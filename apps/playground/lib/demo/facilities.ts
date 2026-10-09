/*
 * Демо-данные объектов: производственные площадки вымышленной компании.
 * Детерминированные (без Math.random): серверный и клиентский рендер совпадают.
 */

import { bi, type Bi } from '../lang'

export type FacilityStatus = 'online' | 'degraded' | 'maintenance' | 'offline'

export interface Facility {
  id: string
  code: string
  name: Bi
  region: Bi
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
  manager: Bi
  openedAt: string
}

export const FACILITY_STATUS: Record<FacilityStatus, { label: Bi; tone: 'success' | 'warning' | 'info' | 'danger' }> = {
  online: { label: bi('В работе', 'Operating'), tone: 'success' },
  degraded: { label: bi('С ограничениями', 'Limited'), tone: 'warning' },
  maintenance: { label: bi('Обслуживание', 'Maintenance'), tone: 'info' },
  offline: { label: bi('Остановлен', 'Stopped'), tone: 'danger' },
}

function series(seed: number, base: number, amp: number): number[] {
  return Array.from({ length: 14 }, (_, i) => Math.round(base + amp * Math.sin((i + seed) / 2.3) + ((i * seed) % 7) * (amp / 9)))
}

export const FACILITIES: Facility[] = [
  { id: 'f1', code: 'VAL-01', name: bi('Долина-1', 'Valley-1'), region: bi('Северный сектор', 'North sector'), status: 'online', load: 86, output: 1240, energy: 412, staff: 48, history: series(1, 1180, 90), manager: bi('Глеб Сорокин', 'Gleb Sorokin'), openedAt: '2023-04-12' },
  { id: 'f2', code: 'VAL-02', name: bi('Долина-2', 'Valley-2'), region: bi('Северный сектор', 'North sector'), status: 'online', load: 72, output: 980, energy: 355, staff: 39, history: series(3, 940, 70), manager: bi('Ирина Лебедева', 'Irina Lebedeva'), openedAt: '2023-09-01' },
  { id: 'f3', code: 'RDG-04', name: bi('Хребет', 'Ridge'), region: bi('Восточный сектор', 'East sector'), status: 'degraded', load: 54, output: 610, energy: 298, staff: 31, history: series(5, 700, 120), manager: bi('Тимур Ахмедов', 'Timur Akhmedov'), openedAt: '2024-02-19' },
  { id: 'f4', code: 'PRT-07', name: bi('Порт Ясный', 'Clearwater Port'), region: bi('Прибрежный сектор', 'Coastal sector'), status: 'online', load: 91, output: 1530, energy: 506, staff: 62, history: series(2, 1450, 110), manager: bi('Мария Котова', 'Maria Kotova'), openedAt: '2022-11-30' },
  { id: 'f5', code: 'OUT-11', name: bi('Застава', 'Outpost'), region: bi('Пограничный сектор', 'Border sector'), status: 'maintenance', load: 12, output: 85, energy: 74, staff: 9, history: series(7, 260, 160), manager: bi('Павел Гусев', 'Pavel Gusev'), openedAt: '2024-06-05' },
  { id: 'f6', code: 'MIN-03', name: bi('Рудник Глубокий', 'Deep Mine'), region: bi('Восточный сектор', 'East sector'), status: 'online', load: 78, output: 1105, energy: 640, staff: 54, history: series(4, 1040, 95), manager: bi('Святослав Ершов', 'Svyatoslav Ershov'), openedAt: '2021-08-14' },
  { id: 'f7', code: 'LAB-02', name: bi('Лаборатория Сигма', 'Sigma Lab'), region: bi('Центральный сектор', 'Central sector'), status: 'online', load: 64, output: 140, energy: 118, staff: 22, history: series(6, 132, 14), manager: bi('Алина Воронцова', 'Alina Vorontsova'), openedAt: '2024-10-01' },
  { id: 'f8', code: 'RLY-05', name: bi('Ретранслятор Южный', 'South Relay'), region: bi('Южный сектор', 'South sector'), status: 'offline', load: 0, output: 0, energy: 6, staff: 3, history: series(8, 40, 30).map((v, i) => (i > 9 ? 0 : v)), manager: bi('Олег Румянцев', 'Oleg Rumyantsev'), openedAt: '2023-01-23' },
]
