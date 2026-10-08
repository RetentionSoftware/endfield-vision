/*
 * Детали объектов для раздела «Объекты»: паспорт площадки, персонал смен,
 * журнал событий. Дополняет facilities.ts, не меняя его экспорты.
 * Детерминированные данные: серверный и клиентский рендер совпадают.
 */

import { FACILITIES, type Facility } from './facilities'

/** Регионы: из списка объектов плюс сектора без площадок (для формы добавления). */
export const REGIONS: string[] = Array.from(new Set([...FACILITIES.map((f) => f.region), 'Западный сектор'])).sort((a, b) =>
  a.localeCompare(b, 'ru'),
)

/** Подписи 14 дней истории выпуска (25.09-08.10), как в Facility.history. */
export const HISTORY_LABELS: string[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 25 + i))
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
})

export interface FacilityProfile {
  /** Проектная мощность, ед. в сутки. */
  capacity: number
  address: string
  shifts: number
  lastInspection: string
  nextInspection: string
  /** Лимит потребления, МВт·ч в сутки. */
  energyLimit: number
}

const PROFILES: Record<string, FacilityProfile> = {
  f1: { capacity: 1450, address: 'Долина, промзона 1, корп. 3', shifts: 3, lastInspection: '2026-08-14', nextInspection: '2027-02-14', energyLimit: 460 },
  f2: { capacity: 1350, address: 'Долина, промзона 2, корп. 1', shifts: 3, lastInspection: '2026-07-02', nextInspection: '2027-01-02', energyLimit: 420 },
  f3: { capacity: 1130, address: 'Хребет, участок 4', shifts: 2, lastInspection: '2026-05-21', nextInspection: '2026-11-21', energyLimit: 340 },
  f4: { capacity: 1680, address: 'Порт Ясный, терминал 7', shifts: 3, lastInspection: '2026-09-09', nextInspection: '2027-03-09', energyLimit: 560 },
  f5: { capacity: 700, address: 'Застава, пост 11', shifts: 1, lastInspection: '2026-10-01', nextInspection: '2027-04-01', energyLimit: 120 },
  f6: { capacity: 1420, address: 'Рудник Глубокий, горизонт 3', shifts: 3, lastInspection: '2026-06-30', nextInspection: '2026-12-30', energyLimit: 700 },
  f7: { capacity: 220, address: 'Центр, научный квартал, стр. 2', shifts: 2, lastInspection: '2026-09-18', nextInspection: '2027-03-18', energyLimit: 150 },
  f8: { capacity: 0, address: 'Южный хребет, мачта 5', shifts: 1, lastInspection: '2026-04-11', nextInspection: '2026-10-11', energyLimit: 20 },
}

export function facilityProfile(f: Facility): FacilityProfile {
  return (
    PROFILES[f.id] ?? {
      capacity: Math.max(f.output, 100),
      address: `${f.region}, адрес уточняется`,
      shifts: 1,
      lastInspection: '',
      nextInspection: '',
      energyLimit: Math.max(f.energy, 50),
    }
  )
}

/** План выпуска на сутки: 85% проектной мощности. */
export function dailyPlan(f: Facility): number {
  return Math.round(facilityProfile(f).capacity * 0.85)
}

export type ShiftState = 'day' | 'night' | 'off' | 'sick'

export const SHIFT_STATE: Record<ShiftState, { label: string; tone: 'success' | 'info' | 'neutral' | 'warning' }> = {
  day: { label: 'Дневная смена', tone: 'success' },
  night: { label: 'Ночная смена', tone: 'info' },
  off: { label: 'Выходной', tone: 'neutral' },
  sick: { label: 'Больничный', tone: 'warning' },
}

export interface StaffMember {
  id: string
  name: string
  role: string
  shift: ShiftState
  phone: string
}

const NAMES = [
  'Андрей Белов',
  'Ксения Морозова',
  'Роман Фёдоров',
  'Ольга Никитина',
  'Денис Кравец',
  'Елена Субботина',
  'Артём Зайцев',
  'Вера Полякова',
  'Максим Орлов',
  'Наталья Гришина',
  'Игорь Сафонов',
  'Юлия Тарасова',
]

const ROLES = ['Начальник смены', 'Оператор линии', 'Инженер-механик', 'Электрик', 'Техник КИПиА', 'Контролёр ОТК', 'Кладовщик']
const SHIFTS: ShiftState[] = ['day', 'day', 'night', 'day', 'off', 'night', 'sick', 'day']

export function facilityStaff(f: Facility): StaffMember[] {
  const seed = Number(f.id.replace(/\D/g, '')) || f.name.length
  const count = Math.min(6, Math.max(2, Math.round(f.staff / 9)))
  const out: StaffMember[] = [{ id: `${f.id}-m`, name: f.manager, role: 'Руководитель объекта', shift: 'day', phone: `+7 900 ${100 + seed * 7}-1${seed}-0${seed}` }]
  for (let i = 0; i < count; i++) {
    const k = (seed * 5 + i * 7) % NAMES.length
    out.push({
      id: `${f.id}-s${i}`,
      name: NAMES[k] ?? 'Сотрудник',
      role: ROLES[(seed + i) % ROLES.length] ?? 'Оператор',
      shift: SHIFTS[(seed + i * 3) % SHIFTS.length] ?? 'day',
      phone: `+7 900 ${200 + k * 13}-${10 + i}-${20 + seed}`,
    })
  }
  return out
}

export type JournalKind = 'info' | 'warning' | 'danger' | 'success'

export interface JournalEntry {
  id: string
  /** ДД.ММ ЧЧ:ММ */
  at: string
  who: string
  text: string
  kind: JournalKind
}

const JOURNAL: Record<string, JournalEntry[]> = {
  f3: [
    { id: 'j1', at: '08.10 06:47', who: 'Тимур Ахмедов', text: 'Открыт инцидент INC-2288: перегрев линии сборки №3, линия остановлена.', kind: 'danger' },
    { id: 'j2', at: '08.10 07:30', who: 'Дежурный инженер', text: 'Нагрузка перераспределена на линии №1 и №2, выпуск снижен до 60% плана.', kind: 'warning' },
    { id: 'j3', at: '07.10 22:10', who: 'Система', text: 'Температура подшипника линии №3 выше нормы на 12 °C.', kind: 'warning' },
    { id: 'j4', at: '06.10 09:00', who: 'Тимур Ахмедов', text: 'Плановая замена ремней конвейера завершена.', kind: 'success' },
  ],
  f5: [
    { id: 'j1', at: '07.10 15:00', who: 'Павел Гусев', text: 'Объект переведён в обслуживание: замена фильтров вентиляции.', kind: 'info' },
    { id: 'j2', at: '07.10 15:20', who: 'Система', text: 'Персонал смены переведён на объект Долина-1.', kind: 'info' },
    { id: 'j3', at: '01.10 11:40', who: 'Инспекция', text: 'Проверка пожарной безопасности пройдена без замечаний.', kind: 'success' },
  ],
  f8: [
    { id: 'j1', at: '08.10 08:12', who: 'Система', text: 'Потеря связи с ретранслятором. Данные объекта не обновляются.', kind: 'danger' },
    { id: 'j2', at: '08.10 08:25', who: 'Олег Румянцев', text: 'Дежурная бригада выехала на объект, расчётное прибытие 11:00.', kind: 'info' },
    { id: 'j3', at: '04.10 13:05', who: 'Система', text: 'Кратковременные обрывы связи: 6 за сутки.', kind: 'warning' },
  ],
}

export function facilityJournal(f: Facility): JournalEntry[] {
  return (
    JOURNAL[f.id] ?? [
      { id: 'j1', at: '08.10 07:00', who: f.manager, text: 'Смена принята, замечаний нет.', kind: 'success' },
      { id: 'j2', at: '07.10 19:00', who: 'Система', text: `Выпуск за сутки: ${f.output} ед.`, kind: 'info' },
      { id: 'j3', at: '05.10 10:15', who: 'Инспекция', text: 'Плановый обход оборудования выполнен.', kind: 'info' },
    ]
  )
}

/** Цвет полосы загрузки: перегруз, простой, недогруз, норма. */
export function loadTone(load: number): 'warning' | 'danger' | 'info' | 'accent' {
  return load >= 90 ? 'warning' : load === 0 ? 'danger' : load < 30 ? 'info' : 'accent'
}
