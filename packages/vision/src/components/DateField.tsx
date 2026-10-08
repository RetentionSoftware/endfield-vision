'use client'

import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '../lib/cx'
import {
  DEFAULT_RANGE_PRESETS,
  dateDigitsToIso,
  formatDateDigits,
  formatIsoRu,
  isoToDateDigits,
  todayIso,
  type DateRange,
  type DateRangePreset,
} from '../lib/dates'
import { useOutsideClick } from '../lib/hooks'
import { Portal, useEscapeLayer, useFloating } from '../lib/overlay'
import { Button } from './Button'
import { Calendar } from './Calendar'
import { useFieldProps } from './Field'
import type { ControlSize } from './Input'
import { MaskedDigitsInput } from './MaskedInput'

export interface DateFieldProps {
  /** 'YYYY-MM-DD' или '' (не задано). */
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  size?: ControlSize
  id?: string
  className?: string
  /** Кнопка календаря (выключается внутри других поповеров). */
  calendar?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
}

/**
 * Дата: ввод с маской «дд.мм.гггг» или выбор в календаре. Значение
 * фиксируется только на полной корректной дате в пределах min/max,
 * недописанная дата откатывается при потере фокуса.
 */
export function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = 'дд.мм.гггг',
  disabled,
  invalid,
  size = 'md',
  id,
  className,
  calendar = true,
  ...aria
}: DateFieldProps) {
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': aria['aria-describedby'] })
  const [open, setOpen] = useState(false)
  const [digits, setDigits] = useState(() => isoToDateDigits(value))
  const [prevValue, setPrevValue] = useState(value)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { style, side } = useFloating(wrapRef, popRef, { open, placement: 'bottom-start', offset: 4 })

  // Значение пришло снаружи - синхронизировать текст поля.
  if (value !== prevValue) {
    setPrevValue(value)
    setDigits(isoToDateDigits(value))
  }

  const allowed = (iso: string) => !(min && iso < min) && !(max && iso > max)

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) inputRef.current?.focus({ preventScroll: true })
  }
  useOutsideClick([wrapRef, popRef], () => setOpen(false), open)
  useEscapeLayer(open, () => close(true))

  const onDigits = (next: string) => {
    setDigits(next)
    if (next.length === 0) {
      if (value !== '') onChange('')
      return
    }
    const iso = dateDigitsToIso(next)
    if (iso && allowed(iso) && iso !== value) onChange(iso)
  }

  const onBlur = () => {
    const iso = dateDigitsToIso(digits)
    if (digits.length > 0 && !(iso && allowed(iso))) setDigits(isoToDateDigits(value))
  }

  const commit = (iso: string) => {
    if (iso && !allowed(iso)) return
    setDigits(isoToDateDigits(iso))
    if (iso !== value) onChange(iso)
    close(true)
  }

  const onKey = (e: KeyboardEvent) => {
    if (calendar && e.key === 'ArrowDown' && (e.altKey || !open)) {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <>
      <div
        ref={wrapRef}
        className={cx('ev-input ev-datefield', className)}
        data-size={size}
        data-invalid={f.invalid || undefined}
        data-disabled={f.disabled || undefined}
        data-open={open || undefined}
      >
        <MaskedDigitsInput
          ref={inputRef}
          className="ev-input-el ev-num"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          digits={digits}
          onDigits={onDigits}
          format={formatDateDigits}
          maxDigits={8}
          onBlur={onBlur}
          onKeyDown={onKey}
          id={f.id}
          disabled={f.disabled}
          aria-invalid={f['aria-invalid']}
          aria-describedby={f['aria-describedby']}
          aria-label={aria['aria-label']}
        />
        {calendar ? (
          <button
            type="button"
            className="ev-input-action"
            aria-label="Открыть календарь"
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={f.disabled}
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarDays size={15} />
          </button>
        ) : null}
      </div>
      {open ? (
        <Portal>
          <div ref={popRef} className="ev-popover ev-date-pop" data-ev-layer="" role="dialog" aria-label="Выбор даты" data-side={side} style={style}>
            <Calendar value={value} min={min} max={max} onPick={commit} autoFocus />
            <div className="ev-cal-foot">
              <button type="button" className="ev-cal-foot-btn" onClick={() => commit('')}>
                Очистить
              </button>
              <button type="button" className="ev-cal-foot-btn" data-accent="" disabled={!allowed(todayIso())} onClick={() => commit(todayIso())}>
                Сегодня
              </button>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  )
}

export interface DateRangePickerProps {
  value: DateRange | null
  onChange: (value: DateRange | null) => void
  presets?: DateRangePreset[]
  /** Можно ли сбросить период (пусто = за всё время). */
  clearable?: boolean
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  size?: ControlSize
  className?: string
  'aria-label'?: string
}

function presetFor(value: DateRange | null, presets: DateRangePreset[]): DateRangePreset | undefined {
  if (!value) return undefined
  return presets.find((p) => {
    const r = p.range()
    return r.from === value.from && r.to === value.to
  })
}

/** Период отчёта: пресеты строками, свой период - в календаре или вводом дат. */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_RANGE_PRESETS,
  clearable = false,
  placeholder = 'Весь период',
  min,
  max,
  disabled = false,
  size = 'md',
  className,
  ...aria
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<{ from: string; to: string }>({ from: value?.from ?? '', to: value?.to ?? '' })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const { style, side } = useFloating(triggerRef, popRef, { open, placement: 'bottom-start', offset: 4 })

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }
  useOutsideClick([triggerRef, popRef], () => setOpen(false), open)
  useEscapeLayer(open, () => close(true))

  const openPop = () => {
    setDraft({ from: value?.from ?? '', to: value?.to ?? '' })
    setOpen(true)
  }

  const apply = (r: DateRange | null) => {
    onChange(r)
    close(true)
  }

  const pick = (iso: string) => {
    // Первый клик - начало, второй - конец (если раньше начала - меняем местами).
    if (!draft.from || draft.to) {
      setDraft({ from: iso, to: '' })
      return
    }
    const from = iso < draft.from ? iso : draft.from
    const to = iso < draft.from ? draft.from : iso
    setDraft({ from, to })
    apply({ from, to })
  }

  const active = presetFor(value, presets)
  const label = value ? (active ? active.label : `${formatIsoRu(value.from)} - ${formatIsoRu(value.to)}`) : null
  const draftValid = Boolean(draft.from && draft.to && draft.from <= draft.to)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx('ev-select-trigger ev-range-trigger', className)}
        data-size={size}
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={aria['aria-label'] ? `${aria['aria-label']}: ${label ?? placeholder}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPop())}
      >
        <CalendarDays size={15} className="ev-select-icon" aria-hidden="true" />
        <span className={cx('ev-select-value', !label && 'is-placeholder')}>{label ?? placeholder}</span>
        {value && active ? (
          <span className="ev-range-dates ev-num">
            {formatIsoRu(value.from)} - {formatIsoRu(value.to)}
          </span>
        ) : null}
        <ChevronDown size={15} className="ev-select-caret" aria-hidden="true" />
      </button>
      {open ? (
        <Portal>
          <div ref={popRef} className="ev-popover ev-range-pop" data-ev-layer="" role="dialog" aria-label="Выбор периода" data-side={side} style={style}>
            <div className="ev-range-presets" role="listbox" aria-label="Готовые периоды">
              {presets.map((p) => {
                const on = active?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className="ev-range-preset"
                    data-active={on || undefined}
                    onClick={() => apply(p.range())}
                  >
                    <span>{p.label}</span>
                    {on ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
            <div className="ev-range-custom">
              <Calendar range={draft.from ? { from: draft.from, to: draft.to || undefined } : null} min={min} max={max} onPick={pick} />
              <div className="ev-range-inputs">
                <DateField
                  size="sm"
                  aria-label="Начало периода"
                  calendar={false}
                  value={draft.from}
                  max={max}
                  min={min}
                  onChange={(v) => setDraft((d) => ({ ...d, from: v }))}
                />
                <span className="ev-muted" aria-hidden="true">
                  -
                </span>
                <DateField
                  size="sm"
                  aria-label="Конец периода"
                  calendar={false}
                  value={draft.to}
                  max={max}
                  min={draft.from || min}
                  onChange={(v) => setDraft((d) => ({ ...d, to: v }))}
                />
              </div>
              <div className="ev-range-foot">
                {clearable ? (
                  <Button size="sm" variant="ghost" onClick={() => apply(null)}>
                    Весь период
                  </Button>
                ) : (
                  <span />
                )}
                <Button size="sm" variant="primary" disabled={!draftValid} onClick={() => apply({ from: draft.from, to: draft.to })}>
                  Применить
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  )
}
