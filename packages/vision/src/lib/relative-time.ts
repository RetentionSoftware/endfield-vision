import { EMPTY_VALUE } from './cx'

/*
 * Относительное время: «5 минут назад», «через 2 дня», «только что».
 * Без 'use client': пригоден для серверных компонентов. Язык - строка intl
 * из словаря (t.intl), подпись «только что» - тоже из словаря.
 */

export type DateInput = Date | string | number

/** Дата из Date, ISO-строки или миллисекунд; некорректная - null. */
export function toDate(value: DateInput): Date | null {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Округление к ближайшему по модулю, не меньше 1: «0 минут назад» не бывает. */
function step(diff: number, unit: number): number {
  return Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) / unit))
}

/**
 * Пороги единиц:
 * - меньше 45 секунд - justNow;
 * - меньше 45 минут - минуты;
 * - меньше 22 часов - часы;
 * - меньше 7 дней - дни («вчера», «через 2 дня»);
 * - меньше 30 дней - недели;
 * - меньше 12 месяцев - месяцы (месяц - 30,44 дня);
 * - дальше - годы.
 */
export function formatRelativeTime(date: DateInput, now: DateInput, intl: string, justNow: string): string {
  const d = toDate(date)
  const n = toDate(now)
  if (!d || !n) return EMPTY_VALUE
  const diff = d.getTime() - n.getTime()
  const abs = Math.abs(diff)
  if (abs < 45 * SEC) return justNow
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' })
  if (abs < 45 * MIN) return rtf.format(step(diff, MIN), 'minute')
  if (abs < 22 * HOUR) return rtf.format(step(diff, HOUR), 'hour')
  const days = step(diff, DAY)
  if (Math.abs(days) < 7) return rtf.format(days, 'day')
  if (Math.abs(days) < 30) return rtf.format(step(diff, 7 * DAY), 'week')
  const months = step(diff, 30.4375 * DAY)
  if (Math.abs(months) < 12) return rtf.format(months, 'month')
  return rtf.format(step(diff, 365.25 * DAY), 'year')
}
