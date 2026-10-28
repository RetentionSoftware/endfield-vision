'use client'

import { ChevronDown } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import type { Messages } from '../lib/i18n-messages'
import { UiLink } from '../lib/link'
import type { Tone } from './Display'
import { Popover } from './Popover'
import { Tooltip } from './Tooltip'

/*
 * Полнота и состояние данных сущности: бейдж «Заполнено» / «Не заполнено: N» /
 * «Истекает срок» / «Просрочено» / «Блокирует выпуск» и подсказка с группами:
 * блокирует, просрочено, истекает, не заполнено. С onItemClick бейдж - кнопка:
 * по нажатию - список-поповер, пункт переводит к полю (открыть блок на правку,
 * прокрутить к строке). С href бейдж - ссылка (например в карточку записи).
 */

export interface CompletenessField {
  /** Ключ поля: его получает onItemClick. */
  key: string
  label: ReactNode
}

/** Пункт группы: причина блокировки, просроченный или истекающий срок. */
export interface CompletenessItem {
  /** Ключ: с ним пункт можно нажать (onItemClick). */
  key?: string
  label: ReactNode
  /** Срок: «до 12.11.2026». */
  date?: ReactNode
}

/** Истекающий срок - то же, что CompletenessItem. */
export type CompletenessExpiringItem = CompletenessItem

export type CompletenessSeverity = 'warning' | 'danger'
export type CompletenessTone = 'success' | 'warning' | 'danger'

/**
 * Тон бейджа: есть блокирующие причины или просроченные сроки (dangerCount) -
 * danger; есть незаполненные - severity (warning по умолчанию); только
 * истекающие сроки - warning, иначе success.
 */
export function completenessTone(
  missingCount: number,
  expiringCount: number,
  severity: CompletenessSeverity = 'warning',
  dangerCount = 0,
): CompletenessTone {
  if (dangerCount > 0) return 'danger'
  if (missingCount > 0) return severity
  if (expiringCount > 0) return 'warning'
  return 'success'
}

export interface CompletenessBadgeProps {
  /** Причины, по которым запись не допускается к работе: тон danger, первая группа. Строка - она же ключ. */
  blocking?: Array<string | CompletenessItem>
  /** Просроченные сроки: тон danger. Строка - она же ключ. */
  expired?: Array<string | CompletenessItem>
  /** Истекающие сроки (документы, допуски). */
  expiring?: CompletenessExpiringItem[]
  /** Незаполненные поля: строка (она же ключ) или { key, label }. */
  missing?: Array<string | CompletenessField>
  /** Тон при незаполненных полях: warning (не мешает работе) или danger (блокирует). */
  severity?: CompletenessSeverity
  /** Подпись, когда всё заполнено. По умолчанию - «Заполнено». */
  completeLabel?: ReactNode
  /** Своя подпись бейджа поверх вычисленной - и при пустых группах (например «Заблокирован»). */
  label?: ReactNode
  /** Свой тон бейджа поверх вычисленного - и при пустых группах. */
  tone?: Tone
  /** Переход к полю: бейдж становится кнопкой со списком. */
  onItemClick?: (key: string) => void
  /** Бейдж-ссылка (например в карточку записи), группы - в подсказке. Вместе с onItemClick и группами побеждает onItemClick. */
  href?: string
  size?: 'sm' | 'md'
  className?: string
}

function toField(f: string | CompletenessField): CompletenessField {
  return typeof f === 'string' ? { key: f, label: f } : f
}

function toItem(f: string | CompletenessItem): CompletenessItem {
  return typeof f === 'string' ? { key: f, label: f } : f
}

interface Group {
  id: 'blocking' | 'expired' | 'expiring' | 'missing'
  title: string
  items: CompletenessItem[]
}

function Details({ groups, onPick }: { groups: Group[]; onPick?: (key: string) => void }) {
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
      {groups.map((g) => (
        <div key={g.id} className="ev-completeness-group" data-group={g.id}>
          <div className="ev-completeness-title">{g.title}</div>
          <ul className="ev-completeness-list" role="list">
            {g.items.map((e, i) => (
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
      ))}
    </div>
  )
}

/** Группы подсказки в порядке важности: блокирует, просрочено, истекает, не заполнено. */
function buildGroups(
  t: Messages,
  blocking: CompletenessItem[],
  expired: CompletenessItem[],
  expiring: CompletenessItem[],
  missing: CompletenessField[],
): Group[] {
  const all: Group[] = [
    { id: 'blocking', title: t.completeness.blockingTitle, items: blocking },
    { id: 'expired', title: t.completeness.expired, items: expired },
    { id: 'expiring', title: t.completeness.expiring, items: expiring },
    { id: 'missing', title: t.completeness.missingTitle, items: missing },
  ]
  return all.filter((g) => g.items.length > 0)
}

export function CompletenessBadge({
  blocking: blockingProp,
  expired: expiredProp,
  expiring: expiringProp,
  missing: missingProp,
  severity = 'warning',
  completeLabel,
  label: labelProp,
  tone: toneProp,
  onItemClick,
  href,
  size = 'md',
  className,
}: CompletenessBadgeProps) {
  const t = useMessages()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const blocking = (blockingProp ?? []).map(toItem)
  const expired = (expiredProp ?? []).map(toItem)
  const expiring = expiringProp ?? []
  const missing = (missingProp ?? []).map(toField)
  const groups = buildGroups(t, blocking, expired, expiring, missing)
  const tone = toneProp ?? completenessTone(missing.length, expiring.length, severity, blocking.length + expired.length)
  const hasDetails = groups.length > 0
  const computedLabel =
    blocking.length > 0
      ? t.completeness.blockingTitle
      : expired.length > 0
        ? t.completeness.expired
        : missing.length > 0
          ? t.completeness.missing(missing.length)
          : expiring.length > 0
            ? t.completeness.expiring
            : (completeLabel ?? t.completeness.complete)
  const label = labelProp ?? computedLabel

  const inner = (
    <>
      <span className="ev-badge-dot" aria-hidden="true" />
      <span className="ev-completeness-label">{label}</span>
    </>
  )

  const details = <Details groups={groups} />

  // Ссылка: группы - в подсказке у ссылки (она и так фокусируется).
  if (href !== undefined && !(onItemClick && hasDetails)) {
    const link = (
      <UiLink href={href} className={cx('ev-badge ev-completeness ev-completeness-link', className)} data-tone={tone} data-size={size}>
        {inner}
      </UiLink>
    )
    return hasDetails ? <Tooltip content={details}>{link}</Tooltip> : link
  }

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
        <Details groups={groups} onPick={pick} />
      </Popover>
    )
  }

  return (
    <Tooltip content={details}>
      <span className={cx('ev-badge ev-completeness', className)} data-tone={tone} data-size={size} tabIndex={0}>
        {inner}
      </span>
    </Tooltip>
  )
}
