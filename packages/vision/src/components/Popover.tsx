'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from '../lib/cx'
import { useControllable, useEventCallback, useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { getFocusable, Portal, useEscapeLayer, useFloating, type Placement } from '../lib/overlay'

export interface PopoverProps {
  /** Элемент-якорь; получает ref, onClick и aria-атрибуты. */
  trigger: ReactElement
  /** Содержимое; функция получает close(). */
  children: ReactNode | ((ctx: { close: () => void }) => ReactNode)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: Placement
  /** Подпись окна для скринридера. */
  label?: string
  className?: string
  /** Ширина не меньше якоря. */
  matchWidth?: boolean
  /** Перевести фокус внутрь при открытии (по умолчанию да). */
  autoFocus?: boolean
  /** Стандартный внутренний отступ содержимого (по умолчанию нет: отступы задаёт содержимое). */
  padded?: boolean
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  else (ref as { current: T | null }).current = node
}

/** Неблокирующее всплывающее окно у элемента: фильтры, выбор периода, детали. */
export function Popover({
  trigger,
  children,
  open: openProp,
  onOpenChange,
  placement = 'bottom-start',
  label,
  className,
  matchWidth = false,
  autoFocus = true,
  padded = false,
}: PopoverProps) {
  const id = useId()
  const [open, setOpen] = useControllable(openProp, false, onOpenChange)
  const anchorRef = useRef<HTMLElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const { style, side } = useFloating(anchorRef, popRef, { open, placement, matchWidth })

  const close = useEventCallback(() => {
    setOpen(false)
    anchorRef.current?.focus({ preventScroll: true })
  })

  useOutsideClick([anchorRef, popRef], () => setOpen(false), open)
  useEscapeLayer(open, close)

  useIsoLayoutEffect(() => {
    if (!open || !autoFocus) return
    const raf = requestAnimationFrame(() => {
      const root = popRef.current
      if (!root) return
      const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? getFocusable(root)[0] ?? root
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [open, autoFocus])

  const childRef = isValidElement(trigger) ? (trigger.props as { ref?: Ref<HTMLElement> }).ref : undefined
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      anchorRef.current = node
      assignRef(childRef, node)
    },
    [childRef],
  )

  const triggerProps = (trigger as ReactElement<Record<string, unknown>>).props
  // Ложное срабатывание: cloneElement только передаёт callback-ref якорю, ref не читается при рендере.
  // eslint-disable-next-line react-hooks/refs
  const anchor = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: setRef,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: (e: unknown) => {
      const fn = triggerProps.onClick
      if (typeof fn === 'function') (fn as (e: unknown) => void)(e)
      setOpen(!open)
    },
  })

  return (
    <>
      {anchor}
      {open ? (
        <Portal>
          <div
            ref={popRef}
            id={id}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            className={cx('ev-popover', padded && 'ev-popover-padded', className)}
            data-ev-layer=""
            data-side={side}
            style={style}
          >
            {typeof children === 'function' ? children({ close }) : children}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
