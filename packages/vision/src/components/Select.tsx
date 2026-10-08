'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { cx, normalizeSearch } from '../lib/cx'
import { useEventCallback, useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { Portal, useEscapeLayer, useFloating } from '../lib/overlay'
import { useFieldProps } from './Field'
import type { ControlSize } from './Input'
import { Spinner } from './Spinner'

/*
 * Выпадающий список - замена нативного <select>. Триггер - кнопка
 * role="combobox", список в портале (не обрезается overflow таблиц и окон),
 * переворот вверх при нехватке места. Активная опция объявляется через
 * aria-activedescendant, фокус остаётся в поле поиска или в списке.
 */

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  /** Вторая строка или пояснение; участвует в поиске, если строка. */
  hint?: ReactNode
  icon?: ReactNode
  disabled?: boolean
  /** Заголовок группы: опции с одинаковой группой идут подряд. */
  group?: string
}

interface ListProps<V extends string> {
  listId: string
  options: SelectOption<V>[]
  activeIndex: number
  setActiveIndex: (i: number) => void
  isSelected: (v: V) => boolean
  onPick: (o: SelectOption<V>) => void
  multiple: boolean
  emptyText: ReactNode
  loading: boolean
}

function optionDomId(listId: string, i: number) {
  return `${listId}-o${i}`
}

function OptionList<V extends string>({
  listId,
  options,
  activeIndex,
  setActiveIndex,
  isSelected,
  onPick,
  multiple,
  emptyText,
  loading,
}: ListProps<V>) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useIsoLayoutEffect(() => {
    if (activeIndex < 0) return
    const el = document.getElementById(optionDomId(listId, activeIndex))
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listId])

  if (loading && options.length === 0) {
    return (
      <div className="ev-select-empty">
        <Spinner size={14} /> Загрузка
      </div>
    )
  }
  if (options.length === 0) return <div className="ev-select-empty">{emptyText}</div>

  // Заголовок группы - у первой опции группы.
  const headers = options.map((o, i) => (o.group && o.group !== options[i - 1]?.group ? o.group : null))
  return (
    <div ref={listRef} className="ev-select-list" role="presentation">
      {options.map((o, i) => {
        const header = headers[i]
        const selected = isSelected(o.value)
        return (
          <div key={o.value} role="presentation">
            {header ? (
              <div className="ev-select-group" role="presentation">
                {header}
              </div>
            ) : null}
            <div
              id={optionDomId(listId, i)}
              role="option"
              aria-selected={selected}
              aria-disabled={o.disabled || undefined}
              className="ev-select-option"
              data-active={i === activeIndex || undefined}
              data-selected={selected || undefined}
              onPointerMove={() => !o.disabled && i !== activeIndex && setActiveIndex(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => !o.disabled && onPick(o)}
            >
              {multiple ? (
                <span className="ev-check-box" data-checked={selected || undefined} aria-hidden="true">
                  {selected ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              ) : o.icon ? (
                <span className="ev-select-option-icon" aria-hidden="true">
                  {o.icon}
                </span>
              ) : null}
              <span className="ev-select-option-body">
                <span className="ev-select-option-label">{o.label}</span>
                {o.hint ? <span className="ev-select-option-hint">{o.hint}</span> : null}
              </span>
              {!multiple && selected ? <Check size={15} className="ev-select-option-check" aria-hidden="true" /> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function matches<V extends string>(o: SelectOption<V>, q: string): boolean {
  if (!q) return true
  if (normalizeSearch(o.label).includes(q)) return true
  return typeof o.hint === 'string' && normalizeSearch(o.hint).includes(q)
}

function firstEnabled<V extends string>(opts: SelectOption<V>[], from = 0, dir: 1 | -1 = 1): number {
  const n = opts.length
  for (let k = 0; k < n; k++) {
    const i = (((from + k * dir) % n) + n) % n
    if (!opts[i]!.disabled) return i
  }
  return -1
}

interface CommonSelectProps<V extends string> {
  options: SelectOption<V>[]
  placeholder?: string
  /** Строка поиска в списке. По умолчанию - если опций больше 7. */
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: ReactNode
  disabled?: boolean
  invalid?: boolean
  size?: ControlSize
  id?: string
  className?: string
  /** Ширина триггера (по умолчанию 100% контейнера). */
  width?: number | string
  /** Минимальная ширина выпадающего списка. */
  dropdownMinWidth?: number
  /** Серверный поиск: опции приходят снаружи, локальной фильтрации нет. */
  onSearch?: (query: string) => void
  loading?: boolean
  icon?: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

export interface SelectProps<V extends string = string> extends CommonSelectProps<V> {
  value: V | null
  onChange: (value: V | null) => void
  /** Кнопка очистки выбора. */
  clearable?: boolean
  /** Подпись выбранного значения, если его нет среди опций (серверный поиск). */
  selectedLabel?: string
}

function useSelectCore<V extends string>(props: CommonSelectProps<V>, initialActive: () => number) {
  const { options, searchable: searchableProp, onSearch } = props
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listBoxRef = useRef<HTMLDivElement | null>(null)
  const searchable = searchableProp ?? (Boolean(onSearch) || options.length > 7)

  const q = normalizeSearch(query)
  const visible = useMemo(() => (onSearch ? options : options.filter((o) => matches(o, q))), [options, q, onSearch])

  const { style, side } = useFloating(wrapRef, popRef, { open, placement: 'bottom-start', matchWidth: true, offset: 4 })

  const close = useEventCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  })

  const openList = () => {
    if (props.disabled) return
    setQuery('')
    onSearch?.('')
    setActiveIndex(initialActive())
    setOpen(true)
  }

  useOutsideClick([wrapRef, popRef], () => close(false), open)
  useEscapeLayer(open, () => close(true))

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus({ preventScroll: true })
      else listBoxRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [open, searchable])

  const onQuery = (next: string) => {
    setQuery(next)
    onSearch?.(next)
    const nq = normalizeSearch(next)
    const list = onSearch ? options : options.filter((o) => matches(o, nq))
    setActiveIndex(firstEnabled(list))
  }

  const navKey = (e: KeyboardEvent, pick: (o: SelectOption<V>) => void) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(firstEnabled(visible, activeIndex + 1, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(firstEnabled(visible, activeIndex < 0 ? visible.length - 1 : activeIndex - 1, -1))
        break
      case 'Home':
        if (!searchable) {
          e.preventDefault()
          setActiveIndex(firstEnabled(visible, 0, 1))
        }
        break
      case 'End':
        if (!searchable) {
          e.preventDefault()
          setActiveIndex(firstEnabled(visible, visible.length - 1, -1))
        }
        break
      case 'Enter': {
        e.preventDefault()
        const o = visible[activeIndex]
        if (o && !o.disabled) pick(o)
        break
      }
      case ' ':
        if (!searchable) {
          e.preventDefault()
          const o = visible[activeIndex]
          if (o && !o.disabled) pick(o)
        }
        break
      case 'Tab':
        close(false)
        break
      default:
        break
    }
  }

  const triggerKey = (e: KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      openList()
    }
  }

  return {
    listId,
    open,
    setOpen,
    query,
    onQuery,
    activeIndex,
    setActiveIndex,
    visible,
    searchable,
    style,
    side,
    close,
    openList,
    navKey,
    triggerKey,
    triggerRef,
    wrapRef,
    popRef,
    searchRef,
    listBoxRef,
  }
}

function setRefs<T>(node: T | null, ...refs: Array<Ref<T> | undefined>) {
  for (const r of refs) {
    if (!r) continue
    if (typeof r === 'function') r(node)
    else (r as { current: T | null }).current = node
  }
}

export function Select<V extends string = string>(props: SelectProps<V>) {
  const {
    value,
    onChange,
    options,
    placeholder = 'Выберите',
    searchPlaceholder = 'Поиск',
    emptyText = 'Ничего не найдено',
    clearable = false,
    size = 'md',
    className,
    width,
    dropdownMinWidth,
    loading = false,
    icon,
    selectedLabel,
    ref,
  } = props
  const f = useFieldProps({ id: props.id, invalid: props.invalid, disabled: props.disabled, 'aria-describedby': props['aria-describedby'] })
  const { triggerRef, wrapRef, popRef, searchRef, listBoxRef, ...core } = useSelectCore(props, () => {
    const i = options.findIndex((o) => o.value === value)
    return i >= 0 ? i : firstEnabled(options)
  })
  const selected = options.find((o) => o.value === value) ?? null
  const label = selected?.label ?? (value !== null ? selectedLabel : undefined)

  const pick = (o: SelectOption<V>) => {
    core.close(true)
    if (o.value !== value) onChange(o.value)
  }

  const activeId = core.activeIndex >= 0 && core.visible[core.activeIndex] ? optionDomId(core.listId, core.activeIndex) : undefined

  return (
    <div
      ref={wrapRef}
      className={cx('ev-select', className)}
      data-size={size}
      data-open={core.open || undefined}
      data-invalid={f.invalid || undefined}
      data-disabled={f.disabled || undefined}
      style={width !== undefined ? { width } : undefined}
    >
      <button
        ref={(n) => setRefs(n, triggerRef, ref)}
        type="button"
        id={f.id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={core.open}
        aria-controls={core.open ? core.listId : undefined}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        disabled={f.disabled}
        className="ev-select-trigger"
        onClick={() => (core.open ? core.close(false) : core.openList())}
        onKeyDown={core.triggerKey}
      >
        {selected?.icon ?? icon ? (
          <span className="ev-select-icon" aria-hidden="true">
            {selected?.icon ?? icon}
          </span>
        ) : null}
        <span className={cx('ev-select-value', !label && 'is-placeholder')}>{label ?? placeholder}</span>
        <ChevronDown size={15} className="ev-select-caret" aria-hidden="true" />
      </button>
      {clearable && value !== null && !f.disabled ? (
        <button type="button" className="ev-select-clear" aria-label="Очистить выбор" onClick={() => onChange(null)}>
          <X size={14} />
        </button>
      ) : null}
      {core.open ? (
        <Portal>
          <div
            ref={popRef}
            className="ev-select-pop"
            data-ev-layer=""
            data-side={core.side}
            style={{ ...core.style, minWidth: Math.max(dropdownMinWidth ?? 0, Number(core.style.minWidth ?? 0)) || undefined }}
          >
            {core.searchable ? (
              <div className="ev-select-search">
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={core.listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={core.query}
                  onChange={(e) => core.onQuery(e.target.value)}
                  onKeyDown={(e) => core.navKey(e, pick)}
                />
                {loading ? <Spinner size={13} /> : null}
              </div>
            ) : null}
            <div
              ref={listBoxRef}
              id={core.listId}
              role="listbox"
              tabIndex={core.searchable ? undefined : -1}
              aria-activedescendant={core.searchable ? undefined : activeId}
              aria-label={props['aria-label'] ?? placeholder}
              className="ev-select-listbox"
              onKeyDown={core.searchable ? undefined : (e) => core.navKey(e, pick)}
            >
              <OptionList
                listId={core.listId}
                options={core.visible}
                activeIndex={core.activeIndex}
                setActiveIndex={core.setActiveIndex}
                isSelected={(v) => v === value}
                onPick={pick}
                multiple={false}
                emptyText={emptyText}
                loading={loading}
              />
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  )
}

export interface MultiSelectProps<V extends string = string> extends CommonSelectProps<V> {
  value: V[]
  onChange: (value: V[]) => void
  /** Сколько подписей показывать в триггере до «+N». */
  maxLabels?: number
  /** Кнопки «Выбрать все» и «Очистить» внизу списка. */
  bulkActions?: boolean
}

export function MultiSelect<V extends string = string>(props: MultiSelectProps<V>) {
  const {
    value,
    onChange,
    options,
    placeholder = 'Не выбрано',
    searchPlaceholder = 'Поиск',
    emptyText = 'Ничего не найдено',
    size = 'md',
    className,
    width,
    dropdownMinWidth,
    loading = false,
    icon,
    maxLabels = 2,
    bulkActions = true,
    ref,
  } = props
  const f = useFieldProps({ id: props.id, invalid: props.invalid, disabled: props.disabled, 'aria-describedby': props['aria-describedby'] })
  const { triggerRef, wrapRef, popRef, searchRef, listBoxRef, ...core } = useSelectCore(props, () => firstEnabled(options))
  const set = new Set(value)
  const selectedOpts = options.filter((o) => set.has(o.value))

  const toggle = (o: SelectOption<V>) => {
    if (set.has(o.value)) onChange(value.filter((v) => v !== o.value))
    else onChange([...value, o.value])
  }

  const activeId = core.activeIndex >= 0 && core.visible[core.activeIndex] ? optionDomId(core.listId, core.activeIndex) : undefined
  const summary =
    selectedOpts.length === 0
      ? null
      : selectedOpts.length <= maxLabels
        ? selectedOpts.map((o) => o.label).join(', ')
        : `${selectedOpts.slice(0, maxLabels).map((o) => o.label).join(', ')} +${selectedOpts.length - maxLabels}`

  return (
    <div
      ref={wrapRef}
      className={cx('ev-select', className)}
      data-size={size}
      data-open={core.open || undefined}
      data-invalid={f.invalid || undefined}
      data-disabled={f.disabled || undefined}
      style={width !== undefined ? { width } : undefined}
    >
      <button
        ref={(n) => setRefs(n, triggerRef, ref)}
        type="button"
        id={f.id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={core.open}
        aria-controls={core.open ? core.listId : undefined}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        disabled={f.disabled}
        className="ev-select-trigger"
        onClick={() => (core.open ? core.close(false) : core.openList())}
        onKeyDown={core.triggerKey}
      >
        {icon ? (
          <span className="ev-select-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className={cx('ev-select-value', !summary && 'is-placeholder')}>{summary ?? placeholder}</span>
        {value.length > 0 ? <span className="ev-select-count ev-num">{value.length}</span> : null}
        <ChevronDown size={15} className="ev-select-caret" aria-hidden="true" />
      </button>
      {core.open ? (
        <Portal>
          <div
            ref={popRef}
            className="ev-select-pop"
            data-ev-layer=""
            data-side={core.side}
            style={{ ...core.style, minWidth: Math.max(dropdownMinWidth ?? 0, Number(core.style.minWidth ?? 0)) || undefined }}
          >
            {core.searchable ? (
              <div className="ev-select-search">
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={core.listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={core.query}
                  onChange={(e) => core.onQuery(e.target.value)}
                  onKeyDown={(e) => core.navKey(e, toggle)}
                />
                {loading ? <Spinner size={13} /> : null}
              </div>
            ) : null}
            <div
              ref={listBoxRef}
              id={core.listId}
              role="listbox"
              aria-multiselectable="true"
              tabIndex={core.searchable ? undefined : -1}
              aria-activedescendant={core.searchable ? undefined : activeId}
              aria-label={props['aria-label'] ?? placeholder}
              className="ev-select-listbox"
              onKeyDown={core.searchable ? undefined : (e) => core.navKey(e, toggle)}
            >
              <OptionList
                listId={core.listId}
                options={core.visible}
                activeIndex={core.activeIndex}
                setActiveIndex={core.setActiveIndex}
                isSelected={(v) => set.has(v)}
                onPick={toggle}
                multiple
                emptyText={emptyText}
                loading={loading}
              />
            </div>
            {bulkActions && options.length > 1 ? (
              <div className="ev-select-foot">
                <button
                  type="button"
                  className="ev-select-foot-btn"
                  onClick={() => {
                    const add = core.visible.filter((o) => !o.disabled).map((o) => o.value)
                    onChange(Array.from(new Set([...value, ...add])))
                  }}
                >
                  Выбрать все
                </button>
                <button type="button" className="ev-select-foot-btn" disabled={value.length === 0} onClick={() => onChange([])}>
                  Очистить
                </button>
              </div>
            ) : null}
          </div>
        </Portal>
      ) : null}
    </div>
  )
}
