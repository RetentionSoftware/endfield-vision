'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useIsoLayoutEffect, useMounted } from './hooks'

/**
 * Портал в document.body. Выпадающие списки, подсказки и окна рендерятся
 * вне дерева страницы, чтобы их не обрезал overflow таблиц и модалок.
 * Токены объявлены на :root, поэтому порталы наследуют тему.
 */
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(children, document.body)
}

export type Placement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top'

const VIEWPORT_PAD = 8

interface FloatingOptions {
  open: boolean
  placement?: Placement
  offset?: number
  /** Минимальная ширина поповера = ширине якоря (выпадающие списки). */
  matchWidth?: boolean
}

/**
 * Позиция плавающего элемента относительно якоря: position: fixed, переворот
 * вверх при нехватке места снизу, прижим к краям окна. Пересчёт на scroll
 * (capture - ловит прокрутку любых контейнеров) и resize.
 */
export function useFloating<A extends HTMLElement, F extends HTMLElement>(
  anchorRef: RefObject<A | null>,
  floatingRef: RefObject<F | null>,
  { open, placement = 'bottom-start', offset = 6, matchWidth = false }: FloatingOptions,
): { style: CSSProperties; side: 'top' | 'bottom' } {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; side: 'top' | 'bottom' } | null>(null)
  const frame = useRef(0)

  useIsoLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const compute = () => {
      const a = anchorRef.current
      const f = floatingRef.current
      if (!a || !f) return
      const ar = a.getBoundingClientRect()
      const fw = f.offsetWidth
      const fh = f.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight

      const wantTop = placement.startsWith('top')
      const spaceBelow = vh - ar.bottom - offset - VIEWPORT_PAD
      const spaceAbove = ar.top - offset - VIEWPORT_PAD
      let side: 'top' | 'bottom' = wantTop ? 'top' : 'bottom'
      if (side === 'bottom' && fh > spaceBelow && spaceAbove > spaceBelow) side = 'top'
      if (side === 'top' && fh > spaceAbove && spaceBelow > spaceAbove) side = 'bottom'

      let top = side === 'bottom' ? ar.bottom + offset : ar.top - offset - fh
      top = Math.max(VIEWPORT_PAD, Math.min(top, vh - fh - VIEWPORT_PAD))

      const width = matchWidth ? Math.max(fw, ar.width) : fw
      let left: number
      if (placement.endsWith('-end')) left = ar.right - width
      else if (placement === 'bottom' || placement === 'top') left = ar.left + ar.width / 2 - width / 2
      else left = ar.left
      left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD))

      setPos({ top: Math.round(top), left: Math.round(left), width: Math.round(ar.width), side })
    }
    compute()
    const schedule = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(compute)
    }
    // Размер поповера меняется при фильтрации списка - следим и за ним.
    const ro = new ResizeObserver(schedule)
    if (floatingRef.current) ro.observe(floatingRef.current)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      cancelAnimationFrame(frame.current)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open, placement, offset, matchWidth, anchorRef, floatingRef])

  const style: CSSProperties = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, minWidth: matchWidth ? pos.width : undefined }
    : { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }
  return { style, side: pos?.side ?? 'bottom' }
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  )
}

/**
 * Ловушка фокуса для окон: Tab не уходит под подложку, при открытии фокус
 * переходит внутрь (элемент с data-autofocus или первый фокусируемый),
 * при закрытии возвращается на элемент-инициатор.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    const previous = document.activeElement as HTMLElement | null

    const initial =
      root.querySelector<HTMLElement>('[data-autofocus]') ??
      getFocusable(root).find((el) => !el.hasAttribute('data-dialog-close')) ??
      root
    // Фокус после кадра: содержимое окна могло ещё не отрисоваться.
    const raf = requestAnimationFrame(() => initial.focus({ preventScroll: true }))

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      // Вложенное окно ловит Tab само.
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) return
      const items = getFocusable(root)
      if (items.length === 0) {
        e.preventDefault()
        root.focus()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('keydown', onKey)
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [ref, active])
}

let scrollLocks = 0
let savedOverflow = ''
let savedPaddingRight = ''

/** Блокировка прокрутки страницы под окнами; счётчик для вложенных окон. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const body = document.body
    if (scrollLocks === 0) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      savedOverflow = body.style.overflow
      savedPaddingRight = body.style.paddingRight
      body.style.overflow = 'hidden'
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    }
    scrollLocks += 1
    return () => {
      scrollLocks -= 1
      if (scrollLocks === 0) {
        body.style.overflow = savedOverflow
        body.style.paddingRight = savedPaddingRight
      }
    }
  }, [active])
}

/**
 * Стек слоёв, закрываемых по Escape: закрывается только верхний.
 * Иначе Esc в выпадающем списке внутри модалки закрыл бы и модалку.
 * Слой с условием claims забирает Escape, только пока оно истинно (например,
 * правка блока - пока фокус внутри блока); иначе событие получает слой ниже.
 */
export interface EscapeLayer {
  id: number
  cb: () => void
  claims?: () => boolean
}

const escapeStack: EscapeLayer[] = []
let escapeSeq = 0
let escapeListening = false

/**
 * Верхний слой, который забирает Escape: сверху вниз, слои с ложным claims
 * пропускаются. undefined - Escape никому не нужен.
 */
export function topEscapeLayer(stack: readonly EscapeLayer[]): EscapeLayer | undefined {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const layer = stack[i]!
    if (!layer.claims || layer.claims()) return layer
  }
  return undefined
}

function onGlobalEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return
  const top = topEscapeLayer(escapeStack)
  if (!top) return
  e.preventDefault()
  e.stopPropagation()
  top.cb()
}

export interface EscapeLayerOptions {
  /** Забирать ли Escape сейчас (проверяется при нажатии); false - событие уходит слою ниже. */
  claims?: () => boolean
}

export function useEscapeLayer(active: boolean, onEscape: () => void, options?: EscapeLayerOptions): void {
  const cbRef = useRef(onEscape)
  const claimsRef = useRef(options?.claims)
  useIsoLayoutEffect(() => {
    cbRef.current = onEscape
    claimsRef.current = options?.claims
  })
  useEffect(() => {
    if (!active) return
    const id = ++escapeSeq
    escapeStack.push({
      id,
      cb: () => cbRef.current(),
      claims: () => claimsRef.current?.() ?? true,
    })
    if (!escapeListening) {
      document.addEventListener('keydown', onGlobalEscape, true)
      escapeListening = true
    }
    return () => {
      const i = escapeStack.findIndex((x) => x.id === id)
      if (i >= 0) escapeStack.splice(i, 1)
    }
  }, [active])
}
