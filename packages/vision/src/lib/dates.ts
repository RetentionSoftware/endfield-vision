/**
 * Даты без времени в формате 'YYYY-MM-DD' для полей и периодов.
 * Вся арифметика в локальном времени, сериализация вручную (без toISOString),
 * чтобы не ловить сдвиг часового пояса.
 * Без 'use client': пригоден для серверных компонентов.
 */

import { EMPTY_VALUE } from './cx'
import { toDate, type DateInput } from './relative-time'

export interface Ymd {
  y: number
  /** Месяц с 0. */
  m: number
  d: number
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function toIso(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`
}

export function parseIso(s: string | null | undefined): Ymd | null {
  if (!s) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = Number(match[3])
  const dt = new Date(y, m, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null
  return { y, m, d }
}

export function dateToIso(dt: Date): string {
  return toIso(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export function todayIso(): string {
  return dateToIso(new Date())
}

export function addDaysIso(iso: string, days: number): string {
  const p = parseIso(iso)
  if (!p) return iso
  return dateToIso(new Date(p.y, p.m, p.d + days))
}

export function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate()
}

/** День недели первого числа месяца: Пн = 0 ... Вс = 6. */
export function mondayFirstDow(y: number, m0: number): number {
  return (new Date(y, m0, 1).getDay() + 6) % 7
}

export function addMonths(y: number, m0: number, delta: number): { y: number; m: number } {
  const total = y * 12 + m0 + delta
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
}

/** 'YYYY-MM-DD' -> 'дд.мм.гггг' (формат полей дат на обоих языках). */
export function formatIsoDate(iso: string | null | undefined): string {
  const p = parseIso(iso)
  return p ? `${pad2(p.d)}.${pad2(p.m + 1)}.${p.y}` : ''
}

/** @deprecated Используйте formatIsoDate. */
export const formatIsoRu = formatIsoDate

/** Цифры маски «ддммгггг» <-> ISO. */
export function isoToDateDigits(iso: string): string {
  const p = parseIso(iso)
  return p ? `${pad2(p.d)}${pad2(p.m + 1)}${p.y}` : ''
}

export function dateDigitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null
  const iso = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
  return parseIso(iso) ? iso : null
}

export function formatDateDigits(digits: string): string {
  let out = digits.slice(0, 2)
  if (digits.length > 2) out += `.${digits.slice(2, 4)}`
  if (digits.length > 4) out += `.${digits.slice(4, 8)}`
  return out
}

export interface DateRange {
  from: string
  to: string
}

export interface DateRangePreset {
  id: string
  label: string
  range: () => DateRange
}

/** Типовые периоды отчётов. Все границы включительно. DateRangePicker подставляет подписи текущего языка. */
export const DEFAULT_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: 'today',
    label: 'Сегодня',
    range: () => ({ from: todayIso(), to: todayIso() }),
  },
  {
    id: 'last7',
    label: 'Последние 7 дней',
    range: () => ({ from: addDaysIso(todayIso(), -6), to: todayIso() }),
  },
  {
    id: 'last30',
    label: 'Последние 30 дней',
    range: () => ({ from: addDaysIso(todayIso(), -29), to: todayIso() }),
  },
  {
    id: 'thisMonth',
    label: 'Этот месяц',
    range: () => {
      const n = new Date()
      return { from: toIso(n.getFullYear(), n.getMonth(), 1), to: toIso(n.getFullYear(), n.getMonth(), daysInMonth(n.getFullYear(), n.getMonth())) }
    },
  },
  {
    id: 'lastMonth',
    label: 'Прошлый месяц',
    range: () => {
      const n = new Date()
      const { y, m } = addMonths(n.getFullYear(), n.getMonth(), -1)
      return { from: toIso(y, m, 1), to: toIso(y, m, daysInMonth(y, m)) }
    },
  },
  {
    id: 'thisYear',
    label: 'Этот год',
    range: () => {
      const y = new Date().getFullYear()
      return { from: toIso(y, 0, 1), to: toIso(y, 11, 31) }
    },
  },
]

/* ------------------------------------------------------------------ */
/* Календарные дни: ключ, подпись «Сегодня / Вчера / 8 октября»,       */
/* группировка (ленты переписки и уведомлений)                         */
/* ------------------------------------------------------------------ */

/** Ключ календарного дня 'YYYY-MM-DD' в часовом поясе timeZone (по умолчанию - пояс среды); некорректная дата - ''. */
export function dayKey(date: DateInput, timeZone?: string): string {
  const d = toDate(date)
  if (!d) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Сдвиг ключа дня 'YYYY-MM-DD' на days календарных дней. */
export function shiftDayKey(key: string, days: number): string {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export interface DayLabelOptions {
  /** Опорное «сейчас»: без него нет «Сегодня» и «Вчера», только дата с годом. */
  now?: DateInput | null
  /** Локаль Intl (t.intl). */
  intl: string
  today: string
  yesterday: string
  timeZone?: string
}

/** Подпись дня: «Сегодня», «Вчера», «8 октября» (год - если не текущий). */
export function formatDayLabel(
  date: DateInput,
  { now, intl, today, yesterday, timeZone }: DayLabelOptions,
): string {
  const d = toDate(date)
  if (!d) return EMPTY_VALUE
  const key = dayKey(d, timeZone)
  const n = now === undefined || now === null ? null : toDate(now)
  const nowKey = n ? dayKey(n, timeZone) : null
  if (nowKey !== null) {
    if (key === nowKey) return today
    if (key === shiftDayKey(nowKey, -1)) return yesterday
  }
  const sameYear = nowKey !== null && nowKey.slice(0, 4) === key.slice(0, 4)
  return new Intl.DateTimeFormat(intl, {
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(d)
}

export interface DayGroup<T> {
  /** 'YYYY-MM-DD'. */
  key: string
  /** Дата первого элемента группы. */
  date: Date
  items: T[]
}

/** Группы по календарным дням в порядке первого появления; элементы с некорректной датой пропускаются. */
export function groupByDay<T>(
  items: readonly T[],
  getDate: (item: T) => DateInput,
  timeZone?: string,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  const byKey = new Map<string, DayGroup<T>>()
  for (const item of items) {
    const d = toDate(getDate(item))
    if (!d) continue
    const key = dayKey(d, timeZone)
    let g = byKey.get(key)
    if (!g) {
      g = { key, date: d, items: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    g.items.push(item)
  }
  return groups
}
