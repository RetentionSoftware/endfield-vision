'use client'

import { Check, Minus } from 'lucide-react'
import { useId, useRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { useFieldProps } from './Field'

/*
 * Чекбокс, тумблер, радиогруппа, сегментный переключатель. Нативные input
 * скрыты визуально (не display: none), поэтому работают Tab, Space и
 * скринридер.
 */

type NativeCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked' | 'size'>

export interface CheckboxProps extends NativeCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Частичный выбор (шапка таблицы при выборе части строк). */
  indeterminate?: boolean
  label?: ReactNode
  description?: ReactNode
  invalid?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Checkbox({ checked, onChange, indeterminate = false, label, description, className, invalid, id, disabled, ref, ...rest }: CheckboxProps) {
  const auto = useId()
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': rest['aria-describedby'] })
  const inputId = f.id ?? `cb${auto}`
  const inner = useRef<HTMLInputElement | null>(null)
  useIsoLayoutEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate
  }, [indeterminate])
  const descId = description ? `${inputId}-desc` : undefined
  return (
    <label className={cx('ev-check', className)} htmlFor={inputId} data-disabled={f.disabled || undefined}>
      <input
        {...rest}
        ref={(n) => {
          inner.current = n
          if (typeof ref === 'function') ref(n)
          else if (ref) (ref as { current: HTMLInputElement | null }).current = n
        }}
        id={inputId}
        type="checkbox"
        className="ev-check-input"
        checked={checked}
        disabled={f.disabled}
        aria-invalid={f['aria-invalid']}
        aria-describedby={[f['aria-describedby'], descId].filter(Boolean).join(' ') || undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ev-check-box" data-checked={checked || indeterminate || undefined} aria-hidden="true">
        {indeterminate ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      {label || description ? (
        <span className="ev-check-text">
          {label ? <span className="ev-check-label">{label}</span> : null}
          {description ? (
            <span className="ev-check-desc" id={descId}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}

export interface SwitchProps extends Omit<NativeCheckboxProps, 'role'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  size?: 'sm' | 'md'
  ref?: Ref<HTMLInputElement>
}

export function Switch({ checked, onChange, label, description, size = 'md', className, id, disabled, ref, ...rest }: SwitchProps) {
  const auto = useId()
  const f = useFieldProps({ id, disabled, 'aria-describedby': rest['aria-describedby'] })
  const inputId = f.id ?? `sw${auto}`
  const descId = description ? `${inputId}-desc` : undefined
  return (
    <label className={cx('ev-switch', className)} htmlFor={inputId} data-size={size} data-disabled={f.disabled || undefined}>
      <input
        {...rest}
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        className="ev-check-input"
        checked={checked}
        disabled={f.disabled}
        aria-checked={checked}
        aria-describedby={[f['aria-describedby'], descId].filter(Boolean).join(' ') || undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ev-switch-track" data-checked={checked || undefined} aria-hidden="true">
        <span className="ev-switch-thumb" />
      </span>
      {label || description ? (
        <span className="ev-check-text">
          {label ? <span className="ev-check-label">{label}</span> : null}
          {description ? (
            <span className="ev-check-desc" id={descId}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}

export interface ChoiceOption<V extends string = string> {
  value: V
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  icon?: ReactNode
}

export interface RadioGroupProps<V extends string = string> {
  value: V | null
  onChange: (value: V) => void
  options: ChoiceOption<V>[]
  name?: string
  /** Раскладка: столбик или строка. */
  direction?: 'vertical' | 'horizontal'
  /** Вариант-карточка: опция в рамке (выбор тарифа, роли). */
  variant?: 'plain' | 'card'
  disabled?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

export function RadioGroup<V extends string = string>({
  value,
  onChange,
  options,
  name,
  direction = 'vertical',
  variant = 'plain',
  disabled = false,
  className,
  ...aria
}: RadioGroupProps<V>) {
  const auto = useId()
  const groupName = name ?? `rg${auto}`
  return (
    <div role="radiogroup" className={cx('ev-radio-group', className)} data-direction={direction} data-variant={variant} {...aria}>
      {options.map((o) => {
        const optId = `${groupName}-${o.value}`
        const isOn = value === o.value
        const off = disabled || o.disabled
        return (
          <label key={o.value} className="ev-radio" htmlFor={optId} data-checked={isOn || undefined} data-disabled={off || undefined}>
            <input
              id={optId}
              type="radio"
              className="ev-check-input"
              name={groupName}
              value={o.value}
              checked={isOn}
              disabled={off}
              onChange={() => onChange(o.value)}
            />
            <span className="ev-radio-dot" aria-hidden="true" />
            <span className="ev-check-text">
              <span className="ev-check-label">
                {o.icon ? <span className="ev-radio-icon">{o.icon}</span> : null}
                {o.label}
              </span>
              {o.description ? <span className="ev-check-desc">{o.description}</span> : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export interface SegmentedControlProps<V extends string = string> {
  value: V
  onChange: (value: V) => void
  options: Array<{ value: V; label: ReactNode; icon?: ReactNode; disabled?: boolean; count?: number }>
  size?: 'sm' | 'md'
  /** Растянуть сегменты на всю ширину. */
  block?: boolean
  'aria-label'?: string
  className?: string
}

/** Переключатель 2-5 значений (режим, период, статус). Стрелки двигают выбор. */
export function SegmentedControl<V extends string = string>({
  value,
  onChange,
  options,
  size = 'md',
  block = false,
  className,
  ...aria
}: SegmentedControlProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const onKey = (e: KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    for (let k = 1; k <= options.length; k++) {
      const i = (index + dir * k + options.length) % options.length
      const o = options[i]
      if (o && !o.disabled) {
        onChange(o.value)
        refs.current[i]?.focus()
        return
      }
    }
  }
  return (
    <div role="radiogroup" className={cx('ev-segmented', block && 'ev-segmented-block', className)} data-size={size} {...aria}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(n) => {
              refs.current[i] = n
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            className="ev-segmented-item"
            data-active={on || undefined}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.icon ? <span className="ev-segmented-icon">{o.icon}</span> : null}
            <span>{o.label}</span>
            {o.count !== undefined ? <span className="ev-segmented-count ev-num">{o.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
