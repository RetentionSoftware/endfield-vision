'use client'

import { createContext, useContext, useId, type ReactNode } from 'react'
import { cx } from '../lib/cx'

/*
 * Поле формы: подпись + контрол + подсказка/ошибка. Контролы кита читают
 * контекст поля и сами проставляют id, aria-invalid и aria-describedby,
 * поэтому подпись и ошибка связаны с полем без ручной разметки.
 */

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
  required: boolean
  disabled: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext)
}

/** Атрибуты контрола из пропсов с откатом на контекст поля. */
export function useFieldProps(props: {
  id?: string
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  'aria-describedby'?: string
}) {
  const ctx = useFieldContext()
  const invalid = props.invalid ?? ctx?.invalid ?? false
  return {
    id: props.id ?? ctx?.id,
    invalid,
    disabled: props.disabled ?? ctx?.disabled ?? false,
    required: props.required ?? ctx?.required,
    'aria-invalid': invalid || undefined,
    'aria-describedby': props['aria-describedby'] ?? ctx?.describedBy,
  }
}

export interface FieldProps {
  label?: ReactNode
  /** Подсказка под полем. Ошибка её заменяет. */
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  disabled?: boolean
  /** Явный id контрола (иначе генерируется). */
  id?: string
  /** Справа от подписи: счётчик, ссылка «Сбросить». */
  labelAside?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, required = false, disabled = false, id, labelAside, className, children }: FieldProps) {
  const auto = useId()
  const controlId = id ?? `f${auto}`
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : hint ? hintId : undefined
  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: hasError, required, disabled }}>
      <div className={cx('ev-field', className)} data-invalid={hasError || undefined} data-disabled={disabled || undefined}>
        {label || labelAside ? (
          <div className="ev-field-head">
            {label ? (
              <label className="ev-field-label" htmlFor={controlId}>
                {label}
                {required ? (
                  <span className="ev-field-required" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </label>
            ) : null}
            {labelAside ? <span className="ev-field-aside">{labelAside}</span> : null}
          </div>
        ) : null}
        {children}
        {hasError ? (
          <div className="ev-field-error" id={errorId} role="alert">
            {error}
          </div>
        ) : hint ? (
          <div className="ev-field-hint" id={hintId}>
            {hint}
          </div>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

/** Группа полей с заголовком (секция формы). */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('ev-form-section', className)}>
      {title || description ? (
        <header className="ev-form-section-head">
          {title ? <h3 className="ev-form-section-title">{title}</h3> : null}
          {description ? <p className="ev-form-section-desc">{description}</p> : null}
        </header>
      ) : null}
      <div className="ev-form-grid">{children}</div>
    </section>
  )
}
