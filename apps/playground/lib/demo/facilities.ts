/*
 * Демо-данные объектов: производственные площадки вымышленной компании.
 * Детерминированные (без Math.random): серверный и клиентский рендер совпадают.
 */

export type FacilityStatus = 'online' | 'degraded' | 'maintenance' | 'offline'

export interface Facility {
  id: string
  code: string
  name: string
  region: string
  status: FacilityStatus
  /** Загрузка мощностей, %. */
  load: number
  /** Выпуск за сутки, ед. */
  output: number
  /** Потребление, МВт·ч за сутки. */
  energy: number
  staff: number
  /** Выпуск за 14 дней - для мини-графика. */
  history: number[]
  manager: string
  openedAt: string
}

export const FACILITY_STATUS: Record<FacilityStatus, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' }> = {
  online: { label: 'В работе', tone: 'success' },
  degraded: { label: 'С ограничениями', tone: 'warning' },
  maintenance: { label: 'Обслуживание', tone: 'info' },
  offline: { label: 'Остановлен', tone: 'danger' },
}

function series(seed: number, base: number, amp: number): number[] {
  return Array.from({ length: 14 }, (_, i) => Math.round(base + amp * Math.sin((i + seed) / 2.3) + ((i * seed) % 7) * (amp / 9)))
}

export const FACILITIES: Facility[] = [
  { id: 'f1', code: 'VAL-01', name: 'Долина-1', region: 'Северный сектор', status: 'online', load: 86, output: 1240, energy: 412, staff: 48, history: series(1, 1180, 90), manager: 'Глеб Сорокин', openedAt: '2023-04-12' },
  { id: 'f2', code: 'VAL-02', name: 'Долина-2', region: 'Северный сектор', status: 'online', load: 72, output: 980, energy: 355, staff: 39, history: series(3, 940, 70), manager: 'Ирина Лебедева', openedAt: '2023-09-01' },
  { id: 'f3', code: 'RDG-04', name: 'Хребет', region: 'Восточный сектор', status: 'degraded', load: 54, output: 610, energy: 298, staff: 31, history: series(5, 700, 120), manager: 'Тимур Ахмедов', openedAt: '2024-02-19' },
  { id: 'f4', code: 'PRT-07', name: 'Порт Ясный', region: 'Прибрежный сектор', status: 'online', load: 91, output: 1530, energy: 506, staff: 62, history: series(2, 1450, 110), manager: 'Мария Котова', openedAt: '2022-11-30' },
  { id: 'f5', code: 'OUT-11', name: 'Застава', region: 'Пограничный сектор', status: 'maintenance', load: 12, output: 85, energy: 74, staff: 9, history: series(7, 260, 160), manager: 'Павел Гусев', openedAt: '2024-06-05' },
  { id: 'f6', code: 'MIN-03', name: 'Рудник Глубокий', region: 'Восточный сектор', status: 'online', load: 78, output: 1105, energy: 640, staff: 54, history: series(4, 1040, 95), manager: 'Святослав Ершов', openedAt: '2021-08-14' },
  { id: 'f7', code: 'LAB-02', name: 'Лаборатория Сигма', region: 'Центральный сектор', status: 'online', load: 64, output: 140, energy: 118, staff: 22, history: series(6, 132, 14), manager: 'Алина Воронцова', openedAt: '2024-10-01' },
  { id: 'f8', code: 'RLY-05', name: 'Ретранслятор Южный', region: 'Южный сектор', status: 'offline', load: 0, output: 0, energy: 6, staff: 3, history: series(8, 40, 30).map((v, i) => (i > 9 ? 0 : v)), manager: 'Олег Румянцев', openedAt: '2023-01-23' },
]
