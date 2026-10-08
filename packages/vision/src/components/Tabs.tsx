'use client'

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { UiLink } from '../lib/link'

export interface TabItem<V extends string = string> {
  value: V
  label: ReactNode
  icon?: ReactNode
  /** Счётчик справа от подписи. */
  count?: number
  disabled?: boolean
  /** Вкладка-ссылка: состояние вкладки живёт в адресе (маршрут или ?tab=). */
  href?: string
}

export interface TabsProps<V extends string = string> {
  value: V
  onChange?: (value: V) => void
  items: TabItem<V>[]
  /** line - подчёркивание (разделы страницы), pill - мягкие плашки (внутри панели). */
  variant?: 'line' | 'pill'
  /** Связка с TabPanel: id вкладок и панелей. */
  idBase?: string
  'aria-label'?: string
  className?: string
}

export function tabId(idBase: string, value: string) {
  return `${idBase}-tab-${value}`
}
export function tabPanelId(idBase: string, value: string) {
  return `${idBase}-panel-${value}`
}

/**
 * Вкладки. С href - ссылки (навигация, вкладка в адресе); без href -
 * role="tab" с переключением стрелками по шаблону WAI-ARIA.
 */
export function Tabs<V extends string = string>({ value, onChange, items, variant = 'line', idBase, className, ...aria }: TabsProps<V>) {
  const refs = useRef<Array<HTMLElement | null>>([])
  const isLinks = items.some((i) => i.href)

  const onKey = (e: KeyboardEvent, index: number) => {
    if (isLinks) return
    let dir = 0
    if (e.key === 'ArrowRight') dir = 1
    else if (e.key === 'ArrowLeft') dir = -1
    else if (e.key === 'Home') dir = -Infinity
    else if (e.key === 'End') dir = Infinity
    else return
    e.preventDefault()
    const n = items.length
    let target = -1
    if (dir === -Infinity) target = items.findIndex((i) => !i.disabled)
    else if (dir === Infinity) target = n - 1 - [...items].reverse().findIndex((i) => !i.disabled)
    else {
      for (let k = 1; k <= n; k++) {
        const i = (index + dir * k + n) % n
        if (!items[i]?.disabled) {
          target = i
          break
        }
      }
    }
    const it = items[target]
    if (it) {
      onChange?.(it.value)
      refs.current[target]?.focus()
    }
  }

  const Root = isLinks ? 'nav' : 'div'
  return (
    <Root className={cx('ev-tabs', className)} data-variant={variant} role={isLinks ? undefined : 'tablist'} {...aria}>
      {items.map((it, i) => {
        const active = it.value === value
        const content = (
          <>
            {it.icon ? <span className="ev-tab-icon">{it.icon}</span> : null}
            <span className="ev-tab-label">{it.label}</span>
            {it.count !== undefined ? <span className="ev-tab-count ev-num">{it.count}</span> : null}
          </>
        )
        if (it.href) {
          return (
            <UiLink
              key={it.value}
              href={it.href}
              className="ev-tab"
              data-active={active || undefined}
              aria-current={active ? 'page' : undefined}
              aria-disabled={it.disabled || undefined}
              onClick={(e) => {
                if (it.disabled) e.preventDefault()
                else onChange?.(it.value)
              }}
            >
              {content}
            </UiLink>
          )
        }
        return (
          <button
            key={it.value}
            ref={(n) => {
              refs.current[i] = n
            }}
            type="button"
            role="tab"
            id={idBase ? tabId(idBase, it.value) : undefined}
            aria-controls={idBase ? tabPanelId(idBase, it.value) : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={it.disabled}
            className="ev-tab"
            data-active={active || undefined}
            onClick={() => onChange?.(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {content}
          </button>
        )
      })}
    </Root>
  )
}

export function TabPanel({ idBase, value, children, className }: { idBase: string; value: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={tabPanelId(idBase, value)} aria-labelledby={tabId(idBase, value)} tabIndex={0} className={cx('ev-tabpanel', className)}>
      {children}
    </div>
  )
}
