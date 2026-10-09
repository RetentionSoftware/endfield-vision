'use client'

import { Children, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Badge, type Tone } from './Display'
import { Tooltip } from './Tooltip'

/*
 * Стопка бейджей со сворачиванием: видны первые max (порядок - по
 * значимости, его задаёт вызывающий), за ними «+K» с остальными в подсказке.
 * Для ячеек таблиц и шапок, где у записи несколько ролей или тегов.
 */

export interface BadgeStackItem {
  id: string
  label: ReactNode
  tone?: Tone
  icon?: ReactNode
}

/** Деление списка на видимую часть и остаток для «+K». max меньше нуля считается нулём. */
export function splitOverflow<T>(items: readonly T[], max: number): { visible: T[]; hidden: T[] } {
  const n = Math.max(0, Math.floor(max))
  return { visible: items.slice(0, n), hidden: items.slice(n) }
}

export interface BadgeStackProps {
  /** Бейджи данными. Вместо них можно передать children (Badge, Chip, StatusPill). */
  items?: BadgeStackItem[]
  children?: ReactNode
  /** Сколько показать до «+K» (по умолчанию 1). */
  max?: number
  size?: 'sm' | 'md'
  /** Что показать, когда список пуст. */
  empty?: ReactNode
  className?: string
}

export function BadgeStack({ items, children, max = 1, size = 'md', empty, className }: BadgeStackProps) {
  const t = useMessages()
  const nodes: ReactNode[] = items
    ? items.map((it) => (
        <Badge key={it.id} tone={it.tone} icon={it.icon} size={size}>
          {it.label}
        </Badge>
      ))
    : Children.toArray(children)
  if (nodes.length === 0) return empty ? <>{empty}</> : null
  const { visible, hidden } = splitOverflow(nodes, max)
  const tip = items ? (
    <span className="ev-badge-stack-tip">
      {splitOverflow(items, max).hidden.map((it) => (
        <span key={it.id}>{it.label}</span>
      ))}
    </span>
  ) : (
    <span className="ev-badge-stack-tip" data-nodes="">
      {hidden}
    </span>
  )
  return (
    <span className={cx('ev-badge-stack', className)} data-size={size}>
      {visible}
      {hidden.length > 0 ? (
        <Tooltip content={tip}>
          <span className="ev-badge ev-badge-stack-more" data-tone="neutral" data-size={size} tabIndex={0}>
            <span aria-hidden="true">+{hidden.length}</span>
            <span className="ev-visually-hidden">{t.badgeStack.more(hidden.length)}</span>
          </span>
        </Tooltip>
      ) : null}
    </span>
  )
}
