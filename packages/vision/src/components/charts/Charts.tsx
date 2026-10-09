'use client'

import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { useElementWidth } from '../../lib/hooks'
import { useMessages } from '../../lib/i18n'
import { useEntranceMotion, type EntranceMotion } from '../../lib/motion'

/*
 * Лёгкие SVG-графики без библиотек. Правила оформления:
 * - цвета серий - токены --ev-chart-1..8 в фиксированном порядке (палитра
 *   проверена на различимость при нарушениях цветовосприятия);
 * - столбец не толще 24px, скругление 4px только на конце данных,
 *   основание прямое; линия 2px; маркер r=4 с кольцом цвета поверхности;
 *   заливка области - 10% цвета серии; сетка - волосяная, сплошная;
 * - одна ось Y; подписи и значения - цветом текста, не цветом серии;
 * - подсказка по наведению и с клавиатуры (стрелки), легенда при 2+ сериях,
 *   скрытая таблица с данными для скринридера.
 *
 * Анимация появления (проп animate или MotionProvider): столбцы растут от
 * основания волной слева направо, линии прорисовываются слева направо, заливка
 * открывается вслед за линией, маркеры появляются в конце. Оси и сетка видны
 * сразу. Анимация - CSS по data-ev-motion на корне, один раз при появлении.
 */

export interface ChartSeries<D> {
  key: string
  label: string
  value: (d: D) => number
  /** CSS-цвет; по умолчанию var(--ev-chart-N) по порядку серии. */
  color?: string
}

interface BaseChartProps<D> {
  data: D[]
  /** Подпись точки на оси X и в подсказке. */
  x: (d: D) => string
  /** Заголовок подсказки (по умолчанию - подпись X). */
  tooltipTitle?: (d: D) => string
  series: ChartSeries<D>[]
  height?: number
  /** Формат значений на оси и в подсказке. */
  format?: (v: number) => string
  /** Короткий формат для оси (по умолчанию - format). */
  formatAxis?: (v: number) => string
  /**
   * Целочисленная шкала (счётчики): деления оси Y - только целые. По
   * умолчанию - если все значения серий целые.
   */
  integer?: boolean
  'aria-label': string
  /** Текст при пустых данных. */
  emptyText?: ReactNode
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  className?: string
}

/* ------------------------------------------------------------------ */
/* Анимация появления                                                  */
/* ------------------------------------------------------------------ */

/** Доля длительности на волну столбцов: последний стартует на 40%. */
export const BAR_STAGGER = 0.4
/** Сдвиг между сериями линий. */
export const LINE_STAGGER = 0.2
/** Волна клеток тепловой карты по колонкам. */
export const HEAT_STAGGER = 0.5

/**
 * Задержка элемента index из count в волне, мс: от 0 у первого до
 * duration * spread у последнего. Вместе с staggerItemDuration вся волна
 * укладывается в duration.
 */
export function staggerDelay(index: number, count: number, duration: number, spread: number): number {
  if (count <= 1 || !(duration > 0)) return 0
  const i = Math.min(Math.max(index, 0), count - 1)
  return Math.round((duration * Math.min(Math.max(spread, 0), 1) * i) / (count - 1))
}

/** Длительность одного элемента волны, мс: остаток после последней задержки. */
export function staggerItemDuration(count: number, duration: number, spread: number): number {
  const d = Math.max(0, duration)
  return Math.round(count <= 1 ? d : d * (1 - Math.min(Math.max(spread, 0), 1)))
}

/**
 * Атрибут и CSS-переменные корня для анимации появления; на 'static' -
 * ничего (разметка как без анимации).
 */
export function motionRootProps(motion: EntranceMotion, count: number, spread: number): { 'data-ev-motion'?: string; style?: CSSProperties } {
  if (!motion.attr) return {}
  return {
    'data-ev-motion': motion.attr,
    style: {
      '--ev-motion-dur': `${Math.round(motion.duration)}ms`,
      '--ev-motion-item': `${staggerItemDuration(count, motion.duration, spread)}ms`,
    } as CSSProperties,
  }
}

/** Задержка элемента волны (CSS-переменная); без анимации - undefined. */
export function motionDelayStyle(motion: EntranceMotion, index: number, count: number, spread: number): CSSProperties | undefined {
  if (!motion.attr) return undefined
  return { '--ev-motion-delay': `${staggerDelay(index, count, motion.duration, spread)}ms` } as CSSProperties
}

const PAD_TOP = 12
const PAD_RIGHT = 12
const AXIS_H = 24
/** Формат значений по умолчанию: число по правилам текущего языка. */
function useDefaultFormat(format: ((v: number) => string) | undefined): (v: number) => string {
  const { intl } = useMessages()
  return useMemo(() => format ?? ((v: number) => v.toLocaleString(intl)), [format, intl])
}

function seriesColor<D>(s: ChartSeries<D>, i: number): string {
  return s.color ?? `var(--ev-chart-${(i % 8) + 1})`
}

/** «Красивая» шкала: максимум и шаг кратны 1, 2, 2.5 или 5 степени десяти. */
export function niceScale(maxValue: number, ticks = 4, integer = false): { max: number; step: number } {
  if (integer) return integerScale(maxValue, ticks)
  if (!(maxValue > 0)) return { max: 1, step: 0.25 }
  const raw = maxValue / ticks
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow)
  const step = candidates.find((c) => c * ticks >= maxValue) ?? candidates[candidates.length - 1]!
  return { max: step * ticks, step }
}

/**
 * Шкала целых значений (счётчики): шаг - целое 1, 2, 5, 10, 20, 25, 50...,
 * без делений вроде 0.25; интервалов - не больше ticks + 1, максимум -
 * ближайшее сверху кратное шагу (у 3 подписок ось 0..3, а не 0..4).
 */
function integerScale(maxValue: number, ticks: number): { max: number; step: number } {
  const target = Math.ceil(maxValue)
  if (!(target > 0)) return { max: 1, step: 1 }
  const limit = Math.max(1, ticks) + 1
  for (let pow = 1; pow <= Number.MAX_SAFE_INTEGER; pow *= 10) {
    const multipliers = pow === 1 ? [1, 2, 5] : [1, 2, 2.5, 5]
    for (const m of multipliers) {
      const step = m * pow
      const intervals = Math.ceil(target / step)
      if (intervals <= limit) return { max: intervals * step, step }
    }
  }
  return { max: target, step: target }
}

/** Деления оси Y: от 0 до max с шагом step. */
export function scaleTicks(scale: { max: number; step: number }): number[] {
  return Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step)
}

/** Все значения всех серий - целые числа (тогда шкала целочисленная). */
export function allIntegerValues<D>(data: readonly D[], series: readonly Pick<ChartSeries<D>, 'value'>[]): boolean {
  for (const d of data) for (const s of series) if (!Number.isInteger(s.value(d))) return false
  return true
}

function estimateTextWidth(s: string): number {
  return s.length * 6.6 + 4
}

function pickTickIndexes(n: number, width: number, minGap = 64): number[] {
  if (n === 0) return []
  const maxLabels = Math.max(2, Math.floor(width / minGap))
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i)
  const step = Math.ceil((n - 1) / (maxLabels - 1))
  const out: number[] = []
  for (let i = 0; i < n; i += step) out.push(i)
  if (out[out.length - 1] !== n - 1) {
    // Последняя подпись важнее предпоследней: заменяем её, иначе они слипаются
    // (у линейного графика крайняя подпись прижата вправо и заходит на соседнюю).
    if (out.length > 1) out.pop()
    out.push(n - 1)
  }
  return out
}

/** Столбик: скругление 4px на конце данных, прямое основание. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

interface TooltipState {
  index: number
  left: number
  top: number
}

function ChartTooltip<D>({
  state,
  data,
  series,
  title,
  format,
  containerWidth,
}: {
  state: TooltipState
  data: D[]
  series: ChartSeries<D>[]
  title: (d: D) => string
  format: (v: number) => string
  containerWidth: number
}) {
  const d = data[state.index]
  if (!d) return null
  const flip = state.left > containerWidth * 0.6
  return (
    <div
      className="ev-chart-tooltip"
      role="status"
      style={{
        left: flip ? undefined : state.left + 12,
        right: flip ? containerWidth - state.left + 12 : undefined,
        top: state.top,
      }}
    >
      <div className="ev-chart-tooltip-title">{title(d)}</div>
      {series.map((s, i) => (
        <div key={s.key} className="ev-chart-tooltip-row">
          <span className="ev-chart-key-line" style={{ background: seriesColor(s, i) }} aria-hidden="true" />
          <span className="ev-chart-tooltip-value ev-num">{format(s.value(d))}</span>
          <span className="ev-chart-tooltip-label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function Legend<D>({ series, kind }: { series: ChartSeries<D>[]; kind: 'bar' | 'line' }) {
  if (series.length < 2) return null
  return (
    <div className="ev-chart-legend">
      {series.map((s, i) => (
        <span key={s.key} className="ev-chart-legend-item">
          <span
            className={kind === 'bar' ? 'ev-chart-key-box' : 'ev-chart-key-line'}
            style={{ background: seriesColor(s, i) }}
            aria-hidden="true"
          />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function DataTableSr<D>({ data, series, x, format, label }: { data: D[]; series: ChartSeries<D>[]; x: (d: D) => string; format: (v: number) => string; label: string }) {
  // Скрыта обёртка, а не сама таблица: таблица не сжимается до 1px, и длинный
  // ряд выходил за каркас страницы (пустая тёмная полоса внизу при прокрутке).
  const t = useMessages()
  return (
    <div className="ev-visually-hidden">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{t.charts.period}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{x(d)}</th>
              {series.map((s) => (
                <td key={s.key}>{format(s.value(d))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useChartFrame(height: number) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const width = useElementWidth(wrapRef)
  const [tip, setTip] = useState<TooltipState | null>(null)
  return { wrapRef, width, tip, setTip, height }
}

export interface BarChartProps<D> extends BaseChartProps<D> {
  /** Серии друг на друге (по умолчанию - рядом). */
  stacked?: boolean
}

export function BarChart<D>({
  data,
  x,
  tooltipTitle,
  series,
  height = 240,
  format: formatProp,
  formatAxis,
  integer,
  stacked = false,
  emptyText: emptyTextProp,
  animate,
  animationDuration,
  className,
  ...aria
}: BarChartProps<D>) {
  const t = useMessages()
  const format = useDefaultFormat(formatProp)
  const emptyText = emptyTextProp ?? t.charts.empty
  const { wrapRef, width, tip, setTip } = useChartFrame(height)
  const motion = useEntranceMotion(wrapRef, animate, { duration: animationDuration })
  const titleId = useId()
  const axisFmt = formatAxis ?? format

  const maxValue = useMemo(() => {
    let m = 0
    for (const d of data) {
      if (stacked) m = Math.max(m, series.reduce((acc, s) => acc + Math.max(0, s.value(d)), 0))
      else for (const s of series) m = Math.max(m, s.value(d))
    }
    return m
  }, [data, series, stacked])
  const integerAxis = useMemo(() => integer ?? allIntegerValues(data, series), [integer, data, series])
  const scale = niceScale(maxValue, 4, integerAxis)
  const ticks = scaleTicks(scale)
  const padLeft = Math.max(28, ...ticks.map((t) => estimateTextWidth(axisFmt(t)))) + 6
  const innerW = Math.max(0, width - padLeft - PAD_RIGHT)
  const innerH = Math.max(0, height - PAD_TOP - AXIS_H)
  const n = data.length
  const band = n > 0 ? innerW / n : 0
  const groups = stacked ? 1 : series.length
  const barW = Math.max(2, Math.min(24, (band * 0.72 - (groups - 1) * 2) / groups))
  const groupW = barW * groups + (groups - 1) * 2
  const yOf = (v: number) => PAD_TOP + innerH - (v / scale.max) * innerH
  const tickIdx = pickTickIndexes(n, innerW)

  const moveTip = (i: number) => {
    const cx = padLeft + band * i + band / 2
    setTip({ index: i, left: cx, top: PAD_TOP })
  }

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left - padLeft
    const i = Math.floor(px / band)
    if (i >= 0 && i < n) moveTip(i)
    else setTip(null)
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (n === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const cur = tip?.index ?? (e.key === 'ArrowRight' ? -1 : n)
      moveTip(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))))
    } else if (e.key === 'Escape') setTip(null)
  }

  return (
    <div className={cx('ev-chart', className)} {...motionRootProps(motion, n, BAR_STAGGER)}>
      <div ref={wrapRef} className="ev-chart-frame" style={{ height }}>
        {n === 0 || maxValue === 0 ? (
          <div className="ev-chart-empty">{emptyText}</div>
        ) : width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-labelledby={titleId}
            tabIndex={0}
            className="ev-chart-svg"
            onPointerMove={onPointer}
            onPointerLeave={() => setTip(null)}
            onKeyDown={onKey}
            onBlur={() => setTip(null)}
          >
            <title id={titleId}>{aria['aria-label']}</title>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padLeft} x2={width - PAD_RIGHT} y1={yOf(t)} y2={yOf(t)} className={t === 0 ? 'ev-chart-axis' : 'ev-chart-grid'} />
                <text x={padLeft - 8} y={yOf(t)} dy="0.32em" textAnchor="end" className="ev-chart-tick">
                  {axisFmt(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const gx = padLeft + band * i + (band - groupW) / 2
              const dim = tip !== null && tip.index !== i
              if (stacked) {
                let acc = 0
                const segs = series.map((s, si) => {
                  const v = Math.max(0, s.value(d))
                  const y0 = yOf(acc)
                  acc += v
                  const y1 = yOf(acc)
                  const top = si === series.length - 1 || series.slice(si + 1).every((t) => t.value(d) <= 0)
                  // Зазор 2px цветом поверхности между сегментами.
                  const h = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0))
                  return v > 0 ? (
                    <path key={s.key} d={top ? barPath(gx, y1, barW, h) : `M${gx},${y1}h${barW}v${h}h${-barW}Z`} fill={seriesColor(s, si)} />
                  ) : null
                })
                return (
                  <g key={i} opacity={dim ? 0.55 : 1} className="ev-chart-bar" style={motionDelayStyle(motion, i, n, BAR_STAGGER)}>
                    {segs}
                  </g>
                )
              }
              return (
                <g key={i} opacity={dim ? 0.55 : 1} className="ev-chart-bar" style={motionDelayStyle(motion, i, n, BAR_STAGGER)}>
                  {series.map((s, si) => {
                    const v = Math.max(0, s.value(d))
                    const y = yOf(v)
                    return <path key={s.key} d={barPath(gx + si * (barW + 2), y, barW, PAD_TOP + innerH - y)} fill={seriesColor(s, si)} />
                  })}
                </g>
              )
            })}
            {tickIdx.map((i) => {
              const d = data[i]!
              return (
                <text key={i} x={padLeft + band * i + band / 2} y={height - 6} textAnchor="middle" className="ev-chart-tick">
                  {x(d)}
                </text>
              )
            })}
          </svg>
        ) : null}
        {tip ? (
          <ChartTooltip state={tip} data={data} series={series} title={tooltipTitle ?? x} format={format} containerWidth={width} />
        ) : null}
      </div>
      <Legend series={series} kind="bar" />
      <DataTableSr data={data} series={series} x={tooltipTitle ?? x} format={format} label={aria['aria-label']} />
    </div>
  )
}

export interface LineChartProps<D> extends BaseChartProps<D> {
  /** Заливка под линией (AreaChart). */
  area?: boolean
}

export function LineChart<D>({
  data,
  x,
  tooltipTitle,
  series,
  height = 240,
  format: formatProp,
  formatAxis,
  integer,
  area = false,
  emptyText: emptyTextProp,
  animate,
  animationDuration,
  className,
  ...aria
}: LineChartProps<D>) {
  const t = useMessages()
  const format = useDefaultFormat(formatProp)
  const emptyText = emptyTextProp ?? t.charts.empty
  const { wrapRef, width, tip, setTip } = useChartFrame(height)
  const motion = useEntranceMotion(wrapRef, animate, { duration: animationDuration })
  const titleId = useId()
  const axisFmt = formatAxis ?? format

  const maxValue = useMemo(() => {
    let m = 0
    for (const d of data) for (const s of series) m = Math.max(m, s.value(d))
    return m
  }, [data, series])
  const integerAxis = useMemo(() => integer ?? allIntegerValues(data, series), [integer, data, series])
  const scale = niceScale(maxValue, 4, integerAxis)
  const ticks = scaleTicks(scale)
  const padLeft = Math.max(28, ...ticks.map((t) => estimateTextWidth(axisFmt(t)))) + 6
  const innerW = Math.max(0, width - padLeft - PAD_RIGHT - 4)
  const innerH = Math.max(0, height - PAD_TOP - AXIS_H)
  const n = data.length
  const xOf = (i: number) => padLeft + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yOf = (v: number) => PAD_TOP + innerH - (v / scale.max) * innerH
  const tickIdx = pickTickIndexes(n, innerW)

  const moveTip = (i: number) => setTip({ index: i, left: xOf(i), top: PAD_TOP })

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    if (n === 0) return
    const i = n <= 1 ? 0 : Math.round(((px - padLeft) / innerW) * (n - 1))
    moveTip(Math.max(0, Math.min(n - 1, i)))
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (n === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const cur = tip?.index ?? (e.key === 'ArrowRight' ? -1 : n)
      moveTip(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))))
    } else if (e.key === 'Escape') setTip(null)
  }

  const paths = series.map((s) => {
    const pts = data.map((d, i) => [xOf(i), yOf(Math.max(0, s.value(d)))] as const)
    const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
    const base = PAD_TOP + innerH
    const fill = pts.length > 0 ? `${line}L${pts[pts.length - 1]![0].toFixed(1)},${base}L${pts[0]![0].toFixed(1)},${base}Z` : ''
    return { line, fill }
  })

  const k = series.length
  // Линия прорисовывается штрихом во весь путь: длина пути нормирована к 1.
  const pathLength = motion.attr ? 1 : undefined

  return (
    <div className={cx('ev-chart', className)} {...motionRootProps(motion, k, LINE_STAGGER)}>
      <div ref={wrapRef} className="ev-chart-frame" style={{ height }}>
        {n === 0 ? (
          <div className="ev-chart-empty">{emptyText}</div>
        ) : width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-labelledby={titleId}
            tabIndex={0}
            className="ev-chart-svg"
            onPointerMove={onPointer}
            onPointerLeave={() => setTip(null)}
            onKeyDown={onKey}
            onBlur={() => setTip(null)}
          >
            <title id={titleId}>{aria['aria-label']}</title>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padLeft} x2={width - PAD_RIGHT} y1={yOf(t)} y2={yOf(t)} className={t === 0 ? 'ev-chart-axis' : 'ev-chart-grid'} />
                <text x={padLeft - 8} y={yOf(t)} dy="0.32em" textAnchor="end" className="ev-chart-tick">
                  {axisFmt(t)}
                </text>
              </g>
            ))}
            {area
              ? series.map((s, si) => (
                  <path
                    key={`a${s.key}`}
                    d={paths[si]!.fill}
                    fill={seriesColor(s, si)}
                    opacity={0.1}
                    className="ev-chart-area"
                    style={motionDelayStyle(motion, si, k, LINE_STAGGER)}
                  />
                ))
              : null}
            {series.map((s, si) => (
              <path
                key={s.key}
                d={paths[si]!.line}
                fill="none"
                stroke={seriesColor(s, si)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="ev-chart-line"
                pathLength={pathLength}
                style={motionDelayStyle(motion, si, k, LINE_STAGGER)}
              />
            ))}
            {tip ? <line className="ev-chart-crosshair" x1={xOf(tip.index)} x2={xOf(tip.index)} y1={PAD_TOP} y2={PAD_TOP + innerH} /> : null}
            {series.map((s, si) => {
              // Маркер: на точке под курсором, иначе на последней точке.
              const i = tip ? tip.index : n - 1
              const d = data[i]
              if (!d) return null
              return (
                <circle
                  key={`m${s.key}`}
                  cx={xOf(i)}
                  cy={yOf(Math.max(0, s.value(d)))}
                  r={4}
                  fill={seriesColor(s, si)}
                  stroke="var(--ev-surface-1)"
                  strokeWidth={2}
                  className="ev-chart-marker"
                  style={motionDelayStyle(motion, si, k, LINE_STAGGER)}
                />
              )
            })}
            {tickIdx.map((i) => (
              <text
                key={i}
                x={xOf(i)}
                y={height - 6}
                textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}
                className="ev-chart-tick"
              >
                {x(data[i]!)}
              </text>
            ))}
          </svg>
        ) : null}
        {tip ? (
          <ChartTooltip state={tip} data={data} series={series} title={tooltipTitle ?? x} format={format} containerWidth={width} />
        ) : null}
      </div>
      <Legend series={series} kind="line" />
      <DataTableSr data={data} series={series} x={tooltipTitle ?? x} format={format} label={aria['aria-label']} />
    </div>
  )
}

/** Область под линией - LineChart с заливкой. */
export function AreaChart<D>(props: Omit<LineChartProps<D>, 'area'>) {
  return <LineChart {...props} area />
}

export interface SparklineProps {
  values: number[]
  height?: number
  /** Ширина в px или 'auto' - по ширине контейнера (до замера и на сервере - 120). */
  width?: number | 'auto'
  color?: string
  'aria-label'?: string
  /** Анимация появления: линия прорисовывается, точка появляется в конце (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
}

const SPARKLINE_FALLBACK_W = 120

/** Мини-график для плиток показателей: без осей и подсказок. */
export function Sparkline({
  values,
  height = 32,
  width = SPARKLINE_FALLBACK_W,
  color = 'var(--ev-chart-1)',
  'aria-label': label,
  animate,
  animationDuration,
}: SparklineProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const measured = useElementWidth(wrapRef)
  const fluid = width === 'auto'
  const w = fluid ? (measured > 0 ? measured : SPARKLINE_FALLBACK_W) : width
  const svg =
    values.length < 2 ? null : (
      <SparklineSvg values={values} width={w} height={height} color={color} label={label} animate={animate} animationDuration={animationDuration} />
    )
  if (!fluid) return svg
  // Обёртка есть и без данных: высота зарезервирована, замер не теряет элемент.
  return (
    <div ref={wrapRef} className="ev-sparkline-fluid" style={{ height }}>
      {svg}
    </div>
  )
}

function SparklineSvg({
  values,
  width,
  height,
  color,
  label,
  animate,
  animationDuration,
}: {
  values: number[]
  width: number
  height: number
  color: string
  label?: string
  animate?: boolean
  animationDuration?: number
}) {
  // Наблюдается сам svg: у фиксированной ширины другого корня нет, а svg
  // появляется только при двух и более значениях.
  const ref = useRef<SVGSVGElement | null>(null)
  const motion = useEntranceMotion(ref, animate, { duration: animationDuration })
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)] as const)
  const d = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
  const last = pts[pts.length - 1]!
  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      className="ev-sparkline"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...motionRootProps(motion, 1, 0)}
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" pathLength={motion.attr ? 1 : undefined} />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="var(--ev-surface-1)" strokeWidth={1.5} />
    </svg>
  )
}
