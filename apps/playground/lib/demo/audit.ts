/*
 * Демо-данные журнала аудита: события за две недели (25.09-08.10.2026).
 * Генерируются из шаблонов по номеру события - без Math.random и Date.now.
 */

import type { Tone } from 'endfield-vision'
import { bi, type Bi } from '../lang'
import { FACILITIES, FACILITY_STATUS } from './facilities'
import { PEOPLE, ROLES } from './team'
import { PRIORITY, TASK_STATUS, TASKS } from './tasks'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export' | 'access'

/** Текст события: двуязычный или одинаковый на обоих языках (числа, коды). */
export type AuditText = Bi | string

export interface AuditChange {
  field: Bi
  before: AuditText | null
  after: AuditText | null
}

export interface AuditEvent {
  id: string
  /** ISO с временем (локальное время площадки). */
  at: string
  /** Сотрудник или 'system'. */
  actorId: string
  action: AuditAction
  objectType: Bi
  object: AuditText
  summary: Bi
  ip: string
  client: AuditText
  requestId: string
  changes: AuditChange[]
}

export const SYSTEM_ACTOR = 'system'

export const AUDIT_ACTIONS: Record<AuditAction, { label: Bi; tone: Tone }> = {
  create: { label: bi('Создание', 'Create'), tone: 'success' },
  update: { label: bi('Изменение', 'Update'), tone: 'info' },
  delete: { label: bi('Удаление', 'Delete'), tone: 'danger' },
  login: { label: bi('Вход', 'Sign-in'), tone: 'neutral' },
  export: { label: bi('Выгрузка', 'Export'), tone: 'violet' },
  access: { label: bi('Доступ', 'Access'), tone: 'warning' },
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
const STOCK: Array<[name: Bi, before: number, after: number]> = [
  [bi('Фильтр F7 592x592', 'F7 filter 592x592'), 120, 96],
  [bi('Реагент Р-14, канистра 20 л', 'Reagent R-14, 20 L canister'), 48, 36],
  [bi('Трос стальной 16 мм, м', 'Steel cable 16 mm, m'), 600, 450],
  [bi('Подшипник 6312-2RS', 'Bearing 6312-2RS'), 34, 40],
  [bi('Масло гидравлическое HVLP 46, л', 'Hydraulic oil HVLP 46, L'), 1800, 1520],
]
const EXPORTS = [
  bi('Отчёт по выпуску', 'Output report'),
  bi('Реестр задач', 'Task register'),
  bi('Остатки склада', 'Inventory stock'),
  bi('Табель смен', 'Shift timesheet'),
  bi('Энергопотребление', 'Energy consumption'),
]
const DELETED = [
  bi('Черновик отчёта', 'Report draft'),
  bi('Пропуск подрядчика', 'Contractor pass'),
  bi('Шаблон задачи', 'Task template'),
  bi('Позиция склада', 'Inventory item'),
  bi('Комментарий к задаче', 'Task comment'),
]

/* Подписи полей и типов объектов журнала. */
const F = {
  status: bi('Статус', 'Status'),
  priority: bi('Приоритет', 'Priority'),
  load: bi('Загрузка', 'Load'),
  stock: bi('Остаток', 'Stock'),
  reason: bi('Основание', 'Reason'),
  title: bi('Название', 'Title'),
  assignee: bi('Исполнитель', 'Assignee'),
  due: bi('Срок', 'Due date'),
  author: bi('Автор', 'Author'),
  format: bi('Формат', 'Format'),
  role: bi('Роль', 'Role'),
  facilities: bi('Объекты', 'Facilities'),
}
const TYPE = {
  task: bi('Задача', 'Task'),
  facility: bi('Объект', 'Facility'),
  stock: bi('Склад', 'Inventory'),
  record: bi('Запись', 'Record'),
  session: bi('Сессия', 'Session'),
  report: bi('Отчёт', 'Report'),
  person: bi('Сотрудник', 'Employee'),
}

/** Склейка двуязычных частей через пробел: код и название. */
function join(...parts: AuditText[]): Bi {
  const text = (lang: 'ru' | 'en') => parts.map((x) => (typeof x === 'string' ? x : x[lang])).join(' ')
  return bi(text('ru'), text('en'))
}

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
    client:
      actorId === SYSTEM_ACTOR
        ? bi('Планировщик, задание sync-facilities', 'Scheduler, sync-facilities job')
        : pick(CLIENTS, actorIdx + n),
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
          objectType: TYPE.task,
          object: join(t.id, t.title),
          summary: bi('Смена статуса задачи', 'Task status change'),
          changes: [
            { field: F.status, before: TASK_STATUS[from].label, after: TASK_STATUS[to].label },
            ...(n % 2 === 0
              ? [{ field: F.priority, before: PRIORITY.normal.label, after: PRIORITY.high.label }]
              : []),
          ],
        }
      }
      if (kind === 1) {
        const f = pick(FACILITIES, n)
        return {
          ...base,
          objectType: TYPE.facility,
          object: join(f.code, f.name),
          summary: bi('Обновление параметров объекта', 'Facility parameters updated'),
          changes: [
            { field: F.load, before: `${Math.max(0, f.load - 6 - (n % 9))}%`, after: `${f.load}%` },
            ...(n % 4 === 1
              ? [
                  {
                    field: F.status,
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
        objectType: TYPE.stock,
        object: name,
        summary: bi('Корректировка остатка', 'Stock adjustment'),
        changes: [
          { field: F.stock, before: String(before), after: String(after) },
          { field: F.reason, before: null, after: bi(`Акт ${1200 + n}`, `Adjustment report ${1200 + n}`) },
        ],
      }
    }
    case 'create': {
      const t = pick(TASKS, n * 3)
      const assignee = PEOPLE.find((p) => p.id === t.assigneeId)
      return {
        ...base,
        objectType: TYPE.task,
        object: join(t.id, t.title),
        summary: bi('Создана задача', 'Task created'),
        changes: [
          { field: F.title, before: null, after: t.title },
          { field: F.assignee, before: null, after: assignee?.name ?? null },
          { field: F.priority, before: null, after: PRIORITY[t.priority].label },
          { field: F.due, before: null, after: t.due.split('-').reverse().join('.') },
        ],
      }
    }
    case 'delete': {
      const what = pick(DELETED, n)
      const record = bi(`${what.ru} №${300 + n}`, `${what.en} #${300 + n}`)
      return {
        ...base,
        objectType: TYPE.record,
        object: record,
        summary: bi('Запись удалена', 'Record deleted'),
        changes: [
          { field: F.title, before: record, after: null },
          { field: F.author, before: pick(PEOPLE, n).name, after: null },
        ],
      }
    }
    case 'login':
      return {
        ...base,
        objectType: TYPE.session,
        object: bi('Вход в консоль', 'Console sign-in'),
        summary:
          n % 9 === 4
            ? bi('Вход из внешней сети', 'Sign-in from an external network')
            : bi('Успешный вход', 'Successful sign-in'),
        changes: [],
      }
    case 'export': {
      const what = pick(EXPORTS, n)
      return {
        ...base,
        objectType: TYPE.report,
        object: what,
        summary: bi(`Выгрузка: ${what.ru}`, `Export: ${what.en}`),
        changes: [{ field: F.format, before: null, after: n % 2 ? 'CSV' : 'XLSX' }],
      }
    }
    case 'access': {
      const p = pick(PEOPLE, n * 7)
      const roles = ['operator', 'engineer', 'manager', 'analyst'] as const
      const from = pick(roles, n)
      const to = pick(roles, n + 1)
      return {
        ...base,
        objectType: TYPE.person,
        object: p.name,
        summary: bi('Изменение роли и доступа', 'Role and access change'),
        changes: [
          { field: F.role, before: ROLES[from].label, after: ROLES[to].label },
          { field: F.facilities, before: '1', after: String(2 + (n % 3)) },
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
