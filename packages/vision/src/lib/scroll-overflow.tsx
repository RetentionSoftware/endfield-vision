'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

/*
 * Горизонтальная лента с прокруткой (Tabs, SegmentedControl): не влезшие
 * элементы не должны выглядеть обрезанными. Край, за которым есть элементы,
 * затухает (маска на .ev-scroll-track, ширина - --ev-fade-edge), поверх него -
 * стрелка: она докручивает до следующего скрытого элемента. Выбранный элемент
 * прокручивается из-под затухания в видимую часть.
 */

export interface ScrollOverflow {
  start: boolean
  end: boolean
}

const NO_OVERFLOW: ScrollOverflow = { start: false, end: false }

/** Меньше этого элемент считается видимым: стрелка ведёт к следующему, а не докручивает пару пикселей. */
const SLACK = 8

/** Есть ли скрытые элементы слева и справа. Пересчёт при прокрутке и смене размеров; на сервере - нет. */
export function useScrollOverflow(ref: { current: HTMLElement | null }, count: number): ScrollOverflow {
  const [overflow, setOverflow] = useState<ScrollOverflow>(NO_OVERFLOW)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft > 1
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setOverflow((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    for (const child of Array.from(el.children)) ro?.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [ref, count])
  return overflow
}

/** Ширина затухающего края ленты, px. */
function fadeEdge(track: HTMLElement): number {
  const v = parseFloat(getComputedStyle(track).getPropertyValue('--ev-fade-edge'))
  return Number.isFinite(v) ? v : 40
}

function scrollTrack(track: HTMLElement, delta: number) {
  if (Math.abs(delta) < 1) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  track.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' })
}

/** Элемент ленты - целиком в видимой части, не под затуханием. Прокручивается только лента, не страница. */
export function revealInTrack(track: HTMLElement, item: HTMLElement): void {
  if (track.scrollWidth <= track.clientWidth) return
  const edge = fadeEdge(track)
  const r = track.getBoundingClientRect()
  const i = item.getBoundingClientRect()
  if (i.left < r.left + edge) track.scrollLeft -= r.left + edge - i.left
  else if (i.right > r.right - edge) track.scrollLeft += i.right - (r.right - edge)
}

interface Span {
  left: number
  right: number
}

/**
 * Сдвиг ленты для стрелки: до следующего элемента, скрытого за краем в
 * сторону dir (он встаёт целиком, не под затуханием). Почти видимый элемент
 * (меньше SLACK) пропускается. Элементов нет - на половину ширины.
 */
export function nextItemDelta(track: Span, items: readonly Span[], edge: number, dir: 1 | -1): number {
  const width = track.right - track.left
  if (dir > 0) {
    const limit = track.right - edge
    const next = items.find((i) => i.right > limit + SLACK)
    return next ? next.right - limit : width / 2
  }
  const limit = track.left + edge
  const prev = [...items].reverse().find((i) => i.left < limit - SLACK)
  return prev ? prev.left - limit : -width / 2
}

/** Стрелка: докрутить до следующего скрытого элемента в сторону dir. */
export function scrollToNextItem(track: HTMLElement, dir: 1 | -1): void {
  const items = Array.from(track.children).map((c) => c.getBoundingClientRect())
  scrollTrack(track, nextItemDelta(track.getBoundingClientRect(), items, fadeEdge(track), dir))
}

/**
 * Стрелки над затухающими краями. Только для мыши: с клавиатуры элементы
 * перебираются стрелками, выбранный сам прокручивается в вид.
 */
export function ScrollArrows({
  overflow,
  track,
  size = 16,
}: {
  overflow: ScrollOverflow
  track: { current: HTMLElement | null }
  size?: number
}) {
  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      className="ev-scroll-arrow"
      data-dir={dir < 0 ? 'start' : 'end'}
      tabIndex={-1}
      aria-hidden="true"
      // Фокус остаётся на выбранном элементе ленты.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => track.current && scrollToNextItem(track.current, dir)}
    >
      {dir < 0 ? <ChevronLeft size={size} /> : <ChevronRight size={size} />}
    </button>
  )
  return (
    <>
      {overflow.start ? arrow(-1) : null}
      {overflow.end ? arrow(1) : null}
    </>
  )
}
