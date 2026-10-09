'use client'

import type { CSSProperties } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { splitOverflow } from './BadgeStack'
import { Avatar, type PresenceStatus, type Tone } from './Display'
import { Tooltip } from './Tooltip'

/*
 * Группа аватаров внахлёст: команда, участники, наблюдатели. Первые max
 * видны, остальные - в кружке «+K» с именами в подсказке. Имя каждого
 * аватара - в подсказке и для скринридера.
 */

export interface AvatarGroupItem {
  /** Ключ; по умолчанию - имя. */
  id?: string
  name: string
  src?: string
  tone?: Tone
  status?: PresenceStatus
}

export interface AvatarGroupProps {
  items: AvatarGroupItem[]
  /** Сколько аватаров показать до «+K» (по умолчанию 4). */
  max?: number
  /** Размер аватара, px (по умолчанию 28). */
  size?: number
  /** Подпись группы для скринридера: «Команда объекта». */
  label?: string
  className?: string
}

export function AvatarGroup({ items, max = 4, size = 28, label, className }: AvatarGroupProps) {
  const t = useMessages()
  if (items.length === 0) return null
  const { visible, hidden } = splitOverflow(items, max)
  return (
    <div
      className={cx('ev-avatar-group', className)}
      role="group"
      aria-label={label}
      style={{ '--ev-avatar-group-size': `${size}px` } as CSSProperties}
    >
      {visible.map((it) => (
        <Tooltip
          key={it.id ?? it.name}
          content={
            it.status ? (
              <span className="ev-avatar-group-tip">
                <span>{it.name}</span>
                <span className="ev-avatar-group-tip-muted">{t.presence[it.status]}</span>
              </span>
            ) : (
              it.name
            )
          }
        >
          <span className="ev-avatar-group-item">
            <Avatar name={it.name} src={it.src} tone={it.tone} status={it.status} size={size} alt={it.name} />
          </span>
        </Tooltip>
      ))}
      {hidden.length > 0 ? (
        <Tooltip
          content={
            <span className="ev-avatar-group-tip">
              {hidden.map((it) => (
                <span key={it.id ?? it.name}>{it.name}</span>
              ))}
            </span>
          }
        >
          <span
            className="ev-avatar-group-more"
            tabIndex={0}
            style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
          >
            <span aria-hidden="true">+{hidden.length}</span>
            <span className="ev-visually-hidden">{t.badgeStack.more(hidden.length)}</span>
          </span>
        </Tooltip>
      ) : null}
    </div>
  )
}
