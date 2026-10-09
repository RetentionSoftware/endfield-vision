'use client'

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { addDaysIso, formatIsoDate, parseIso } from '../../lib/dates'
import { useMessages, useNumberFormat } from '../../lib/i18n'
import { useEntranceMotion } from '../../lib/motion'
import type { Tone } from '../Display'
import { HEAT_STAGGER, motionDelayStyle, motionRootProps } from './Charts'

/*
 * Тепловые карты: календарь активности (недели - колонки, дни недели с
 * понедельника - строки) и матрица «строка × колонка» (например, час × день).
 * Пять уровней интенсивности: 0 - пустая клетка, 1..4 - доли цвета тона
 * (по умолчанию - акцент). Доступность: role="grid", одна остановка Tab,
 * стрелки, Home/End (Ctrl - по всей сетке); у каждой клетки aria-label с датой
 * или заголовками и значением; подсказка - по наведению и фокусу.
 * На узком экране сетка прокручивается по горизонтали внутри своей обёртки.
 * Анимация появления (animate или MotionProvider): клетки проявляются
 * волной по колонкам слева направо, легенда и подписи видны сразу.
 */

/* ------------------------------------------------------------------ */
/* Чистые функции                                                      */
/* ------------------------------------------------------------------ */

/** Число уровней интенсивности (включая нулевой). */
export const HEAT_LEVELS = 5

/**
 * Уровень клетки 0..4: 0 - нет значения (0, отрицательное, не число),
 * 1..4 - четверти шкалы от 0 до max (любое положительное значение - не ниже 1).
 */
export function heatLevel(value: number, max: number): number {
  if (!(value > 0) || !(max > 0)) return 0
  return Math.min(HEAT_LEVELS - 1, Math.max(1, Math.ceil((value / max) * (HEAT_LEVELS - 1))))
}

/** День недели даты 'YYYY-MM-DD': Пн = 0 ... Вс = 6; -1, если дата не разбирается. */
export function isoWeekday(iso: string): number {
  const p = parseIso(iso)
  return p ? (new Date(p.y, p.m, p.d).getDay() + 6) % 7 : -1
}

export interface CalendarRange {
  from: string
  to: string
}

/**
 * Период календаря. Конец - явный to или последняя дата в данных (никогда не
 * «сегодня»: серверный и клиентский рендер совпадают). Начало - явный from или
 * понедельник недели, отстоящей от недели конца на weeks - 1. Null - конец
 * неизвестен или даты не разбираются.
 */
export function resolveCalendarRange(opts: { from?: string; to?: string; weeks?: number; dates?: readonly string[] }): CalendarRange | null {
  let to = opts.to
  if (!to && opts.dates) for (const d of opts.dates) if (parseIso(d) && (!to || d > to)) to = d
  if (!to || !parseIso(to)) return null
  if (opts.from) return parseIso(opts.from) && opts.from <= to ? { from: opts.from, to } : null
  const weeks = Math.max(1, Math.floor(opts.weeks ?? 26))
  const monday = addDaysIso(to, -isoWeekday(to))
  return { from: addDaysIso(monday, -(weeks - 1) * 7), to }
}

export interface CalendarMonthLabel {
  /** Индекс колонки-недели. */
  column: number
  /** Месяц с 0. */
  month: number
  year: number
}

export interface CalendarGrid {
  /** Колонки-недели по 7 дней с понедельника; null - день вне периода. */
  weeks: Array<Array<string | null>>
  /** Подписи месяцев над колонками: у первой недели, где месяц сменился. */
  months: CalendarMonthLabel[]
}

/**
 * Сетка календаря: первая колонка начинается с понедельника недели from,
 * последняя - неделя to. Подпись месяца ставится над колонкой, первый день
 * периода в которой относится к новому месяцу; подпись первой колонки
 * убирается, если до следующей меньше трёх колонок (не налезают друг на друга).
 */
export function buildCalendarGrid(range: CalendarRange): CalendarGrid {
  const start = addDaysIso(range.from, -isoWeekday(range.from))
  const weeks: Array<Array<string | null>> = []
  // Защита от бесконечного цикла на неверном периоде: не больше 10 лет.
  for (let w = 0; w < 530; w++) {
    const monday = addDaysIso(start, w * 7)
    if (monday > range.to) break
    weeks.push(
      Array.from({ length: 7 }, (_, d) => {
        const iso = addDaysIso(monday, d)
        return iso >= range.from && iso <= range.to ? iso : null
      }),
    )
  }
  const months: CalendarMonthLabel[] = []
  let prev = ''
  weeks.forEach((days, column) => {
    const first = days.find((d): d is string => d !== null)
    const p = parseIso(first)
    if (!p) return
    const key = `${p.y}-${p.m}`
    if (key !== prev) months.push({ column, month: p.m, year: p.y })
    prev = key
  })
  if (months.length > 1 && months[0]!.column === 0 && months[1]!.column < 3) months.shift()
  return { weeks, months }
}

/* ------------------------------------------------------------------ */
/* Общая сетка                                                         */
/* ------------------------------------------------------------------ */

interface HeatCell {
  key: string
  level: number
  /** Заголовок подсказки и начало aria-label: дата или «строка, колонка». */
  title: string
  valueText: string
}

interface HeatRow {
  key: string
  header: string
  /** Подпись строки видна только скринридеру (у календаря подписаны Пн, Ср, Пт). */
  quiet?: boolean
  cells: Array<HeatCell | null>
}

interface Pos {
  r: number
  c: number
}

interface TipState extends Pos {
  left: number
  top: number
  below: boolean
  flip: boolean
}

function findCell(rows: HeatRow[], from: Pos, dr: number, dc: number): Pos | null {
  let { r, c } = from
  for (;;) {
    r += dr
    c += dc
    const row = rows[r]
    if (!row || c < 0 || c >= row.cells.length) return null
    if (row.cells[c]) return { r, c }
  }
}

function lastCell(rows: HeatRow[]): Pos | null {
  for (let c = (rows[0]?.cells.length ?? 0) - 1; c >= 0; c--) {
    for (let r = rows.length - 1; r >= 0; r--) if (rows[r]!.cells[c]) return { r, c }
  }
  return null
}

function firstCell(rows: HeatRow[]): Pos | null {
  for (let c = 0; c < (rows[0]?.cells.length ?? 0); c++) {
    for (let r = 0; r < rows.length; r++) if (rows[r]!.cells[c]) return { r, c }
  }
  return null
}

function HeatLegend() {
  const t = useMessages()
  return (
    <div className="ev-heatmap-legend">
      <span>{t.heatmap.less}</span>
      {Array.from({ length: HEAT_LEVELS }, (_, l) => (
        <span key={l} className="ev-heatmap-swatch" data-level={l} aria-hidden="true" />
      ))}
      <span>{t.heatmap.more}</span>
    </div>
  )
}

function HeatGrid({
  rows,
  head,
  initial,
  ariaLabel,
  kind,
  style,
  scrollToEnd,
  animate,
  animationDuration,
}: {
  rows: HeatRow[]
  head: ReactNode
  initial: Pos | null
  ariaLabel: string
  kind: 'calendar' | 'matrix'
  style: CSSProperties
  scrollToEnd: boolean
  animate?: boolean
  animationDuration?: number
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const motion = useEntranceMotion(frameRef, animate, { duration: animationDuration })
  const cols = rows[0]?.cells.length ?? 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLElement>())
  const [focusRaw, setFocus] = useState<Pos | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)
  const focus = focusRaw && rows[focusRaw.r]?.cells[focusRaw.c] ? focusRaw : initial

  useEffect(() => {
    // Свежие данные - справа: на узком экране прокручиваем к концу периода.
    const el = scrollRef.current
    if (scrollToEnd && el) el.scrollLeft = el.scrollWidth
  }, [scrollToEnd])

  const showTip = (pos: Pos, el: HTMLElement) => {
    const frame = frameRef.current
    if (!frame) return
    const fr = frame.getBoundingClientRect()
    const cr = el.getBoundingClientRect()
    const below = pos.r < Math.ceil(rows.length / 2)
    const center = cr.left - fr.left + cr.width / 2
    const flip = center > fr.width * 0.6
    setTip({
      ...pos,
      left: flip ? fr.width - center : center,
      top: below ? cr.bottom - fr.top + 6 : cr.top - fr.top - 6,
      below,
      flip,
    })
  }

  const move = (pos: Pos | null) => {
    if (!pos) return
    setFocus(pos)
    cellRefs.current.get(`${pos.r}:${pos.c}`)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!focus) return
    const row = rows[focus.r]
    let next: Pos | null | undefined
    if (e.key === 'ArrowRight') next = findCell(rows, focus, 0, 1)
    else if (e.key === 'ArrowLeft') next = findCell(rows, focus, 0, -1)
    else if (e.key === 'ArrowDown') next = findCell(rows, focus, 1, 0)
    else if (e.key === 'ArrowUp') next = findCell(rows, focus, -1, 0)
    else if (e.key === 'Home') next = e.ctrlKey ? firstCell(rows) : row ? findCell(rows, { r: focus.r, c: -1 }, 0, 1) : null
    else if (e.key === 'End') next = e.ctrlKey ? lastCell(rows) : row ? findCell(rows, { r: focus.r, c: row.cells.length }, 0, -1) : null
    else if (e.key === 'Escape') {
      setTip(null)
      return
    } else return
    e.preventDefault()
    move(next ?? null)
  }

  const onPointerOver = (e: PointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]')
    const [r, c] = (el?.dataset.pos ?? '').split(':').map(Number)
    if (el && r !== undefined && c !== undefined && Number.isFinite(r) && Number.isFinite(c)) showTip({ r, c }, el)
    else setTip(null)
  }

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTip(null)
  }

  const tipCell = tip ? rows[tip.r]?.cells[tip.c] : null

  return (
    <div ref={frameRef} className="ev-heatmap-frame" {...motionRootProps(motion, cols, HEAT_STAGGER)}>
      <div ref={scrollRef} className="ev-heatmap-scroll">
        <div
          role="grid"
          aria-label={ariaLabel}
          aria-readonly="true"
          className="ev-heatmap-grid"
          data-kind={kind}
          style={style}
          onKeyDown={onKeyDown}
          onPointerOver={onPointerOver}
          onPointerLeave={() => setTip(null)}
          onBlur={onBlur}
        >
          {head}
          {rows.map((row, r) => (
            <div key={row.key} role="row" className="ev-heatmap-row">
              <div role="rowheader" className="ev-heatmap-rowhead" data-quiet={row.quiet || undefined}>
                {row.header}
              </div>
              {row.cells.map((cell, c) =>
                cell ? (
                  <div
                    key={cell.key}
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${r}:${c}`, el)
                      else cellRefs.current.delete(`${r}:${c}`)
                    }}
                    role="gridcell"
                    className="ev-heatmap-cell"
                    data-level={cell.level}
                    data-pos={`${r}:${c}`}
                    aria-label={`${cell.title}: ${cell.valueText}`}
                    tabIndex={focus && focus.r === r && focus.c === c ? 0 : -1}
                    style={motionDelayStyle(motion, c, cols, HEAT_STAGGER)}
                    onFocus={(e) => {
                      setFocus({ r, c })
                      showTip({ r, c }, e.currentTarget)
                    }}
                  />
                ) : (
                  <div key={`x${c}`} role="gridcell" className="ev-heatmap-cell" data-void="" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      {tip && tipCell ? (
        <div
          className="ev-chart-tooltip ev-heatmap-tooltip"
          role="status"
          data-below={tip.below || undefined}
          style={{ left: tip.flip ? undefined : tip.left - 16, right: tip.flip ? tip.left - 16 : undefined, top: tip.top }}
        >
          <div className="ev-chart-tooltip-title ev-num">{tipCell.title}</div>
          <div className="ev-chart-tooltip-row">
            <span className="ev-heatmap-swatch" data-level={tipCell.level} aria-hidden="true" />
            <span className="ev-chart-tooltip-value ev-num">{tipCell.valueText}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Календарь активности                                                */
/* ------------------------------------------------------------------ */

export interface HeatmapDay {
  /** 'YYYY-MM-DD'. */
  date: string
  value: number
}

interface HeatmapCommonProps {
  /** Цвет шкалы (по умолчанию - акцент). */
  tone?: Tone
  /** Значение верхнего уровня шкалы (по умолчанию - максимум данных). */
  max?: number
  /** Формат значения в подсказке и aria-label. */
  format?: (v: number) => string
  /** Легенда «Меньше - Больше» под сеткой. */
  showLegend?: boolean
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  'aria-label': string
  /** Текст, когда строить нечего. */
  emptyText?: ReactNode
  className?: string
}

export interface HeatmapProps extends HeatmapCommonProps {
  days: HeatmapDay[]
  /** Начало периода 'YYYY-MM-DD' (по умолчанию - weeks недель до конца). */
  from?: string
  /** Конец периода 'YYYY-MM-DD' (по умолчанию - последняя дата в days). */
  to?: string
  /** Число недель, если from не задан. */
  weeks?: number
  /** Минимальный размер клетки, px (клетка растёт до 1,5 раза по ширине контейнера). */
  cellSize?: number
}

export function Heatmap({
  days,
  from,
  to,
  weeks = 26,
  cellSize = 12,
  tone = 'accent',
  max,
  format: formatProp,
  showLegend = true,
  emptyText,
  animate,
  animationDuration,
  className,
  'aria-label': ariaLabel,
}: HeatmapProps) {
  const t = useMessages()
  const fmt = useNumberFormat()
  const format = formatProp ?? ((v: number) => fmt(v))

  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of days) if (Number.isFinite(d.value)) m.set(d.date, (m.get(d.date) ?? 0) + d.value)
    return m
  }, [days])
  const range = resolveCalendarRange({ from, to, weeks, dates: days.map((d) => d.date) })
  const rangeFrom = range?.from
  const rangeTo = range?.to
  const grid = useMemo(() => (rangeFrom && rangeTo ? buildCalendarGrid({ from: rangeFrom, to: rangeTo }) : null), [rangeFrom, rangeTo])

  if (!range || !grid || grid.weeks.length === 0) {
    return (
      <div className={cx('ev-heatmap', className)} data-tone={tone}>
        <div className="ev-chart-empty ev-heatmap-empty" role="img" aria-label={ariaLabel}>
          {emptyText ?? t.charts.empty}
        </div>
      </div>
    )
  }

  let top = 0
  for (const [date, v] of byDate) if (date >= range.from && date <= range.to) top = Math.max(top, v)
  const scaleMax = max ?? top

  const rows: HeatRow[] = Array.from({ length: 7 }, (_, d) => ({
    key: `d${d}`,
    header: t.calendar.weekdaysShort[d] ?? '',
    quiet: d % 2 === 1 || d === 6,
    cells: grid.weeks.map((week) => {
      const iso = week[d]
      if (!iso) return null
      const v = byDate.get(iso) ?? 0
      return { key: iso, level: heatLevel(v, scaleMax), title: formatIsoDate(iso), valueText: format(v) }
    }),
  }))

  const style = {
    '--ev-heat-cols': grid.weeks.length,
    '--ev-heat-cell': `${cellSize}px`,
  } as CSSProperties

  const head = (
    <div className="ev-heatmap-row ev-heatmap-months" aria-hidden="true">
      <span />
      {grid.months.map((m) => (
        <span key={`${m.year}-${m.month}`} className="ev-heatmap-month" style={{ gridColumn: m.column + 2 }}>
          {t.calendar.monthsShort[m.month]}
        </span>
      ))}
    </div>
  )

  return (
    <div className={cx('ev-heatmap', className)} data-tone={tone}>
      <HeatGrid
        rows={rows}
        head={head}
        initial={lastCell(rows)}
        ariaLabel={ariaLabel}
        kind="calendar"
        style={style}
        scrollToEnd
        animate={animate}
        animationDuration={animationDuration}
      />
      {showLegend ? <HeatLegend /> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Матрица                                                             */
/* ------------------------------------------------------------------ */

export interface HeatmapMatrixProps extends HeatmapCommonProps {
  /** Подписи строк (например, дни недели). */
  rows: string[]
  /** Подписи колонок (например, часы). */
  columns: string[]
  /** Значения: values[строка][колонка]; пропуск - 0. */
  values: number[][]
  /** Видимая подпись у каждой N-й колонки (остальные - только для скринридера). */
  columnLabelStep?: number
  /** Высота клетки, px; ширина - по контейнеру, не меньше cellMinWidth. */
  cellHeight?: number
  cellMinWidth?: number
}

export function HeatmapMatrix({
  rows: rowLabels,
  columns,
  values,
  columnLabelStep = 1,
  cellHeight = 24,
  cellMinWidth = 16,
  tone = 'accent',
  max,
  format: formatProp,
  showLegend = true,
  emptyText,
  animate,
  animationDuration,
  className,
  'aria-label': ariaLabel,
}: HeatmapMatrixProps) {
  const t = useMessages()
  const fmt = useNumberFormat()
  const format = formatProp ?? ((v: number) => fmt(v))
  const headId = useId()

  if (rowLabels.length === 0 || columns.length === 0) {
    return (
      <div className={cx('ev-heatmap', className)} data-tone={tone}>
        <div className="ev-chart-empty ev-heatmap-empty" role="img" aria-label={ariaLabel}>
          {emptyText ?? t.charts.empty}
        </div>
      </div>
    )
  }

  const valueAt = (r: number, c: number) => {
    const v = values[r]?.[c]
    return v !== undefined && Number.isFinite(v) ? v : 0
  }
  let top = 0
  rowLabels.forEach((_, r) => columns.forEach((__, c) => (top = Math.max(top, valueAt(r, c)))))
  const scaleMax = max ?? top
  const step = Math.max(1, Math.floor(columnLabelStep))

  const rows: HeatRow[] = rowLabels.map((label, r) => ({
    key: `r${r}`,
    header: label,
    cells: columns.map((col, c) => {
      const v = valueAt(r, c)
      return { key: `c${c}`, level: heatLevel(v, scaleMax), title: `${label}, ${col}`, valueText: format(v) }
    }),
  }))

  const head = (
    <div role="row" className="ev-heatmap-row ev-heatmap-colheads">
      <div role="columnheader" className="ev-heatmap-corner" />
      {columns.map((col, c) => (
        <div key={`${headId}${c}`} role="columnheader" className="ev-heatmap-colhead" data-quiet={c % step !== 0 || undefined}>
          {col}
        </div>
      ))}
    </div>
  )

  const style = {
    '--ev-heat-cols': columns.length,
    '--ev-heat-cell': `${cellMinWidth}px`,
    '--ev-heat-row': `${cellHeight}px`,
  } as CSSProperties

  return (
    <div className={cx('ev-heatmap', className)} data-tone={tone}>
      <HeatGrid
        rows={rows}
        head={head}
        initial={firstCell(rows)}
        ariaLabel={ariaLabel}
        kind="matrix"
        style={style}
        scrollToEnd={false}
        animate={animate}
        animationDuration={animationDuration}
      />
      {showLegend ? <HeatLegend /> : null}
    </div>
  )
}
