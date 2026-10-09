'use client'

import { Check } from 'lucide-react'
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from '../lib/cx'
import { useEventCallback, useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { UiLink } from '../lib/link'
import { Portal, useEscapeLayer } from '../lib/overlay'
import { findTypeaheadMatch, type MenuEntry } from './Menu'

/*
 * Контекстное меню по правой кнопке мыши.
 *
 * Два способа подключения:
 *  - <ContextMenu items={...}>{элемент}</ContextMenu> - меню у конкретного
 *    элемента (строка, карточка, область). items - массив или функция от
 *    элемента под курсором (event.target): одна обёртка на всю таблицу
 *    может собирать пункты по строке.
 *  - <ContextMenuProvider> + useContextMenuProvider(kind, builder) - реестр
 *    для больших приложений: разметка помечает объекты атрибутами
 *    data-ctx-kind / data-ctx-id, экран регистрирует построитель пунктов для
 *    своего вида, провайдер один на приложение слушает document.
 *
 * Пункты - те же MenuEntry, что у Menu: стрелки, Home/End, поиск по первым
 * буквам, Enter/пробел, Escape с возвратом фокуса. С клавиатуры меню
 * открывается клавишей ContextMenu или Shift+F10 на элементе в фокусе.
 * Закрывается по Escape, клику вне, прокрутке страницы, смене размера окна.
 *
 * Нативное меню браузера остаётся доступным:
 *  - правый клик с зажатым Shift (Firefox показывает нативное меню с Shift
 *    всегда, остальные браузеры - благодаря этой проверке);
 *  - в полях ввода и contenteditable (вставка, орфография), если не выключено
 *    nativeInFields;
 *  - там, где пунктов нет (функция вернула пустой список).
 */

export type ContextMenuItems = MenuEntry[] | ((target: HTMLElement) => MenuEntry[] | null | undefined)

type ActionEntry = Extract<MenuEntry, { label: ReactNode }> & { type?: 'item' }

function isAction(e: MenuEntry): e is ActionEntry {
  return e.type === undefined || e.type === 'item'
}

/** Отступ меню от краёв окна, px. */
const VIEWPORT_PAD = 8
/** Окно, в котором событие contextmenu после клавиши считается её эхом, мс. */
const KEY_ECHO_MS = 400
/** Пауза сброса поиска по первым буквам, мс (как у Menu). */
const TYPEAHEAD_RESET_MS = 500

/**
 * Позиция меню у точки: справа-снизу от курсора, при нехватке места -
 * слева или сверху (как нативное меню), затем прижим к краям окна.
 * flipY - координата, от которой меню раскрывается вверх (верх элемента при
 * открытии с клавиатуры); по умолчанию - сама точка.
 */
export function placeContextMenu(
  point: { x: number; y: number; flipY?: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  pad = VIEWPORT_PAD,
): { left: number; top: number } {
  let left = point.x
  let top = point.y
  if (left + size.width > viewport.width - pad) left = point.x - size.width
  if (top + size.height > viewport.height - pad) top = (point.flipY ?? point.y) - size.height
  left = Math.max(pad, Math.min(left, viewport.width - size.width - pad))
  top = Math.max(pad, Math.min(top, viewport.height - size.height - pad))
  return { left: Math.round(left), top: Math.round(top) }
}

/** Клавиша открытия контекстного меню: ContextMenu или Shift+F10. */
export function isContextMenuKey(e: { key: string; shiftKey: boolean }): boolean {
  return e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')
}

/** Поле ввода или редактируемый текст: там остаётся нативное меню браузера. */
export function isEditableTarget(el: Element | null): boolean {
  if (!el) return false
  if (el.closest('input, textarea, [contenteditable=""], [contenteditable="true"]')) return true
  return (el as HTMLElement).isContentEditable === true
}

/**
 * Чистка списка: без разделителей в начале, в конце и подряд, без подписей
 * групп, за которыми нет пунктов.
 */
export function compactMenuEntries(entries: MenuEntry[]): MenuEntry[] {
  const out: MenuEntry[] = []
  for (const e of entries) {
    if (e.type === 'separator') {
      const last = out[out.length - 1]
      if (!last || last.type === 'separator') continue
      // Подпись группы без пунктов перед разделителем не нужна.
      if (last.type === 'label') out.pop()
      if (out.length === 0 || out[out.length - 1]?.type === 'separator') continue
    }
    out.push(e)
  }
  while (out.length > 0) {
    const last = out[out.length - 1]!
    if (last.type === 'separator' || last.type === 'label') out.pop()
    else break
  }
  return out
}

/** Склейка групп пунктов через разделитель; пустые группы пропускаются. */
export function joinMenuSections(sections: Array<MenuEntry[] | null | undefined>): MenuEntry[] {
  const out: MenuEntry[] = []
  sections.forEach((section, i) => {
    const items = section ? compactMenuEntries(section) : []
    if (items.length === 0) return
    if (out.length > 0) out.push({ type: 'separator', id: `ev-ctx-sep-${i}` })
    out.push(...items)
  })
  return out
}

/* ------------------------------------------------------------------ */
/* Состояние и слой меню                                               */
/* ------------------------------------------------------------------ */

interface OpenState {
  /** Номер открытия: новый слой на каждое открытие (сброс активного пункта). */
  seq: number
  x: number
  y: number
  flipY?: number
  items: MenuEntry[]
  keyboard: boolean
  /** Куда вернуть фокус после закрытия. */
  restore: HTMLElement | null
}

type OpenRequest = Omit<OpenState, 'seq' | 'restore'>

/** Точка открытия с клавиатуры: под левым нижним углом элемента. */
function keyboardPoint(el: Element): { x: number; y: number; flipY: number } {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.bottom + 2, flipY: r.top - 2 }
}

function activeElement(): HTMLElement | null {
  const el = document.activeElement
  return el instanceof HTMLElement && el !== document.body ? el : null
}

function useContextMenuState(onOpenChange?: (open: boolean) => void) {
  const [state, setState] = useState<OpenState | null>(null)
  const seq = useRef(0)
  const keyboardAt = useRef(0)

  const open = useEventCallback((req: OpenRequest) => {
    seq.current += 1
    if (req.keyboard) keyboardAt.current = Date.now()
    setState({ ...req, seq: seq.current, restore: activeElement() })
    onOpenChange?.(true)
  })

  const close = useEventCallback((refocus: boolean) => {
    const restore = state?.restore ?? null
    setState(null)
    onOpenChange?.(false)
    if (refocus && restore && document.contains(restore)) restore.focus({ preventScroll: true })
  })

  /** contextmenu сразу после открытия клавишей - эхо той же клавиши. */
  const isKeyEcho = useEventCallback(() => Date.now() - keyboardAt.current < KEY_ECHO_MS)

  return { state, open, close, isKeyEcho }
}

interface ContextMenuPanelProps {
  items: MenuEntry[]
  label: string
  active: number
  className?: string
  style?: CSSProperties
  menuRef?: Ref<HTMLDivElement>
  itemRef?: (index: number, node: HTMLElement | null) => void
  onActive?: (index: number) => void
  onSelect?: (item: ActionEntry) => void
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void
}

/**
 * Разметка меню (role="menu") без портала и позиционирования. Классы - те же,
 * что у Menu: внешний вид у обычного и контекстного меню общий.
 */
export function ContextMenuPanel({
  items,
  label,
  active,
  className,
  style,
  menuRef,
  itemRef,
  onActive,
  onSelect,
  onKeyDown,
}: ContextMenuPanelProps) {
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      className={cx('ev-menu ev-context-menu', className)}
      data-ev-layer=""
      style={style}
      onKeyDown={onKeyDown}
      // Правый клик внутри меню не открывает ни нативное меню, ни новое своё.
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) => {
        if (it.type === 'separator') return <div key={it.id} className="ev-menu-sep" role="separator" />
        if (it.type === 'label')
          return (
            <div key={it.id} className="ev-menu-label" role="presentation">
              {it.label}
            </div>
          )
        const content = (
          <>
            <span className="ev-menu-icon" aria-hidden="true">
              {it.checked ? <Check size={15} /> : it.icon}
            </span>
            <span className="ev-menu-text">
              <span className="ev-menu-item-label">{it.label}</span>
              {it.hint ? <span className="ev-menu-hint">{it.hint}</span> : null}
            </span>
            {it.shortcut ? <kbd className="ev-kbd">{it.shortcut}</kbd> : null}
          </>
        )
        const common = {
          role: it.checked === undefined ? 'menuitem' : 'menuitemcheckbox',
          'aria-checked': it.checked,
          'aria-disabled': it.disabled || undefined,
          tabIndex: -1,
          className: 'ev-menu-item',
          'data-danger': it.danger || undefined,
          'data-active': active === i || undefined,
          onMouseEnter: () => !it.disabled && onActive?.(i),
        }
        if (it.href && !it.disabled) {
          return (
            <UiLink
              key={it.id}
              href={it.href}
              {...common}
              ref={(n: HTMLAnchorElement | null) => itemRef?.(i, n)}
              onClick={() => onSelect?.(it)}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault()
                  ;(e.currentTarget as HTMLAnchorElement).click()
                }
              }}
            >
              {content}
            </UiLink>
          )
        }
        return (
          <button key={it.id} type="button" {...common} ref={(n) => itemRef?.(i, n)} onClick={() => onSelect?.(it)}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

function ContextMenuLayer({
  state,
  label,
  className,
  onClose,
}: {
  state: OpenState
  label: string
  className?: string
  onClose: (refocus: boolean) => void
}) {
  const { items } = state
  const menuRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const typed = useRef({ text: '', at: 0 })
  const actionable = useMemo(() => items.map((it, i) => (isAction(it) && !it.disabled ? i : -1)).filter((i) => i >= 0), [items])
  // С клавиатуры активен первый пункт; после клика мышью - ни один (как у нативного меню).
  const [active, setActive] = useState(() => (state.keyboard ? (actionable[0] ?? -1) : -1))
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useIsoLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    setPos(
      placeContextMenu(
        { x: state.x, y: state.y, flipY: state.flipY },
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    )
  }, [state])

  useIsoLayoutEffect(() => {
    if (!pos) return
    const target = active >= 0 ? itemRefs.current[active] : menuRef.current
    target?.focus({ preventScroll: true })
  }, [pos, active])

  useOutsideClick([menuRef], () => onClose(false))
  useEscapeLayer(true, () => onClose(true))

  useEffect(() => {
    const onScroll = (e: Event) => {
      // Прокрутка длинного меню изнутри его не закрывает.
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return
      onClose(false)
    }
    const onLeave = () => onClose(false)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [onClose])

  const move = (dir: 1 | -1) => {
    if (actionable.length === 0) return
    const p = actionable.indexOf(active)
    const next = p < 0 ? (dir === 1 ? 0 : actionable.length - 1) : (p + dir + actionable.length) % actionable.length
    setActive(actionable[next] ?? -1)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        move(1)
        return
      case 'ArrowUp':
        e.preventDefault()
        move(-1)
        return
      case 'Home':
        e.preventDefault()
        setActive(actionable[0] ?? -1)
        return
      case 'End':
        e.preventDefault()
        setActive(actionable[actionable.length - 1] ?? -1)
        return
      case 'Tab':
        // Меню модально для клавиатуры: Tab закрывает его и возвращает фокус.
        e.preventDefault()
        onClose(true)
        return
      default:
        break
    }
    if (isContextMenuKey(e)) {
      e.preventDefault()
      return
    }
    if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return
    const now = Date.now()
    const prev = now - typed.current.at > TYPEAHEAD_RESET_MS ? '' : typed.current.text
    const text = prev + e.key
    typed.current = { text, at: now }
    const labels = items.map((it) => (isAction(it) && typeof it.label === 'string' ? it.label : null))
    const hit = findTypeaheadMatch(labels, actionable, active, text)
    if (hit >= 0) {
      e.preventDefault()
      setActive(hit)
    }
  }

  const select = (it: ActionEntry) => {
    if (it.disabled) return
    onClose(!it.href)
    it.onSelect?.()
  }

  return (
    <Portal>
      <ContextMenuPanel
        items={items}
        label={label}
        active={active}
        className={className}
        menuRef={menuRef}
        itemRef={(i, n) => {
          itemRefs.current[i] = n
        }}
        style={
          pos
            ? { position: 'fixed', top: pos.top, left: pos.left }
            : { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }
        }
        onActive={setActive}
        onSelect={select}
        onKeyDown={onKeyDown}
      />
    </Portal>
  )
}

/* ------------------------------------------------------------------ */
/* ContextMenu - меню у элемента                                       */
/* ------------------------------------------------------------------ */

export interface ContextMenuProps {
  /** Пункты или функция от элемента под курсором (пустой список - нативное меню). */
  items: ContextMenuItems
  /** Один элемент: получает onContextMenu и onKeyDown. */
  children: ReactElement
  /** Подпись меню для скринридера; по умолчанию - «Контекстное меню». */
  label?: string
  disabled?: boolean
  /** В полях ввода и contenteditable оставлять нативное меню (по умолчанию да). */
  nativeInFields?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Контекстное меню у элемента: правый клик, клавиша ContextMenu или Shift+F10. С Shift - нативное меню браузера. */
export function ContextMenu({ items, children, label, disabled = false, nativeInFields = true, onOpenChange, className }: ContextMenuProps) {
  const t = useMessages()
  const { state, open, close, isKeyEcho } = useContextMenuState(onOpenChange)

  const resolve = (target: HTMLElement): MenuEntry[] =>
    compactMenuEntries((typeof items === 'function' ? items(target) : items) ?? [])

  const cp = isValidElement(children) ? (children.props as Record<string, unknown>) : {}

  const onContextMenu = (e: ReactMouseEvent<HTMLElement>) => {
    if (typeof cp.onContextMenu === 'function') (cp.onContextMenu as (e: ReactMouseEvent<HTMLElement>) => void)(e)
    if (disabled || e.defaultPrevented || e.shiftKey) return
    const target = e.target instanceof HTMLElement ? e.target : e.currentTarget
    if (nativeInFields && isEditableTarget(target)) return
    if (isKeyEcho()) {
      e.preventDefault()
      return
    }
    const entries = resolve(target)
    if (entries.length === 0) return
    e.preventDefault()
    // Клавиатурное contextmenu без координат - открываем у элемента.
    const fromKeys = e.clientX === 0 && e.clientY === 0
    open({ ...(fromKeys ? keyboardPoint(target) : { x: e.clientX, y: e.clientY }), items: entries, keyboard: fromKeys })
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (typeof cp.onKeyDown === 'function') (cp.onKeyDown as (e: ReactKeyboardEvent<HTMLElement>) => void)(e)
    if (disabled || e.defaultPrevented || !isContextMenuKey(e)) return
    const target = e.target instanceof HTMLElement ? e.target : e.currentTarget
    if (nativeInFields && isEditableTarget(target)) return
    const entries = resolve(target)
    if (entries.length === 0) return
    e.preventDefault()
    open({ ...keyboardPoint(target), items: entries, keyboard: true })
  }

  if (!isValidElement(children)) return children
  const anchor = cloneElement(children as ReactElement<Record<string, unknown>>, { onContextMenu, onKeyDown })

  return (
    <>
      {anchor}
      {state ? <ContextMenuLayer key={state.seq} state={state} label={label ?? t.contextMenu.label} className={className} onClose={close} /> : null}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Реестр: ContextMenuProvider + useContextMenuProvider                */
/* ------------------------------------------------------------------ */

/**
 * Построитель пунктов для объектов вида kind. el - ближайший элемент с
 * data-ctx-kind={kind}, id - его data-ctx-id (или null).
 */
export type ContextMenuBuilder = (el: HTMLElement, id: string | null) => MenuEntry[] | null | undefined

export interface ContextMenuTargetInfo {
  /** Элемент под курсором (или в фокусе при открытии с клавиатуры). */
  target: HTMLElement
  /** Ближайший элемент с data-ctx-kind. */
  element: HTMLElement | null
  kind: string | null
  id: string | null
  /** Выделенный текст на момент открытия (клик по меню может снять выделение). */
  selection: string
}

interface Registry {
  register: (kind: string, builder: { current: ContextMenuBuilder }) => () => void
}

const RegistryContext = createContext<Registry | null>(null)

/** Ближайший объект с data-ctx-kind и его id. */
export function findContextTarget(target: HTMLElement): { element: HTMLElement | null; kind: string | null; id: string | null } {
  const element = target.closest<HTMLElement>('[data-ctx-kind]')
  return {
    element,
    kind: element?.getAttribute('data-ctx-kind') || null,
    id: element?.getAttribute('data-ctx-id') ?? null,
  }
}

export interface ContextMenuProviderProps {
  children: ReactNode
  /**
   * Общие пункты для любого места страницы (копировать выделенное и т.п.).
   * Идут после пунктов объекта, через разделитель.
   */
  globalItems?: (info: ContextMenuTargetInfo) => MenuEntry[] | null | undefined
  /** Подпись меню для скринридера; по умолчанию - «Контекстное меню». */
  label?: string
  /** Выключить перехват (например, личная настройка пользователя). */
  disabled?: boolean
  /** В полях ввода и contenteditable оставлять нативное меню (по умолчанию да). */
  nativeInFields?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Глобальное контекстное меню по реестру видов объектов. Один на приложение,
 * обычно рядом с корневыми провайдерами. Меню у элемента (<ContextMenu>)
 * внутри провайдера имеет приоритет: оно гасит событие раньше.
 */
export function ContextMenuProvider({
  children,
  globalItems,
  label,
  disabled = false,
  nativeInFields = true,
  onOpenChange,
  className,
}: ContextMenuProviderProps) {
  const t = useMessages()
  const registry = useRef(new Map<string, { current: ContextMenuBuilder }>())
  const { state, open, close, isKeyEcho } = useContextMenuState(onOpenChange)

  const api = useMemo<Registry>(
    () => ({
      register: (kind, builder) => {
        registry.current.set(kind, builder)
        return () => {
          if (registry.current.get(kind) === builder) registry.current.delete(kind)
        }
      },
    }),
    [],
  )

  const resolve = useEventCallback((target: HTMLElement): MenuEntry[] => {
    const found = findContextTarget(target)
    const builder = found.kind ? registry.current.get(found.kind) : undefined
    const own = builder && found.element ? builder.current(found.element, found.id) : null
    const info: ContextMenuTargetInfo = {
      target,
      ...found,
      selection: window.getSelection()?.toString().trim() ?? '',
    }
    return joinMenuSections([own, globalItems?.(info)])
  })

  useEffect(() => {
    if (disabled) return
    const skip = (target: HTMLElement) => Boolean(target.closest('.ev-context-menu')) || (nativeInFields && isEditableTarget(target))

    const onContextMenu = (e: MouseEvent) => {
      if (e.defaultPrevented || e.shiftKey || !(e.target instanceof HTMLElement)) return
      if (skip(e.target)) return
      if (isKeyEcho()) {
        e.preventDefault()
        return
      }
      const entries = resolve(e.target)
      if (entries.length === 0) return
      e.preventDefault()
      const fromKeys = e.clientX === 0 && e.clientY === 0
      open({ ...(fromKeys ? keyboardPoint(e.target) : { x: e.clientX, y: e.clientY }), items: entries, keyboard: fromKeys })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isContextMenuKey(e) || !(e.target instanceof HTMLElement)) return
      if (skip(e.target)) return
      const entries = resolve(e.target)
      if (entries.length === 0) return
      e.preventDefault()
      open({ ...keyboardPoint(e.target), items: entries, keyboard: true })
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [disabled, nativeInFields, resolve, open, isKeyEcho])

  return (
    <RegistryContext.Provider value={api}>
      {children}
      {state && !disabled ? (
        <ContextMenuLayer key={state.seq} state={state} label={label ?? t.contextMenu.label} className={className} onClose={close} />
      ) : null}
    </RegistryContext.Provider>
  )
}

/**
 * Регистрирует пункты для объектов с data-ctx-kind={kind}. Построитель
 * вызывается в момент открытия - всегда свежая версия с актуальным
 * состоянием экрана. Без ContextMenuProvider выше по дереву ничего не делает.
 */
export function useContextMenuProvider(kind: string, builder: ContextMenuBuilder): void {
  const registry = useContext(RegistryContext)
  const ref = useRef(builder)
  useIsoLayoutEffect(() => {
    ref.current = builder
  })
  useEffect(() => {
    if (!registry) return
    return registry.register(kind, ref)
  }, [registry, kind])
}
