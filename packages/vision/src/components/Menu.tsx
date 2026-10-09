'use client'

import { cloneElement, isValidElement, useCallback, useId, useRef, useState, type KeyboardEvent, type ReactElement, type Ref } from 'react'
import { useEventCallback, useOutsideClick } from '../lib/hooks'
import { Portal, useFloating, type Placement } from '../lib/overlay'
import { edgeActive, MenuPanel, useMenuKeyboard, type MenuEntry } from './MenuCore'

export { findTypeaheadMatch, type MenuEntry } from './MenuCore'

export interface MenuProps {
  trigger: ReactElement
  items: MenuEntry[]
  placement?: Placement
  /** Подпись меню для скринридера. */
  label?: string
  className?: string
  minWidth?: number
  /** Предел высоты списка (длинные меню прокручиваются). По умолчанию - высота экрана. */
  maxHeight?: number
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  else (ref as { current: T | null }).current = node
}

/** Меню действий (role="menu"): стрелки, Home/End, поиск по первым буквам, Enter, Escape и Tab с возвратом фокуса. */
export function Menu({ trigger, items, placement = 'bottom-end', label, className, minWidth = 200, maxHeight }: MenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLElement | null>(null)
  const kb = useMenuKeyboard({ items, open, onClose: (refocus) => close(refocus) })
  const { style, side } = useFloating(anchorRef, kb.menuRef, { open, placement })

  const close = useEventCallback((refocus: boolean) => {
    setOpen(false)
    kb.reset()
    if (refocus) anchorRef.current?.focus({ preventScroll: true })
  })

  useOutsideClick([anchorRef, kb.menuRef], () => close(false), open)

  const openWith = (which: 'first' | 'last') => {
    setOpen(true)
    kb.setActive(edgeActive(kb.actionable, which))
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
          <MenuPanel
            items={items}
            label={label}
            active={kb.active}
            id={id}
            className={className}
            side={side}
            style={{ ...style, minWidth, maxHeight }}
            menuRef={kb.menuRef}
            itemRef={kb.itemRef}
            onActive={kb.setActive}
            onSelect={kb.select}
            onKeyDown={kb.onKeyDown}
          />
        </Portal>
      ) : null}
    </>
  )
}
