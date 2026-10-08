/*
 * Демо-данные настроек: профиль, уведомления, сеансы, ключи API.
 * Детерминированные: без Math.random и Date.now при рендере.
 */

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

export const PROFILE: Profile = {
  name: 'Алина Воронцова',
  email: 'a.vorontsova@endfield.dev',
  phone: '+79215550417',
  position: 'Директор по операциям',
  timezone: 'Europe/Moscow',
  language: 'ru',
}

export const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград', hint: 'UTC+2' },
  { value: 'Europe/Moscow', label: 'Москва', hint: 'UTC+3' },
  { value: 'Europe/Samara', label: 'Самара', hint: 'UTC+4' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург', hint: 'UTC+5' },
  { value: 'Asia/Omsk', label: 'Омск', hint: 'UTC+6' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск', hint: 'UTC+7' },
  { value: 'Asia/Irkutsk', label: 'Иркутск', hint: 'UTC+8' },
  { value: 'Asia/Yakutsk', label: 'Якутск', hint: 'UTC+9' },
  { value: 'Asia/Vladivostok', label: 'Владивосток', hint: 'UTC+10' },
  { value: 'Asia/Magadan', label: 'Магадан', hint: 'UTC+11' },
]

export const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'uz', label: 'Oʻzbekcha' },
]

/* --- Уведомления --- */

export interface NotificationRule {
  id: string
  label: string
  description: string
  on: boolean
}

export interface NotificationGroup {
  id: string
  title: string
  description: string
  rules: NotificationRule[]
}

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    id: 'incidents',
    title: 'Инциденты',
    description: 'Аварии, остановки и отклонения на объектах.',
    rules: [
      { id: 'inc-critical', label: 'Критические инциденты', description: 'Сразу, в том числе в тихие часы.', on: true },
      { id: 'inc-major', label: 'Серьёзные инциденты', description: 'Перегрев, падение выпуска, отклонение качества.', on: true },
      { id: 'inc-closed', label: 'Закрытие инцидентов', description: 'Итог расследования и время простоя.', on: false },
    ],
  },
  {
    id: 'tasks',
    title: 'Задачи',
    description: 'Поручения, согласования и сроки.',
    rules: [
      { id: 'task-assigned', label: 'Назначена задача', description: 'Вы стали исполнителем или согласующим.', on: true },
      { id: 'task-due', label: 'Приближается срок', description: 'За сутки и за 2 часа до срока.', on: true },
      { id: 'task-mention', label: 'Упоминания', description: 'Вас отметили в комментарии.', on: true },
    ],
  },
  {
    id: 'finance',
    title: 'Финансы',
    description: 'Счета, оплаты и бюджеты объектов.',
    rules: [
      { id: 'fin-overdue', label: 'Просроченные счета', description: 'Контрагент не оплатил счёт в срок.', on: true },
      { id: 'fin-budget', label: 'Превышение бюджета', description: 'Расходы объекта превысили 90% лимита.', on: false },
    ],
  },
  {
    id: 'system',
    title: 'Система',
    description: 'Безопасность и сводки.',
    rules: [
      { id: 'sys-login', label: 'Вход с нового устройства', description: 'Нельзя отключить: требование безопасности.', on: true },
      { id: 'sys-digest', label: 'Еженедельная сводка', description: 'По понедельникам в 09:00.', on: true },
      { id: 'sys-updates', label: 'Обновления консоли', description: 'Новые разделы и изменения.', on: false },
    ],
  },
]

/** Правила, которые нельзя выключить. */
export const LOCKED_RULES = new Set(['sys-login'])

export const CHANNELS = [
  { id: 'email', label: 'Почта', description: 'a.vorontsova@endfield.dev' },
  { id: 'push', label: 'Push в браузере', description: 'На устройствах, где разрешены уведомления.' },
  { id: 'sms', label: 'SMS', description: 'Только критические инциденты.' },
  { id: 'messenger', label: 'Мессенджер', description: 'Через бота компании.' },
] as const

export type ChannelId = (typeof CHANNELS)[number]['id']

/* --- Сеансы --- */

export interface Session {
  id: string
  device: string
  client: string
  location: string
  ip: string
  lastActive: string
  current: boolean
}

export const SESSIONS: Session[] = [
  { id: 's1', device: 'Windows 11', client: 'Chrome 141', location: 'Москва', ip: '185.42.17.203', lastActive: 'Сейчас', current: true },
  { id: 's2', device: 'iPhone 16', client: 'Приложение Endfield', location: 'Москва', ip: '185.42.17.88', lastActive: '08.10.2026 07:52', current: false },
  { id: 's3', device: 'iPadOS 19', client: 'Safari', location: 'Северодвинск', ip: '93.170.44.12', lastActive: '06.10.2026 08:03', current: false },
  { id: 's4', device: 'macOS 26', client: 'Firefox 143', location: 'Санкт-Петербург', ip: '46.39.230.71', lastActive: '29.09.2026 18:40', current: false },
]

/* --- Ключи API --- */

export type KeyScope = 'read' | 'write' | 'admin'

export const KEY_SCOPE: Record<KeyScope, { label: string; tone: 'neutral' | 'info' | 'warning' }> = {
  read: { label: 'Чтение', tone: 'neutral' },
  write: { label: 'Чтение и запись', tone: 'info' },
  admin: { label: 'Полный доступ', tone: 'warning' },
}

export interface ApiKey {
  id: string
  name: string
  /** Открытая часть ключа: по ней ключ ищут в журнале. */
  prefix: string
  last4: string
  scope: KeyScope
  createdAt: string
  lastUsed: string | null
  expiresAt: string | null
}

export const API_KEYS: ApiKey[] = [
  { id: 'k1', name: 'Интеграция с ERP', prefix: 'evk_live_7Hq2', last4: 'a1f3', scope: 'write', createdAt: '2026-03-14', lastUsed: '08.10.2026 08:10', expiresAt: null },
  { id: 'k2', name: 'Дашборд диспетчерской', prefix: 'evk_live_Rt9m', last4: '0c4e', scope: 'read', createdAt: '2026-06-02', lastUsed: '08.10.2026 08:14', expiresAt: '2027-06-02' },
  { id: 'k3', name: 'Выгрузка в бухгалтерию', prefix: 'evk_live_Kd31', last4: '77b0', scope: 'read', createdAt: '2026-08-21', lastUsed: '01.10.2026 03:00', expiresAt: '2026-11-19' },
  { id: 'k4', name: 'Скрипты обслуживания', prefix: 'evk_live_Zp0x', last4: 'e925', scope: 'admin', createdAt: '2025-11-30', lastUsed: null, expiresAt: '2026-11-30' },
]
