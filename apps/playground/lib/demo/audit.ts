/*
 * Демо-данные журнала аудита: события за две недели (25.09-08.10.2026).
 * Генерируются из шаблонов по номеру события - без Math.random и Date.now.
 */

import type { Tone } from 'endfield-vision'
import { FACILITIES, FACILITY_STATUS } from './facilities'
import { PEOPLE, ROLES } from './team'
import { PRIORITY, TASK_STATUS, TASKS } from './tasks'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export' | 'access'

export interface AuditChange {
  field: string
  before: string | null
  after: string | null
}

export interface AuditEvent {
  id: string
  /** ISO с временем (локальное время площадки). */
  at: string
  /** Сотрудник или 'system'. */
  actorId: string
  action: AuditAction
  objectType: string
  object: string
  summary: string
  ip: string
  client: string
  requestId: string
  changes: AuditChange[]
}

export const SYSTEM_ACTOR = 'system'

export const AUDIT_ACTIONS: Record<AuditAction, { label: string; tone: Tone }> = {
  create: { label: 'Создание', tone: 'success' },
  update: { label: 'Изменение', tone: 'info' },
  delete: { label: 'Удаление', tone: 'danger' },
  login: { label: 'Вход', tone: 'neutral' },
  export: { label: 'Выгрузка', tone: 'violet' },
  access: { label: 'Доступ', tone: 'warning' },
}

/** Дни журнала: 25.09-08.10. */
export const AUDIT_DAYS: string[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 25 + i))
  return d.toISOString().slice(0, 10)
})

const ACTORS = [
  'p07',
  'p21',
  'p01',
  'p03',
  'p04',
  'p10',
  'p14',
  'p09',
  'p11',
  'p02',
  'p13',
  'p19',
  SYSTEM_ACTOR,
]
const ACTION_CYCLE: AuditAction[] = [
  'update',
  'login',
  'update',
  'create',
  'update',
  'export',
  'login',
  'access',
  'update',
  'create',
  'delete',
  'update',
]
const CLIENTS = [
  'Chrome 129, Windows 11',
  'Firefox 131, Ubuntu 24.04',
  'Safari 18, macOS 15',
  'Endfield Mobile 3.4, Android 14',
  'Edge 129, Windows 10',
]
const STOCK = [
  ['Фильтр F7 592x592', 120, 96],
  ['Реагент Р-14, канистра 20 л', 48, 36],
  ['Трос стальной 16 мм, м', 600, 450],
  ['Подшипник 6312-2RS', 34, 40],
  ['Масло гидравлическое HVLP 46, л', 1800, 1520],
] as const
const EXPORTS = ['Отчёт по выпуску', 'Реестр задач', 'Остатки склада', 'Табель смен', 'Энергопотребление']
const DELETED = [
  'Черновик отчёта',
  'Пропуск подрядчика',
  'Шаблон задачи',
  'Позиция склада',
  'Комментарий к задаче',
]

function pick<T>(list: readonly T[], n: number): T {
  return list[((n % list.length) + list.length) % list.length]!
}

function build(n: number, at: string): AuditEvent {
  const actorId = pick(ACTORS, n * 5 + Math.floor(n / 3))
  let action = pick(ACTION_CYCLE, n)
  if (actorId === SYSTEM_ACTOR && (action === 'login' || action === 'access')) action = 'update'
  const actorIdx = ACTORS.indexOf(actorId)
  const ip =
    actorId === SYSTEM_ACTOR
      ? '10.0.0.5'
      : n % 9 === 4
        ? `185.71.${34 + (n % 5)}.${12 + (n % 40)}`
        : `10.20.${actorIdx + 1}.${20 + ((n * 3) % 60)}`
  const base = {
    id: `evt_${(0x5f3a91 + n * 7919).toString(16)}${((n * 37) % 256).toString(16).padStart(2, '0')}`,
    at,
    actorId,
    action,
    ip,
    client: actorId === SYSTEM_ACTOR ? 'Планировщик, задание sync-facilities' : pick(CLIENTS, actorIdx + n),
    requestId: `req-${(0xa1b2c + n * 104729).toString(36)}`,
  }

  switch (action) {
    case 'update': {
      const kind = n % 3
      if (kind === 0) {
        const t = pick(TASKS, n)
        const from = pick(['new', 'in_progress', 'review'] as const, n)
        const to = from === 'new' ? 'in_progress' : from === 'in_progress' ? 'review' : 'done'
        return {
          ...base,
          objectType: 'Задача',
          object: `${t.id} ${t.title}`,
          summary: 'Смена статуса задачи',
          changes: [
            { field: 'Статус', before: TASK_STATUS[from].label, after: TASK_STATUS[to].label },
            ...(n % 2 === 0
              ? [{ field: 'Приоритет', before: PRIORITY.normal.label, after: PRIORITY.high.label }]
              : []),
          ],
        }
      }
      if (kind === 1) {
        const f = pick(FACILITIES, n)
        return {
          ...base,
          objectType: 'Объект',
          object: `${f.code} ${f.name}`,
          summary: 'Обновление параметров объекта',
          changes: [
            { field: 'Загрузка', before: `${Math.max(0, f.load - 6 - (n % 9))}%`, after: `${f.load}%` },
            ...(n % 4 === 1
              ? [
                  {
                    field: 'Статус',
                    before: FACILITY_STATUS.online.label,
                    after: FACILITY_STATUS[f.status].label,
                  },
                ]
              : []),
          ],
        }
      }
      const [name, before, after] = pick(STOCK, n)
      return {
        ...base,
        objectType: 'Склад',
        object: name,
        summary: 'Корректировка остатка',
        changes: [
          { field: 'Остаток', before: String(before), after: String(after) },
          { field: 'Основание', before: null, after: `Акт ${1200 + n}` },
        ],
      }
    }
    case 'create': {
      const t = pick(TASKS, n * 3)
      const assignee = PEOPLE.find((p) => p.id === t.assigneeId)
      return {
        ...base,
        objectType: 'Задача',
        object: `${t.id} ${t.title}`,
        summary: 'Создана задача',
        changes: [
          { field: 'Название', before: null, after: t.title },
          { field: 'Исполнитель', before: null, after: assignee?.name ?? null },
          { field: 'Приоритет', before: null, after: PRIORITY[t.priority].label },
          { field: 'Срок', before: null, after: t.due.split('-').reverse().join('.') },
        ],
      }
    }
    case 'delete': {
      const what = pick(DELETED, n)
      return {
        ...base,
        objectType: 'Запись',
        object: `${what} №${300 + n}`,
        summary: 'Запись удалена',
        changes: [
          { field: 'Название', before: `${what} №${300 + n}`, after: null },
          { field: 'Автор', before: pick(PEOPLE, n).name, after: null },
        ],
      }
    }
    case 'login':
      return {
        ...base,
        objectType: 'Сессия',
        object: 'Вход в консоль',
        summary: n % 9 === 4 ? 'Вход из внешней сети' : 'Успешный вход',
        changes: [],
      }
    case 'export': {
      const what = pick(EXPORTS, n)
      return {
        ...base,
        objectType: 'Отчёт',
        object: what,
        summary: `Выгрузка: ${what}`,
        changes: [{ field: 'Формат', before: null, after: n % 2 ? 'CSV' : 'XLSX' }],
      }
    }
    case 'access': {
      const p = pick(PEOPLE, n * 7)
      const roles = ['operator', 'engineer', 'manager', 'analyst'] as const
      const from = pick(roles, n)
      const to = pick(roles, n + 1)
      return {
        ...base,
        objectType: 'Сотрудник',
        object: p.name,
        summary: 'Изменение роли и доступа',
        changes: [
          { field: 'Роль', before: ROLES[from].label, after: ROLES[to].label },
          { field: 'Объекты', before: '1', after: String(2 + (n % 3)) },
        ],
      }
    }
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** События от новых к старым. */
export const AUDIT_EVENTS: AuditEvent[] = (() => {
  const out: AuditEvent[] = []
  let n = 0
  AUDIT_DAYS.forEach((day, d) => {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const count = (weekend ? 3 : 8) + ((d * 7) % 5)
    for (let k = 0; k < count; k++) {
      // Сегодняшний день журнала идёт до 09:40 - «сейчас» демо-консоли.
      const span = d === AUDIT_DAYS.length - 1 ? 150 : 11 * 60
      const minutes = 7 * 60 + Math.floor((k * span) / count) + ((n * 17) % (span > 150 ? 40 : 10))
      out.push(build(n, `${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad((n * 23) % 60)}`))
      n++
    }
  })
  return out.reverse()
})()
