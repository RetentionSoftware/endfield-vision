'use client'

import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMediaQuery } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import type { Messages } from '../lib/i18n-messages'

/*
 * Шаги мастера: где пользователь сейчас и сколько осталось. Маркер - номер,
 * галочка (выполнен) или крестик (ошибка), между маркерами - линия.
 * Горизонтальные шаги на узком экране сворачиваются в «Шаг 2 из 5» с
 * названием текущего шага и полосой из сегментов.
 */

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error'

export interface StepItem {
  id: string
  title: ReactNode
  /** Строка под названием. */
  description?: ReactNode
  /** Необязательный шаг: под названием - пометка «необязательно». */
  optional?: boolean
  /** Явный статус. Без него статус выводится из current. */
  status?: StepStatus
}

export interface StepsProps {
  items: StepItem[]
  /** Индекс текущего шага (с нуля): шаги до него - выполнены, после - впереди. */
  current?: number
  orientation?: 'horizontal' | 'vertical'
  /** Свернуть горизонтальные шаги в компактную строку на экране до 720px. По умолчанию - да. */
  collapsible?: boolean
  /** Переход по шагу: выполненные шаги и шаги с ошибкой становятся кнопками. */
  onStepClick?: (index: number) => void
  /** Подпись списка для скринридера. По умолчанию - «Шаги». */
  'aria-label'?: string
  className?: string
}

/** Статусы шагов: явный status шага важнее вычисленного из current. */
export function resolveStepStatuses(items: Pick<StepItem, 'status'>[], current?: number): StepStatus[] {
  return items.map((it, i) => {
    if (it.status) return it.status
    if (current === undefined) return 'upcoming'
    return i < current ? 'complete' : i === current ? 'current' : 'upcoming'
  })
}

/**
 * Индекс шага, о котором говорит компактная строка: текущий, иначе первый
 * с ошибкой, иначе первый невыполненный, иначе последний.
 */
export function focusStepIndex(statuses: StepStatus[]): number {
  const cur = statuses.indexOf('current')
  if (cur >= 0) return cur
  const err = statuses.indexOf('error')
  if (err >= 0) return err
  const next = statuses.findIndex((s) => s !== 'complete')
  return next >= 0 ? next : Math.max(0, statuses.length - 1)
}

function statusText(t: Messages, s: StepStatus): string | null {
  if (s === 'complete') return t.steps.completed
  if (s === 'current') return t.steps.current
  if (s === 'error') return t.steps.error
  return null
}

function Marker({ status, n }: { status: StepStatus; n: number }) {
  return (
    <span className="ev-step-marker" aria-hidden="true">
      {status === 'complete' ? (
        <Check size={14} strokeWidth={3} />
      ) : status === 'error' ? (
        <X size={14} strokeWidth={3} />
      ) : (
        <span className="ev-num">{n}</span>
      )}
    </span>
  )
}

export function Steps({
  items,
  current,
  orientation = 'horizontal',
  collapsible = true,
  onStepClick,
  'aria-label': ariaLabel,
  className,
}: StepsProps) {
  const t = useMessages()
  const narrow = useMediaQuery('(max-width: 720px)')
  const statuses = resolveStepStatuses(items, current)
  const label = ariaLabel ?? t.steps.label

  if (orientation === 'horizontal' && collapsible && narrow && items.length > 0) {
    const idx = focusStepIndex(statuses)
    const it = items[idx]
    const st = statuses[idx] ?? 'upcoming'
    const extra = statusText(t, st)
    return (
      <div className={cx('ev-steps', className)} data-orientation="compact" role="group" aria-label={label}>
        <div className="ev-steps-compact-head">
          <span className="ev-steps-compact-count ev-num">{t.steps.stepOf(idx + 1, items.length)}</span>
          {it?.optional ? <span className="ev-step-optional">{t.steps.optional}</span> : null}
        </div>
        <div className="ev-steps-compact-title" data-status={st}>
          {it?.title}
          {extra && st !== 'current' ? <span className="ev-visually-hidden">, {extra}</span> : null}
        </div>
        <div className="ev-steps-bar" aria-hidden="true">
          {statuses.map((s, i) => (
            <span key={items[i]?.id ?? i} className="ev-steps-bar-seg" data-status={s} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ol className={cx('ev-steps', className)} data-orientation={orientation} aria-label={label}>
      {items.map((it, i) => {
        const status = statuses[i] ?? 'upcoming'
        const extra = statusText(t, status)
        const clickable = Boolean(onStepClick) && (status === 'complete' || status === 'error')
        const body = (
          <>
            <Marker status={status} n={i + 1} />
            <span className="ev-step-text">
              <span className="ev-step-title">
                {it.title}
                {extra ? <span className="ev-visually-hidden">, {extra}</span> : null}
              </span>
              {it.optional ? <span className="ev-step-optional">{t.steps.optional}</span> : null}
              {it.description ? <span className="ev-step-desc">{it.description}</span> : null}
            </span>
          </>
        )
        return (
          <li
            key={it.id}
            className="ev-step"
            data-status={status}
            data-next-status={statuses[i + 1]}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            {clickable ? (
              <button type="button" className="ev-step-main" data-clickable="" onClick={() => onStepClick?.(i)}>
                {body}
              </button>
            ) : (
              <div className="ev-step-main">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
