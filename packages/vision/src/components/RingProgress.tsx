'use client'

import { useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useNumberFormat } from '../lib/i18n'
import { useCountUp, useEntranceMotion, useMotionProgress, useMotionSettings } from '../lib/motion'
import { countUpText } from '../lib/motion-values'
import { AnimatedText } from './AnimatedNumber'
import type { Tone } from './Display'

/*
 * Кольцевой прогресс: компактная альтернатива Progress для плиток.
 * Одно значение - role="progressbar" (как у Progress, с превышением data-over),
 * несколько сегментов - role="img" с перечислением сегментов в подписи.
 * Изменение значения анимируется через stroke-dashoffset; при
 * prefers-reduced-motion переходы гасит базовый слой.
 * Анимация появления (animate): кольцо заполняется по часовой от 12 часов
 * (сегменты - по очереди, одним проходом), процент в центре набирается.
 * Тон и превышение - сразу итоговые, aria-значения - всегда итоговые.
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
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
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

/**
 * Кадр анимации появления: кольцо открывается по часовой до доли t (0..1) от
 * конца последнего сегмента; сегменты заполняются по очереди, зазоры между
 * ними не меняются. При t >= 1 - исходные сегменты.
 */
export function revealSegments(segments: readonly RingSegment[], t: number): RingSegment[] {
  if (t >= 1) return [...segments]
  const end = segments.reduce((a, s) => (s.length > 0 ? Math.max(a, s.offset + s.length) : a), 0)
  const front = Math.max(0, t) * end
  return segments.map((s) => ({
    offset: s.offset,
    length: Math.round(Math.min(s.length, Math.max(0, front - s.offset)) * 100) / 100,
  }))
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
  animate,
  animationDuration,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: RingProgressProps) {
  const fmt = useNumberFormat()
  const partsId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const settings = useMotionSettings()
  const motion = useEntranceMotion(rootRef, animate, { duration: animationDuration })
  // Кольцо - только при появлении (дальше изменения ведёт CSS-переход), число - и при обновлении.
  const progress = useMotionProgress(motion.phase, motion.duration)
  const drawing = motion.phase !== 'static' && progress < 1
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
  const shownSum = useCountUp(Math.max(0, sum), motion.phase, motion.duration)
  const counting = motion.phase !== 'static'
  const shownPct = (v: number) => percent(max > 0 ? (v / max) * 100 : 0)
  const center =
    label === undefined ? (
      countUpText(counting, shownPct(shownSum), percent(realPct))
    ) : (typeof label === 'string' || typeof label === 'number') && (animate ?? settings.animate) ? (
      // Своя подпись с числом («7/10», «42 ГБ») набирается с сохранением формата.
      <AnimatedText animate={animate} duration={animationDuration}>
        {label}
      </AnimatedText>
    ) : (
      label
    )
  const drawnPct = pct * progress

  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ev-ring-svg" aria-hidden="true">
      <circle cx={c} cy={c} r={r} className="ev-ring-track" strokeWidth={stroke} />
      {multi ? (
        revealSegments(
          ringSegments(
            sections.map((s) => s.value),
            max,
            circ,
            Math.min(2, stroke / 2),
          ),
          progress,
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
      ) : drawnPct > 0 ? (
        <circle
          cx={c}
          cy={c}
          r={r}
          className="ev-ring-bar"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - drawnPct / 100)}
          data-cap={drawnPct >= 100 ? 'butt' : undefined}
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
        data-ev-motion={motion.attr}
        data-ev-drawing={drawing || undefined}
        ref={rootRef}
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
      data-ev-motion={motion.attr}
      data-ev-drawing={drawing || undefined}
      ref={rootRef}
    >
      {ring}
      {centerNode}
    </div>
  )
}
