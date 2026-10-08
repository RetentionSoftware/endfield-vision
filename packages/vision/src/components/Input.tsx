'use client'

import { Eye, EyeOff, Minus, Plus, Search, X } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { useFieldProps } from './Field'

export type ControlSize = 'sm' | 'md' | 'lg'

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>

export interface InputProps extends NativeInputProps {
  size?: ControlSize
  invalid?: boolean
  /** Иконка или текст слева внутри поля. */
  prefix?: ReactNode
  /** Иконка, единица или кнопка справа внутри поля. */
  suffix?: ReactNode
  /** Кнопка очистки при непустом значении. */
  onClear?: () => void
  /** Класс обёртки (рамка поля), а не самого input. */
  wrapperClassName?: string
  ref?: Ref<HTMLInputElement>
}

export function Input({
  size = 'md',
  invalid,
  prefix,
  suffix,
  onClear,
  wrapperClassName,
  className,
  id,
  disabled,
  required,
  value,
  ...rest
}: InputProps) {
  const f = useFieldProps({ id, invalid, disabled, required, 'aria-describedby': rest['aria-describedby'] })
  const showClear = onClear && !f.disabled && value !== undefined && value !== null && String(value) !== ''
  return (
    <div
      className={cx('ev-input', wrapperClassName)}
      data-size={size}
      data-invalid={f.invalid || undefined}
      data-disabled={f.disabled || undefined}
    >
      {prefix ? <span className="ev-input-affix ev-input-prefix">{prefix}</span> : null}
      <input
        {...rest}
        value={value}
        id={f.id}
        disabled={f.disabled}
        required={f.required}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
        className={cx('ev-input-el', className)}
      />
      {showClear ? (
        <button type="button" className="ev-input-clear" aria-label="Очистить" onClick={onClear} tabIndex={-1}>
          <X size={14} />
        </button>
      ) : null}
      {suffix ? <span className="ev-input-affix ev-input-suffix">{suffix}</span> : null}
    </div>
  )
}

export interface SearchInputProps extends Omit<InputProps, 'value' | 'onChange' | 'prefix' | 'type'> {
  value: string
  onChange: (value: string) => void
}

/** Поиск: иконка, очистка, Escape очищает поле. */
export function SearchInput({ value, onChange, placeholder = 'Поиск', onKeyDown, ...rest }: SearchInputProps) {
  return (
    <Input
      {...rest}
      type="search"
      role="searchbox"
      autoComplete="off"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      prefix={<Search size={15} aria-hidden="true" />}
      onChange={(e) => onChange(e.target.value)}
      onClear={() => onChange('')}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && value) {
          e.preventDefault()
          e.stopPropagation()
          onChange('')
        }
        onKeyDown?.(e)
      }}
    />
  )
}

export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'>

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          className="ev-input-action"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      }
    />
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  /** Высота растёт по содержимому до maxRows. */
  autoResize?: boolean
  maxRows?: number
  /** Счётчик символов (нужен maxLength). */
  showCount?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({
  invalid,
  autoResize = false,
  maxRows = 16,
  showCount = false,
  className,
  id,
  disabled,
  required,
  rows = 3,
  value,
  maxLength,
  ref,
  ...rest
}: TextareaProps) {
  const f = useFieldProps({ id, invalid, disabled, required, 'aria-describedby': rest['aria-describedby'] })
  const inner = useRef<HTMLTextAreaElement | null>(null)

  useIsoLayoutEffect(() => {
    if (!autoResize) return
    const el = inner.current
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20
    el.style.height = 'auto'
    const max = lh * maxRows + 16
    el.style.height = `${Math.min(el.scrollHeight + 2, max)}px`
    el.style.overflowY = el.scrollHeight + 2 > max ? 'auto' : 'hidden'
  }, [value, autoResize, maxRows])

  const length = typeof value === 'string' ? value.length : 0
  return (
    <div className="ev-textarea-wrap">
      <textarea
        {...rest}
        ref={(node) => {
          inner.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node
        }}
        rows={rows}
        value={value}
        maxLength={maxLength}
        id={f.id}
        disabled={f.disabled}
        required={f.required}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
        className={cx('ev-textarea', className)}
        data-invalid={f.invalid || undefined}
      />
      {showCount && maxLength ? (
        <span className="ev-textarea-count ev-num" aria-hidden="true">
          {`${length} / ${maxLength}`}
        </span>
      ) : null}
    </div>
  )
}

export interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'> {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  /** Знаков после запятой; 0 - только целые. */
  decimals?: number
  /** Кнопки «-» и «+». */
  stepper?: boolean
  /** Единица измерения справа: «₽», «дн.», «мин». */
  unit?: ReactNode
}

function formatNumber(v: number | null, decimals: number): string {
  if (v === null || Number.isNaN(v)) return ''
  return decimals > 0 ? String(v).replace('.', ',') : String(Math.trunc(v))
}

function parseNumber(s: string, decimals: number): number | null | 'invalid' {
  const t = s.replace(/\s/g, '').replace(',', '.')
  if (t === '' || t === '-') return null
  const re = decimals > 0 ? new RegExp(`^-?\\d+(\\.\\d{0,${decimals}})?$`) : /^-?\d+$/
  if (!re.test(t)) return 'invalid'
  return Number(t)
}

/**
 * Число с буфером ввода: «12,» или «-» не ломают значение, наружу уходит
 * число или null. Границы min/max применяются при потере фокуса.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 0,
  stepper = false,
  unit,
  onBlur,
  onKeyDown,
  disabled,
  ...rest
}: NumberInputProps) {
  const [text, setText] = useState(() => formatNumber(value, decimals))
  const lastEmitted = useRef<number | null>(value)

  // Внешнее значение поменялось не из-за ввода в этом поле - показать его.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setText(formatNumber(value, decimals))
    }
  }, [value, decimals])

  const emit = (v: number | null) => {
    lastEmitted.current = v
    onChange(v)
  }

  const clamp = (v: number) => {
    let out = v
    if (min !== undefined && out < min) out = min
    if (max !== undefined && out > max) out = max
    return decimals > 0 ? Number(out.toFixed(decimals)) : Math.round(out)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    const allowNegative = min === undefined || min < 0
    const pattern = decimals > 0 ? /^-?[\d\s]*([.,]\d*)?$/ : /^-?[\d\s]*$/
    if (!pattern.test(next) || (!allowNegative && next.startsWith('-'))) return
    setText(next)
    const parsed = parseNumber(next, decimals)
    if (parsed !== 'invalid') emit(parsed)
  }

  const stepBy = (dir: 1 | -1) => {
    const base = value ?? min ?? 0
    const next = clamp(base + dir * step)
    setText(formatNumber(next, decimals))
    emit(next)
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      stepBy(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      stepBy(-1)
    }
    onKeyDown?.(e)
  }

  return (
    <Input
      {...rest}
      disabled={disabled}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onKeyDown={handleKey}
      className={cx('ev-num', rest.className)}
      onBlur={(e) => {
        const parsed = parseNumber(text, decimals)
        if (parsed === 'invalid') {
          setText(formatNumber(value, decimals))
        } else if (parsed !== null) {
          const c = clamp(parsed)
          setText(formatNumber(c, decimals))
          if (c !== value) emit(c)
        }
        onBlur?.(e)
      }}
      suffix={
        stepper || unit ? (
          <span className="ev-number-suffix">
            {unit ? <span className="ev-input-unit">{unit}</span> : null}
            {stepper ? (
              <span className="ev-number-stepper">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Уменьшить"
                  disabled={disabled || (min !== undefined && value !== null && value <= min)}
                  onClick={() => stepBy(-1)}
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Увеличить"
                  disabled={disabled || (max !== undefined && value !== null && value >= max)}
                  onClick={() => stepBy(1)}
                >
                  <Plus size={13} />
                </button>
              </span>
            ) : null}
          </span>
        ) : undefined
      }
    />
  )
}

export interface MoneyInputProps extends Omit<NumberInputProps, 'value' | 'onChange' | 'decimals' | 'unit'> {
  /** Сумма в копейках. */
  value: number | null
  onChange: (kopecks: number | null) => void
}

/** Сумма в рублях на экране, в копейках в значении. */
export function MoneyInput({ value, onChange, min = 0, ...rest }: MoneyInputProps) {
  return (
    <NumberInput
      {...rest}
      min={min === undefined ? undefined : min / 100}
      max={rest.max === undefined ? undefined : rest.max / 100}
      decimals={2}
      unit="₽"
      value={value === null ? null : value / 100}
      onChange={(rub) => onChange(rub === null ? null : Math.round(rub * 100))}
    />
  )
}
