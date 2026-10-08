'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx, normalizeSearch } from '../lib/cx'
import { useEventCallback, useIsoLayoutEffect } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Portal, useEscapeLayer, useFocusTrap, useScrollLock } from '../lib/overlay'
import { Kbd } from './Display'

/*
 * Палитра команд: окно поиска по командам и разделам (Ctrl/Cmd+K).
 * Поле - role="combobox", активная команда объявляется через
 * aria-activedescendant, фокус всё время остаётся в поле. Окно - в портале
 * на слое модалок, прижато к верху экрана; Escape закрывает, фокус
 * возвращается на прежний элемент.
 */

export interface CommandItem {
  id: string
  /** Название команды; по нему идёт поиск. */
  label: string
  /** Группа: команды одной группы выводятся вместе под заголовком. Участвует в поиске. */
  group?: string
  icon?: ReactNode
  /** Справа в строке: сочетание клавиш (Kbd), раздел, статус. */
  hint?: ReactNode
  /** Дополнительные слова для поиска (синонимы, коды, английские названия). */
  keywords?: string[]
  disabled?: boolean
  /** Выполнить команду. Палитра закрывается перед вызовом. */
  onSelect: () => void
}

export interface CommandGroup {
  /** Название группы; undefined - команды без группы. */
  group: string | undefined
  items: CommandItem[]
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandItem[]
  /** Плейсхолдер поля. По умолчанию - из словаря. */
  placeholder?: string
  /** Текст при пустом результате. По умолчанию - «Ничего не найдено». */
  emptyText?: ReactNode
  /**
   * Буква глобального сочетания Ctrl/Cmd + буква, которое открывает и закрывает
   * палитру. По умолчанию 'k'; false - без сочетания (палитра открывается только снаружи).
   */
  hotkey?: string | false
  /** Слева в нижней строке: подсказка, ссылка на справку. Справа - клавиши навигации. */
  footer?: ReactNode
  /** Подпись окна для скринридера. По умолчанию - «Палитра команд». */
  'aria-label'?: string
  className?: string
}

/** Совпадение команды с запросом: каждое слово запроса есть в названии, группе или ключевых словах. */
export function commandMatches(item: CommandItem, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = normalizeSearch([item.label, item.group ?? '', ...(item.keywords ?? [])].join(' '))
  return words.every((w) => hay.includes(w))
}

/** Отбор команд по запросу (без учёта регистра и «ё/е»), порядок сохраняется. */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  return items.filter((it) => commandMatches(it, query))
}

/**
 * Группировка: группы в порядке первого появления, команды одной группы
 * собираются вместе, даже если в исходном списке идут вразбивку.
 */
export function groupCommands(items: CommandItem[]): CommandGroup[] {
  const out: CommandGroup[] = []
  const byName = new Map<string | undefined, CommandGroup>()
  for (const it of items) {
    let g = byName.get(it.group)
    if (!g) {
      g = { group: it.group, items: [] }
      byName.set(it.group, g)
      out.push(g)
    }
    g.items.push(it)
  }
  return out
}

/**
 * Следующая доступная команда от позиции from в направлении dir (по кругу).
 * Возвращает -1, если доступных нет.
 */
export function nextEnabledCommand(items: CommandItem[], from: number, dir: 1 | -1): number {
  const n = items.length
  for (let k = 0; k < n; k++) {
    const i = (((from + k * dir) % n) + n) % n
    if (!items[i]?.disabled) return i
  }
  return -1
}

interface HotkeyEvent {
  key: string
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/**
 * Нажато ли Ctrl/Cmd + hotkey. Латинская буква сверяется и по физической
 * клавише (code), поэтому сочетание работает и в русской раскладке.
 */
export function isCommandHotkey(e: HotkeyEvent, hotkey: string): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false
  const hk = hotkey.toLowerCase()
  if (e.key.toLowerCase() === hk) return true
  return /^[a-z]$/.test(hk) && e.code === `Key${hk.toUpperCase()}`
}

/** Палитра команд: поиск по командам и разделам с клавиатуры. */
export function CommandPalette({ open, onOpenChange, hotkey = 'k', ...rest }: CommandPaletteProps) {
  const toggle = useEventCallback(() => onOpenChange(!open))

  useEffect(() => {
    if (hotkey === false) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || !isCommandHotkey(e, hotkey)) return
      e.preventDefault()
      toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hotkey, toggle])

  if (!open) return null
  return (
    <Portal>
      <PalettePanel onOpenChange={onOpenChange} {...rest} />
    </Portal>
  )
}

// id опции в DOM - по позиции в отфильтрованном списке: id команды может содержать пробелы.
function optionDomId(listId: string, index: number) {
  return `${listId}-o${index}`
}

/** Тело окна. Монтируется при открытии - запрос и активная команда сбрасываются сами. */
function PalettePanel({
  onOpenChange,
  items,
  placeholder,
  emptyText,
  footer,
  'aria-label': ariaLabel,
  className,
}: Omit<CommandPaletteProps, 'open' | 'hotkey'>) {
  const t = useMessages()
  const listId = useId()
  const ref = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const groups = useMemo(() => groupCommands(filterCommands(items, query)), [items, query])
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Активная команда - выбранная пользователем, если она ещё в списке, иначе первая доступная.
  const activeIndex = useMemo(() => {
    const i = activeId === null ? -1 : flat.findIndex((it) => it.id === activeId && !it.disabled)
    return i >= 0 ? i : nextEnabledCommand(flat, 0, 1)
  }, [flat, activeId])
  const active = activeIndex >= 0 ? flat[activeIndex] : undefined

  const close = () => onOpenChange(false)
  useFocusTrap(ref, true)
  useScrollLock(true)
  useEscapeLayer(true, close)

  useIsoLayoutEffect(() => {
    if (!active) return
    document.getElementById(optionDomId(listId, activeIndex))?.scrollIntoView({ block: 'nearest' })
  }, [active, activeIndex, listId])

  const run = (it: CommandItem) => {
    if (it.disabled) return
    close()
    it.onSelect()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (flat.length === 0) return
    let next = -1
    switch (e.key) {
      case 'ArrowDown':
        next = nextEnabledCommand(flat, activeIndex + 1, 1)
        break
      case 'ArrowUp':
        next = nextEnabledCommand(flat, activeIndex < 0 ? flat.length - 1 : activeIndex - 1, -1)
        break
      case 'Home':
        // Home/End в поле с текстом двигают курсор; в пустом - переходят по списку.
        if (query) return
        next = nextEnabledCommand(flat, 0, 1)
        break
      case 'End':
        if (query) return
        next = nextEnabledCommand(flat, flat.length - 1, -1)
        break
      case 'Enter':
        e.preventDefault()
        if (active && !e.nativeEvent.isComposing) run(active)
        return
      default:
        return
    }
    e.preventDefault()
    const it = flat[next]
    if (it) setActiveId(it.id)
  }

  return (
    <div
      className="ev-modal-backdrop ev-cmdk-backdrop"
      data-ev-layer=""
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? t.commandPalette.label}
        tabIndex={-1}
        className={cx('ev-cmdk', className)}
      >
        <div className="ev-cmdk-head">
          <Search size={17} className="ev-cmdk-search-icon" aria-hidden="true" />
          <input
            className="ev-cmdk-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionDomId(listId, activeIndex) : undefined}
            aria-label={ariaLabel ?? t.commandPalette.label}
            placeholder={placeholder ?? t.commandPalette.placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-autofocus=""
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveId(null)
            }}
            onKeyDown={onKey}
          />
          <button type="button" className="ev-cmdk-close" aria-label={t.common.close} data-dialog-close="" onClick={close}>
            <X size={16} />
          </button>
        </div>
        <div id={listId} role="listbox" aria-label={ariaLabel ?? t.commandPalette.label} className="ev-cmdk-list">
          {groups.map((g, gi) => {
            const headId = `${listId}-g${gi}`
            const options = g.items.map((it) => (
              <div
                key={it.id}
                id={optionDomId(listId, flat.indexOf(it))}
                role="option"
                aria-selected={it === active}
                aria-disabled={it.disabled || undefined}
                className="ev-cmdk-item"
                data-active={it === active || undefined}
                onPointerMove={() => !it.disabled && it !== active && setActiveId(it.id)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => run(it)}
              >
                {it.icon ? (
                  <span className="ev-cmdk-item-icon" aria-hidden="true">
                    {it.icon}
                  </span>
                ) : null}
                <span className="ev-cmdk-item-label">{it.label}</span>
                {it.hint ? <span className="ev-cmdk-item-hint">{it.hint}</span> : null}
              </div>
            ))
            if (g.group === undefined) {
              return (
                <div key={`g${gi}`} role="group" className="ev-cmdk-group">
                  {options}
                </div>
              )
            }
            return (
              <div key={`g${gi}`} role="presentation" className="ev-cmdk-group">
                <div id={headId} className="ev-cmdk-group-label" aria-hidden="true">
                  {g.group}
                </div>
                <div role="group" aria-labelledby={headId}>
                  {options}
                </div>
              </div>
            )
          })}
        </div>
        <div className="ev-cmdk-empty" role="status">
          {flat.length === 0 ? (emptyText ?? t.common.nothingFound) : null}
        </div>
        <div className="ev-cmdk-foot">
          <div className="ev-cmdk-foot-left">{footer}</div>
          <div className="ev-cmdk-hints" aria-hidden="true">
            <span className="ev-cmdk-hint">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {t.commandPalette.hintNavigate}
            </span>
            <span className="ev-cmdk-hint">
              <Kbd>↵</Kbd>
              {t.commandPalette.hintSelect}
            </span>
            <span className="ev-cmdk-hint">
              <Kbd>Esc</Kbd>
              {t.commandPalette.hintClose}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
