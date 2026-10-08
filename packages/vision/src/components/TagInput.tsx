'use client'

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import { cx, normalizeSearch } from '../lib/cx'
import { useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Portal, useEscapeLayer, useFloating } from '../lib/overlay'
import { Chip } from './Chip'
import type { Tone } from './Display'
import { useFieldProps } from './Field'
import type { ControlSize } from './Input'

/*
 * Свободные метки в рамке поля. Метка добавляется по Enter, запятой, точке с
 * запятой и Tab (если введён текст); вставка из буфера делится по запятым и
 * переводам строк. Backspace в пустом поле удаляет последнюю метку в два
 * нажатия: первое подсвечивает её, второе удаляет - случайное нажатие не
 * стирает данные. Стрелка влево в начале поля переводит фокус на крестики
 * меток; Backspace / Delete на крестике удаляет метку. Причина отказа
 * (дубль, лимит, ошибка проверки) объявляется через aria-live под полем.
 */

export interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  /** По умолчанию - «Введите и нажмите Enter». */
  placeholder?: string
  /** Сколько меток можно добавить. */
  max?: number
  /** Разрешить одинаковые метки (сравнение без учёта регистра и «ё/е»). */
  allowDuplicates?: boolean
  /** Проверка метки: текст ошибки или null. */
  validate?: (tag: string) => string | null
  /** Подсказки: список под полем, фильтр по введённому тексту. */
  suggestions?: string[]
  /** Сколько подсказок показывать. */
  maxSuggestions?: number
  /** Нормализация перед добавлением: (s) => s.toLowerCase(). */
  transform?: (raw: string) => string
  /** Тон чипов-меток. */
  tone?: Tone
  size?: ControlSize
  invalid?: boolean
  disabled?: boolean
  id?: string
  /** Имя скрытого поля формы: метки через запятую. */
  name?: string
  autoFocus?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLInputElement>
}

/* --- Чистые функции --- */

const SEPARATORS = /[,;\n\r\t]+/

/** Разбор строки на метки: запятая, точка с запятой, перевод строки, табуляция. */
export function splitTags(raw: string): string[] {
  return raw
    .split(SEPARATORS)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Есть ли метка в списке (без учёта регистра и «ё/е»). */
export function hasTag(list: readonly string[], tag: string): boolean {
  const key = normalizeSearch(tag)
  return list.some((t) => normalizeSearch(t) === key)
}

export type TagRejection = { kind: 'duplicate'; tag: string } | { kind: 'limit'; tag: string } | { kind: 'invalid'; tag: string; message: string }

export interface AddTagsResult {
  value: string[]
  added: string[]
  /** Не принятые метки - остаются в поле для правки. */
  rejected: string[]
  /** Первая причина отказа. */
  error: TagRejection | null
}

export interface AddTagsOptions {
  max?: number
  allowDuplicates?: boolean
  transform?: (raw: string) => string
  validate?: (tag: string) => string | null
}

/** Добавление меток с проверками: пустые пропускаются, дубли, лимит и ошибки проверки - в rejected. */
export function addTags(current: readonly string[], candidates: readonly string[], opts: AddTagsOptions = {}): AddTagsResult {
  const value = [...current]
  const added: string[] = []
  const rejected: string[] = []
  let error: TagRejection | null = null
  const reject = (tag: string, e: TagRejection) => {
    rejected.push(tag)
    error ??= e
  }
  for (const raw of candidates) {
    const trimmed = raw.trim()
    const tag = (opts.transform ? opts.transform(trimmed) : trimmed).trim()
    if (!tag) continue
    if (opts.max !== undefined && value.length >= opts.max) {
      reject(tag, { kind: 'limit', tag })
      continue
    }
    if (!opts.allowDuplicates && hasTag(value, tag)) {
      reject(tag, { kind: 'duplicate', tag })
      continue
    }
    const message = opts.validate?.(tag) ?? null
    if (message) {
      reject(tag, { kind: 'invalid', tag, message })
      continue
    }
    value.push(tag)
    added.push(tag)
  }
  return { value, added, rejected, error }
}

/** Подсказки по введённому тексту без уже добавленных меток. */
export function filterTagSuggestions(
  suggestions: readonly string[],
  query: string,
  current: readonly string[],
  { allowDuplicates = false, limit = 8 }: { allowDuplicates?: boolean; limit?: number } = {},
): string[] {
  const q = normalizeSearch(query)
  const out: string[] = []
  for (const s of suggestions) {
    if (out.length >= limit) break
    if (q && !normalizeSearch(s).includes(q)) continue
    if (!allowDuplicates && hasTag(current, s)) continue
    out.push(s)
  }
  return out
}

export function TagInput({
  value,
  onChange,
  placeholder,
  max,
  allowDuplicates = false,
  validate,
  suggestions,
  maxSuggestions = 8,
  transform,
  tone = 'neutral',
  size = 'md',
  invalid,
  disabled,
  id,
  name,
  autoFocus,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ref,
}: TagInputProps) {
  const t = useMessages()
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': ariaDescribedBy })
  const auto = useId()
  const baseId = f.id ?? `ti${auto}`
  const listId = `${baseId}-list`
  const msgId = `${baseId}-msg`

  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const removeRefs = useRef<Array<HTMLButtonElement | null>>([])
  // Куда вернуть фокус после удаления метки: индекс крестика или -1 (поле).
  const focusAfter = useRef<number | null>(null)

  useIsoLayoutEffect(() => {
    const target = focusAfter.current
    if (target === null) return
    focusAfter.current = null
    const el = target >= 0 ? removeRefs.current[target] : inputRef.current
    ;(el ?? inputRef.current)?.focus({ preventScroll: true })
  }, [value])

  const limitReached = max !== undefined && value.length >= max
  const visible = useMemo(
    () => (suggestions ? filterTagSuggestions(suggestions, text, value, { allowDuplicates, limit: maxSuggestions }) : []),
    [suggestions, text, value, allowDuplicates, maxSuggestions],
  )
  const showList = open && visible.length > 0 && !f.disabled && !limitReached

  const { style, side } = useFloating(wrapRef, popRef, { open: showList, placement: 'bottom-start', matchWidth: true, offset: 4 })
  useOutsideClick([wrapRef, popRef], () => setOpen(false), showList)
  useEscapeLayer(showList, () => setOpen(false))

  const reasonText = (r: TagRejection): string =>
    r.kind === 'duplicate' ? t.tagInput.duplicate : r.kind === 'limit' ? t.tagInput.limit(max ?? 0) : r.message

  /** Добавить метки; не принятые остаются в поле вместе с хвостом после разделителя. */
  const commit = (candidates: string[], rest = '') => {
    const r = addTags(value, candidates, { max, allowDuplicates, transform, validate })
    if (r.added.length > 0) onChange(r.value)
    setMessage(r.error ? reasonText(r.error) : null)
    setText([...r.rejected, rest].filter(Boolean).join(', '))
    setActiveIndex(-1)
    if (r.added.length > 0) setOpen(false)
    return r
  }

  const removeAt = (index: number, focusTarget: number | null) => {
    focusAfter.current = focusTarget
    setPendingRemove(false)
    setMessage(null)
    onChange(value.filter((_, i) => i !== index))
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setPendingRemove(false)
    setMessage(null)
    setActiveIndex(-1)
    if (/[,;]/.test(next)) {
      const parts = next.split(/[,;]/)
      const rest = parts.pop() ?? ''
      commit(parts, rest.trimStart())
      return
    }
    setText(next)
    setOpen(true)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!SEPARATORS.test(pasted)) return
    e.preventDefault()
    const el = e.currentTarget
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    commit(splitTags(text.slice(0, start) + pasted + text.slice(end)))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    const hasText = text.trim() !== ''
    switch (e.key) {
      case 'ArrowDown':
        if (!suggestions) return
        e.preventDefault()
        setOpen(true)
        if (visible.length > 0) setActiveIndex((i) => (i + 1) % visible.length)
        return
      case 'ArrowUp':
        if (!showList) return
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? visible.length - 1 : i - 1))
        return
      case 'Enter': {
        const picked = showList && activeIndex >= 0 ? visible[activeIndex] : undefined
        if (picked !== undefined) {
          e.preventDefault()
          commit([picked])
        } else if (hasText) {
          e.preventDefault()
          commit([text])
        }
        return
      }
      case 'Tab':
        if (hasText && !e.shiftKey) {
          e.preventDefault()
          commit([text])
        }
        return
      case 'Backspace':
        if (text !== '' || value.length === 0) return
        e.preventDefault()
        if (pendingRemove) removeAt(value.length - 1, -1)
        else setPendingRemove(true)
        return
      case 'ArrowLeft': {
        const el = e.currentTarget
        if (value.length === 0 || el.selectionStart !== 0 || el.selectionEnd !== 0) return
        e.preventDefault()
        setPendingRemove(false)
        removeRefs.current[value.length - 1]?.focus()
        return
      }
      default:
        if (pendingRemove) setPendingRemove(false)
    }
  }

  const chipKeyDown = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const focusChip = (i: number) => (i >= 0 && i < value.length ? removeRefs.current[i]?.focus() : inputRef.current?.focus())
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        if (index > 0) focusChip(index - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        focusChip(index + 1)
        break
      case 'Home':
        e.preventDefault()
        focusChip(0)
        break
      case 'End':
      case 'Escape':
        e.preventDefault()
        inputRef.current?.focus()
        break
      case 'Backspace':
        e.preventDefault()
        removeAt(index, index > 0 ? index - 1 : value.length > 1 ? 0 : -1)
        break
      case 'Delete':
        e.preventDefault()
        removeAt(index, index < value.length - 1 ? index : -1)
        break
      default:
        break
    }
  }

  const onShellPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (f.disabled || e.target !== e.currentTarget) return
    e.preventDefault()
    inputRef.current?.focus()
  }

  const shown = message ?? (limitReached && max !== undefined ? t.tagInput.limit(max) : null)
  const activeId = showList && activeIndex >= 0 ? `${listId}-o${activeIndex}` : undefined
  const describedBy = [f['aria-describedby'], shown ? msgId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('ev-tag-input-root', className)}>
      <div
        ref={wrapRef}
        className="ev-input ev-tag-input"
        data-size={size}
        data-invalid={f.invalid || undefined}
        data-disabled={f.disabled || undefined}
        onPointerDown={onShellPointerDown}
      >
        {value.map((tag, i) => (
          <Chip
            key={`${tag}-${i}`}
            size={size === 'sm' ? 'sm' : 'md'}
            tone={tone}
            disabled={f.disabled}
            onRemove={() => removeAt(i, -1)}
            onRemoveKeyDown={chipKeyDown(i)}
            removeTabIndex={-1}
            removeRef={(n) => {
              removeRefs.current[i] = n
            }}
            data-pending={(pendingRemove && i === value.length - 1) || undefined}
          >
            {tag}
          </Chip>
        ))}
        <input
          ref={(n) => {
            inputRef.current = n
            if (typeof ref === 'function') ref(n)
            else if (ref) (ref as { current: HTMLInputElement | null }).current = n
          }}
          type="text"
          className="ev-input-el ev-tag-input-el"
          id={f.id}
          value={text}
          disabled={f.disabled}
          required={f.required && value.length === 0}
          placeholder={limitReached && max !== undefined ? t.tagInput.limit(max) : (placeholder ?? t.tagInput.placeholder)}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          enterKeyHint="enter"
          aria-label={ariaLabel}
          aria-invalid={f.invalid || (message !== null && !limitReached) || undefined}
          aria-describedby={describedBy}
          role={suggestions ? 'combobox' : undefined}
          aria-autocomplete={suggestions ? 'list' : undefined}
          aria-expanded={suggestions ? showList : undefined}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={activeId}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            setPendingRemove(false)
          }}
        />
      </div>
      {name ? <input type="hidden" name={name} value={value.join(',')} /> : null}
      <div id={msgId} className="ev-tag-input-message" aria-live="polite" data-error={(message !== null && !limitReached) || undefined}>
        {shown}
      </div>
      {showList ? (
        <Portal>
          <div ref={popRef} className="ev-select-pop" data-ev-layer="" data-side={side} style={style}>
            <div id={listId} role="listbox" aria-label={ariaLabel ?? placeholder ?? t.tagInput.placeholder} className="ev-select-listbox">
              {visible.map((s, i) => (
                <div
                  key={s}
                  id={`${listId}-o${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className="ev-select-option"
                  data-active={i === activeIndex || undefined}
                  onPointerMove={() => i !== activeIndex && setActiveIndex(i)}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => commit([s])}
                >
                  <span className="ev-select-option-body">
                    <span className="ev-select-option-label">{s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  )
}
