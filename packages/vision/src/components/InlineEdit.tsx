'use client'

import { Check, Pencil, X } from 'lucide-react'
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { useEscapeLayer } from '../lib/overlay'
import { IconButton } from './Button'
import { useFieldProps } from './Field'
import { Input, Textarea } from './Input'
import { useFieldLabelId } from './Field'

/*
 * Правка на месте: значение показано текстом-кнопкой, по нажатию - поле и
 * кнопки «Сохранить» / «Отмена». Enter (в многострочном - Ctrl+Enter)
 * сохраняет, Escape отменяет, уход фокуса сохраняет (saveOnBlur). Пока
 * onSave выполняется - спиннер; если он бросил ошибку - значение остаётся
 * прежним, текст ошибки под полем. После сохранения и отмены с клавиатуры
 * или кнопкой фокус возвращается на значение.
 */

export interface InlineEditProps {
  value: string
  /** Сохранение. Промис - спиннер до завершения; исключение - откат и текст ошибки (message). */
  onSave: (next: string) => void | Promise<void>
  /** Текст пустого значения и плейсхолдер поля. По умолчанию - «Не указано». */
  placeholder?: string
  /** Многострочное поле: Enter - перевод строки, Ctrl+Enter - сохранить. */
  multiline?: boolean
  /** Проверка перед сохранением: текст ошибки или null. */
  validate?: (next: string) => string | null
  /** Своё отображение значения в режиме просмотра (непустого). */
  renderValue?: (value: string) => ReactNode
  disabled?: boolean
  /** Уход фокуса сохраняет (по умолчанию). false - уход фокуса отменяет правку. */
  saveOnBlur?: boolean
  size?: 'sm' | 'md'
  maxLength?: number
  /** Строк у многострочного поля. */
  rows?: number
  /** Вход и выход из режима правки. */
  onEditingChange?: (editing: boolean) => void
  id?: string
  className?: string
  /** Подпись без Field. */
  'aria-label'?: string
  'aria-describedby'?: string
}

/** Текст ошибки из исключения onSave. */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return String(e)
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  multiline = false,
  validate,
  renderValue,
  disabled,
  saveOnBlur = true,
  size = 'md',
  maxLength,
  rows = 3,
  onEditingChange,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: InlineEditProps) {
  const t = useMessages()
  const f = useFieldProps({ id, disabled, 'aria-describedby': ariaDescribedBy })
  const auto = useId()
  const baseId = f.id ?? `ie${auto}`
  const valueId = `${baseId}-value`
  const editId = `${baseId}-edit`
  const nameId = `${baseId}-name`
  const errorId = `${baseId}-error`
  const fieldLabelId = useFieldLabelId(f.id)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const displayRef = useRef<HTMLButtonElement | null>(null)
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const savingRef = useRef(false)
  // Вернуть фокус на значение после выхода из правки (не при уходе фокуса наружу).
  const refocus = useRef(false)

  useIsoLayoutEffect(() => {
    if (editing) {
      const el = fieldRef.current
      el?.focus({ preventScroll: true })
      el?.select()
    } else if (refocus.current) {
      refocus.current = false
      displayRef.current?.focus({ preventScroll: true })
    }
  }, [editing])

  const setMode = (next: boolean, focusBack: boolean) => {
    refocus.current = !next && focusBack
    setEditing(next)
    onEditingChange?.(next)
  }

  const start = () => {
    if (f.disabled) return
    setDraft(value)
    setError(null)
    setMode(true, false)
  }

  const cancel = (focusBack: boolean) => {
    if (savingRef.current) return
    setError(null)
    setMode(false, focusBack)
  }

  const save = async (focusBack: boolean) => {
    if (savingRef.current) return
    const next = multiline ? draft : draft.trim()
    if (next === value) {
      setError(null)
      setMode(false, focusBack)
      return
    }
    const invalid = validate?.(next) ?? null
    if (invalid) {
      setError(invalid)
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await onSave(next)
      setError(null)
    } catch (e) {
      setError(errorText(e))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
    setMode(false, focusBack)
  }

  useEscapeLayer(editing && !saving, () => cancel(true))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if (multiline && !(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    void save(true)
  }

  const onBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (savingRef.current) return
    const next = e.relatedTarget as Node | null
    if (next && rootRef.current?.contains(next)) return
    if (saveOnBlur) void save(false)
    else cancel(false)
  }

  const describedBy = [f['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') || undefined
  const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()
  const empty = value.trim() === ''
  const nameRef = fieldLabelId ?? (ariaLabel ? nameId : undefined)

  return (
    <div
      ref={rootRef}
      className={cx('ev-inline-edit', className)}
      data-size={size}
      data-editing={editing || undefined}
      data-multiline={multiline || undefined}
      data-invalid={error ? true : undefined}
    >
      {editing ? (
        <div className="ev-inline-edit-editor">
          {multiline ? (
            <Textarea
              ref={(n) => {
                fieldRef.current = n
              }}
              id={f.id}
              value={draft}
              rows={rows}
              maxLength={maxLength}
              autoResize
              placeholder={placeholder}
              readOnly={saving}
              invalid={error ? true : undefined}
              aria-label={fieldLabelId ? undefined : ariaLabel}
              aria-describedby={describedBy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
            />
          ) : (
            <Input
              ref={(n) => {
                fieldRef.current = n
              }}
              id={f.id}
              size={size}
              value={draft}
              maxLength={maxLength}
              placeholder={placeholder}
              readOnly={saving}
              invalid={error ? true : undefined}
              aria-label={fieldLabelId ? undefined : ariaLabel}
              aria-describedby={describedBy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
            />
          )}
          <div className="ev-inline-edit-actions">
            <IconButton
              label={t.inlineEdit.save}
              icon={<Check size={15} />}
              size="sm"
              variant="secondary"
              loading={saving}
              onPointerDown={keepFocus}
              onClick={() => void save(true)}
            />
            <IconButton
              label={t.common.cancel}
              icon={<X size={15} />}
              size="sm"
              disabled={saving}
              onPointerDown={keepFocus}
              onClick={() => cancel(true)}
            />
          </div>
        </div>
      ) : (
        <button
          ref={displayRef}
          type="button"
          id={f.id}
          className="ev-inline-edit-display"
          data-empty={empty || undefined}
          disabled={f.disabled}
          aria-labelledby={nameRef ? `${nameRef} ${valueId} ${editId}` : undefined}
          aria-describedby={describedBy}
          onClick={start}
        >
          <span id={valueId} className="ev-inline-edit-value">
            {empty ? <span className="ev-inline-edit-empty">{placeholder ?? t.inlineEdit.empty}</span> : renderValue ? renderValue(value) : value}
          </span>
          <span id={editId} className="ev-inline-edit-icon" role="img" aria-label={t.inlineEdit.edit}>
            <Pencil size={13} aria-hidden="true" />
          </span>
        </button>
      )}
      {ariaLabel && !fieldLabelId ? (
        <span id={nameId} hidden>
          {ariaLabel}
        </span>
      ) : null}
      {error ? (
        <div id={errorId} className="ev-inline-edit-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}
