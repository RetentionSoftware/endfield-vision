'use client'

import { ChevronDown } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import type { Messages } from '../lib/i18n-messages'
import { Popover } from './Popover'
import { Tooltip } from './Tooltip'

/*
 * Полнота данных сущности: бейдж «Заполнено» / «Не заполнено: N» /
 * «Истекает срок» и подсказка со списком незаполненных полей и истекающих
 * сроков. С onItemClick бейдж - кнопка: по нажатию - список-поповер, пункт
 * переводит к полю (открыть блок на правку, прокрутить к строке).
 */

export interface CompletenessField {
  /** Ключ поля: его получает onItemClick. */
  key: string
  label: ReactNode
}

export interface CompletenessExpiringItem {
  /** Ключ: с ним пункт можно нажать (onItemClick). */
  key?: string
  label: ReactNode
  /** Срок: «до 12.11.2026». */
  date?: ReactNode
}

export type CompletenessSeverity = 'warning' | 'danger'
export type CompletenessTone = 'success' | 'warning' | 'danger'

/**
 * Тон бейджа: есть незаполненные - severity (warning по умолчанию),
 * только истекающие сроки - warning, иначе success.
 */
export function completenessTone(missingCount: number, expiringCount: number, severity: CompletenessSeverity = 'warning'): CompletenessTone {
  if (missingCount > 0) return severity
  if (expiringCount > 0) return 'warning'
  return 'success'
}

export interface CompletenessBadgeProps {
  /** Незаполненные поля: строка (она же ключ) или { key, label }. */
  missing?: Array<string | CompletenessField>
  /** Истекающие сроки (документы, допуски). */
  expiring?: CompletenessExpiringItem[]
  /** Тон при незаполненных полях: warning (не мешает работе) или danger (блокирует). */
  severity?: CompletenessSeverity
  /** Подпись, когда всё заполнено. По умолчанию - «Заполнено». */
  completeLabel?: ReactNode
  /** Своя подпись бейджа при незаполненных полях или сроках. */
  label?: ReactNode
  /** Переход к полю: бейдж становится кнопкой со списком. */
  onItemClick?: (key: string) => void
  size?: 'sm' | 'md'
  className?: string
}

function toField(f: string | CompletenessField): CompletenessField {
  return typeof f === 'string' ? { key: f, label: f } : f
}

function Details({
  missing,
  expiring,
  t,
  onPick,
}: {
  missing: CompletenessField[]
  expiring: CompletenessExpiringItem[]
  t: Messages
  onPick?: (key: string) => void
}) {
  const item = (key: string | undefined, content: ReactNode) =>
    onPick && key !== undefined ? (
      <button type="button" className="ev-completeness-item" onClick={() => onPick(key)}>
        {content}
      </button>
    ) : (
      <span className="ev-completeness-item">{content}</span>
    )
  return (
    <div className="ev-completeness-details">
      {missing.length > 0 ? (
        <div className="ev-completeness-group">
          <div className="ev-completeness-title">{t.completeness.missingTitle}</div>
          <ul className="ev-completeness-list" role="list">
            {missing.map((f) => (
              <li key={f.key}>{item(f.key, f.label)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {expiring.length > 0 ? (
        <div className="ev-completeness-group">
          <div className="ev-completeness-title">{t.completeness.expiring}</div>
          <ul className="ev-completeness-list" role="list">
            {expiring.map((e, i) => (
              <li key={e.key ?? i}>
                {item(
                  e.key,
                  <>
                    <span>{e.label}</span>
                    {e.date ? <span className="ev-completeness-date ev-num">{e.date}</span> : null}
                  </>,
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function CompletenessBadge({
  missing: missingProp,
  expiring: expiringProp,
  severity = 'warning',
  completeLabel,
  label: labelProp,
  onItemClick,
  size = 'md',
  className,
}: CompletenessBadgeProps) {
  const t = useMessages()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const missing = (missingProp ?? []).map(toField)
  const expiring = expiringProp ?? []
  const tone = completenessTone(missing.length, expiring.length, severity)
  const hasDetails = missing.length > 0 || expiring.length > 0
  const label = !hasDetails
    ? (completeLabel ?? t.completeness.complete)
    : (labelProp ?? (missing.length > 0 ? t.completeness.missing(missing.length) : t.completeness.expiring))

  const inner = (
    <>
      <span className="ev-badge-dot" aria-hidden="true" />
      <span className="ev-completeness-label">{label}</span>
    </>
  )

  if (!hasDetails) {
    return (
      <span className={cx('ev-badge ev-completeness', className)} data-tone={tone} data-size={size}>
        {inner}
      </span>
    )
  }

  if (onItemClick) {
    const pick = (key: string) => {
      setOpen(false)
      onItemClick(key)
      // Обработчик не перевёл фокус к полю - фокус возвращается на бейдж, а не теряется.
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (!active || active === document.body) triggerRef.current?.focus({ preventScroll: true })
      })
    }
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        label={typeof label === 'string' ? label : t.completeness.missingTitle}
        className="ev-completeness-pop"
        trigger={
          <button
            ref={triggerRef}
            type="button"
            className={cx('ev-badge ev-completeness ev-completeness-btn', className)} data-tone={tone} data-size={size}>
            {inner}
            <ChevronDown size={12} aria-hidden="true" className="ev-completeness-chevron" />
          </button>
        }
      >
        <Details missing={missing} expiring={expiring} t={t} onPick={pick} />
      </Popover>
    )
  }

  return (
    <Tooltip content={<Details missing={missing} expiring={expiring} t={t} />}>
      <span className={cx('ev-badge ev-completeness', className)} data-tone={tone} data-size={size} tabIndex={0}>
        {inner}
      </span>
    </Tooltip>
  )
}
