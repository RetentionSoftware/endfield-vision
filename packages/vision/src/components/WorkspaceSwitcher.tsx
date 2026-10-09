'use client'

import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx, normalizeSearch } from '../lib/cx'
import { useEventCallback, useIsoLayoutEffect, useOutsideClick } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Portal, useEscapeLayer, useFloating, type Placement } from '../lib/overlay'
import { useAppShell } from './AppShell'
import { Avatar } from './Display'
import { findTypeaheadMatch } from './Menu'
import { Tooltip } from './Tooltip'

/*
 * Переключатель рабочего пространства (организация, филиал, проект, стенд).
 * Кнопка с логотипом и названием в шапке или в заголовке бокового меню;
 * список в портале с поиском, когда пространств больше searchThreshold.
 * В свёрнутом боковом меню - только логотип с подсказкой.
 * Клавиатура: стрелки, Home/End, Enter, поиск по первым буквам без поля поиска.
 */

export interface WorkspaceItem {
  id: string
  name: string
  /** Вторая строка: тариф, город, роль. Строка участвует в поиске. */
  description?: ReactNode
  /** Иконка или логотип; без неё и без avatar - инициалы. */
  icon?: ReactNode
  /** Картинка-логотип (src). */
  avatar?: string
  /** Метка справа: счётчик, «тест», «архив». */
  badge?: ReactNode
  disabled?: boolean
  /** Доп. слова для поиска (код, старое название). */
  keywords?: string[]
}

export interface WorkspaceSwitcherProps {
  items: WorkspaceItem[]
  /** id текущего пространства. */
  value: string
  onSwitch: (id: string) => void
  /** Только логотип (свёрнутое меню). По умолчанию - из AppShell. */
  collapsed?: boolean
  /** Поиск появляется, когда пунктов больше этого числа (по умолчанию 6). */
  searchThreshold?: number
  /** Действие под списком («Управление пространствами»); функция получает close(). */
  footer?: ReactNode | ((ctx: { close: () => void }) => ReactNode)
  placement?: Placement
  /** Подпись кнопки; по умолчанию - «Сменить рабочее пространство». */
  label?: string
  /** Заголовок списка над пунктами (например, «Организации»). */
  heading?: ReactNode
  /** Растянуть кнопку на ширину контейнера (заголовок бокового меню). */
  block?: boolean
  className?: string
}

/** Пункты, подходящие под запрос: название, строковое описание, ключевые слова; без учёта регистра и «ё». */
export function filterWorkspaces(items: WorkspaceItem[], query: string): WorkspaceItem[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return items
  return items.filter((it) => {
    const hay = normalizeSearch(
      [it.name, typeof it.description === 'string' ? it.description : '', ...(it.keywords ?? [])].join(' '),
    )
    return words.every((w) => hay.includes(w))
  })
}

function WorkspaceMark({ item, size }: { item: WorkspaceItem; size: number }) {
  if (item.icon) {
    return (
      <span className="ev-workspace-mark" style={{ width: size, height: size }} aria-hidden="true">
        {item.icon}
      </span>
    )
  }
  return <Avatar name={item.name} src={item.avatar} size={size} className="ev-workspace-avatar" />
}

function nextEnabled(list: WorkspaceItem[], from: number, dir: 1 | -1): number {
  const n = list.length
  if (n === 0) return -1
  for (let k = 0; k < n; k++) {
    const i = (((from + dir * k) % n) + n) % n
    if (!list[i]?.disabled) return i
  }
  return -1
}

export function WorkspaceSwitcher({
  items,
  value,
  onSwitch,
  collapsed: collapsedProp,
  searchThreshold = 6,
  footer,
  placement = 'bottom-start',
  label,
  heading,
  block = false,
  className,
}: WorkspaceSwitcherProps) {
  const t = useMessages()
  const shell = useAppShell()
  const collapsed = collapsedProp ?? shell.collapsed
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const typed = useRef({ text: '', at: 0 })
  const { style, side } = useFloating(triggerRef, popRef, { open, placement })

  const current = items.find((it) => it.id === value) ?? items[0]
  const searchable = items.length > searchThreshold
  const visible = searchable ? filterWorkspaces(items, query) : items
  const switchLabel = label ?? t.workspace.switch
  const optionId = (i: number) => `${listId}-o${i}`

  const close = useEventCallback((refocus: boolean) => {
    setOpen(false)
    setQuery('')
    setActive(-1)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  })

  const openList = () => {
    const idx = items.findIndex((it) => it.id === current?.id)
    setActive(idx >= 0 && !items[idx]?.disabled ? idx : nextEnabled(items, 0, 1))
    setOpen(true)
  }

  useOutsideClick([triggerRef, popRef], () => close(false), open)
  useEscapeLayer(open, () => close(true))

  // Фокус в поле поиска или в список после открытия.
  useIsoLayoutEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => (searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [open, searchable])

  // Активный пункт в зоне видимости при навигации стрелками.
  useIsoLayoutEffect(() => {
    if (!open || active < 0) return
    document.getElementById(`${listId}-o${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, listId])

  if (!current) return null

  const pick = (it: WorkspaceItem) => {
    if (it.disabled) return
    close(true)
    if (it.id !== current.id) onSwitch(it.id)
  }

  const onNavKey = (e: KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive(nextEnabled(visible, active + 1, 1))
        return
      case 'ArrowUp':
        e.preventDefault()
        setActive(nextEnabled(visible, active < 0 ? visible.length - 1 : active - 1, -1))
        return
      case 'Home':
        if (searchable) return
        e.preventDefault()
        setActive(nextEnabled(visible, 0, 1))
        return
      case 'End':
        if (searchable) return
        e.preventDefault()
        setActive(nextEnabled(visible, visible.length - 1, -1))
        return
      case 'Enter':
      case ' ': {
        if (e.key === ' ' && searchable) return
        e.preventDefault()
        const it = visible[active]
        if (it) pick(it)
        return
      }
      case 'Tab':
        close(false)
        return
      default:
        break
    }
    if (searchable || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    const now = Date.now()
    const text = (now - typed.current.at > 500 ? '' : typed.current.text) + e.key
    typed.current = { text, at: now }
    const candidates = visible.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    const hit = findTypeaheadMatch(
      visible.map((it) => it.name),
      candidates,
      active,
      text,
    )
    if (hit >= 0) {
      e.preventDefault()
      setActive(hit)
    }
  }

  // Один пункт - переключать некуда: просто подпись.
  if (items.length < 2) {
    if (collapsed) {
      return (
        <Tooltip content={current.name} placement="right">
          <div
            className={cx('ev-workspace', className)}
            data-collapsed=""
            data-static=""
            role="img"
            tabIndex={0}
            aria-label={`${t.workspace.label}: ${current.name}`}
          >
            <WorkspaceMark item={current} size={28} />
          </div>
        </Tooltip>
      )
    }
    return (
      <div className={cx('ev-workspace', className)} data-static="" data-block={block || undefined}>
        <WorkspaceMark item={current} size={24} />
        <span className="ev-workspace-titles">
          <span className="ev-workspace-name">{current.name}</span>
          {current.description ? <span className="ev-workspace-desc">{current.description}</span> : null}
        </span>
      </div>
    )
  }

  const activeId = open && active >= 0 && visible[active] ? optionId(active) : undefined

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={cx('ev-workspace', 'ev-workspace-trigger', className)}
      data-collapsed={collapsed || undefined}
      data-block={block || undefined}
      data-open={open || undefined}
      aria-label={`${switchLabel}: ${current.name}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      onClick={() => (open ? close(false) : openList())}
      onKeyDown={(e) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault()
          openList()
        }
      }}
    >
      <WorkspaceMark item={current} size={collapsed ? 28 : 24} />
      {!collapsed ? (
        <>
          <span className="ev-workspace-titles">
            <span className="ev-workspace-name">{current.name}</span>
            {current.description ? <span className="ev-workspace-desc">{current.description}</span> : null}
          </span>
          <ChevronsUpDown size={15} className="ev-workspace-caret" aria-hidden="true" />
        </>
      ) : null}
    </button>
  )

  return (
    <>
      {collapsed ? (
        <Tooltip content={current.name} placement="right">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      {open ? (
        <Portal>
          <div
            ref={popRef}
            className="ev-select-pop ev-workspace-pop"
            data-ev-layer=""
            data-side={side}
            style={style}
          >
            {searchable ? (
              <div className="ev-select-search">
                <Search size={14} className="ev-workspace-search-icon" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  aria-label={t.workspace.search}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t.workspace.search}
                  value={query}
                  onChange={(e) => {
                    const q = e.target.value
                    setQuery(q)
                    setActive(nextEnabled(filterWorkspaces(items, q), 0, 1))
                  }}
                  onKeyDown={onNavKey}
                />
              </div>
            ) : null}
            {heading ? (
              <div className="ev-select-group" aria-hidden="true">
                {heading}
              </div>
            ) : null}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={searchable ? undefined : -1}
              aria-label={t.workspace.label}
              aria-activedescendant={searchable ? undefined : activeId}
              className="ev-select-listbox"
              onKeyDown={searchable ? undefined : onNavKey}
            >
              {visible.length === 0 ? (
                <div className="ev-select-empty" role="presentation">
                  {t.common.nothingFound}
                </div>
              ) : (
                visible.map((it, i) => {
                  const isCurrent = it.id === current.id
                  return (
                    <div
                      key={it.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isCurrent}
                      aria-disabled={it.disabled || undefined}
                      className="ev-select-option ev-workspace-option"
                      data-active={i === active || undefined}
                      data-current={isCurrent || undefined}
                      onPointerMove={() => !it.disabled && i !== active && setActive(i)}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => pick(it)}
                    >
                      <WorkspaceMark item={it} size={28} />
                      <span className="ev-select-option-body">
                        <span className="ev-select-option-label">{it.name}</span>
                        {it.description ? <span className="ev-select-option-hint">{it.description}</span> : null}
                      </span>
                      {it.badge !== undefined && it.badge !== null ? <span className="ev-workspace-badge">{it.badge}</span> : null}
                      {isCurrent ? (
                        <span className="ev-workspace-current">
                          <Check size={14} aria-hidden="true" />
                          <span>{t.workspace.current}</span>
                        </span>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
            {footer ? (
              <div className="ev-workspace-footer">{typeof footer === 'function' ? footer({ close: () => close(true) }) : footer}</div>
            ) : null}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
