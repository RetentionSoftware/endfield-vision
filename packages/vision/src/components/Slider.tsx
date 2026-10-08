'use client'

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { useMessages, useNumberFormat } from '../lib/i18n'
import { useFieldLabelId, useFieldProps } from './Field'

/*
 * Ползунок: одно значение или диапазон из двух бегунков. В каждом бегунке
 * визуально скрытый нативный <input type="range">: роль slider, значения и
 * подпись поля (<label for>) работают без ручной разметки, экранные дикторы
 * на телефонах двигают его жестами. Клавиатуру и перетаскивание ведёт
 * компонент: шаг, крупный шаг, бегунки диапазона не перескакивают друг друга.
 */

export type SliderRange = [number, number]

export interface SliderMark {
  value: number
  /** Подпись под шкалой. Без неё - только риска на дорожке. */
  label?: ReactNode
}

export interface SliderProps<V extends number | SliderRange = number> {
  /** Число или [от, до] - тогда два бегунка. */
  value: V
  onChange: (value: V) => void
  /** Значение зафиксировано: отпустили бегунок, нажали клавишу. Для запросов к API. */
  onChangeEnd?: (value: V) => void
  min?: number
  max?: number
  step?: number
  /** Шаг PageUp / PageDown. По умолчанию - 10 шагов. */
  bigStep?: number
  /** Риски на шкале, с подписями или без. */
  marks?: SliderMark[]
  /** true - значение справа от шкалы, 'tooltip' - над бегунком при наведении, фокусе и перетаскивании. */
  showValue?: boolean | 'tooltip'
  /** Текст значения: на экране и в aria-valuetext. По умолчанию - число в формате языка. */
  format?: (value: number) => string
  disabled?: boolean
  size?: 'sm' | 'md'
  invalid?: boolean
  id?: string
  /** Имя для отправки формы (у диапазона - у обоих бегунков). */
  name?: string
  className?: string
  /** Подпись без Field. У диапазона к ней добавляется «От» / «До». */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

/* --- Чистые функции: границы, шаг, проценты, бегунки диапазона --- */

export function clampValue(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0
  const s = String(n)
  const e = s.indexOf('e-')
  if (e >= 0) return Number(s.slice(e + 2))
  const dot = s.indexOf('.')
  return dot < 0 ? 0 : s.length - dot - 1
}

/** Ближайшее значение сетки min + k * step в границах [min, max] без хвостов 0.30000000000000004. */
export function snapToStep(v: number, min: number, max: number, step: number): number {
  if (!(step > 0)) return clampValue(v, min, max)
  const k = Math.round((clampValue(v, min, max) - min) / step)
  let out = min + k * step
  if (out > max) out -= step
  const d = Math.max(decimalsOf(step), decimalsOf(min))
  return clampValue(Number(out.toFixed(d)), min, max)
}

/** Положение значения на шкале, 0-100. */
export function valueToPercent(v: number, min: number, max: number): number {
  if (max <= min) return 0
  return ((clampValue(v, min, max) - min) / (max - min)) * 100
}

/** Значение по доле шкалы (0-1) с привязкой к шагу. */
export function fractionToValue(fraction: number, min: number, max: number, step: number): number {
  return snapToStep(min + clampValue(fraction, 0, 1) * (max - min), min, max, step)
}

/**
 * Новое значение по клавише. Стрелки - шаг, PageUp / PageDown - крупный шаг,
 * Home / End - границы. Не та клавиша - null.
 */
export function sliderKeyValue(
  key: string,
  value: number,
  { min, max, step, bigStep }: { min: number; max: number; step: number; bigStep?: number },
): number | null {
  const big = bigStep ?? step * 10
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return snapToStep(value + step, min, max, step)
    case 'ArrowLeft':
    case 'ArrowDown':
      return snapToStep(value - step, min, max, step)
    case 'PageUp':
      return snapToStep(value + big, min, max, step)
    case 'PageDown':
      return snapToStep(value - big, min, max, step)
    case 'Home':
      return min
    case 'End':
      return max
    default:
      return null
  }
}

/** Сдвиг одного бегунка диапазона: он упирается в соседний, порядок [от, до] сохраняется. */
export function updateRangeValue(range: SliderRange, index: 0 | 1, v: number): SliderRange {
  return index === 0 ? [Math.min(v, range[1]), range[1]] : [range[0], Math.max(v, range[0])]
}

/** Какой бегунок ближе к точке нажатия. При совпадении бегунков решает сторона: левее - первый. */
export function closestThumb(range: SliderRange, v: number): 0 | 1 {
  if (v <= range[0]) return 0
  if (v >= range[1]) return 1
  return v - range[0] <= range[1] - v ? 0 : 1
}

/** @deprecated Импортируйте из Field. */
export { useFieldLabelId }

function sameValue(a: number | SliderRange, b: number | SliderRange): boolean {
  if (typeof a === 'number' || typeof b === 'number') return a === b
  return a[0] === b[0] && a[1] === b[1]
}

export function Slider<V extends number | SliderRange = number>({
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  bigStep,
  marks,
  showValue = false,
  format: formatProp,
  disabled,
  size = 'md',
  invalid,
  id,
  name,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: SliderProps<V>) {
  const t = useMessages()
  const nf = useNumberFormat()
  const format = formatProp ?? ((v: number) => nf(v))
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': ariaDescribedBy })
  const auto = useId()
  const baseId = f.id ?? `sl${auto}`
  const isRange = Array.isArray(value)
  const values: number[] = isRange ? [(value as SliderRange)[0], (value as SliderRange)[1]] : [value as number]

  const railRef = useRef<HTMLDivElement | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const latest = useRef<number | SliderRange>(value)
  // -1: бегунки совпали, какой тянуть - решит направление первого движения.
  const drag = useRef<{ index: -1 | 0 | 1; pointerId: number } | null>(null)
  const [active, setActive] = useState<number | null>(null)

  useIsoLayoutEffect(() => {
    if (!drag.current) latest.current = value
  }, [value])

  const fieldLabelId = useFieldLabelId(f.id, isRange && !ariaLabelledBy)
  const nameId = `${baseId}-name`
  const groupLabel = ariaLabelledBy ?? fieldLabelId ?? (ariaLabel ? nameId : undefined)

  const emit = (next: number | SliderRange) => {
    latest.current = next
    if (!sameValue(next, value)) onChange(next as V)
  }

  const commit = () => onChangeEnd?.(latest.current as V)

  const setThumb = (index: 0 | 1, raw: number) => {
    const v = snapToStep(raw, min, max, step)
    if (typeof value === 'number') emit(v)
    else emit(updateRangeValue(value as SliderRange, index, v))
  }

  const valueAt = (clientX: number) => {
    const rail = railRef.current
    if (!rail) return null
    const r = rail.getBoundingClientRect()
    if (r.width <= 0) return null
    return fractionToValue((clientX - r.left) / r.width, min, max, step)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (f.disabled || e.button !== 0) return
    const v = valueAt(e.clientX)
    if (v === null) return
    e.preventDefault()
    const cur = value as number | SliderRange
    let index: -1 | 0 | 1 = 0
    if (typeof cur !== 'number') index = cur[0] === cur[1] && v === cur[0] ? -1 : closestThumb(cur, v)
    drag.current = { index, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    const focusIndex = index === -1 ? 0 : index
    inputRefs.current[focusIndex]?.focus({ preventScroll: true })
    setActive(focusIndex)
    if (index !== -1) setThumb(index, v)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const v = valueAt(e.clientX)
    if (v === null) return
    if (d.index === -1) {
      const cur = value as SliderRange
      if (v === cur[0]) return
      d.index = v > cur[1] ? 1 : 0
      inputRefs.current[d.index]?.focus({ preventScroll: true })
      setActive(d.index)
    }
    setThumb(d.index, v)
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    setActive(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    commit()
  }

  const lo = isRange ? values[0]! : min
  const hi = isRange ? values[1]! : values[0]!
  const loPct = valueToPercent(lo, min, max)
  const hiPct = valueToPercent(hi, min, max)
  const labelled = marks?.some((m) => m.label !== undefined && m.label !== null) ?? false
  const valueText = isRange ? `${format(values[0]!)} - ${format(values[1]!)}` : format(values[0]!)

  return (
    <div
      className={cx('ev-slider', className)}
      data-size={size}
      data-range={isRange || undefined}
      data-disabled={f.disabled || undefined}
      data-invalid={f.invalid || undefined}
      data-value-tooltip={showValue === 'tooltip' || undefined}
      data-marks={labelled || undefined}
      role={isRange ? 'group' : undefined}
      aria-labelledby={isRange ? groupLabel : undefined}
    >
      {isRange && ariaLabel && !ariaLabelledBy ? (
        <span id={nameId} hidden>
          {ariaLabel}
        </span>
      ) : null}
      <div className="ev-slider-main">
        <div
          className="ev-slider-control"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="ev-slider-track" aria-hidden="true">
            <div className="ev-slider-fill" style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }} />
          </div>
          <div ref={railRef} className="ev-slider-rail">
            {marks?.map((m) => {
              const p = valueToPercent(m.value, min, max)
              return (
                <span
                  key={m.value}
                  className="ev-slider-tick"
                  aria-hidden="true"
                  data-active={(m.value >= lo && m.value <= hi) || undefined}
                  style={{ left: `${p}%` }}
                />
              )
            })}
            {values.map((v, i) => {
              const index = i as 0 | 1
              const partId = `${baseId}-part${i}`
              const inputId = i === 0 ? baseId : `${baseId}-to`
              const thumbMin = isRange && i === 1 ? values[0]! : min
              const thumbMax = isRange && i === 0 ? values[1]! : max
              return (
                <span
                  key={i}
                  className="ev-slider-thumb"
                  data-active={active === i || undefined}
                  style={{ left: `${valueToPercent(v, min, max)}%` }}
                >
                  <input
                    ref={(n) => {
                      inputRefs.current[i] = n
                    }}
                    type="range"
                    className="ev-slider-input ev-visually-hidden"
                    id={inputId}
                    name={name}
                    min={thumbMin}
                    max={thumbMax}
                    step={step}
                    value={v}
                    disabled={f.disabled}
                    aria-valuetext={format(v)}
                    aria-label={!isRange ? ariaLabel : undefined}
                    aria-labelledby={isRange ? [groupLabel, partId].filter(Boolean).join(' ') : ariaLabelledBy}
                    aria-describedby={f['aria-describedby']}
                    aria-invalid={f['aria-invalid']}
                    onChange={(e) => {
                      const next = Number(e.currentTarget.value)
                      if (!Number.isFinite(next)) return
                      setThumb(index, next)
                      commit()
                    }}
                    onKeyDown={(e) => {
                      const next = sliderKeyValue(e.key, v, { min, max, step, bigStep })
                      if (next === null) return
                      e.preventDefault()
                      setThumb(index, next)
                      commit()
                    }}
                  />
                  {isRange ? (
                    <span id={partId} hidden>
                      {i === 0 ? t.slider.from : t.slider.to}
                    </span>
                  ) : null}
                  {showValue === 'tooltip' ? (
                    <span className="ev-slider-bubble ev-num" aria-hidden="true">
                      {format(v)}
                    </span>
                  ) : null}
                </span>
              )
            })}
          </div>
        </div>
        {labelled ? (
          <div className="ev-slider-marks" aria-hidden="true">
            {marks!
              .filter((m) => m.label !== undefined && m.label !== null)
              .map((m) => {
                const p = valueToPercent(m.value, min, max)
                return (
                  <span key={m.value} className="ev-slider-mark" data-edge={p <= 0 ? 'start' : p >= 100 ? 'end' : undefined} style={{ left: `${p}%` }}>
                    {m.label}
                  </span>
                )
              })}
          </div>
        ) : null}
      </div>
      {showValue === true ? (
        <span className="ev-slider-value ev-num" aria-hidden="true">
          {valueText}
        </span>
      ) : null}
    </div>
  )
}
