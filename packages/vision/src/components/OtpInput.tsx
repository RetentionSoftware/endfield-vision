'use client'

import { Fragment, useId, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { useFieldProps } from './Field'
import type { ControlSize } from './Input'
import { useFieldLabelId } from './Field'

/*
 * Одноразовый код: отдельная ячейка на символ. Код хранится строкой без
 * пропусков: ввод перескакивает к следующей ячейке, Backspace стирает и
 * возвращается назад, вставка и автозаполнение из SMS (autocomplete
 * one-time-code у первой ячейки) раскладывают код по ячейкам. В порядке
 * табуляции одна ячейка - первая незаполненная, между ячейками - стрелки.
 */

export type OtpMode = 'numeric' | 'alphanumeric'

export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  /** Код введён полностью. Вызывается из обработчика ввода, один раз на изменение. */
  onComplete?: (code: string) => void
  /** Число символов, по умолчанию 6. */
  length?: number
  /** numeric - только цифры, alphanumeric - латиница и цифры (в верхнем регистре). */
  mode?: OtpMode
  /** Скрыть символы точками. */
  mask?: boolean
  /** Визуальный разрыв после каждых N ячеек: 3 - «123 456». */
  groupSize?: number
  size?: ControlSize
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  id?: string
  /** Имя скрытого поля формы с кодом. */
  name?: string
  className?: string
  /** Подпись группы без Field. По умолчанию - «Код подтверждения». */
  'aria-label'?: string
  'aria-describedby'?: string
}

/* --- Чистые функции --- */

/** Допустимые символы кода: цифры или латиница и цифры в верхнем регистре. */
export function sanitizeOtp(raw: string, mode: OtpMode = 'numeric'): string {
  return mode === 'numeric' ? raw.replace(/\D/g, '') : raw.replace(/[^0-9a-z]/gi, '').toUpperCase()
}

/**
 * Запись символов с ячейки index поверх старых. Код без пропусков: позиция не
 * дальше конца кода. Возвращает новый код и ячейку для фокуса.
 */
export function insertOtp(value: string, index: number, chars: string, length: number): { value: string; focus: number } {
  const at = Math.max(0, Math.min(index, value.length))
  const next = (value.slice(0, at) + chars + value.slice(at + chars.length)).slice(0, length)
  return { value: next, focus: Math.min(at + chars.length, length - 1) }
}

/** Вставка из буфера: полный код раскладывается с первой ячейки, часть - с текущей. */
export function distributeOtp(value: string, index: number, pasted: string, length: number, mode: OtpMode = 'numeric'): { value: string; focus: number } | null {
  const chars = sanitizeOtp(pasted, mode)
  if (!chars) return null
  return insertOtp(value, chars.length >= length ? 0 : index, chars, length)
}

/** Удаление символа в ячейке index; следующие сдвигаются влево. */
export function removeOtpAt(value: string, index: number): string {
  if (index < 0 || index >= value.length) return value
  return value.slice(0, index) + value.slice(index + 1)
}

/** Набранное в ячейке без старого символа: «5» + ввод «7» даёт «57» или «75» в зависимости от каретки. */
export function typedOtpChars(raw: string, prev: string): string {
  if (prev && raw.length > prev.length) {
    if (raw.startsWith(prev)) return raw.slice(prev.length)
    if (raw.endsWith(prev)) return raw.slice(0, raw.length - prev.length)
  }
  return raw
}

const MASK_CHAR = '•'

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  mode = 'numeric',
  mask = false,
  groupSize,
  size = 'md',
  disabled,
  invalid,
  autoFocus,
  id,
  name,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: OtpInputProps) {
  const t = useMessages()
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': ariaDescribedBy })
  const auto = useId()
  const baseId = f.id ?? `otp${auto}`
  const fieldLabelId = useFieldLabelId(f.id)
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const code = sanitizeOtp(value, mode).slice(0, length)
  const current = Math.min(code.length, length - 1)

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(i, length - 1))]
    el?.focus()
    el?.select()
  }

  const emit = (next: string) => {
    if (next === code) return
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  const apply = (r: { value: string; focus: number } | null) => {
    if (!r) return
    emit(r.value)
    focusBox(r.focus)
  }

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      emit(removeOtpAt(code, i))
      return
    }
    const prev = code[i] ? (mask ? MASK_CHAR : code[i]!) : ''
    const chars = sanitizeOtp(typedOtpChars(raw, prev), mode)
    if (!chars) return
    apply(insertOtp(code, chars.length >= length ? 0 : i, chars, length))
  }

  const handlePaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    apply(distributeOtp(code, i, e.clipboardData.getData('text'), length, mode))
  }

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace':
        e.preventDefault()
        if (i < code.length) {
          emit(removeOtpAt(code, i))
          focusBox(i)
        } else if (i > 0) {
          emit(removeOtpAt(code, i - 1))
          focusBox(i - 1)
        }
        break
      case 'Delete':
        e.preventDefault()
        emit(removeOtpAt(code, i))
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusBox(i - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        focusBox(Math.min(i + 1, code.length))
        break
      case 'Home':
        e.preventDefault()
        focusBox(0)
        break
      case 'End':
        e.preventDefault()
        focusBox(code.length)
        break
      default:
        break
    }
  }

  // Ячейки за концом кода недоступны: клик переводит в первую пустую.
  const handlePointerDown = (i: number) => (e: ReactPointerEvent<HTMLInputElement>) => {
    if (f.disabled || i <= code.length) return
    e.preventDefault()
    focusBox(code.length)
  }

  return (
    <div
      role="group"
      className={cx('ev-otp', className)}
      data-size={size}
      data-invalid={f.invalid || undefined}
      data-disabled={f.disabled || undefined}
      aria-labelledby={ariaLabel ? undefined : fieldLabelId}
      aria-label={ariaLabel ?? (fieldLabelId ? undefined : t.otp.label)}
    >
      {Array.from({ length }, (_, i) => {
        const ch = code[i] ?? ''
        return (
          <Fragment key={i}>
            {groupSize && i > 0 && i % groupSize === 0 ? <span className="ev-otp-sep" aria-hidden="true" /> : null}
            <input
              ref={(n) => {
                refs.current[i] = n
              }}
              id={i === 0 ? baseId : `${baseId}-${i}`}
              type="text"
              className="ev-otp-box ev-num"
              inputMode={mode === 'numeric' ? 'numeric' : 'text'}
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoCapitalize={mode === 'alphanumeric' ? 'characters' : 'off'}
              autoCorrect="off"
              spellCheck={false}
              autoFocus={autoFocus && i === current}
              tabIndex={i === current ? 0 : -1}
              value={mask && ch ? MASK_CHAR : ch}
              disabled={f.disabled}
              aria-label={t.otp.digit(i + 1, length)}
              aria-invalid={f['aria-invalid']}
              aria-describedby={f['aria-describedby']}
              data-filled={ch ? true : undefined}
              onChange={handleChange(i)}
              onPaste={handlePaste(i)}
              onKeyDown={handleKeyDown(i)}
              onPointerDown={handlePointerDown(i)}
              onFocus={(e) => e.currentTarget.select()}
            />
          </Fragment>
        )
      })}
      {name ? <input type="hidden" name={name} value={code} /> : null}
    </div>
  )
}
