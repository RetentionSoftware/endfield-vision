'use client'

import { createContext, useContext, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'

/*
 * Поле формы: подпись + контрол + подсказка/ошибка. Контролы кита читают
 * контекст поля и сами проставляют id, aria-invalid и aria-describedby,
 * поэтому подпись и ошибка связаны с полем без ручной разметки.
 */

interface FieldContextValue {
  id: string
  /** id подписи поля: группам контролов (диапазон, ячейки кода) - для aria-labelledby. */
  labelId?: string
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

/**
 * id подписи для aria-labelledby групп контролов. Внутри Field - из контекста
 * (подпись рендерится с id). Вне Field - поиск <label for={controlId}> после
 * монтирования; подписи без id он назначается.
 */
export function useFieldLabelId(controlId: string | undefined, enabled = true): string | undefined {
  const ctx = useFieldContext()
  const fromField = ctx?.labelId && ctx.id === controlId ? ctx.labelId : undefined
  const [found, setFound] = useState<string | undefined>(undefined)
  useIsoLayoutEffect(() => {
    if (!enabled || !controlId || fromField) return
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(controlId)}"]`)
    if (!label) {
      setFound(undefined)
      return
    }
    if (!label.id) label.id = `${controlId}-label`
    setFound(label.id)
  }, [controlId, enabled, fromField])
  return enabled ? (fromField ?? found) : undefined
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
  /**
   * Дополнительные id описаний вне поля (через пробел): контрол получает их
   * в aria-describedby перед подсказкой или ошибкой. Например, описание строки
   * настройки, в которую вложено поле.
   */
  describedBy?: string
  /** Ширина в сетке FormSection: full - строка целиком (адрес, комментарий), число - сколько колонок занять. */
  span?: 'full' | number
  className?: string
  children: ReactNode
}

function spanStyle(span: 'full' | number | undefined): CSSProperties | undefined {
  return typeof span === 'number' ? { gridColumn: `span ${span}` } : undefined
}

export function Field({
  label,
  hint,
  error,
  required = false,
  disabled = false,
  id,
  labelAside,
  describedBy: extraDescribedBy,
  span,
  className,
  children,
}: FieldProps) {
  const auto = useId()
  const controlId = id ?? `f${auto}`
  const labelId = controlId + '-label'
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const hasError = Boolean(error)
  const own = hasError ? errorId : hint ? hintId : undefined
  const describedBy = [extraDescribedBy, own].filter(Boolean).join(' ') || undefined
  return (
    <FieldContext.Provider value={{ id: controlId, labelId: label ? labelId : undefined, describedBy, invalid: hasError, required, disabled }}>
      <div
        className={cx('ev-field', className)}
        data-invalid={hasError || undefined}
        data-disabled={disabled || undefined}
        data-span={span === 'full' ? 'full' : undefined}
        style={spanStyle(span)}
      >
        {label || labelAside ? (
          <div className="ev-field-head">
            {label ? (
              <label id={labelId} className="ev-field-label" htmlFor={controlId}>
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

export interface FormSectionProps {
  title?: ReactNode
  description?: ReactNode
  /**
   * Наибольшее число колонок. Колонка не уже minColumn: на узком экране их
   * становится меньше. Без columns - сколько влезет.
   */
  columns?: number
  /** Наименьшая ширина колонки, px или CSS-длина. По умолчанию 240px. */
  minColumn?: number | string
  children: ReactNode
  className?: string
}

/** Группа полей с заголовком (секция формы). Не-поле на всю ширину - FormSection.Row или Field span="full". */
export function FormSection({ title, description, columns, minColumn, children, className }: FormSectionProps) {
  const grid: Record<string, string> = {}
  if (columns !== undefined) grid['--ev-form-cols'] = String(Math.max(1, Math.floor(columns)))
  if (minColumn !== undefined) grid['--ev-form-min'] = typeof minColumn === 'number' ? `${minColumn}px` : minColumn
  return (
    <section className={cx('ev-form-section', className)}>
      {title || description ? (
        <header className="ev-form-section-head">
          {title ? <h3 className="ev-form-section-title">{title}</h3> : null}
          {description ? <div className="ev-form-section-desc">{description}</div> : null}
        </header>
      ) : null}
      <div
        className="ev-form-grid"
        data-columns={columns !== undefined ? '' : undefined}
        style={Object.keys(grid).length ? (grid as CSSProperties) : undefined}
      >
        {children}
      </div>
    </section>
  )
}

/** Строка секции формы на всю ширину: переключатель, RadioGroup, пояснение, блок из нескольких контролов. */
export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('ev-form-row', className)}>{children}</div>
}

FormSection.Row = FormRow
