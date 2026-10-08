'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { cx, EMPTY_VALUE } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { formatRelativeTime, toDate, type DateInput } from '../lib/relative-time'
import { Tooltip } from './Tooltip'

export interface RelativeTimeProps {
  date: DateInput
  /**
   * Опорное «сейчас». С ним серверный и первый клиентский рендер уже
   * относительные и совпадают. Без него до гидрации показывается полная дата,
   * после монтирования - относительное время по часам браузера.
   */
  now?: DateInput
  /**
   * Живое обновление, мс: после монтирования текст пересчитывается по часам
   * браузера с этим интервалом (в том числе при заданном now).
   */
  updateInterval?: number
  /** Подсказка с полной датой по наведению и фокусу (по умолчанию да; элемент получает tabIndex=0). */
  tooltip?: boolean
  /** Часовой пояс полной даты: одинаковый текст на сервере и в браузере ('Europe/Moscow'). */
  timeZone?: string
  className?: string
}

interface Clock {
  subscribe: (cb: () => void) => () => void
  get: () => number
}

/** Часы для useSyncExternalStore: время фиксируется при первом чтении и обновляется по интервалу. */
function createClock(interval: number | undefined): Clock {
  let value = 0
  return {
    subscribe(cb) {
      if (!interval || interval <= 0) return () => undefined
      const id = window.setInterval(() => {
        value = Date.now()
        cb()
      }, interval)
      return () => window.clearInterval(id)
    },
    get() {
      if (value === 0) value = Date.now()
      return value
    },
  }
}

const getServerNow = () => null

/**
 * Относительное время в <time dateTime>: «5 минут назад», «через 2 дня».
 * Полная дата - в подсказке. Гидрация: серверный рендер и первый клиентский
 * совпадают - либо относительное время от now, либо полная дата (если now не
 * задан); часы браузера включаются только после монтирования.
 */
export function RelativeTime({ date, now, updateInterval, tooltip = true, timeZone, className }: RelativeTimeProps) {
  const t = useMessages()
  const clock = useMemo(() => createClock(updateInterval), [updateInterval])
  const clientNow = useSyncExternalStore<number | null>(clock.subscribe, clock.get, getServerNow)

  const d = toDate(date)
  if (!d) return <span className={cx('ev-reltime', className)}>{EMPTY_VALUE}</span>

  const absolute = new Intl.DateTimeFormat(t.intl, { dateStyle: 'long', timeStyle: 'short', timeZone }).format(d)
  // Заданный now без живого обновления - всегда он; иначе после монтирования - часы браузера.
  const reference = now !== undefined && (!updateInterval || clientNow === null) ? now : clientNow
  const text = reference === null ? absolute : formatRelativeTime(d, reference, t.intl, t.relativeTime.justNow)

  const time = (
    <time
      className={cx('ev-reltime', className)}
      dateTime={d.toISOString()}
      tabIndex={tooltip ? 0 : undefined}
      // Полная дата без now и timeZone зависит от пояса сервера и браузера; после монтирования текст всё равно меняется.
      suppressHydrationWarning
    >
      {text}
    </time>
  )
  return tooltip ? <Tooltip content={absolute}>{time}</Tooltip> : time
}
