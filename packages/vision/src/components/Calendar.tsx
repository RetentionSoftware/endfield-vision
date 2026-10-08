'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '../lib/cx'
import { useMounted } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import {
  addMonths,
  daysInMonth,
  mondayFirstDow,
  parseIso,
  toIso,
  todayIso,
  type DateRange,
} from '../lib/dates'

export interface CalendarProps {
  /** Выбранный день (одиночный выбор). */
  value?: string
  /** Выбранный период (выбор диапазона). */
  range?: Partial<DateRange> | null
  min?: string
  max?: string
  onPick: (iso: string) => void
  /** Перевести фокус в сетку при монтировании. */
  autoFocus?: boolean
  /** С какого месяца открыть, если значения нет. */
  initialMonth?: string
  className?: string
}

/** Календарь: дни -> месяцы -> годы, неделя с понедельника, управление с клавиатуры. */
export function Calendar({ value, range, min, max, onPick, autoFocus = false, initialMonth, className }: CalendarProps) {
  const t = useMessages()
  const { months: MONTHS, monthsShort: MONTHS_SHORT, weekdaysShort: WEEKDAYS_SHORT } = t.calendar
  const today = todayIso()
  // Отметка «сегодня» - после гидрации: дата сервера и браузера может различаться.
  const mounted = useMounted()
  const anchor = parseIso(value) ?? parseIso(range?.from) ?? parseIso(initialMonth) ?? parseIso(today)!
  const [viewY, setViewY] = useState(anchor.y)
  const [viewM, setViewM] = useState(anchor.m)
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  const [focused, setFocused] = useState(value || range?.from || today)
  const [hover, setHover] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (autoFocus) gridRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const allowed = (iso: string) => !(min && iso < min) && !(max && iso > max)

  const goTo = (iso: string) => {
    const p = parseIso(iso)
    if (!p) return
    setFocused(iso)
    setViewY(p.y)
    setViewM(p.m)
  }

  const moveDays = (delta: number) => {
    const p = parseIso(focused) ?? parseIso(today)!
    const dt = new Date(p.y, p.m, p.d + delta)
    goTo(toIso(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  }

  const moveMonths = (delta: number) => {
    const p = parseIso(focused) ?? parseIso(today)!
    const { y, m } = addMonths(p.y, p.m, delta)
    goTo(toIso(y, m, Math.min(p.d, daysInMonth(y, m))))
  }

  const onGridKey = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => moveDays(-1),
      ArrowRight: () => moveDays(1),
      ArrowUp: () => moveDays(-7),
      ArrowDown: () => moveDays(7),
      PageUp: () => moveMonths(e.shiftKey ? -12 : -1),
      PageDown: () => moveMonths(e.shiftKey ? 12 : 1),
      Home: () => {
        const p = parseIso(focused)!
        goTo(toIso(p.y, p.m, 1))
      },
      End: () => {
        const p = parseIso(focused)!
        goTo(toIso(p.y, p.m, daysInMonth(p.y, p.m)))
      },
      Enter: () => allowed(focused) && onPick(focused),
      ' ': () => allowed(focused) && onPick(focused),
    }
    const fn = map[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  const step = (delta: number) => {
    const { y, m } = addMonths(viewY, viewM, delta)
    setViewY(y)
    setViewM(m)
  }

  // Подсветка периода: при выборе второй границы - предпросмотр до курсора.
  const rangeFrom = range?.from
  const rangeTo = range?.to ?? (rangeFrom && hover && hover >= rangeFrom ? hover : undefined)
  const inRange = (iso: string) => Boolean(rangeFrom && rangeTo && iso > rangeFrom && iso < rangeTo)

  if (view === 'months') {
    const sel = parseIso(value ?? rangeFrom)
    const now = parseIso(today)!
    return (
      <div className={cx('ev-cal', className)}>
        <div className="ev-cal-head">
          <button type="button" className="ev-cal-nav" aria-label={t.calendar.prevYear} onClick={() => setViewY((y) => y - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="ev-cal-title" onClick={() => setView('years')}>
            {viewY}
          </button>
          <button type="button" className="ev-cal-nav" aria-label={t.calendar.nextYear} onClick={() => setViewY((y) => y + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="ev-cal-mgrid">
          {MONTHS_SHORT.map((label, i) => (
            <button
              key={label}
              type="button"
              className="ev-cal-mcell"
              data-selected={(sel && sel.y === viewY && sel.m === i) || undefined}
              data-current={(now.y === viewY && now.m === i) || undefined}
              onClick={() => {
                setViewM(i)
                setView('days')
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'years') {
    const start = viewY - (((viewY % 12) + 12) % 12)
    const selY = parseIso(value ?? rangeFrom)?.y
    const curY = parseIso(today)!.y
    return (
      <div className={cx('ev-cal', className)}>
        <div className="ev-cal-head">
          <button type="button" className="ev-cal-nav" aria-label={t.calendar.prevYears} onClick={() => setViewY((y) => y - 12)}>
            <ChevronLeft size={16} />
          </button>
          <span className="ev-cal-title" data-static="">
            {start} - {start + 11}
          </span>
          <button type="button" className="ev-cal-nav" aria-label={t.calendar.nextYears} onClick={() => setViewY((y) => y + 12)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="ev-cal-mgrid">
          {Array.from({ length: 12 }, (_, i) => start + i).map((y) => (
            <button
              key={y}
              type="button"
              className="ev-cal-mcell"
              data-selected={selY === y || undefined}
              data-current={curY === y || undefined}
              onClick={() => {
                setViewY(y)
                setView('months')
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const firstDow = mondayFirstDow(viewY, viewM)
  const total = daysInMonth(viewY, viewM)
  const prev = addMonths(viewY, viewM, -1)
  const prevTotal = daysInMonth(prev.y, prev.m)
  const next = addMonths(viewY, viewM, 1)
  const cells: Array<{ iso: string; d: number; outside: boolean }> = []
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ iso: toIso(prev.y, prev.m, prevTotal - i), d: prevTotal - i, outside: true })
  for (let d = 1; d <= total; d++) cells.push({ iso: toIso(viewY, viewM, d), d, outside: false })
  let nd = 1
  while (cells.length < 42) {
    cells.push({ iso: toIso(next.y, next.m, nd), d: nd, outside: true })
    nd += 1
  }

  return (
    <div className={cx('ev-cal', className)}>
      <div className="ev-cal-head">
        <button type="button" className="ev-cal-nav" aria-label={t.calendar.prevMonth} onClick={() => step(-1)}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="ev-cal-title" onClick={() => setView('months')}>
          {MONTHS[viewM]} {viewY}
        </button>
        <button type="button" className="ev-cal-nav" aria-label={t.calendar.nextMonth} onClick={() => step(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="ev-cal-weekdays" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w, i) => (
          <span key={w} data-weekend={i >= 5 || undefined}>
            {w}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        className="ev-cal-grid"
        role="grid"
        aria-label={`${MONTHS[viewM]} ${viewY}`}
        tabIndex={0}
        onKeyDown={onGridKey}
        onMouseLeave={() => setHover(null)}
      >
        {cells.map((c) => {
          const ok = allowed(c.iso)
          const isStart = rangeFrom === c.iso
          const isEnd = rangeTo === c.iso
          return (
            <button
              key={c.iso}
              type="button"
              role="gridcell"
              tabIndex={-1}
              className="ev-cal-cell"
              aria-selected={c.iso === value || isStart || isEnd || undefined}
              data-outside={c.outside || undefined}
              data-today={(mounted && c.iso === today) || undefined}
              data-focused={c.iso === focused || undefined}
              data-selected={c.iso === value || isStart || isEnd || undefined}
              data-in-range={inRange(c.iso) || undefined}
              data-range-start={(isStart && Boolean(rangeTo)) || undefined}
              data-range-end={(isEnd && Boolean(rangeFrom)) || undefined}
              disabled={!ok}
              onClick={() => ok && onPick(c.iso)}
              onMouseEnter={() => {
                if (!ok) return
                setFocused(c.iso)
                setHover(c.iso)
              }}
            >
              {c.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
