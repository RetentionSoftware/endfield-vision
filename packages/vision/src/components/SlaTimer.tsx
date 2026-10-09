'use client'

import { Hourglass, Timer, TriangleAlert } from 'lucide-react'
import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cx, EMPTY_VALUE } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import type { Messages } from '../lib/i18n-messages'
import { toDate, type DateInput } from '../lib/relative-time'
import { Tooltip } from './Tooltip'

/*
 * Таймер SLA: сколько прошло с момента (since) или сколько осталось до срока
 * (deadline). Тон по порогам: нейтральный, предупреждение, опасность; срок
 * прошёл - «просрочено на ...». Гидрация как у RelativeTime: серверный и
 * первый клиентский рендер считают от now, ход часов - только после монтирования.
 */

export type TimerTone = 'neutral' | 'warning' | 'danger'
export type TimerKind = 'elapsed' | 'countdown'

export interface TimerThresholds {
  /** Прошло не меньше - предупреждение (мс). */
  warnAfter?: number
  /** Прошло не меньше - опасность (мс). */
  dangerAfter?: number
  /** До срока осталось не больше - предупреждение (мс). */
  warnBefore?: number
  /** До срока осталось не больше - опасность (мс). Срок прошёл - опасность всегда. */
  dangerBefore?: number
}

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN

export interface FormatDurationOptions {
  /** Сколько единиц показывать, от старшей: 2 - «1 ч 05 мин», 1 - «1 ч». */
  parts?: 1 | 2
}

/**
 * Длительность по модулю: «2 д 3 ч», «1 ч 05 мин», «12 мин 05 с», «45 с».
 * Младшая единица после старшей - с ведущим нулём (минуты, секунды). Единицы
 * и формат чисел - из словаря (t.timer, t.intl).
 */
export function formatDuration(ms: number, t: Pick<Messages, 'timer' | 'intl'>, options: FormatDurationOptions = {}): string {
  if (!Number.isFinite(ms)) return EMPTY_VALUE
  const parts = options.parts ?? 2
  const total = Math.floor(Math.abs(ms) / SEC)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const num = (n: number) => n.toLocaleString(t.intl)
  const pad = (n: number) => String(n).padStart(2, '0')
  const u = t.timer
  if (d > 0) return parts === 1 || h === 0 ? `${num(d)} ${u.days}` : `${num(d)} ${u.days} ${h} ${u.hours}`
  if (h > 0) return parts === 1 ? `${h} ${u.hours}` : `${h} ${u.hours} ${pad(m)} ${u.minutes}`
  if (m > 0) return parts === 1 ? `${m} ${u.minutes}` : `${m} ${u.minutes} ${pad(s)} ${u.seconds}`
  return `${s} ${u.seconds}`
}

/**
 * Тон таймера. elapsed - ms прошло с начала: dangerAfter, затем warnAfter.
 * countdown - ms осталось до срока: меньше нуля (срок прошёл) - danger,
 * затем dangerBefore, warnBefore.
 */
export function timerTone(kind: TimerKind, ms: number, thresholds: TimerThresholds = {}): TimerTone {
  const { warnAfter, dangerAfter, warnBefore, dangerBefore } = thresholds
  if (kind === 'elapsed') {
    if (dangerAfter !== undefined && ms >= dangerAfter) return 'danger'
    if (warnAfter !== undefined && ms >= warnAfter) return 'warning'
    return 'neutral'
  }
  if (ms < 0) return 'danger'
  if (dangerBefore !== undefined && ms <= dangerBefore) return 'danger'
  if (warnBefore !== undefined && ms <= warnBefore) return 'warning'
  return 'neutral'
}

/** Период обновления: меньше часа - каждую секунду, дальше - раз в 30 секунд. */
export function timerTickInterval(ms: number): number {
  return Math.abs(ms) < HOUR ? SEC : 30 * SEC
}

interface TimerClock {
  subscribe: (cb: () => void, period: number) => () => void
  get: () => number | null
  /** Сколько прошло с первого чтения часов (момента монтирования). */
  offset: () => number
}

/** Часы таймера: время фиксируется при первом чтении и обновляется по интервалу. */
function createTimerClock(): TimerClock {
  let value: number | null = null
  let startedAt = 0
  const read = () => {
    if (value === null) {
      value = Date.now()
      startedAt = value
    }
    return value
  }
  return {
    subscribe(cb, period) {
      if (period <= 0) return () => undefined
      const id = window.setInterval(() => {
        read()
        value = Date.now()
        cb()
      }, period)
      return () => window.clearInterval(id)
    },
    get: read,
    offset: () => (value === null ? 0 : value - startedAt),
  }
}

const getServerSnapshot = () => null

export interface SlaTimerProps extends TimerThresholds {
  /** Начало отсчёта: таймер показывает, сколько прошло. */
  since?: DateInput
  /** Срок: таймер показывает, сколько осталось, после срока - просрочку. */
  deadline?: DateInput
  /**
   * Опорное «сейчас». С ним серверный и первый клиентский рендер совпадают;
   * после монтирования отсчёт идёт от него по часам браузера. Без него до
   * гидрации показывается дефис.
   */
  now?: DateInput
  /** Ход часов после монтирования (по умолчанию да). */
  live?: boolean
  /** Компактный вид: меньше и только длительность, полная фраза - в подсказке и aria-label. */
  compact?: boolean
  /** Свой тон вместо расчёта по порогам. */
  tone?: TimerTone
  /** Иконка слева; false - без иконки. */
  icon?: ReactNode | false
  className?: string
}

/**
 * Плашка таймера SLA. Цвет не единственный носитель смысла: просрочка - своя
 * иконка и текст «просрочено на ...».
 */
export function SlaTimer({
  since,
  deadline,
  now,
  live = true,
  compact = false,
  tone: toneProp,
  icon,
  className,
  ...thresholds
}: SlaTimerProps) {
  const t = useMessages()
  const [clock] = useState(createTimerClock)
  const kind: TimerKind = deadline !== undefined ? 'countdown' : 'elapsed'
  const target = toDate(kind === 'countdown' ? (deadline as DateInput) : (since ?? NaN))
  const anchor = now === undefined ? null : toDate(now)

  // Период зависит от текущей величины: считаем по опорному now, после монтирования - по часам.
  const [period, setPeriod] = useState(SEC)
  const subscribe = useCallback((cb: () => void) => clock.subscribe(cb, live ? period : 0), [clock, live, period])
  const clientNow = useSyncExternalStore<number | null>(subscribe, clock.get, getServerSnapshot)

  let current: number | null = null
  if (clientNow !== null) current = anchor ? anchor.getTime() + clock.offset() : clientNow
  else if (anchor) current = anchor.getTime()

  const ms = target && current !== null ? (kind === 'countdown' ? target.getTime() - current : current - target.getTime()) : null
  const nextPeriod = ms === null ? SEC : timerTickInterval(ms)
  if (live && nextPeriod !== period) setPeriod(nextPeriod)

  const overdue = kind === 'countdown' && ms !== null && ms < 0
  const tone = toneProp ?? (ms === null ? 'neutral' : timerTone(kind, ms, thresholds))
  const duration = ms === null ? EMPTY_VALUE : formatDuration(ms, t)
  const phrase =
    ms === null ? EMPTY_VALUE : kind === 'elapsed' ? duration : overdue ? t.timer.overdueBy(duration) : t.timer.left(duration)
  const shown = compact ? duration : phrase
  const glyph =
    icon === false ? null : (icon ?? (overdue ? <TriangleAlert size={13} /> : kind === 'countdown' ? <Hourglass size={13} /> : <Timer size={13} />))

  const chip = (
    <span
      className={cx('ev-timer', className)}
      role="timer"
      data-tone={tone}
      data-kind={kind}
      data-overdue={overdue || undefined}
      data-compact={compact || undefined}
      aria-label={compact && ms !== null ? phrase : undefined}
      tabIndex={compact && ms !== null ? 0 : undefined}
    >
      {glyph ? (
        <span className="ev-timer-icon" aria-hidden="true">
          {glyph}
        </span>
      ) : null}
      <span className="ev-timer-text ev-num">{shown}</span>
    </span>
  )
  return compact && ms !== null ? <Tooltip content={phrase}>{chip}</Tooltip> : chip
}
