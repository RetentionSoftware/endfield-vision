'use client'

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
import { Portal } from '../lib/overlay'
import { isContextMenuKey, MenuPanel, useMenuKeyboard, withCopySelectionEntry, type MenuAction, type MenuEntry } from './MenuCore'
import { useToast } from './Toast'
import { copyText } from './Utility'

export { isContextMenuKey }

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
 * Пункты - те же MenuEntry, что у Menu, и та же разметка и клавиатура
 * (MenuCore): стрелки, Home/End, поиск по первым буквам, Enter/пробел,
 * Escape и Tab с возвратом фокуса. С клавиатуры меню
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

/** Отступ меню от краёв окна, px. */
const VIEWPORT_PAD = 8
/** Окно, в котором событие contextmenu после клавиши считается её эхом, мс. */
const KEY_ECHO_MS = 400

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
  onSelect?: (item: MenuAction) => void
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void
}

/**
 * Разметка меню (role="menu") без портала и позиционирования - общая с Menu
 * (MenuPanel), плюс класс ev-context-menu.
 */
export function ContextMenuPanel({ className, ...props }: ContextMenuPanelProps) {
  return <MenuPanel {...props} className={cx('ev-context-menu', className)} />
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
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  // С клавиатуры активен первый пункт; после клика мышью - ни один (как у нативного меню).
  // Фокус - после расстановки (pos), чтобы не дёргать прокрутку.
  const kb = useMenuKeyboard({ items: state.items, open: true, ready: pos !== null, initial: state.keyboard ? 'first' : 'none', onClose })
  const { menuRef } = kb

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
  }, [state, menuRef])

  useOutsideClick([menuRef], () => onClose(false))

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
  }, [onClose, menuRef])

  return (
    <Portal>
      <ContextMenuPanel
        items={state.items}
        label={label}
        active={kb.active}
        className={className}
        menuRef={menuRef}
        itemRef={kb.itemRef}
        style={
          pos
            ? { position: 'fixed', top: pos.top, left: pos.left }
            : { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }
        }
        onActive={kb.setActive}
        onSelect={kb.select}
        onKeyDown={kb.onKeyDown}
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

/** Выделение задевает элемент (правый клик по выделенному, а не в другом месте страницы). */
function selectionTouches(target: HTMLElement): boolean {
  const sel = window.getSelection()
  return Boolean(sel && !sel.isCollapsed && sel.containsNode(target, true))
}

/** Сочетание копирования для подсказки в пункте: ⌘C на устройствах Apple, иначе Ctrl+C. */
function copyShortcut(): string {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘C' : 'Ctrl+C'
}

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
   * Общие пункты для любого места страницы. Идут после пунктов объекта, через
   * разделитель.
   */
  globalItems?: (info: ContextMenuTargetInfo) => MenuEntry[] | null | undefined
  /**
   * Встроенный пункт «Копировать» первым, если в элементе под курсором выделен
   * текст (по умолчанию да). Добавляется к меню, у которого есть свои пункты;
   * где их нет, остаётся нативное меню браузера со своим «Копировать».
   */
  copySelection?: boolean
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
  copySelection = true,
  label,
  disabled = false,
  nativeInFields = true,
  onOpenChange,
  className,
}: ContextMenuProviderProps) {
  const t = useMessages()
  const toast = useToast()
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
    const entries = joinMenuSections([own, globalItems?.(info)])
    if (!copySelection || !info.selection || !selectionTouches(target)) return entries
    return withCopySelectionEntry(entries, info.selection, {
      label: t.contextMenu.copy,
      shortcut: copyShortcut(),
      onCopy: (text) => {
        void copyText(text).then((ok) => {
          if (ok) toast.success(t.copy.copied, { duration: 1800, id: 'ev-copy' })
          else toast.error(t.copy.failed)
        })
      },
    })
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
