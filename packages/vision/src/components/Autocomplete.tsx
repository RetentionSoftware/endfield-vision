'use client'

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cx, normalizeSearch } from '../lib/cx'
import { useOutsideClick } from '../lib/hooks'
import { Portal, useEscapeLayer, useFloating } from '../lib/overlay'
import { useFieldProps } from './Field'
import { Highlight } from './Highlight'
import { Input, type InputProps } from './Input'
import { Spinner } from './Spinner'

/*
 * Поле со свободным вводом и подсказками. Значение - произвольная строка:
 * подсказка только подставляет текст. Стрелки выбирают подсказку, Enter
 * подставляет, Escape закрывает список. Фокус остаётся в поле, активная
 * подсказка объявляется через aria-activedescendant.
 */

export interface AutocompleteSuggestion {
  /** Текст, который подставится в поле. */
  value: string
  /** Вторая строка или пояснение справа. */
  hint?: ReactNode
}

export interface AutocompleteProps
  extends Omit<InputProps, 'value' | 'defaultValue' | 'onChange' | 'onSelect' | 'role' | 'ref'> {
  value: string
  onChange: (value: string) => void
  /** Подсказки: строки или { value, hint }. */
  suggestions: ReadonlyArray<string | AutocompleteSuggestion>
  /** Выбор подсказки (после onChange): например сразу сохранить. */
  onSelect?: (value: string) => void
  /** Фильтр по введённому тексту (по умолчанию да); false - подсказки уже отобраны снаружи (сервер). */
  filter?: boolean
  /** Сколько подсказок показывать (по умолчанию 8). */
  maxSuggestions?: number
  /** Список при фокусе на пустом поле (по умолчанию да). */
  openOnFocus?: boolean
  /** Подсветка совпадений в подсказках (по умолчанию да). */
  highlight?: boolean
  /** Подсказки ещё загружаются: индикатор справа в поле. */
  loading?: boolean
  ref?: Ref<HTMLInputElement>
}

function toSuggestion(s: string | AutocompleteSuggestion): AutocompleteSuggestion {
  return typeof s === 'string' ? { value: s } : s
}

/**
 * Подсказки по тексту: совпадение подстрокой без учёта регистра и «ё», без
 * повторов и без подсказки, совпадающей с текстом целиком (подставлять нечего).
 */
export function filterAutocomplete(
  suggestions: ReadonlyArray<string | AutocompleteSuggestion>,
  query: string,
  { filter = true, limit = 8 }: { filter?: boolean; limit?: number } = {},
): AutocompleteSuggestion[] {
  const q = normalizeSearch(query)
  const seen = new Set<string>()
  const out: AutocompleteSuggestion[] = []
  for (const raw of suggestions) {
    if (out.length >= limit) break
    const s = toSuggestion(raw)
    const n = normalizeSearch(s.value)
    if (seen.has(n) || (q && n === q)) continue
    if (filter && q && !n.includes(q)) continue
    seen.add(n)
    out.push(s)
  }
  return out
}

export function Autocomplete({
  value,
  onChange,
  suggestions,
  onSelect,
  filter = true,
  maxSuggestions = 8,
  openOnFocus = true,
  highlight = true,
  loading = false,
  id,
  invalid,
  disabled,
  suffix,
  className,
  wrapperClassName,
  onFocus,
  onBlur,
  onKeyDown,
  ref,
  ...rest
}: AutocompleteProps) {
  const f = useFieldProps({ id, invalid, disabled, 'aria-describedby': rest['aria-describedby'] })
  const auto = useId()
  const listId = `${f.id ?? `ac${auto}`}-list`
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  const visible = useMemo(
    () => filterAutocomplete(suggestions, value, { filter, limit: maxSuggestions }),
    [suggestions, value, filter, maxSuggestions],
  )
  const showList = open && visible.length > 0 && !f.disabled
  const active = showList && activeIndex < visible.length ? activeIndex : -1

  const { style, side } = useFloating(wrapRef, popRef, { open: showList, placement: 'bottom-start', matchWidth: true, offset: 4 })
  useOutsideClick([wrapRef, popRef], () => setOpen(false), showList)
  useEscapeLayer(showList, () => setOpen(false))

  const pick = (s: AutocompleteSuggestion) => {
    setOpen(false)
    setActiveIndex(-1)
    if (s.value !== value) onChange(s.value)
    onSelect?.(s.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || e.nativeEvent.isComposing) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!showList) {
          setOpen(true)
          setActiveIndex(0)
        } else setActiveIndex((i) => (i + 1) % visible.length)
        return
      case 'ArrowUp':
        if (!showList) return
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? visible.length - 1 : i - 1))
        return
      case 'Enter': {
        const s = active >= 0 ? visible[active] : undefined
        if (s) {
          e.preventDefault()
          pick(s)
        }
        return
      }
      case 'Tab':
        setOpen(false)
        return
      default:
        return
    }
  }

  const activeId = active >= 0 ? `${listId}-o${active}` : undefined

  return (
    <div ref={wrapRef} className={cx('ev-autocomplete', className)}>
      <Input
        {...rest}
        ref={ref}
        id={f.id}
        value={value}
        invalid={f.invalid}
        disabled={f.disabled}
        wrapperClassName={wrapperClassName}
        suffix={loading ? <Spinner size={13} /> : suffix}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={activeId}
        aria-busy={loading || undefined}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          onFocus?.(e)
          if (openOnFocus || e.target.value !== '') setOpen(true)
        }}
        onBlur={(e) => {
          onBlur?.(e)
          setOpen(false)
          setActiveIndex(-1)
        }}
      />
      {showList ? (
        <Portal>
          <div ref={popRef} className="ev-select-pop" data-ev-layer="" data-side={side} style={style}>
            <div id={listId} role="listbox" aria-label={rest['aria-label'] ?? rest.placeholder} className="ev-select-listbox">
              {visible.map((s, i) => (
                <div
                  key={s.value}
                  id={`${listId}-o${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="ev-select-option"
                  data-active={i === active || undefined}
                  onPointerMove={() => i !== active && setActiveIndex(i)}
                  // Фокус остаётся в поле: нажатие не уводит его в список.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                >
                  <span className="ev-select-option-body">
                    <span className="ev-select-option-label">{highlight ? <Highlight text={s.value} query={value} /> : s.value}</span>
                    {s.hint ? <span className="ev-select-option-hint">{s.hint}</span> : null}
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
