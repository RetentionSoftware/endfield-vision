/*
 * Демо-данные страницы «Состояние систем»: сервисы платформы, история
 * доступности за 90 дней, время ответа, инциденты, плановые работы.
 * Детерминированные (без Math.random/Date.now): серверный и клиентский
 * рендер совпадают. «Сегодня» - 08.10.2026.
 */

import { bi, type Bi, type Lang } from '../lang'

export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance'

export const SERVICE_STATUS: Record<ServiceStatus, { label: Bi; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  operational: { label: bi('Работает', 'Operational'), tone: 'success' },
  degraded: { label: bi('Снижена производительность', 'Degraded performance'), tone: 'warning' },
  outage: { label: bi('Сбой', 'Outage'), tone: 'danger' },
  maintenance: { label: bi('Плановые работы', 'Scheduled maintenance'), tone: 'info' },
}

export type DayState = 'ok' | 'minor' | 'major' | 'maint'

export interface DayRecord {
  /** ГГГГ-ММ-ДД */
  date: string
  state: DayState
  /** Минут простоя или деградации. */
  minutes: number
}

export interface Service {
  id: string
  name: Bi
  description: Bi
  group: Bi
  status: ServiceStatus
  days: DayRecord[]
  /** Доступность за 90 дней, %. */
  uptime: number
}

export const STATUS_DAYS = 90
const START = Date.UTC(2026, 6, 11) // 11.07.2026, последний день - 08.10.2026
const DAY_MS = 86_400_000

function dayIso(i: number): string {
  return new Date(START + i * DAY_MS).toISOString().slice(0, 10)
}

/** Номер дня в окне 90 дней по дате ДД.ММ. */
function dayIndex(ddmm: string): number {
  const [d, m] = ddmm.split('.').map(Number)
  return Math.round((Date.UTC(2026, (m ?? 1) - 1, d ?? 1) - START) / DAY_MS)
}

type Mark = [service: string, ddmm: string, state: DayState, minutes: number]

/** Дни с инцидентами и работами (совпадают с историей инцидентов ниже). */
const MARKS: Mark[] = [
  ['relay', '08.10', 'major', 100],
  ['relay', '04.10', 'minor', 48],
  ['relay', '21.08', 'major', 210],
  ['telemetry', '08.10', 'minor', 95],
  ['telemetry', '07.10', 'minor', 40],
  ['notify', '02.10', 'minor', 65],
  ['api', '24.09', 'major', 29],
  ['queue', '17.09', 'minor', 52],
  ['reports', '05.09', 'minor', 80],
  ['storage', '14.09', 'maint', 0],
  ['api', '30.08', 'maint', 0],
  ['auth', '12.08', 'minor', 18],
  ['telemetry', '28.07', 'minor', 35],
]

interface ServiceSeed {
  id: string
  name: Bi
  description: Bi
  group: Bi
  status: ServiceStatus
  seed: number
}

const CORE = bi('Ядро платформы', 'Platform core')
const SITES = bi('Объекты', 'Facilities')
const APPS = bi('Сервисы', 'Services')

const SEEDS: ServiceSeed[] = [
  { id: 'api', name: bi('API шлюз', 'API gateway'), description: bi('Внешний и внутренний API консоли', 'External and internal console API'), group: CORE, status: 'operational', seed: 3 },
  { id: 'auth', name: bi('Авторизация', 'Authentication'), description: bi('Вход, сессии, единый доступ', 'Sign-in, sessions, single sign-on'), group: CORE, status: 'operational', seed: 5 },
  { id: 'queue', name: bi('Очереди сообщений', 'Message queues'), description: bi('Шина событий между сервисами', 'Event bus between services'), group: CORE, status: 'operational', seed: 7 },
  { id: 'storage', name: bi('Хранилище данных', 'Data storage'), description: bi('Основная БД и файловое хранилище', 'Primary database and file storage'), group: CORE, status: 'operational', seed: 11 },
  { id: 'telemetry', name: bi('Телеметрия объектов', 'Facility telemetry'), description: bi('Сбор показаний датчиков с площадок', 'Sensor readings from sites'), group: SITES, status: 'degraded', seed: 13 },
  { id: 'relay', name: bi('Ретрансляция связи', 'Communications relay'), description: bi('Каналы связи с удалёнными объектами', 'Links to remote facilities'), group: SITES, status: 'outage', seed: 17 },
  { id: 'notify', name: bi('Уведомления', 'Notifications'), description: bi('Почта, SMS, сообщения в мессенджер', 'Email, SMS, messenger'), group: APPS, status: 'operational', seed: 19 },
  { id: 'reports', name: bi('Отчёты и выгрузки', 'Reports and exports'), description: bi('Формирование отчётов и файлов', 'Report and file generation'), group: APPS, status: 'operational', seed: 23 },
]

function buildDays(s: ServiceSeed): DayRecord[] {
  const days: DayRecord[] = Array.from({ length: STATUS_DAYS }, (_, i) => {
    // Редкие короткие деградации - детерминированно по номеру дня и сервису.
    const blip = (i * 31 + s.seed * 17) % 89 === 0
    return { date: dayIso(i), state: blip ? 'minor' : 'ok', minutes: blip ? 6 + (s.seed % 9) : 0 }
  })
  for (const [id, ddmm, state, minutes] of MARKS) {
    if (id !== s.id) continue
    const i = dayIndex(ddmm)
    const day = days[i]
    if (day) days[i] = { ...day, state, minutes }
  }
  return days
}

function uptimeOf(days: DayRecord[]): number {
  const down = days.reduce((a, d) => a + (d.state === 'maint' ? 0 : d.state === 'major' ? d.minutes : d.minutes * 0.5), 0)
  return Math.round((100 - (down / (days.length * 1440)) * 100) * 100) / 100
}

export const SERVICES: Service[] = SEEDS.map((s) => {
  const days = buildDays(s)
  return { id: s.id, name: s.name, description: s.description, group: s.group, status: s.status, days, uptime: uptimeOf(days) }
})

export function serviceName(id: string): Bi {
  return SERVICES.find((s) => s.id === id)?.name ?? bi(id, id)
}

/** Длительность для показа: «1 ч 05 мин» / «1 h 05 min». */
export function formatDuration(minutes: number, lang: Lang): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const [hu, mu] = lang === 'en' ? ['h', 'min'] : ['ч', 'мин']
  return h ? `${h} ${hu} ${String(m).padStart(2, '0')} ${mu}` : `${m} ${mu}`
}

/* ------------------------------------------------------------------ */
/* Время ответа                                                        */
/* ------------------------------------------------------------------ */

export interface LatencyPoint {
  label: string
  api: number
  telemetry: number
  storage: number
}

/** Последние 24 часа, по часу: 10:00 07.10 - 09:00 08.10. */
export const LATENCY_24H: LatencyPoint[] = Array.from({ length: 24 }, (_, i) => {
  const hour = (10 + i) % 24
  const busy = hour >= 9 && hour <= 18 ? 1 : 0
  const incident = i >= 22 // после 08:00 08.10 - потеря ретранслятора
  return {
    label: `${String(hour).padStart(2, '0')}:00`,
    api: 118 + busy * 34 + ((i * 7) % 13) * 2,
    telemetry: 186 + busy * 40 + ((i * 11) % 17) * 3 + (incident ? 240 : 0),
    storage: 42 + busy * 12 + ((i * 5) % 9),
  }
})

/** Последние 7 дней, среднее за сутки. */
export const LATENCY_7D: LatencyPoint[] = ['02.10', '03.10', '04.10', '05.10', '06.10', '07.10', '08.10'].map((label, i) => ({
  label,
  api: 131 + ((i * 7) % 11) * 3 + (i === 0 ? 22 : 0),
  telemetry: 204 + ((i * 5) % 13) * 4 + (i === 2 ? 70 : 0) + (i === 6 ? 160 : 0),
  storage: 47 + ((i * 3) % 7) * 2,
}))

/* ------------------------------------------------------------------ */
/* Инциденты                                                           */
/* ------------------------------------------------------------------ */

export type IncidentSeverity = 'critical' | 'major' | 'minor'
export type IncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export const INCIDENT_SEVERITY: Record<IncidentSeverity, { label: Bi; tone: 'danger' | 'warning' | 'neutral' }> = {
  critical: { label: bi('Критический', 'Critical'), tone: 'danger' },
  major: { label: bi('Серьёзный', 'Major'), tone: 'warning' },
  minor: { label: bi('Незначительный', 'Minor'), tone: 'neutral' },
}

export const INCIDENT_STATE: Record<IncidentState, { label: Bi; tone: 'danger' | 'warning' | 'info' | 'success' }> = {
  investigating: { label: bi('Выясняем причину', 'Investigating'), tone: 'danger' },
  identified: { label: bi('Причина найдена', 'Identified'), tone: 'warning' },
  monitoring: { label: bi('Наблюдаем', 'Monitoring'), tone: 'info' },
  resolved: { label: bi('Решён', 'Resolved'), tone: 'success' },
}

export interface IncidentUpdate {
  id: string
  /** ДД.ММ ЧЧ:ММ */
  at: string
  state: IncidentState
  text: Bi
}

export interface StatusIncident {
  id: string
  title: Bi
  severity: IncidentSeverity
  state: IncidentState
  services: string[]
  /** ДД.ММ.ГГГГ ЧЧ:ММ */
  startedAt: string
  endedAt: string | null
  /** Длительность, мин. Для показа - formatDuration. */
  minutes: number
  summary: Bi
  updates: IncidentUpdate[]
}

export const STATUS_INCIDENTS: StatusIncident[] = [
  {
    id: 'INC-2291',
    title: bi('Потеря связи с ретранслятором Южный', 'Lost connection to South Relay'),
    severity: 'critical',
    state: 'investigating',
    services: ['relay', 'telemetry'],
    startedAt: '08.10.2026 08:12',
    endedAt: null,
    minutes: 100,
    summary: bi(
      'Объект RLY-05 не отвечает по основному и резервному каналам. Данные телеметрии Южного сектора не поступают.',
      'RLY-05 does not respond on the primary or backup channel. No telemetry is coming in from South sector.',
    ),
    updates: [
      {
        id: 'u3',
        at: '08.10 09:40',
        state: 'investigating',
        text: bi(
          'Резервный спутниковый канал тоже недоступен. Предполагаем отказ питания мачты.',
          'The backup satellite channel is also down. We suspect a power failure at the mast.',
        ),
      },
      {
        id: 'u2',
        at: '08.10 08:25',
        state: 'investigating',
        text: bi('Дежурная бригада выехала на объект, расчётное прибытие - 11:00.', 'The on-call crew is on its way to the site, ETA 11:00.'),
      },
      { id: 'u1', at: '08.10 08:12', state: 'investigating', text: bi('Мониторинг зафиксировал потерю связи с ретранслятором.', 'Monitoring detected a lost connection to the relay.') },
    ],
  },
  {
    id: 'INC-2288',
    title: bi('Задержка телеметрии с объекта Хребет', 'Telemetry delays from Ridge'),
    severity: 'major',
    state: 'monitoring',
    services: ['telemetry'],
    startedAt: '08.10.2026 06:47',
    endedAt: null,
    minutes: 185,
    summary: bi(
      'После остановки линии №3 часть датчиков передаёт данные с задержкой до 4 минут.',
      'After line 3 was stopped, some sensors report data with a delay of up to 4 minutes.',
    ),
    updates: [
      {
        id: 'u3',
        at: '08.10 08:50',
        state: 'monitoring',
        text: bi('Буфер шлюза очищен, задержка снизилась до 40 секунд. Наблюдаем.', 'Gateway buffer cleared; delay is down to 40 seconds. Monitoring.'),
      },
      {
        id: 'u2',
        at: '08.10 07:30',
        state: 'identified',
        text: bi(
          'Причина - переполнение буфера шлюза при массовом переподключении датчиков.',
          'Cause: gateway buffer overflow during a mass sensor reconnect.',
        ),
      },
      { id: 'u1', at: '08.10 06:47', state: 'investigating', text: bi('Показания с объекта RDG-04 приходят с задержкой.', 'Readings from RDG-04 are arriving late.') },
    ],
  },
  {
    id: 'INC-2276',
    title: bi('Задержки доставки уведомлений', 'Notification delivery delays'),
    severity: 'minor',
    state: 'resolved',
    services: ['notify'],
    startedAt: '02.10.2026 14:05',
    endedAt: '02.10.2026 15:10',
    minutes: 65,
    summary: bi(
      'SMS-уведомления доставлялись с задержкой до 20 минут из-за ограничений у провайдера.',
      'SMS notifications were delayed by up to 20 minutes due to provider limits.',
    ),
    updates: [
      {
        id: 'u2',
        at: '02.10 15:10',
        state: 'resolved',
        text: bi('Трафик переключён на резервного провайдера, очередь доставлена.', 'Traffic switched to the backup provider; the queue has been delivered.'),
      },
      { id: 'u1', at: '02.10 14:05', state: 'investigating', text: bi('Растёт очередь исходящих SMS.', 'The outgoing SMS queue is growing.') },
    ],
  },
  {
    id: 'INC-2263',
    title: bi('Недоступность API шлюза', 'API gateway unavailable'),
    severity: 'major',
    state: 'resolved',
    services: ['api'],
    startedAt: '24.09.2026 03:12',
    endedAt: '24.09.2026 03:41',
    minutes: 29,
    summary: bi(
      'После обновления конфигурации балансировщика запросы к API возвращали ошибку 502.',
      'After a load balancer config update, API requests returned error 502.',
    ),
    updates: [
      {
        id: 'u3',
        at: '24.09 03:41',
        state: 'resolved',
        text: bi('Конфигурация откатана, ошибки прекратились. Разбор - в базе знаний.', 'Config rolled back and errors stopped. Postmortem is in the knowledge base.'),
      },
      { id: 'u2', at: '24.09 03:25', state: 'identified', text: bi('Причина - ошибка в правилах маршрутизации нового релиза.', 'Cause: a routing rule bug in the new release.') },
      { id: 'u1', at: '24.09 03:12', state: 'investigating', text: bi('Доля ошибок 5xx превысила 30%.', '5xx error rate exceeded 30%.') },
    ],
  },
  {
    id: 'INC-2250',
    title: bi('Рост задержек в очереди событий', 'Rising event queue latency'),
    severity: 'minor',
    state: 'resolved',
    services: ['queue'],
    startedAt: '17.09.2026 11:20',
    endedAt: '17.09.2026 12:12',
    minutes: 52,
    summary: bi(
      'События обрабатывались с задержкой до 3 минут из-за медленного потребителя.',
      'Events were processed with a delay of up to 3 minutes due to a slow consumer.',
    ),
    updates: [
      {
        id: 'u2',
        at: '17.09 12:12',
        state: 'resolved',
        text: bi('Потребитель масштабирован до 6 экземпляров, очередь разобрана.', 'Consumer scaled to 6 instances; the queue has been drained.'),
      },
      { id: 'u1', at: '17.09 11:20', state: 'investigating', text: bi('Глубина очереди выше порога.', 'Queue depth is above the threshold.') },
    ],
  },
  {
    id: 'INC-2231',
    title: bi('Ошибки выгрузки отчётов в XLSX', 'XLSX report export errors'),
    severity: 'minor',
    state: 'resolved',
    services: ['reports'],
    startedAt: '05.09.2026 09:30',
    endedAt: '05.09.2026 10:50',
    minutes: 80,
    summary: bi(
      'Выгрузки больше 50 тыс. строк завершались ошибкой. Остальные форматы работали.',
      'Exports over 50K rows failed. Other formats worked.',
    ),
    updates: [
      {
        id: 'u2',
        at: '05.09 10:50',
        state: 'resolved',
        text: bi('Увеличен лимит памяти сервиса отчётов, выгрузки перезапущены.', 'Report service memory limit increased; exports restarted.'),
      },
      { id: 'u1', at: '05.09 09:30', state: 'investigating', text: bi('Пользователи сообщают об ошибке при выгрузке.', 'Users report an error when exporting.') },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Плановые работы                                                     */
/* ------------------------------------------------------------------ */

export interface Maintenance {
  id: string
  title: Bi
  /** ДД.ММ.ГГГГ */
  date: string
  window: string
  services: string[]
  impact: Bi
  impactTone: 'info' | 'warning'
}

export const MAINTENANCE: Maintenance[] = [
  {
    id: 'MW-118',
    title: bi('Обновление кластера хранилища', 'Storage cluster upgrade'),
    date: '12.10.2026',
    window: '02:00-04:00',
    services: ['storage', 'reports'],
    impact: bi('Только чтение', 'Read-only'),
    impactTone: 'warning',
  },
  {
    id: 'MW-119',
    title: bi('Замена сертификатов API шлюза', 'API gateway certificate renewal'),
    date: '15.10.2026',
    window: '22:00-22:30',
    services: ['api'],
    impact: bi('Обрывы до 1 минуты', 'Drops of up to 1 minute'),
    impactTone: 'info',
  },
  {
    id: 'MW-121',
    title: bi('Перенос очередей на новый кластер', 'Queue migration to a new cluster'),
    date: '19.10.2026',
    window: '01:00-05:00',
    services: ['queue', 'notify'],
    impact: bi('Уведомления с задержкой до 10 минут', 'Notifications delayed by up to 10 minutes'),
    impactTone: 'warning',
  },
]
