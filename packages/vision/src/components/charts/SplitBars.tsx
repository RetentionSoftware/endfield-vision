'use client'

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { useMessages, useNumberFormat } from '../../lib/i18n'
import { useEntranceMotion } from '../../lib/motion'
import { Tooltip } from '../Tooltip'
import { BAR_STAGGER, motionDelayStyle, motionRootProps } from './Charts'

/*
 * Полосы долей: строка - одна горизонтальная полоса на всю ширину, разделённая
 * на сегменты по долям суммы строки (строка - 100%). Как разошлась цена,
 * из чего сложились затраты. Серии общие для всех строк: один ключ - один цвет
 * и подпись, цвета --ev-chart-1..8 по порядку, как у BarChart и DonutChart.
 * Нулевые и отрицательные значения не рисуются и не входят в сумму.
 * Полоса - role="img" с долями в подписи; наведение или фокус и стрелки
 * подсвечивают сегмент и показывают подсказку: серия, значение, доля.
 */

export interface SplitBarsSeries<D> {
  key: string
  label: string
  value: (d: D) => number
  /** CSS-цвет; по умолчанию var(--ev-chart-N) по порядку серии. */
  color?: string
  /** Пояснение к серии в подсказке у легенды. */
  hint?: ReactNode
}

export interface SplitBarsProps<D> {
  data: D[]
  rowKey: (d: D) => string
  /** Подпись строки над полосой. */
  label: (d: D) => ReactNode
  /** Текст строки для скринридера и заголовка подсказки, если label - не строка. */
  labelText?: (d: D) => string
  /** Справа над полосой: итог, среднее. */
  aside?: (d: D) => ReactNode
  series: SplitBarsSeries<D>[]
  /** Формат значения сегмента (подсказка, строка значений). По умолчанию - число в формате языка. */
  format?: (v: number, d: D) => string
  /** Строка значений под полосой: цвет, серия, значение для каждого непустого сегмента. */
  showValues?: boolean
  /** Своя строка под полосой вместо showValues. */
  renderValues?: (d: D) => ReactNode
  /** Общая легенда под строками (по умолчанию - да). */
  legend?: boolean
  /** Строка без значений: текст вместо полосы. По умолчанию - «Нет данных». */
  rowEmpty?: (d: D) => ReactNode
  /** Толщина полосы. */
  size?: 'sm' | 'md'
  'aria-label': string
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  className?: string
}

export interface SplitSegment {
  /** Номер серии. */
  index: number
  value: number
  /** Доля в сумме строки, 0..1. */
  share: number
  /** Начало сегмента, доля от 0..1. */
  start: number
}

/** Сегменты строки: только положительные конечные значения, доли от их суммы. */
export function splitSegments(values: readonly number[]): SplitSegment[] {
  const positive = values.map((v, index) => ({ index, value: Number.isFinite(v) && v > 0 ? v : 0 })).filter((s) => s.value > 0)
  const total = positive.reduce((a, s) => a + s.value, 0)
  if (!(total > 0)) return []
  let start = 0
  return positive.map((s) => {
    const share = s.value / total
    const seg = { ...s, share, start }
    start += share
    return seg
  })
}

function seriesColor<D>(s: SplitBarsSeries<D>, i: number): string {
  return s.color ?? `var(--ev-chart-${(i % 8) + 1})`
}

export function SplitBars<D>({
  data,
  rowKey,
  label,
  labelText,
  aside,
  series,
  format: formatProp,
  showValues = false,
  renderValues,
  legend = true,
  rowEmpty,
  size = 'md',
  'aria-label': ariaLabel,
  animate,
  animationDuration,
  className,
}: SplitBarsProps<D>) {
  const t = useMessages()
  const fmt = useNumberFormat()
  const format = useMemo(() => formatProp ?? ((v: number) => fmt(v)), [formatProp, fmt])
  const formatShare = (share: number) => fmt(share, { style: 'percent', maximumFractionDigits: share > 0 && share < 0.1 ? 1 : 0 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const motion = useEntranceMotion(rootRef, animate, { duration: animationDuration })
  // Подсвеченный сегмент: строка и позиция в её сегментах.
  const [active, setActive] = useState<{ row: number; seg: number } | null>(null)

  const rows = data.map((d) => ({ d, segments: splitSegments(series.map((s) => s.value(d))) }))
  const textOf = (d: D, i: number): string => {
    if (labelText) return labelText(d)
    const l = label(d)
    return typeof l === 'string' || typeof l === 'number' ? String(l) : String(i + 1)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>, row: number, count: number) => {
    if (count === 0) return
    const cur = active?.row === row ? active.seg : -1
    let next: number | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = cur < 0 ? 0 : (cur + 1) % count
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = cur < 0 ? count - 1 : (cur - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
    if (next !== undefined) setActive({ row, seg: next })
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={ariaLabel}
      className={cx('ev-split', className)}
      data-size={size}
      {...motionRootProps(motion, rows.length, BAR_STAGGER)}
    >
      {rows.map(({ d, segments }, r) => {
        const text = textOf(d, r)
        const current = active?.row === r ? segments[active.seg] : undefined
        const barLabel = `${text}: ${segments.map((s) => `${series[s.index]!.label} ${formatShare(s.share)}`).join(', ')}`
        const values = renderValues ? renderValues(d) : showValues && segments.length > 0 ? (
          <ul className="ev-split-values" role="list">
            {segments.map((s) => (
              <li key={series[s.index]!.key} className="ev-split-value">
                <span className="ev-chart-key-box" style={{ background: seriesColor(series[s.index]!, s.index) }} aria-hidden="true" />
                <span className="ev-split-value-label">{series[s.index]!.label}</span>
                <span className="ev-split-value-num ev-num">{format(s.value, d)}</span>
              </li>
            ))}
          </ul>
        ) : null
        const asideNode = aside?.(d)
        return (
          <div key={rowKey(d)} className="ev-split-row">
            <div className="ev-split-head">
              <span className="ev-split-label">{label(d)}</span>
              {asideNode !== undefined && asideNode !== null ? <span className="ev-split-aside">{asideNode}</span> : null}
            </div>
            {segments.length === 0 ? (
              <div className="ev-split-empty">{rowEmpty ? rowEmpty(d) : t.charts.empty}</div>
            ) : (
              <div className="ev-split-figure">
                <div
                  role="img"
                  aria-label={barLabel}
                  tabIndex={0}
                  className="ev-split-track"
                  style={motionDelayStyle(motion, r, rows.length, BAR_STAGGER)}
                  onKeyDown={(e) => onKey(e, r, segments.length)}
                  onBlur={() => setActive(null)}
                  onPointerLeave={() => setActive(null)}
                >
                  {segments.map((s, si) => (
                    <span
                      key={series[s.index]!.key}
                      className="ev-split-seg"
                      data-dim={current && current !== s ? true : undefined}
                      style={{ flexGrow: s.share, background: seriesColor(series[s.index]!, s.index) }}
                      onPointerEnter={() => setActive({ row: r, seg: si })}
                    />
                  ))}
                </div>
                {current ? (
                  <div
                    className="ev-chart-tooltip ev-split-tooltip"
                    role="status"
                    data-align={current.start + current.share / 2 < 0.2 ? 'start' : current.start + current.share / 2 > 0.8 ? 'end' : undefined}
                    style={{ '--ev-split-at': `${(current.start + current.share / 2) * 100}%` } as CSSProperties}
                  >
                    <div className="ev-chart-tooltip-title">{text}</div>
                    <div className="ev-chart-tooltip-row">
                      <span className="ev-chart-key-box" style={{ background: seriesColor(series[current.index]!, current.index) }} aria-hidden="true" />
                      <span className="ev-chart-tooltip-label">{series[current.index]!.label}</span>
                      <span className="ev-chart-tooltip-value ev-num">
                        {format(current.value, d)} · {formatShare(current.share)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {values}
          </div>
        )
      })}
      {legend && series.length > 0 ? (
        <div className="ev-chart-legend ev-split-legend">
          {series.map((s, i) => {
            const item = (
              <span key={s.key} className="ev-chart-legend-item" data-hint={s.hint ? '' : undefined} tabIndex={s.hint ? 0 : undefined}>
                <span className="ev-chart-key-box" style={{ background: seriesColor(s, i) }} aria-hidden="true" />
                {s.label}
              </span>
            )
            return s.hint ? (
              <Tooltip key={s.key} content={s.hint}>
                {item}
              </Tooltip>
            ) : (
              item
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
