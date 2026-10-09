/*
 * Детали объектов для раздела «Объекты»: паспорт площадки, персонал смен,
 * журнал событий. Дополняет facilities.ts, не меняя его экспорты.
 * Детерминированные данные: серверный и клиентский рендер совпадают.
 */

import { bi, type Bi } from '../lang'
import { FACILITIES, type Facility } from './facilities'

/** Регионы: из списка объектов плюс сектора без площадок (для формы добавления). Ключ - русское название. */
export const REGIONS: Bi[] = [...FACILITIES.map((f) => f.region), bi('Западный сектор', 'West sector')]
  .filter((r, i, all) => all.findIndex((x) => x.ru === r.ru) === i)
  .sort((a, b) => a.ru.localeCompare(b.ru, 'ru'))

/** Подписи 14 дней истории выпуска (25.09-08.10), как в Facility.history. */
export const HISTORY_LABELS: string[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 25 + i))
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
})

export interface FacilityProfile {
  /** Проектная мощность, ед. в сутки. */
  capacity: number
  address: Bi
  shifts: number
  lastInspection: string
  nextInspection: string
  /** Лимит потребления, МВт·ч в сутки. */
  energyLimit: number
}

const PROFILES: Record<string, FacilityProfile> = {
  f1: { capacity: 1450, address: bi('Долина, промзона 1, корп. 3', 'Valley, industrial zone 1, bldg. 3'), shifts: 3, lastInspection: '2026-08-14', nextInspection: '2027-02-14', energyLimit: 460 },
  f2: { capacity: 1350, address: bi('Долина, промзона 2, корп. 1', 'Valley, industrial zone 2, bldg. 1'), shifts: 3, lastInspection: '2026-07-02', nextInspection: '2027-01-02', energyLimit: 420 },
  f3: { capacity: 1130, address: bi('Хребет, участок 4', 'Ridge, site 4'), shifts: 2, lastInspection: '2026-05-21', nextInspection: '2026-11-21', energyLimit: 340 },
  f4: { capacity: 1680, address: bi('Порт Ясный, терминал 7', 'Clearwater Port, terminal 7'), shifts: 3, lastInspection: '2026-09-09', nextInspection: '2027-03-09', energyLimit: 560 },
  f5: { capacity: 700, address: bi('Застава, пост 11', 'Outpost, post 11'), shifts: 1, lastInspection: '2026-10-01', nextInspection: '2027-04-01', energyLimit: 120 },
  f6: { capacity: 1420, address: bi('Рудник Глубокий, горизонт 3', 'Deep Mine, level 3'), shifts: 3, lastInspection: '2026-06-30', nextInspection: '2026-12-30', energyLimit: 700 },
  f7: { capacity: 220, address: bi('Центр, научный квартал, стр. 2', 'Center, science quarter, bldg. 2'), shifts: 2, lastInspection: '2026-09-18', nextInspection: '2027-03-18', energyLimit: 150 },
  f8: { capacity: 0, address: bi('Южный хребет, мачта 5', 'South ridge, mast 5'), shifts: 1, lastInspection: '2026-04-11', nextInspection: '2026-10-11', energyLimit: 20 },
}

/** Адрес нового объекта, пока он не уточнён. */
export function pendingAddress(region: Bi): Bi {
  return bi(`${region.ru}, адрес уточняется`, `${region.en}, address pending`)
}

export function facilityProfile(f: Facility): FacilityProfile {
  return (
    PROFILES[f.id] ?? {
      capacity: Math.max(f.output, 100),
      address: pendingAddress(f.region),
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

export const SHIFT_STATE: Record<ShiftState, { label: Bi; tone: 'success' | 'info' | 'neutral' | 'warning' }> = {
  day: { label: bi('Дневная смена', 'Day shift'), tone: 'success' },
  night: { label: bi('Ночная смена', 'Night shift'), tone: 'info' },
  off: { label: bi('Выходной', 'Day off'), tone: 'neutral' },
  sick: { label: bi('Больничный', 'Sick leave'), tone: 'warning' },
}

export interface StaffMember {
  id: string
  name: Bi
  role: Bi
  shift: ShiftState
  phone: string
}

const NAMES: Bi[] = [
  bi('Андрей Белов', 'Andrey Belov'),
  bi('Ксения Морозова', 'Ksenia Morozova'),
  bi('Роман Фёдоров', 'Roman Fyodorov'),
  bi('Ольга Никитина', 'Olga Nikitina'),
  bi('Денис Кравец', 'Denis Kravets'),
  bi('Елена Субботина', 'Elena Subbotina'),
  bi('Артём Зайцев', 'Artyom Zaytsev'),
  bi('Вера Полякова', 'Vera Polyakova'),
  bi('Максим Орлов', 'Maxim Orlov'),
  bi('Наталья Гришина', 'Natalya Grishina'),
  bi('Игорь Сафонов', 'Igor Safonov'),
  bi('Юлия Тарасова', 'Yulia Tarasova'),
]

const ROLES: Bi[] = [
  bi('Начальник смены', 'Shift supervisor'),
  bi('Оператор линии', 'Line operator'),
  bi('Инженер-механик', 'Mechanical engineer'),
  bi('Электрик', 'Electrician'),
  bi('Техник КИПиА', 'Instrumentation technician'),
  bi('Контролёр ОТК', 'QC inspector'),
  bi('Кладовщик', 'Storekeeper'),
]
const SHIFTS: ShiftState[] = ['day', 'day', 'night', 'day', 'off', 'night', 'sick', 'day']

export function facilityStaff(f: Facility): StaffMember[] {
  const seed = Number(f.id.replace(/\D/g, '')) || f.name.ru.length
  const count = Math.min(6, Math.max(2, Math.round(f.staff / 9)))
  const out: StaffMember[] = [
    {
      id: `${f.id}-m`,
      name: f.manager,
      role: bi('Руководитель объекта', 'Facility manager'),
      shift: 'day',
      phone: `+7 900 ${100 + seed * 7}-1${seed}-0${seed}`,
    },
  ]
  for (let i = 0; i < count; i++) {
    const k = (seed * 5 + i * 7) % NAMES.length
    out.push({
      id: `${f.id}-s${i}`,
      name: NAMES[k] ?? bi('Сотрудник', 'Employee'),
      role: ROLES[(seed + i) % ROLES.length] ?? bi('Оператор', 'Operator'),
      shift: SHIFTS[(seed + i * 3) % SHIFTS.length] ?? 'day',
      phone: `+7 900 ${200 + k * 13}-${10 + i}-${20 + seed}`,
    })
  }
  return out
}

export type JournalKind = 'info' | 'warning' | 'danger' | 'success'

export interface JournalEntry {
  id: string
  /** ДД.ММ ЧЧ:ММ (у новой записи - «сейчас»). */
  at: Bi | string
  who: Bi | string
  /** Запись пользователя - обычная строка, как введена. */
  text: Bi | string
  kind: JournalKind
}

const SYSTEM = bi('Система', 'System')
const INSPECTION = bi('Инспекция', 'Inspection')
const AKHMEDOV = bi('Тимур Ахмедов', 'Timur Akhmedov')

const JOURNAL: Record<string, JournalEntry[]> = {
  f3: [
    {
      id: 'j1',
      at: '08.10 06:47',
      who: AKHMEDOV,
      text: bi('Открыт инцидент INC-2288: перегрев линии сборки №3, линия остановлена.', 'Incident INC-2288 opened: assembly line 3 overheating, line stopped.'),
      kind: 'danger',
    },
    {
      id: 'j2',
      at: '08.10 07:30',
      who: bi('Дежурный инженер', 'On-call engineer'),
      text: bi('Нагрузка перераспределена на линии №1 и №2, выпуск снижен до 60% плана.', 'Load shifted to lines 1 and 2; output reduced to 60% of plan.'),
      kind: 'warning',
    },
    { id: 'j3', at: '07.10 22:10', who: SYSTEM, text: bi('Температура подшипника линии №3 выше нормы на 12 °C.', 'Line 3 bearing temperature is 12 °C above normal.'), kind: 'warning' },
    { id: 'j4', at: '06.10 09:00', who: AKHMEDOV, text: bi('Плановая замена ремней конвейера завершена.', 'Scheduled conveyor belt replacement completed.'), kind: 'success' },
  ],
  f5: [
    {
      id: 'j1',
      at: '07.10 15:00',
      who: bi('Павел Гусев', 'Pavel Gusev'),
      text: bi('Объект переведён в обслуживание: замена фильтров вентиляции.', 'Facility put into maintenance: ventilation filter replacement.'),
      kind: 'info',
    },
    { id: 'j2', at: '07.10 15:20', who: SYSTEM, text: bi('Персонал смены переведён на объект Долина-1.', 'Shift staff transferred to Valley-1.'), kind: 'info' },
    { id: 'j3', at: '01.10 11:40', who: INSPECTION, text: bi('Проверка пожарной безопасности пройдена без замечаний.', 'Fire safety inspection passed with no findings.'), kind: 'success' },
  ],
  f8: [
    { id: 'j1', at: '08.10 08:12', who: SYSTEM, text: bi('Потеря связи с ретранслятором. Данные объекта не обновляются.', 'Relay connection lost. Facility data is not updating.'), kind: 'danger' },
    {
      id: 'j2',
      at: '08.10 08:25',
      who: bi('Олег Румянцев', 'Oleg Rumyantsev'),
      text: bi('Дежурная бригада выехала на объект, расчётное прибытие 11:00.', 'On-call crew dispatched to the site, ETA 11:00.'),
      kind: 'info',
    },
    { id: 'j3', at: '04.10 13:05', who: SYSTEM, text: bi('Кратковременные обрывы связи: 6 за сутки.', 'Brief connection drops: 6 in 24 hours.'), kind: 'warning' },
  ],
}

export function facilityJournal(f: Facility): JournalEntry[] {
  return (
    JOURNAL[f.id] ?? [
      { id: 'j1', at: '08.10 07:00', who: f.manager, text: bi('Смена принята, замечаний нет.', 'Shift handed over, no issues.'), kind: 'success' },
      { id: 'j2', at: '07.10 19:00', who: SYSTEM, text: bi(`Выпуск за сутки: ${f.output} ед.`, `Daily output: ${f.output} units.`), kind: 'info' },
      { id: 'j3', at: '05.10 10:15', who: INSPECTION, text: bi('Плановый обход оборудования выполнен.', 'Scheduled equipment walkthrough completed.'), kind: 'info' },
    ]
  )
}

/** Цвет полосы загрузки: перегруз, простой, недогруз, норма. */
export function loadTone(load: number): 'warning' | 'danger' | 'info' | 'accent' {
  return load >= 90 ? 'warning' : load === 0 ? 'danger' : load < 30 ? 'info' : 'accent'
}
