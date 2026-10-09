'use client'

import { Check, Copy } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { UiLink } from '../lib/link'
import { useEscapeLayer } from '../lib/overlay'

/*
 * Общее ядро Menu и ContextMenu: разметка списка пунктов (MenuPanel) и
 * клавиатура с перемещаемым фокусом (useMenuKeyboard). Открытие и
 * позиционирование - у каждого меню своё: Menu - у кнопки, ContextMenu - у
 * курсора. Внутренний модуль: в публичный API входят только MenuEntry,
 * findTypeaheadMatch и isContextMenuKey (через Menu и ContextMenu).
 */

export type MenuEntry =
  | {
      type?: 'item'
      id: string
      label: ReactNode
      icon?: ReactNode
      /** Вторая строка или текст справа. */
      hint?: ReactNode
      /** Сочетание клавиш справа. */
      shortcut?: string
      danger?: boolean
      disabled?: boolean
      /** Отметка выбранного пункта (переключатели в меню). */
      checked?: boolean
      /** Пункт-ссылка: навигация через ссылку приложения. */
      href?: string
      onSelect?: () => void
    }
  | { type: 'separator'; id: string }
  | { type: 'label'; id: string; label: ReactNode }

/** Пункт-действие (не разделитель и не подпись группы). */
export type MenuAction = Extract<MenuEntry, { id: string; label: ReactNode }> & { type?: 'item' }

export function isMenuAction(e: MenuEntry): e is MenuAction {
  return e.type === undefined || e.type === 'item'
}

/* ------------------------------------------------------------------ */
/* Чистые функции клавиатуры                                           */
/* ------------------------------------------------------------------ */

/** Пауза, после которой набранные буквы поиска по первым буквам сбрасываются, мс. */
export const TYPEAHEAD_RESET_MS = 500

/**
 * Поиск пункта по набранным буквам. labels - текст пунктов (null - пункт без
 * строковой подписи, пропускается), candidates - индексы доступных пунктов.
 * Одна буква ищется со следующего пункта (повтор буквы перебирает пункты на
 * неё), уточнение из нескольких букв - с текущего. Возвращает индекс или -1.
 */
export function findTypeaheadMatch(labels: Array<string | null>, candidates: number[], active: number, query: string): number {
  const q = query.toLocaleLowerCase()
  if (!q || candidates.length === 0) return -1
  const first = q.charAt(0)
  const needle = [...q].every((c) => c === first) ? first : q
  const n = candidates.length
  const pos = candidates.indexOf(active)
  const base = pos < 0 ? 0 : pos + (needle.length === 1 ? 1 : 0)
  for (let k = 0; k < n; k++) {
    const idx = candidates[(base + k) % n]
    if (idx === undefined) continue
    const label = labels[idx]
    if (label && label.trim().toLocaleLowerCase().startsWith(needle)) return idx
  }
  return -1
}

/** Клавиша открытия контекстного меню: ContextMenu или Shift+F10. */
export function isContextMenuKey(e: { key: string; shiftKey: boolean }): boolean {
  return e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')
}

/** Индексы доступных пунктов (действия без disabled). */
export function actionableIndexes(items: MenuEntry[]): number[] {
  return items.map((it, i) => (isMenuAction(it) && !it.disabled ? i : -1)).filter((i) => i >= 0)
}

/** Подписи пунктов для поиска по первым буквам: null - не действие или подпись не строка. */
export function typeaheadLabels(items: MenuEntry[]): Array<string | null> {
  return items.map((it) => (isMenuAction(it) && typeof it.label === 'string' ? it.label : null))
}

/** Шаг стрелкой по кругу. Без активного пункта - первый (вниз) или последний (вверх). */
export function stepActive(actionable: number[], active: number, dir: 1 | -1): number {
  const n = actionable.length
  if (n === 0) return active
  const pos = actionable.indexOf(active)
  const next = pos < 0 ? (dir === 1 ? 0 : n - 1) : (pos + dir + n) % n
  return actionable[next] ?? -1
}

/** Первый или последний доступный пункт (-1, если доступных нет). */
export function edgeActive(actionable: number[], edge: 'first' | 'last'): number {
  return (edge === 'first' ? actionable[0] : actionable[actionable.length - 1]) ?? -1
}

export interface TypeaheadBuffer {
  text: string
  at: number
}

/** Набранные буквы: после паузы дольше TYPEAHEAD_RESET_MS поиск начинается заново. */
export function nextTypeahead(buf: TypeaheadBuffer, char: string, now: number): TypeaheadBuffer {
  const prev = now - buf.at > TYPEAHEAD_RESET_MS ? '' : buf.text
  return { text: prev + char, at: now }
}

export type MenuKeyCommand =
  | { type: 'step'; dir: 1 | -1 }
  | { type: 'edge'; edge: 'first' | 'last' }
  /** Tab: закрыть с возвратом фокуса, переход по Tab идёт дальше от элемента-источника. */
  | { type: 'close' }
  /** Клавиша открытия контекстного меню внутри меню: погасить. */
  | { type: 'swallow' }
  | { type: 'type'; char: string }

type KeyLike = { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }

/**
 * Команда меню по клавише (null - клавиша меню не касается). Enter и пробел
 * нажимают пункт сами (кнопка; у ссылки пробел - в MenuPanel), Escape - слой
 * useEscapeLayer.
 */
export function menuKeyCommand(e: KeyLike): MenuKeyCommand | null {
  switch (e.key) {
    case 'ArrowDown':
      return { type: 'step', dir: 1 }
    case 'ArrowUp':
      return { type: 'step', dir: -1 }
    case 'Home':
      return { type: 'edge', edge: 'first' }
    case 'End':
      return { type: 'edge', edge: 'last' }
    case 'Tab':
      return { type: 'close' }
    default:
      break
  }
  if (isContextMenuKey(e)) return { type: 'swallow' }
  // Пробел нажимает пункт, а не ищет; сочетания с модификаторами - не ввод.
  if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return null
  return { type: 'type', char: e.key }
}

/* ------------------------------------------------------------------ */
/* Пункт «копировать выделенное»                                        */
/* ------------------------------------------------------------------ */

/** id встроенного пункта копирования выделенного текста. */
export const COPY_SELECTION_ID = 'ev-ctx-copy'

/**
 * Пункт «копировать выделенное» первым, отдельной группой. Добавляется только
 * к меню, которое и так открывается (пустой список остаётся пустым - там
 * нативное меню браузера со своим «Копировать»), и только при непустом
 * выделении.
 */
export function withCopySelectionEntry(
  entries: MenuEntry[],
  selection: string,
  item: { label: string; shortcut?: string; onCopy: (text: string) => void },
): MenuEntry[] {
  const text = selection.trim()
  if (entries.length === 0 || !text) return entries
  return [
    { id: COPY_SELECTION_ID, label: item.label, icon: <Copy size={15} />, shortcut: item.shortcut, onSelect: () => item.onCopy(text) },
    { type: 'separator', id: `${COPY_SELECTION_ID}-sep` },
    ...entries,
  ]
}

/* ------------------------------------------------------------------ */
/* Клавиатура и фокус                                                   */
/* ------------------------------------------------------------------ */

export interface MenuKeyboardOptions {
  items: MenuEntry[]
  /** Меню открыто: слой Escape и перевод фокуса. */
  open: boolean
  /** Меню на месте и может принять фокус (по умолчанию - сразу при открытии). */
  ready?: boolean
  /** Активный пункт при монтировании: первый доступный или ни одного. */
  initial?: 'first' | 'none'
  /** Закрыть меню; refocus - вернуть фокус туда, откуда меню открыли. */
  onClose: (refocus: boolean) => void
}

/**
 * Клавиатура меню: стрелки по кругу, Home/End, поиск по первым буквам,
 * Escape и Tab закрывают с возвратом фокуса. Фокус переходит за активным
 * пунктом; без активного пункта - на сам список (клавиши продолжают работать).
 */
export function useMenuKeyboard({ items, open, ready = open, initial = 'none', onClose }: MenuKeyboardOptions) {
  const actionable = useMemo(() => actionableIndexes(items), [items])
  const [active, setActive] = useState(() => (initial === 'first' ? edgeActive(actionableIndexes(items), 'first') : -1))
  const menuRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const typed = useRef<TypeaheadBuffer>({ text: '', at: 0 })

  useEscapeLayer(open, () => onClose(true))

  useIsoLayoutEffect(() => {
    if (!open || !ready) return
    // Панель рисуется в портале и до расчёта позиции скрыта (visibility: hidden) -
    // скрытый элемент фокус не принимает. Повторяем на следующих кадрах, пока
    // фокус действительно не перейдёт (не дольше ~10 кадров).
    let raf = 0
    let tries = 0
    const run = () => {
      const target = active >= 0 ? itemRefs.current[active] : menuRef.current
      target?.focus({ preventScroll: true })
      if ((!target || document.activeElement !== target) && tries++ < 10) raf = requestAnimationFrame(run)
    }
    run()
    return () => cancelAnimationFrame(raf)
  }, [open, ready, active])

  const itemRef = useCallback((index: number, node: HTMLElement | null) => {
    itemRefs.current[index] = node
  }, [])

  /** Сброс при закрытии (меню, которое не размонтируется между открытиями). */
  const reset = () => {
    setActive(-1)
    typed.current = { text: '', at: 0 }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const cmd = menuKeyCommand(e)
    if (!cmd) return
    switch (cmd.type) {
      case 'step':
        e.preventDefault()
        setActive(stepActive(actionable, active, cmd.dir))
        return
      case 'edge':
        e.preventDefault()
        setActive(edgeActive(actionable, cmd.edge))
        return
      case 'close':
        // Фокус возвращается синхронно, и Tab переходит дальше уже от источника.
        onClose(true)
        return
      case 'swallow':
        e.preventDefault()
        return
      case 'type': {
        typed.current = nextTypeahead(typed.current, cmd.char, Date.now())
        const hit = findTypeaheadMatch(typeaheadLabels(items), actionable, active, typed.current.text)
        if (hit >= 0) {
          e.preventDefault()
          setActive(hit)
        }
        return
      }
    }
  }

  const select = (it: MenuAction) => {
    if (it.disabled) return
    // Ссылка уводит на другую страницу: фокус возвращать некуда.
    onClose(!it.href)
    it.onSelect?.()
  }

  return { active, setActive, actionable, menuRef, itemRef, onKeyDown, select, reset }
}

/* ------------------------------------------------------------------ */
/* Разметка                                                            */
/* ------------------------------------------------------------------ */

export interface MenuPanelProps {
  items: MenuEntry[]
  /** Подпись меню для скринридера. */
  label?: string
  active: number
  id?: string
  className?: string
  style?: CSSProperties
  /** Сторона раскрытия относительно якоря (data-side). */
  side?: string
  menuRef?: Ref<HTMLDivElement>
  itemRef?: (index: number, node: HTMLElement | null) => void
  onActive?: (index: number) => void
  onSelect?: (item: MenuAction) => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
}

/** Список пунктов (role="menu") без портала и позиционирования. */
export function MenuPanel({ items, label, active, id, className, style, side, menuRef, itemRef, onActive, onSelect, onKeyDown }: MenuPanelProps) {
  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      className={cx('ev-menu', className)}
      data-ev-layer=""
      data-side={side}
      style={style}
      onKeyDown={onKeyDown}
      // Правый клик внутри меню не открывает ни нативное меню, ни контекстное.
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
