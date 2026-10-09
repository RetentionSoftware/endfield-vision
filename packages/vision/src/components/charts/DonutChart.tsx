'use client'

import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { useMessages, useNumberFormat } from '../../lib/i18n'
import { useCountUp, useEntranceMotion, useMotionProgress } from '../../lib/motion'
import { roundLike } from '../../lib/motion-values'

/*
 * Кольцевая диаграмма: доля частей в целом. Правила - как у BarChart/LineChart:
 * цвета - --ev-chart-1..8 по порядку, подсказка по наведению и с клавиатуры
 * (фокус на диаграмме, стрелки), скрытая таблица для скринридера.
 * Зазор между секторами - геометрический (параллельные края постоянной
 * ширины), поэтому не зависит от цвета поверхности под диаграммой.
 * Анимация появления (animate): сектора разворачиваются по часовой от 12 часов
 * (углы масштабируются прогрессом), сумма в центре набирается.
 */

/* ------------------------------------------------------------------ */
/* Геометрия дуг                                                       */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Точка на окружности: угол в радианах от 12 часов по часовой стрелке. */
export function polarPoint(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [round2(cx + r * Math.sin(angle)), round2(cy - r * Math.cos(angle))]
}

/**
 * Сектор кольца от a0 до a1 (радианы от 12 часов по часовой). При rInner = 0 -
 * сектор круга. Полный оборот рисуется двумя полуокружностями (одна дуга A
 * с совпадающими концами в SVG не рисуется), дырка - правилом evenodd.
 */
export function annularSectorPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const span = a1 - a0
  if (!(span > 0) || !(rOuter > 0)) return ''
  if (span >= TAU - 1e-6) {
    const ring = (r: number) => {
      const [tx, ty] = polarPoint(cx, cy, r, 0)
      const [bx, by] = polarPoint(cx, cy, r, Math.PI)
      return `M${tx},${ty}A${r},${r} 0 1 1 ${bx},${by}A${r},${r} 0 1 1 ${tx},${ty}Z`
    }
    return rInner > 0 ? `${ring(rOuter)}${ring(rInner)}` : ring(rOuter)
  }
  const large = span > Math.PI ? 1 : 0
  const [ox0, oy0] = polarPoint(cx, cy, rOuter, a0)
  const [ox1, oy1] = polarPoint(cx, cy, rOuter, a1)
  if (!(rInner > 0)) return `M${round2(cx)},${round2(cy)}L${ox0},${oy0}A${rOuter},${rOuter} 0 ${large} 1 ${ox1},${oy1}Z`
  const [ix1, iy1] = polarPoint(cx, cy, rInner, a1)
  const [ix0, iy0] = polarPoint(cx, cy, rInner, a0)
  return `M${ox0},${oy0}A${rOuter},${rOuter} 0 ${large} 1 ${ox1},${oy1}L${ix1},${iy1}A${rInner},${rInner} 0 ${large} 0 ${ix0},${iy0}Z`
}

export interface DonutArc {
  /** Начало и конец доли по окружности, радианы от 12 часов. */
  start: number
  end: number
}

/**
 * Углы секторов по значениям: доли от полного оборота, отрицательные - как 0.
 * Сумма 0 - все сектора пустые (start = end = 0).
 */
export function donutArcs(values: readonly number[]): DonutArc[] {
  const total = values.reduce((a, v) => a + Math.max(0, v), 0)
  let acc = 0
  return values.map((v) => {
    const start = total > 0 ? (acc / total) * TAU : 0
    acc += Math.max(0, v)
    const end = total > 0 ? (acc / total) * TAU : 0
    return { start, end }
  })
}

/** Сектор уже этого угла (радианы) в кадре анимации не рисуется. */
const MIN_SWEEP = 0.004

/**
 * Кадр анимации появления: все углы умножены на t (0..1), диаграмма
 * разворачивается по часовой от 12 часов. Слишком узкие в этом кадре сектора
 * схлопываются (start = end) и не рисуются - иначе зазоры превращаются в
 * щепки. При t >= 1 - исходные дуги.
 */
export function donutArcsAt(arcs: readonly DonutArc[], t: number, minSweep = MIN_SWEEP): DonutArc[] {
  if (t >= 1) return [...arcs]
  const k = Math.max(0, t)
  return arcs.map((a) => {
    const start = a.start * k
    const end = a.end * k
    return end - start < minSweep ? { start, end: start } : { start, end }
  })
}

/**
 * Сектор с зазором постоянной ширины gap: у внешней и внутренней дуги свой
 * угловой отступ, края сектора параллельны. Узкий сектор не исчезает: отступ
 * не больше трети его угла.
 */
export function paddedSectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  arc: DonutArc,
  gap: number,
  whole: boolean,
): string {
  const span = arc.end - arc.start
  if (!(span > 0)) return ''
  if (whole || gap <= 0) return annularSectorPath(cx, cy, rOuter, rInner, arc.start, arc.end)
  const padOuter = Math.min(gap / 2 / rOuter, span / 3)
  const padInner = rInner > 0 ? Math.min(gap / 2 / rInner, span / 3) : 0
  const large = span - 2 * padOuter > Math.PI ? 1 : 0
  const [ox0, oy0] = polarPoint(cx, cy, rOuter, arc.start + padOuter)
  const [ox1, oy1] = polarPoint(cx, cy, rOuter, arc.end - padOuter)
  if (!(rInner > 0)) return `M${round2(cx)},${round2(cy)}L${ox0},${oy0}A${rOuter},${rOuter} 0 ${large} 1 ${ox1},${oy1}Z`
  const largeInner = span - 2 * padInner > Math.PI ? 1 : 0
  const [ix1, iy1] = polarPoint(cx, cy, rInner, arc.end - padInner)
  const [ix0, iy0] = polarPoint(cx, cy, rInner, arc.start + padInner)
  return `M${ox0},${oy0}A${rOuter},${rOuter} 0 ${large} 1 ${ox1},${oy1}L${ix1},${iy1}A${rInner},${rInner} 0 ${largeInner} 0 ${ix0},${iy0}Z`
}

/* ------------------------------------------------------------------ */
/* Группировка «Прочее»                                                */
/* ------------------------------------------------------------------ */

/**
 * Не больше maxSlices секторов: остаются крупнейшие maxSlices - 1 (в исходном
 * порядке), остальные уходят в rest - из них собирается сектор «Прочее».
 * Если группировать нечего (элементов не больше maxSlices) - rest пуст.
 */
export function groupSlices<T>(items: readonly T[], value: (item: T) => number, maxSlices?: number): { kept: T[]; rest: T[] } {
  if (maxSlices === undefined || maxSlices < 1 || items.length <= maxSlices) return { kept: [...items], rest: [] }
  const keep = Math.max(1, Math.floor(maxSlices) - 1)
  const order = items.map((item, i) => ({ i, v: Math.max(0, value(item)) })).sort((a, b) => b.v - a.v || a.i - b.i)
  const keptIdx = new Set(order.slice(0, keep).map((o) => o.i))
  return { kept: items.filter((_, i) => keptIdx.has(i)), rest: items.filter((_, i) => !keptIdx.has(i)) }
}

/* ------------------------------------------------------------------ */
/* Компонент                                                           */
/* ------------------------------------------------------------------ */

export interface DonutChartProps<D> {
  data: D[]
  label: (d: D) => string
  value: (d: D) => number
  /** CSS-цвет сектора; по умолчанию var(--ev-chart-N) по порядку. */
  color?: (d: D, index: number) => string
  /** Диаметр, px. */
  size?: number
  /** Толщина кольца, px (по умолчанию - 14% диаметра). */
  thickness?: number
  /** Содержимое центра; по умолчанию - сумма и подпись «Всего». null - пустой центр. */
  center?: ReactNode
  /** Формат значений в центре, легенде, подсказке и таблице. */
  format?: (v: number) => string
  /** Не больше стольких секторов: мелкие собираются в «Прочее». */
  maxSlices?: number
  /** Легенда со значением и долей: справа (переносится вниз на узком месте), снизу или без неё. */
  legend?: 'right' | 'bottom' | false
  'aria-label': string
  /** Текст при нулевой сумме. */
  emptyText?: ReactNode
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  className?: string
}

interface Slice {
  key: string
  label: string
  value: number
  color: string
  other: boolean
}

/** Ширина зазора между секторами, px. */
const GAP = 2
/** Насколько выдвигается активный сектор, px. */
const LIFT = 3

export function DonutChart<D>({
  data,
  label,
  value,
  color,
  size = 180,
  thickness,
  center,
  format: formatProp,
  maxSlices,
  legend = 'right',
  emptyText,
  animate,
  animationDuration,
  className,
  'aria-label': ariaLabel,
}: DonutChartProps<D>) {
  const t = useMessages()
  const fmt = useNumberFormat()
  const format = useMemo(() => formatProp ?? ((v: number) => fmt(v)), [formatProp, fmt])
  const formatShare = (share: number) => fmt(share, { style: 'percent', maximumFractionDigits: share > 0 && share < 0.1 ? 1 : 0 })
  const titleId = useId()
  const [active, setActive] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const motion = useEntranceMotion(rootRef, animate, { duration: animationDuration })
  // Геометрия - только при появлении (обновление данных не переигрывает), число - и при обновлении.
  const progress = useMotionProgress(motion.phase, motion.duration)

  const slices = useMemo<Slice[]>(() => {
    const indexed = data.map((d, i) => ({ d, i }))
    const { kept, rest } = groupSlices(indexed, (x) => value(x.d), maxSlices)
    const out: Slice[] = kept.map(({ d, i }, n) => ({
      key: `s${i}`,
      label: label(d),
      value: Math.max(0, value(d)),
      color: color ? color(d, i) : `var(--ev-chart-${(n % 8) + 1})`,
      other: false,
    }))
    if (rest.length > 0) {
      out.push({
        key: 'other',
        label: t.donut.other,
        value: rest.reduce((a, x) => a + Math.max(0, value(x.d)), 0),
        color: 'var(--ev-text-muted)',
        other: true,
      })
    }
    return out
  }, [data, label, value, color, maxSlices, t.donut.other])

  const total = slices.reduce((a, s) => a + s.value, 0)
  const arcs = donutArcsAt(donutArcs(slices.map((s) => s.value)), progress)
  const shownTotal = useCountUp(total, motion.phase, motion.duration)
  const nonZero = slices.filter((s) => s.value > 0).length
  const ring = Math.max(2, Math.min(thickness ?? Math.round(size * 0.14), size / 2 - LIFT))
  const c = size / 2
  const rOuter = c - LIFT
  const rInner = Math.max(0, rOuter - ring)
  const empty = !(total > 0)
  const current = active !== null && slices[active] && !empty ? active : null

  const focusable = slices.map((s, i) => (s.value > 0 ? i : -1)).filter((i) => i >= 0)
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (focusable.length === 0) return
    const pos = current === null ? -1 : focusable.indexOf(current)
    let next: number | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = focusable[pos < 0 ? 0 : (pos + 1) % focusable.length]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = focusable[pos < 0 ? focusable.length - 1 : (pos - 1 + focusable.length) % focusable.length]
    else if (e.key === 'Home') next = focusable[0]
    else if (e.key === 'End') next = focusable[focusable.length - 1]
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
    if (next !== undefined) setActive(next)
  }

  const tip = (() => {
    if (current === null) return null
    const s = slices[current]!
    const arc = arcs[current]!
    const mid = (arc.start + arc.end) / 2
    const [x, y] = polarPoint(c, c, rOuter + LIFT, mid)
    const right = Math.sin(mid) < 0
    return (
      <div
        className="ev-chart-tooltip ev-donut-tooltip"
        role="status"
        style={{
          left: right ? undefined : x + 8,
          right: right ? size - x + 8 : undefined,
          top: Math.max(0, y - 16),
        }}
      >
        <div className="ev-chart-tooltip-title">{s.label}</div>
        <div className="ev-chart-tooltip-row">
          <span className="ev-chart-key-box" style={{ background: s.color }} aria-hidden="true" />
          <span className="ev-chart-tooltip-value ev-num">{format(s.value)}</span>
          <span className="ev-chart-tooltip-label ev-num">{formatShare(s.value / total)}</span>
        </div>
      </div>
    )
  })()

  const centerNode =
    center !== undefined ? (
      center
    ) : empty ? (
      <span className="ev-donut-center-caption">{emptyText ?? t.charts.empty}</span>
    ) : (
      <>
        <span className="ev-donut-center-value ev-num">{format(motion.phase === 'static' ? total : roundLike(shownTotal, total))}</span>
        <span className="ev-donut-center-caption">{t.donut.total}</span>
      </>
    )

  return (
    <div ref={rootRef} className={cx('ev-donut', className)} data-legend={!empty && legend ? legend : undefined} data-ev-motion={motion.attr}>
      <div className="ev-donut-figure" style={{ width: size, height: size, '--ev-donut-hole': `${rInner * 2}px` } as CSSProperties}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-labelledby={titleId}
          tabIndex={empty ? undefined : 0}
          className="ev-chart-svg ev-donut-svg"
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          <title id={titleId}>{ariaLabel}</title>
          {empty ? (
            <path d={annularSectorPath(c, c, rOuter, rInner, 0, TAU)} className="ev-donut-track" fillRule="evenodd" />
          ) : (
            slices.map((s, i) => {
              const arc = arcs[i]!
              if (!(arc.end > arc.start)) return null
              const lifted = current === i
              return (
                <path
                  key={s.key}
                  d={paddedSectorPath(c, c, lifted ? rOuter + LIFT : rOuter, rInner, arc, GAP, nonZero === 1)}
                  fill={s.color}
                  fillRule="evenodd"
                  className="ev-donut-slice"
                  data-dim={current !== null && !lifted ? true : undefined}
                  onPointerEnter={() => setActive(i)}
                />
              )
            })
          )}
        </svg>
        {centerNode !== null ? (
          <div className="ev-donut-center" aria-hidden={center === undefined || undefined}>
            {centerNode}
          </div>
        ) : null}
        {tip}
      </div>
      {!empty && legend ? (
        <ul className="ev-donut-legend" role="list" onPointerLeave={() => setActive(null)}>
          {slices.map((s, i) => (
            <li
              key={s.key}
              className="ev-donut-legend-item"
              data-active={current === i || undefined}
              data-dim={current !== null && current !== i ? true : undefined}
              onPointerEnter={() => setActive(s.value > 0 ? i : null)}
            >
              <span className="ev-chart-key-box" style={{ background: s.color }} aria-hidden="true" />
              <span className="ev-donut-legend-label">{s.label}</span>
              <span className="ev-donut-legend-value ev-num">{format(s.value)}</span>
              <span className="ev-donut-legend-share ev-num">{formatShare(s.value / total)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="ev-visually-hidden">
        <table>
          <caption>{ariaLabel}</caption>
          {empty ? (
            <tbody>
              <tr>
                <td>{emptyText ?? t.charts.empty}</td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {slices.map((s) => (
                <tr key={s.key}>
                  <th scope="row">{s.label}</th>
                  <td>{format(s.value)}</td>
                  <td>{formatShare(s.value / total)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t.donut.total}</th>
                <td>{format(total)}</td>
                <td>{formatShare(1)}</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}
