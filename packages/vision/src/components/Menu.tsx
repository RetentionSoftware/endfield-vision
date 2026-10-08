'use client'

import { Check } from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from '../lib/cx'
import { useEventCallback, useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { UiLink } from '../lib/link'
import { Portal, useEscapeLayer, useFloating, type Placement } from '../lib/overlay'

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

export interface MenuProps {
  trigger: ReactElement
  items: MenuEntry[]
  placement?: Placement
  /** Подпись меню для скринридера. */
  label?: string
  className?: string
  minWidth?: number
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  else (ref as { current: T | null }).current = node
}

type ActionItem = Extract<MenuEntry, { id: string; label: ReactNode }> & { type?: 'item' }

function isAction(e: MenuEntry): e is ActionItem {
  return e.type === undefined || e.type === 'item'
}

/** Пауза, после которой набранные буквы поиска по первым буквам сбрасываются, мс. */
const TYPEAHEAD_RESET_MS = 500

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

/** Меню действий (role="menu"): стрелки, Home/End, поиск по первым буквам, Enter, Escape с возвратом фокуса. */
export function Menu({ trigger, items, placement = 'bottom-end', label, className, minWidth = 200 }: MenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const anchorRef = useRef<HTMLElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const typed = useRef({ text: '', at: 0 })
  const { style, side } = useFloating(anchorRef, menuRef, { open, placement })

  const actionable = items.map((it, i) => (isAction(it) && !it.disabled ? i : -1)).filter((i) => i >= 0)

  const close = useEventCallback((refocus: boolean) => {
    setOpen(false)
    setActive(-1)
    typed.current = { text: '', at: 0 }
    if (refocus) anchorRef.current?.focus({ preventScroll: true })
  })

  useOutsideClick([anchorRef, menuRef], () => close(false), open)
  useEscapeLayer(open, () => close(true))

  useIsoLayoutEffect(() => {
    if (open && active >= 0) itemRefs.current[active]?.focus({ preventScroll: true })
  }, [open, active])

  const openWith = (which: 'first' | 'last') => {
    setOpen(true)
    setActive(which === 'first' ? (actionable[0] ?? -1) : (actionable[actionable.length - 1] ?? -1))
  }

  const move = (dir: 1 | -1) => {
    if (actionable.length === 0) return
    const pos = actionable.indexOf(active)
    const next = pos < 0 ? (dir === 1 ? 0 : actionable.length - 1) : (pos + dir + actionable.length) % actionable.length
    setActive(actionable[next] ?? -1)
  }

  const typeahead = (e: KeyboardEvent<HTMLDivElement>) => {
    // Пробел нажимает пункт, а не ищет; сочетания с модификаторами - не ввод.
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

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        move(-1)
        break
      case 'Home':
        e.preventDefault()
        setActive(actionable[0] ?? -1)
        break
      case 'End':
        e.preventDefault()
        setActive(actionable[actionable.length - 1] ?? -1)
        break
      case 'Tab':
        close(false)
        break
      default:
        typeahead(e)
        break
    }
  }

  const select = (it: ActionItem) => {
    if (it.disabled) return
    close(!it.href)
    it.onSelect?.()
  }

  const childRef = isValidElement(trigger) ? (trigger.props as { ref?: Ref<HTMLElement> }).ref : undefined
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      anchorRef.current = node
      assignRef(childRef, node)
    },
    [childRef],
  )
  const tp = (trigger as ReactElement<Record<string, unknown>>).props
  // Ложное срабатывание: cloneElement только передаёт callback-ref якорю, ref не читается при рендере.
  // eslint-disable-next-line react-hooks/refs
  const anchor = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: setRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: (e: unknown) => {
      if (typeof tp.onClick === 'function') (tp.onClick as (e: unknown) => void)(e)
      if (open) close(false)
      else openWith('first')
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (typeof tp.onKeyDown === 'function') (tp.onKeyDown as (e: KeyboardEvent) => void)(e)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        openWith('first')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        openWith('last')
      }
    },
  })

  return (
    <>
      {anchor}
      {open ? (
        <Portal>
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            className={cx('ev-menu', className)}
            data-ev-layer=""
            data-side={side}
            style={{ ...style, minWidth }}
            onKeyDown={onMenuKey}
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
                onMouseEnter: () => !it.disabled && setActive(i),
              }
              if (it.href && !it.disabled) {
                return (
                  <UiLink
                    key={it.id}
                    href={it.href}
                    {...common}
                    ref={(n: HTMLAnchorElement | null) => {
                      itemRefs.current[i] = n
                    }}
                    onClick={() => select(it)}
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
                <button
                  key={it.id}
                  type="button"
                  {...common}
                  ref={(n) => {
                    itemRefs.current[i] = n
                  }}
                  onClick={() => select(it)}
                >
                  {content}
                </button>
              )
            })}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
