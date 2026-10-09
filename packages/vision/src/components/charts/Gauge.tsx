'use client'

import { useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { useNumberFormat } from '../../lib/i18n'
import { useCountUp, useEntranceMotion, useMotionProgress } from '../../lib/motion'
import { countUpText, roundLike } from '../../lib/motion-values'
import type { Tone } from '../Display'
import { toneColor } from '../RingProgress'

/*
 * Полукруглая шкала (спидометр): значение в диапазоне min..max и пороговые
 * зоны. Основная дуга заполняется до значения цветом зоны, в которую оно
 * попало; зоны - тонкая дуга снаружи. Доступность - role="meter".
 * Дуги рисуются штрихом с pathLength=100: заполнение анимируется через
 * stroke-dasharray (при prefers-reduced-motion переход гасит базовый слой).
 * Анимация появления (animate): дуга заполняется от min до значения, число
 * в центре набирается от min; зоны видны сразу. aria-значения - всегда итоговые.
 */

export interface GaugeThreshold {
  /** С этого значения и выше действует тон зоны. */
  value: number
  tone: Tone
}

export interface GaugeBand {
  /** Доли шкалы 0..1. */
  from: number
  to: number
  tone: Tone
}

/** Доля значения на шкале 0..1 (за пределами диапазона - край шкалы). */
export function gaugeFraction(value: number, min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

function sortedThresholds(thresholds: readonly GaugeThreshold[]): GaugeThreshold[] {
  return [...thresholds].filter((t) => Number.isFinite(t.value)).sort((a, b) => a.value - b.value)
}

/** Тон значения: последний порог, не больший значения; ниже всех порогов - base. */
export function gaugeTone(value: number, thresholds: readonly GaugeThreshold[], base: Tone): Tone {
  let tone = base
  for (const t of sortedThresholds(thresholds)) if (value >= t.value) tone = t.tone
  return tone
}

/** Зоны шкалы по порогам: от min до первого порога - base, дальше - тон порога. */
export function gaugeBands(thresholds: readonly GaugeThreshold[], min: number, max: number, base: Tone): GaugeBand[] {
  const bands: GaugeBand[] = []
  let from = 0
  let tone = base
  for (const t of sortedThresholds(thresholds)) {
    const at = gaugeFraction(t.value, min, max)
    if (at > from) bands.push({ from, to: at, tone })
    from = Math.max(from, at)
    tone = t.tone
  }
  if (from < 1) bands.push({ from, to: 1, tone })
  return bands
}

export interface GaugeProps {
  value: number
  min?: number
  max?: number
  /** Пороговые зоны: { value, tone } - с этого значения и выше. */
  thresholds?: GaugeThreshold[]
  /** Тон ниже первого порога (и без порогов). */
  tone?: Tone
  /** Ширина, px; высота - примерно половина. */
  size?: number
  /** Толщина основной дуги, px. */
  thickness?: number
  /** Формат значения в центре, подписей краёв и aria-valuetext. */
  format?: (v: number) => string
  /**
   * Подпись под значением (единицы, название показателя). У role="meter"
   * содержимое не читается: строка или число добавляются к aria-valuetext,
   * разметка - связывается через aria-describedby.
   */
  caption?: ReactNode
  /** Подписи min и max под краями дуги. */
  showRange?: boolean
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  'aria-label': string
  className?: string
}

const BAND_W = 3
const BAND_GAP = 4

export function Gauge({
  value,
  min = 0,
  max = 100,
  thresholds = [],
  tone = 'accent',
  size = 200,
  thickness,
  format: formatProp,
  caption,
  showRange = true,
  animate,
  animationDuration,
  className,
  'aria-label': ariaLabel,
}: GaugeProps) {
  const fmt = useNumberFormat()
  const format = formatProp ?? ((v: number) => fmt(v))
  const rootRef = useRef<HTMLDivElement | null>(null)
  const motion = useEntranceMotion(rootRef, animate, { duration: animationDuration })
  // Дуга - только при появлении (дальше изменения ведёт CSS-переход), число - и при обновлении.
  const progress = useMotionProgress(motion.phase, motion.duration)
  const finite = Number.isFinite(value)
  // Набор от min: в стартовом кадре useCountUp даёт 0, то есть ровно min.
  const shownOffset = useCountUp(finite ? value - min : 0, motion.phase, motion.duration)
  const counting = motion.phase !== 'static' && finite
  const drawing = motion.phase !== 'static' && progress < 1
  const stroke = Math.max(4, thickness ?? Math.round(size * 0.08))
  const c = size / 2
  const rBand = c - BAND_W / 2 - 1
  const r = rBand - BAND_W / 2 - BAND_GAP - stroke / 2
  const arc = (radius: number) => `M${c - radius},${c}A${radius},${radius} 0 0 1 ${c + radius},${c}`
  const frac = gaugeFraction(value, min, max) * progress
  const valueTone = gaugeTone(value, thresholds, tone)
  const bands = thresholds.length > 0 ? gaugeBands(thresholds, min, max, tone) : []
  const height = c + stroke / 2 + 1
  const clamped = Math.min(max, Math.max(min, value))
  const captionId = useId()
  const hasCaption = caption !== undefined && caption !== null && caption !== false && caption !== ''
  const textCaption = typeof caption === 'string' || typeof caption === 'number' ? String(caption) : null
  const valueText = textCaption !== null ? `${format(value)} ${textCaption}` : format(value)

  return (
    <div
      ref={rootRef}
      className={cx('ev-gauge', className)}
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number.isFinite(clamped) ? clamped : undefined}
      aria-valuetext={valueText}
      aria-describedby={hasCaption && textCaption === null ? captionId : undefined}
      data-tone={valueTone}
      data-ev-motion={motion.attr}
      data-ev-drawing={drawing || undefined}
      style={{ width: size, '--ev-gauge-inset': `${c - r - stroke / 2}px` } as CSSProperties}
    >
      <div className="ev-gauge-figure" style={{ height }}>
        <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} className="ev-gauge-svg" aria-hidden="true">
          <path d={arc(r)} pathLength={100} className="ev-gauge-track" strokeWidth={stroke} />
          {bands.map((b, i) => (
            <path
              key={i}
              d={arc(rBand)}
              pathLength={100}
              className="ev-gauge-band"
              strokeWidth={BAND_W}
              style={{ stroke: toneColor(b.tone) }}
              strokeDasharray={`${Math.max(0, (b.to - b.from) * 100 - (i < bands.length - 1 ? 0.8 : 0))} 200`}
              strokeDashoffset={-b.from * 100}
            />
          ))}
          <path
            d={arc(r)}
            pathLength={100}
            className="ev-gauge-bar"
            strokeWidth={stroke}
            strokeDasharray={`${frac * 100} 200`}
            opacity={frac > 0 ? 1 : 0}
          />
        </svg>
        <div className="ev-gauge-center">
          <span className="ev-gauge-value ev-num">{countUpText(counting, format(roundLike(min + shownOffset, value)), format(value))}</span>
          {hasCaption ? (
            <span id={captionId} className="ev-gauge-caption">
              {caption}
            </span>
          ) : null}
        </div>
      </div>
      {showRange ? (
        <div className="ev-gauge-range ev-num" aria-hidden="true">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      ) : null}
    </div>
  )
}
