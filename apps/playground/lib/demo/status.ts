/*
 * Демо-данные страницы «Состояние систем»: сервисы платформы, история
 * доступности за 90 дней, время ответа, инциденты, плановые работы.
 * Детерминированные (без Math.random/Date.now): серверный и клиентский
 * рендер совпадают. «Сегодня» - 08.10.2026.
 */

export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance'

export const SERVICE_STATUS: Record<ServiceStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  operational: { label: 'Работает', tone: 'success' },
  degraded: { label: 'Снижена производительность', tone: 'warning' },
  outage: { label: 'Сбой', tone: 'danger' },
  maintenance: { label: 'Плановые работы', tone: 'info' },
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
  name: string
  description: string
  group: string
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
  name: string
  description: string
  group: string
  status: ServiceStatus
  seed: number
}

const SEEDS: ServiceSeed[] = [
  { id: 'api', name: 'API шлюз', description: 'Внешний и внутренний API консоли', group: 'Ядро платформы', status: 'operational', seed: 3 },
  { id: 'auth', name: 'Авторизация', description: 'Вход, сессии, единый доступ', group: 'Ядро платформы', status: 'operational', seed: 5 },
  { id: 'queue', name: 'Очереди сообщений', description: 'Шина событий между сервисами', group: 'Ядро платформы', status: 'operational', seed: 7 },
  { id: 'storage', name: 'Хранилище данных', description: 'Основная БД и файловое хранилище', group: 'Ядро платформы', status: 'operational', seed: 11 },
  { id: 'telemetry', name: 'Телеметрия объектов', description: 'Сбор показаний датчиков с площадок', group: 'Объекты', status: 'degraded', seed: 13 },
  { id: 'relay', name: 'Ретрансляция связи', description: 'Каналы связи с удалёнными объектами', group: 'Объекты', status: 'outage', seed: 17 },
  { id: 'notify', name: 'Уведомления', description: 'Почта, SMS, сообщения в мессенджер', group: 'Сервисы', status: 'operational', seed: 19 },
  { id: 'reports', name: 'Отчёты и выгрузки', description: 'Формирование отчётов и файлов', group: 'Сервисы', status: 'operational', seed: 23 },
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

export function serviceName(id: string): string {
  return SERVICES.find((s) => s.id === id)?.name ?? id
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

export const INCIDENT_SEVERITY: Record<IncidentSeverity, { label: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  critical: { label: 'Критический', tone: 'danger' },
  major: { label: 'Серьёзный', tone: 'warning' },
  minor: { label: 'Незначительный', tone: 'neutral' },
}

export const INCIDENT_STATE: Record<IncidentState, { label: string; tone: 'danger' | 'warning' | 'info' | 'success' }> = {
  investigating: { label: 'Выясняем причину', tone: 'danger' },
  identified: { label: 'Причина найдена', tone: 'warning' },
  monitoring: { label: 'Наблюдаем', tone: 'info' },
  resolved: { label: 'Решён', tone: 'success' },
}

export interface IncidentUpdate {
  id: string
  /** ДД.ММ ЧЧ:ММ */
  at: string
  state: IncidentState
  text: string
}

export interface StatusIncident {
  id: string
  title: string
  severity: IncidentSeverity
  state: IncidentState
  services: string[]
  /** ДД.ММ.ГГГГ ЧЧ:ММ */
  startedAt: string
  endedAt: string | null
  /** Длительность для показа. */
  duration: string
  summary: string
  updates: IncidentUpdate[]
}

export const STATUS_INCIDENTS: StatusIncident[] = [
  {
    id: 'INC-2291',
    title: 'Потеря связи с ретранслятором Южный',
    severity: 'critical',
    state: 'investigating',
    services: ['relay', 'telemetry'],
    startedAt: '08.10.2026 08:12',
    endedAt: null,
    duration: '1 ч 40 мин',
    summary: 'Объект RLY-05 не отвечает по основному и резервному каналам. Данные телеметрии Южного сектора не поступают.',
    updates: [
      { id: 'u3', at: '08.10 09:40', state: 'investigating', text: 'Резервный спутниковый канал тоже недоступен. Предполагаем отказ питания мачты.' },
      { id: 'u2', at: '08.10 08:25', state: 'investigating', text: 'Дежурная бригада выехала на объект, расчётное прибытие - 11:00.' },
      { id: 'u1', at: '08.10 08:12', state: 'investigating', text: 'Мониторинг зафиксировал потерю связи с ретранслятором.' },
    ],
  },
  {
    id: 'INC-2288',
    title: 'Задержка телеметрии с объекта Хребет',
    severity: 'major',
    state: 'monitoring',
    services: ['telemetry'],
    startedAt: '08.10.2026 06:47',
    endedAt: null,
    duration: '3 ч 05 мин',
    summary: 'После остановки линии №3 часть датчиков передаёт данные с задержкой до 4 минут.',
    updates: [
      { id: 'u3', at: '08.10 08:50', state: 'monitoring', text: 'Буфер шлюза очищен, задержка снизилась до 40 секунд. Наблюдаем.' },
      { id: 'u2', at: '08.10 07:30', state: 'identified', text: 'Причина - переполнение буфера шлюза при массовом переподключении датчиков.' },
      { id: 'u1', at: '08.10 06:47', state: 'investigating', text: 'Показания с объекта RDG-04 приходят с задержкой.' },
    ],
  },
  {
    id: 'INC-2276',
    title: 'Задержки доставки уведомлений',
    severity: 'minor',
    state: 'resolved',
    services: ['notify'],
    startedAt: '02.10.2026 14:05',
    endedAt: '02.10.2026 15:10',
    duration: '1 ч 05 мин',
    summary: 'SMS-уведомления доставлялись с задержкой до 20 минут из-за ограничений у провайдера.',
    updates: [
      { id: 'u2', at: '02.10 15:10', state: 'resolved', text: 'Трафик переключён на резервного провайдера, очередь доставлена.' },
      { id: 'u1', at: '02.10 14:05', state: 'investigating', text: 'Растёт очередь исходящих SMS.' },
    ],
  },
  {
    id: 'INC-2263',
    title: 'Недоступность API шлюза',
    severity: 'major',
    state: 'resolved',
    services: ['api'],
    startedAt: '24.09.2026 03:12',
    endedAt: '24.09.2026 03:41',
    duration: '29 мин',
    summary: 'После обновления конфигурации балансировщика запросы к API возвращали ошибку 502.',
    updates: [
      { id: 'u3', at: '24.09 03:41', state: 'resolved', text: 'Конфигурация откатана, ошибки прекратились. Разбор - в базе знаний.' },
      { id: 'u2', at: '24.09 03:25', state: 'identified', text: 'Причина - ошибка в правилах маршрутизации нового релиза.' },
      { id: 'u1', at: '24.09 03:12', state: 'investigating', text: 'Доля ошибок 5xx превысила 30%.' },
    ],
  },
  {
    id: 'INC-2250',
    title: 'Рост задержек в очереди событий',
    severity: 'minor',
    state: 'resolved',
    services: ['queue'],
    startedAt: '17.09.2026 11:20',
    endedAt: '17.09.2026 12:12',
    duration: '52 мин',
    summary: 'События обрабатывались с задержкой до 3 минут из-за медленного потребителя.',
    updates: [
      { id: 'u2', at: '17.09 12:12', state: 'resolved', text: 'Потребитель масштабирован до 6 экземпляров, очередь разобрана.' },
      { id: 'u1', at: '17.09 11:20', state: 'investigating', text: 'Глубина очереди выше порога.' },
    ],
  },
  {
    id: 'INC-2231',
    title: 'Ошибки выгрузки отчётов в XLSX',
    severity: 'minor',
    state: 'resolved',
    services: ['reports'],
    startedAt: '05.09.2026 09:30',
    endedAt: '05.09.2026 10:50',
    duration: '1 ч 20 мин',
    summary: 'Выгрузки больше 50 тыс. строк завершались ошибкой. Остальные форматы работали.',
    updates: [
      { id: 'u2', at: '05.09 10:50', state: 'resolved', text: 'Увеличен лимит памяти сервиса отчётов, выгрузки перезапущены.' },
      { id: 'u1', at: '05.09 09:30', state: 'investigating', text: 'Пользователи сообщают об ошибке при выгрузке.' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Плановые работы                                                     */
/* ------------------------------------------------------------------ */

export interface Maintenance {
  id: string
  title: string
  /** ДД.ММ.ГГГГ */
  date: string
  window: string
  services: string[]
  impact: string
  impactTone: 'info' | 'warning'
}

export const MAINTENANCE: Maintenance[] = [
  {
    id: 'MW-118',
    title: 'Обновление кластера хранилища',
    date: '12.10.2026',
    window: '02:00-04:00',
    services: ['storage', 'reports'],
    impact: 'Только чтение',
    impactTone: 'warning',
  },
  {
    id: 'MW-119',
    title: 'Замена сертификатов API шлюза',
    date: '15.10.2026',
    window: '22:00-22:30',
    services: ['api'],
    impact: 'Обрывы до 1 минуты',
    impactTone: 'info',
  },
  {
    id: 'MW-121',
    title: 'Перенос очередей на новый кластер',
    date: '19.10.2026',
    window: '01:00-05:00',
    services: ['queue', 'notify'],
    impact: 'Уведомления с задержкой до 10 минут',
    impactTone: 'warning',
  },
]
