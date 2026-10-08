'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { useIsoLayoutEffect } from '../lib/hooks'
import { Portal } from '../lib/overlay'

/*
 * Подсказка в портале - замена атрибута title=. Показывается по наведению
 * и по фокусу клавиатуры, связана с якорем через aria-describedby.
 * Disabled-кнопки не получают событий мыши, поэтому такой якорь
 * оборачивается в span с display: contents (позиция - по самому ребёнку).
 */

export type TooltipPlacement = 'top' | 'bottom' | 'right' | 'left' | 'auto'

type TooltipSide = 'top' | 'bottom' | 'right' | 'left'

export interface TooltipProps {
  content: ReactNode
  placement?: TooltipPlacement
  /** Задержка появления, мс. */
  delay?: number
  children: ReactElement
}

const PAD = 8
const GAP = 6

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  else (ref as { current: T | null }).current = node
}

export function Tooltip({ content, placement = 'auto', delay = 200, children }: TooltipProps) {
  const id = useId()
  const anchorRef = useRef<HTMLElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const timer = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; side: TooltipSide } | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const show = useCallback(() => {
    cancel()
    if (!content) return
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }, [cancel, content, delay])

  const hide = useCallback(() => {
    cancel()
    setOpen(false)
    setPos(null)
  }, [cancel])

  useIsoLayoutEffect(() => {
    if (!open) return
    const anchor = anchorRef.current
    const tip = tipRef.current
    if (!anchor || !tip) return
    const target =
      anchor.dataset.tooltipAnchor !== undefined && anchor.firstElementChild instanceof HTMLElement
        ? anchor.firstElementChild
        : anchor
    const ar = target.getBoundingClientRect()
    const tr = tip.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (placement === 'right' || placement === 'left') {
      // Сбоку: нужная сторона, при нехватке места - противоположная, иначе сверху или снизу.
      const fitsRight = ar.right + GAP + tr.width <= vw - PAD
      const fitsLeft = ar.left - GAP - tr.width >= PAD
      const side = placement === 'right' ? (fitsRight ? 'right' : fitsLeft ? 'left' : null) : fitsLeft ? 'left' : fitsRight ? 'right' : null
      if (side) {
        const t = Math.max(PAD, Math.min(ar.top + ar.height / 2 - tr.height / 2, vh - tr.height - PAD))
        setPos({ top: t, left: side === 'right' ? ar.right + GAP : ar.left - GAP - tr.width, side })
        return
      }
    }
    let side: 'top' | 'bottom' = placement === 'bottom' ? 'bottom' : 'top'
    if (side === 'top' && ar.top - tr.height - GAP < PAD) side = 'bottom'
    else if (side === 'bottom' && ar.bottom + tr.height + GAP > vh - PAD && placement === 'auto') side = 'top'
    let top = side === 'top' ? ar.top - tr.height - GAP : ar.bottom + GAP
    let left = ar.left + ar.width / 2 - tr.width / 2
    left = Math.max(PAD, Math.min(left, vw - tr.width - PAD))
    top = Math.max(PAD, Math.min(top, vh - tr.height - PAD))
    setPos({ top, left, side })
  }, [open, placement])

  useEffect(() => {
    if (!open) return
    const close = () => hide()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, hide])

  useEffect(() => cancel, [cancel])

  // В React 19 ref - обычный проп ребёнка.
  const childRef = isValidElement(children) ? (children.props as { ref?: Ref<HTMLElement> }).ref : undefined
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      anchorRef.current = node
      assignRef(childRef, node)
    },
    [childRef],
  )
  const setAnchorOnly = useCallback((node: HTMLElement | null) => {
    anchorRef.current = node
  }, [])

  if (!isValidElement(children)) return children
  const props = (children as ReactElement<Record<string, unknown>>).props

  const call = <E,>(name: string, e: E) => {
    const fn = props[name]
    if (typeof fn === 'function') (fn as (e: E) => void)(e)
  }

  const describedBy = open && content ? id : undefined
  const handlers = {
    onMouseEnter: (e: MouseEvent) => {
      show()
      call('onMouseEnter', e)
    },
    onMouseLeave: (e: MouseEvent) => {
      hide()
      call('onMouseLeave', e)
    },
    onFocus: (e: FocusEvent) => {
      show()
      call('onFocus', e)
    },
    onBlur: (e: FocusEvent) => {
      hide()
      call('onBlur', e)
    },
  }

  const anchor =
    props.disabled === true ? (
      <span ref={setAnchorOnly} data-tooltip-anchor="" className="ev-tooltip-anchor" {...handlers}>
        {children}
      </span>
    ) : (
      // Ложное срабатывание: cloneElement только передаёт callback-ref якорю, ref не читается при рендере.
      // eslint-disable-next-line react-hooks/refs
      cloneElement(children as ReactElement<Record<string, unknown>>, {
        ref: setRefs,
        'aria-describedby': describedBy ?? props['aria-describedby'],
        ...handlers,
      })
    )

  return (
    <>
      {anchor}
      {open && content ? (
        <Portal>
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="ev-tooltip"
            data-side={pos?.side ?? 'top'}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
          >
            {content}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
