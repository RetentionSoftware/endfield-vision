'use client'

import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Tooltip } from './Tooltip'

/*
 * Состояние связи: точка + подпись. Цвет не единственный носитель смысла -
 * подпись есть всегда (в компактном виде - в подсказке и для скринридера).
 * Переподключение пульсирует; при prefers-reduced-motion анимацию гасит
 * общее правило base.css.
 */

export type ConnectionState = 'online' | 'degraded' | 'offline' | 'reconnecting'

export interface ConnectionStatusProps {
  status: ConnectionState
  /** Только точка; подпись - в подсказке и для скринридера. */
  compact?: boolean
  /** Своя подпись вместо стандартной («Нет интернета», «Сервер не отвечает»). */
  label?: ReactNode
  /** Подробности в подсказке: пинг, время последнего ответа. */
  detail?: ReactNode
  /** Клик по индикатору (например, окно с подробностями): элемент становится кнопкой. */
  onClick?: () => void
  className?: string
}

export function ConnectionStatus({
  status,
  compact = false,
  label,
  detail,
  onClick,
  className,
}: ConnectionStatusProps) {
  const t = useMessages()
  const text = label ?? t.connection[status]

  const content = (
    <>
      <span className="ev-conn-dot" aria-hidden="true" />
      {compact ? (
        <span className="ev-visually-hidden">{text}</span>
      ) : (
        <span className="ev-conn-label">{text}</span>
      )}
    </>
  )
  const inner = onClick ? (
    <button type="button" className="ev-conn-inner ev-conn-button" onClick={onClick}>
      {content}
    </button>
  ) : (
    // Компактный индикатор фокусируется с клавиатуры, чтобы подсказка открывалась не только мышью.
    <span className="ev-conn-inner" tabIndex={compact || detail ? 0 : undefined}>
      {content}
    </span>
  )
  const tip = compact ? (
    detail ? (
      <>
        <div>{text}</div>
        <div>{detail}</div>
      </>
    ) : (
      text
    )
  ) : (
    detail
  )

  return (
    <span
      className={cx('ev-conn', className)}
      data-status={status}
      data-compact={compact || undefined}
      role="status"
      aria-live="polite"
    >
      {tip ? <Tooltip content={tip}>{inner}</Tooltip> : inner}
    </span>
  )
}
