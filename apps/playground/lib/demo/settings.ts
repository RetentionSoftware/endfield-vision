/*
 * Демо-данные настроек: профиль, уведомления, сеансы, ключи API.
 * Детерминированные: без Math.random и Date.now при рендере.
 */

import { bi, type Bi, type Lang } from '@/lib/lang'

export const WORKSPACE_NAME = 'endfield-ops'

export interface Profile {
  name: string
  email: string
  /** E.164. */
  phone: string
  position: string
  timezone: string
  language: string
}

/** Текстовые поля профиля по умолчанию - на двух языках. */
export const PROFILE_TEXT = {
  name: bi('Алина Воронцова', 'Alina Vorontsova'),
  position: bi('Директор по операциям', 'Head of operations'),
}

/** Исходный профиль на нужном языке (форма редактирует обычные строки). */
export function profileFor(lang: Lang): Profile {
  return {
    name: PROFILE_TEXT.name[lang],
    email: 'a.vorontsova@endfield.dev',
    phone: '+79215550417',
    position: PROFILE_TEXT.position[lang],
    timezone: 'Europe/Moscow',
    language: lang,
  }
}

/*
 * Фото профиля для демо: SVG-портрет, собранный в коде (без внешних картинок).
 * Картинка в <img> не видит CSS-переменные страницы, поэтому цвета - литералами
 * внутри data URI. Не загрузилось - Avatar покажет инициалы.
 */
const PORTRAIT_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0" stop-color="#3b5b7a"/><stop offset="1" stop-color="#1f3347"/>',
  '</linearGradient></defs>',
  '<rect width="64" height="64" fill="url(#bg)"/>',
  '<path d="M18 30c0-10 6-17 14-17s14 7 14 17v12H18z" fill="#2a1d18"/>',
  '<path d="M8 64c2-12 12-18 24-18s22 6 24 18z" fill="#c9d6e2"/>',
  '<rect x="27" y="38" width="10" height="10" rx="4" fill="#e3b597"/>',
  '<ellipse cx="32" cy="29" rx="10" ry="12" fill="#efc4a6"/>',
  '<path d="M21 28c1-9 6-13 12-13 6 0 10 5 10 11-5-1-10-4-12-8-2 5-6 8-10 10z" fill="#2a1d18"/>',
  '</svg>',
].join('')

export const PROFILE_PHOTO = `data:image/svg+xml,${encodeURIComponent(PORTRAIT_SVG)}`

export const TIMEZONES: Array<{ value: string; label: Bi; hint: string }> = [
  { value: 'Europe/Kaliningrad', label: bi('Калининград', 'Kaliningrad'), hint: 'UTC+2' },
  { value: 'Europe/Moscow', label: bi('Москва', 'Moscow'), hint: 'UTC+3' },
  { value: 'Europe/Samara', label: bi('Самара', 'Samara'), hint: 'UTC+4' },
  { value: 'Asia/Yekaterinburg', label: bi('Екатеринбург', 'Yekaterinburg'), hint: 'UTC+5' },
  { value: 'Asia/Omsk', label: bi('Омск', 'Omsk'), hint: 'UTC+6' },
  { value: 'Asia/Novosibirsk', label: bi('Новосибирск', 'Novosibirsk'), hint: 'UTC+7' },
  { value: 'Asia/Irkutsk', label: bi('Иркутск', 'Irkutsk'), hint: 'UTC+8' },
  { value: 'Asia/Yakutsk', label: bi('Якутск', 'Yakutsk'), hint: 'UTC+9' },
  { value: 'Asia/Vladivostok', label: bi('Владивосток', 'Vladivostok'), hint: 'UTC+10' },
  { value: 'Asia/Magadan', label: bi('Магадан', 'Magadan'), hint: 'UTC+11' },
]

export const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

/* --- Уведомления --- */

export interface NotificationRule {
  id: string
  label: Bi
  description: Bi
  on: boolean
}

export interface NotificationGroup {
  id: string
  title: Bi
  description: Bi
  rules: NotificationRule[]
}

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    id: 'incidents',
    title: bi('Инциденты', 'Incidents'),
    description: bi('Аварии, остановки и отклонения на объектах.', 'Failures, stoppages and deviations at facilities.'),
    rules: [
      { id: 'inc-critical', label: bi('Критические инциденты', 'Critical incidents'), description: bi('Сразу, в том числе в тихие часы.', 'Immediately, including during quiet hours.'), on: true },
      { id: 'inc-major', label: bi('Серьёзные инциденты', 'Major incidents'), description: bi('Перегрев, падение выпуска, отклонение качества.', 'Overheating, output drops, quality deviations.'), on: true },
      { id: 'inc-closed', label: bi('Закрытие инцидентов', 'Incident closure'), description: bi('Итог расследования и время простоя.', 'Investigation outcome and downtime.'), on: false },
    ],
  },
  {
    id: 'tasks',
    title: bi('Задачи', 'Tasks'),
    description: bi('Поручения, согласования и сроки.', 'Assignments, approvals and due dates.'),
    rules: [
      { id: 'task-assigned', label: bi('Назначена задача', 'Task assigned'), description: bi('Вы стали исполнителем или согласующим.', 'You became the assignee or an approver.'), on: true },
      { id: 'task-due', label: bi('Приближается срок', 'Due date approaching'), description: bi('За сутки и за 2 часа до срока.', '1 day and 2 hours before the due date.'), on: true },
      { id: 'task-mention', label: bi('Упоминания', 'Mentions'), description: bi('Вас отметили в комментарии.', 'Someone mentioned you in a comment.'), on: true },
    ],
  },
  {
    id: 'finance',
    title: bi('Финансы', 'Finance'),
    description: bi('Счета, оплаты и бюджеты объектов.', 'Invoices, payments and facility budgets.'),
    rules: [
      { id: 'fin-overdue', label: bi('Просроченные счета', 'Overdue invoices'), description: bi('Контрагент не оплатил счёт в срок.', 'A counterparty missed an invoice due date.'), on: true },
      { id: 'fin-budget', label: bi('Превышение бюджета', 'Budget overrun'), description: bi('Расходы объекта превысили 90% лимита.', 'Facility spending exceeded 90% of the limit.'), on: false },
    ],
  },
  {
    id: 'system',
    title: bi('Система', 'System'),
    description: bi('Безопасность и сводки.', 'Security and digests.'),
    rules: [
      { id: 'sys-login', label: bi('Вход с нового устройства', 'Sign-in from a new device'), description: bi('Нельзя отключить: требование безопасности.', 'Cannot be turned off: security requirement.'), on: true },
      { id: 'sys-digest', label: bi('Еженедельная сводка', 'Weekly digest'), description: bi('По понедельникам в 09:00.', 'Mondays at 09:00.'), on: true },
      { id: 'sys-updates', label: bi('Обновления консоли', 'Console updates'), description: bi('Новые разделы и изменения.', 'New sections and changes.'), on: false },
    ],
  },
]

/** Правила, которые нельзя выключить. */
export const LOCKED_RULES = new Set(['sys-login'])

export const CHANNELS = [
  { id: 'email', label: bi('Почта', 'Email'), description: bi('a.vorontsova@endfield.dev', 'a.vorontsova@endfield.dev') },
  { id: 'push', label: bi('Push в браузере', 'Browser push'), description: bi('На устройствах, где разрешены уведомления.', 'On devices where notifications are allowed.') },
  { id: 'sms', label: 'SMS', description: bi('Только критические инциденты.', 'Critical incidents only.') },
  { id: 'messenger', label: bi('Мессенджер', 'Messenger'), description: bi('Через бота компании.', 'Via the company bot.') },
] as const

export type ChannelId = (typeof CHANNELS)[number]['id']

/* --- Сеансы --- */

export interface Session {
  id: string
  device: string
  client: Bi | string
  location: Bi
  ip: string
  lastActive: Bi | string
  current: boolean
}

export const SESSIONS: Session[] = [
  { id: 's1', device: 'Windows 11', client: 'Chrome 141', location: bi('Москва', 'Moscow'), ip: '185.42.17.203', lastActive: bi('Сейчас', 'Now'), current: true },
  { id: 's2', device: 'iPhone 16', client: bi('Приложение Endfield', 'Endfield app'), location: bi('Москва', 'Moscow'), ip: '185.42.17.88', lastActive: '08.10.2026 07:52', current: false },
  { id: 's3', device: 'iPadOS 19', client: 'Safari', location: bi('Северодвинск', 'Severodvinsk'), ip: '93.170.44.12', lastActive: '06.10.2026 08:03', current: false },
  { id: 's4', device: 'macOS 26', client: 'Firefox 143', location: bi('Санкт-Петербург', 'Saint Petersburg'), ip: '46.39.230.71', lastActive: '29.09.2026 18:40', current: false },
]

/* --- Ключи API --- */

export type KeyScope = 'read' | 'write' | 'admin'

export const KEY_SCOPE: Record<KeyScope, { label: Bi; tone: 'neutral' | 'info' | 'warning' }> = {
  read: { label: bi('Чтение', 'Read'), tone: 'neutral' },
  write: { label: bi('Чтение и запись', 'Read and write'), tone: 'info' },
  admin: { label: bi('Полный доступ', 'Full access'), tone: 'warning' },
}

export interface ApiKey {
  id: string
  /** Демо-ключи - на двух языках, созданные в форме - строка как есть. */
  name: Bi | string
  /** Открытая часть ключа: по ней ключ ищут в журнале. */
  prefix: string
  last4: string
  scope: KeyScope
  createdAt: string
  lastUsed: string | null
  expiresAt: string | null
}

export const API_KEYS: ApiKey[] = [
  { id: 'k1', name: bi('Интеграция с ERP', 'ERP integration'), prefix: 'evk_live_7Hq2', last4: 'a1f3', scope: 'write', createdAt: '2026-03-14', lastUsed: '08.10.2026 08:10', expiresAt: null },
  { id: 'k2', name: bi('Дашборд диспетчерской', 'Control room dashboard'), prefix: 'evk_live_Rt9m', last4: '0c4e', scope: 'read', createdAt: '2026-06-02', lastUsed: '08.10.2026 08:14', expiresAt: '2027-06-02' },
  { id: 'k3', name: bi('Выгрузка в бухгалтерию', 'Accounting export'), prefix: 'evk_live_Kd31', last4: '77b0', scope: 'read', createdAt: '2026-08-21', lastUsed: '01.10.2026 03:00', expiresAt: '2026-11-19' },
  { id: 'k4', name: bi('Скрипты обслуживания', 'Maintenance scripts'), prefix: 'evk_live_Zp0x', last4: 'e925', scope: 'admin', createdAt: '2025-11-30', lastUsed: null, expiresAt: '2026-11-30' },
]
