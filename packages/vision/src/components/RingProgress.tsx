'use client'

import { useId, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useNumberFormat } from '../lib/i18n'
import type { Tone } from './Display'

/*
 * Кольцевой прогресс: компактная альтернатива Progress для плиток.
 * Одно значение - role="progressbar" (как у Progress, с превышением data-over),
 * несколько сегментов - role="img" с перечислением сегментов в подписи.
 * Изменение значения анимируется через stroke-dashoffset; при
 * prefers-reduced-motion переходы гасит базовый слой.
 */

export interface RingSection {
  value: number
  /** Тон сегмента; иначе color или var(--ev-chart-N) по порядку. */
  tone?: Tone
  /** CSS-цвет сегмента. */
  color?: string
  label: string
}

export interface RingProgressProps {
  /** Текущее значение (для sections - не используется, сумма считается по сегментам). */
  value?: number
  max?: number
  /** Диаметр, px. */
  size?: number
  /** Толщина кольца, px (по умолчанию - 10% диаметра, не меньше 4). */
  thickness?: number
  tone?: Tone
  /** Тон при превышении (value > max): кольцо замкнуто, в центре - реальный процент. */
  overTone?: Tone
  /** Центр кольца; по умолчанию - процент. null - пустой центр. */
  label?: ReactNode
  /** Несколько сегментов на одном кольце (доли от max). */
  sections?: RingSection[]
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

/** CSS-цвет тона: акцент - заливочный, остальные - базовые цвета статусов. */
export function toneColor(tone: Tone): string {
  return tone === 'accent' ? 'var(--ev-accent)' : `var(--ev-${tone})`
}

export interface RingSegment {
  /** Длина сегмента по окружности, px. */
  length: number
  /** Смещение начала от 12 часов по часовой, px. */
  offset: number
}

/**
 * Сегменты кольца: длины по долям от max, подряд от 12 часов; сумма обрезается
 * по полному кругу. Между соседними сегментами зазор gap (если сегментов больше одного).
 */
export function ringSegments(values: readonly number[], max: number, circumference: number, gap = 0): RingSegment[] {
  let acc = 0
  const visible = values.filter((v) => v > 0).length
  return values.map((raw) => {
    const v = Math.max(0, raw)
    const start = max > 0 ? Math.min(1, acc / max) : 0
    acc += v
    const end = max > 0 ? Math.min(1, acc / max) : 0
    const full = (end - start) * circumference
    const length = visible > 1 && full > gap ? full - gap : full
    return { length: Math.round(length * 100) / 100, offset: Math.round(start * circumference * 100) / 100 }
  })
}

export function RingProgress({
  value = 0,
  max = 100,
  size = 64,
  thickness,
  tone = 'accent',
  overTone = 'danger',
  label,
  sections,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: RingProgressProps) {
  const fmt = useNumberFormat()
  const partsId = useId()
  const stroke = Math.max(2, Math.min(thickness ?? Math.max(4, Math.round(size * 0.1)), size / 2))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const c = size / 2
  const percent = (v: number) => `${fmt(Math.round(v))}%`

  const multi = sections !== undefined
  const sum = multi ? sections.reduce((a, s) => a + Math.max(0, s.value), 0) : value
  const clamped = Math.min(Math.max(sum, 0), max)
  const over = max > 0 && sum > max
  const pct = max > 0 ? (clamped / max) * 100 : 0
  const realPct = max > 0 ? (Math.max(0, sum) / max) * 100 : 0
  const center = label === undefined ? percent(realPct) : label

  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ev-ring-svg" aria-hidden="true">
      <circle cx={c} cy={c} r={r} className="ev-ring-track" strokeWidth={stroke} />
      {multi ? (
        ringSegments(
          sections.map((s) => s.value),
          max,
          circ,
          Math.min(2, stroke / 2),
        ).map((seg, i) => {
          const s = sections[i]!
          return seg.length > 0 ? (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              className="ev-ring-bar"
              strokeWidth={stroke}
              style={{ stroke: s.color ?? (s.tone ? toneColor(s.tone) : `var(--ev-chart-${(i % 8) + 1})`) }}
              strokeDasharray={`${seg.length} ${circ}`}
              strokeDashoffset={-seg.offset}
              data-cap="butt"
            />
          ) : null
        })
      ) : pct > 0 ? (
        <circle
          cx={c}
          cy={c}
          r={r}
          className="ev-ring-bar"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          data-cap={pct >= 100 ? 'butt' : undefined}
        />
      ) : null}
    </svg>
  )

  const style = { width: size, height: size, '--ev-ring-size': `${size}px` } as CSSProperties
  const centerNode = center !== null && center !== false ? <span className="ev-ring-label ev-num">{center}</span> : null

  if (multi) {
    const parts = sections.map((s) => `${s.label}: ${percent(max > 0 ? (Math.max(0, s.value) / max) * 100 : 0)}`).join(', ')
    return (
      <div
        className={cx('ev-ring', className)}
        style={style}
        role="img"
        aria-label={ariaLabelledBy ? undefined : ariaLabel ? `${ariaLabel}. ${parts}` : parts}
        aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${partsId}` : undefined}
        data-over={over || undefined}
      >
        {ring}
        {centerNode}
        {ariaLabelledBy ? (
          <span id={partsId} hidden>
            {parts}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cx('ev-ring', className)}
      style={style}
      data-tone={over ? overTone : tone}
      data-over={over || undefined}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={over ? percent(realPct) : undefined}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {ring}
      {centerNode}
    </div>
  )
}
