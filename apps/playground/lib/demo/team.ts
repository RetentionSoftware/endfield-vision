/*
 * Демо-данные сотрудников и приглашений. Сотрудники - исполнители задач и
 * авторы событий журнала. Детерминированные: без Math.random и Date.now.
 */

import type { Tone } from 'endfield-vision'

export type Role = 'admin' | 'manager' | 'engineer' | 'operator' | 'analyst'
export type Presence = 'shift' | 'off' | 'vacation'
export type Access = 'full' | 'edit' | 'view'

export interface Person {
  id: string
  name: string
  role: Role
  /** Должность. */
  position: string
  facilityIds: string[]
  email: string
  /** E.164. */
  phone: string
  presence: Presence
  /** Загрузка задачами, %. */
  load: number
  access: Access
  joinedAt: string
  lastSeen: string
  active: boolean
}

export interface Invite {
  id: string
  name: string
  email: string
  role: Role
  access: Access
  facilityIds: string[]
  invitedBy: string
  sentAt: string | null
  expiresAt: string
  token: string
}

export const ROLES: Record<Role, { label: string; tone: Tone }> = {
  admin: { label: 'Администратор', tone: 'violet' },
  manager: { label: 'Руководитель', tone: 'accent' },
  engineer: { label: 'Инженер', tone: 'info' },
  operator: { label: 'Оператор', tone: 'neutral' },
  analyst: { label: 'Аналитик', tone: 'success' },
}

export const PRESENCE: Record<Presence, { label: string; tone: Tone }> = {
  shift: { label: 'На смене', tone: 'success' },
  off: { label: 'Не на смене', tone: 'neutral' },
  vacation: { label: 'В отпуске', tone: 'warning' },
}

export const ACCESS: Record<Access, { label: string; description: string }> = {
  full: { label: 'Полный', description: 'Все разделы, управление командой и настройками.' },
  edit: { label: 'Редактирование', description: 'Работа с задачами, складом и объектами из списка.' },
  view: { label: 'Просмотр', description: 'Только чтение: отчёты, журналы, статусы.' },
}

/** Текущий пользователь консоли (меню аккаунта). */
export const CURRENT_USER_ID = 'p07'

export const INVITE_BASE_URL = 'https://console.endfield-ops.ru/invite/'

type Row = [
  id: string,
  name: string,
  role: Role,
  position: string,
  facilities: string,
  email: string,
  phone: string,
  presence: Presence,
  load: number,
  access: Access,
  joinedAt: string,
  lastSeen: string,
]

// prettier-ignore
const ROWS: Row[] = [
  ['p01', 'Глеб Сорокин', 'manager', 'Начальник площадки', 'f1', 'g.sorokin', '+79161204417', 'shift', 82, 'edit', '2023-04-12', '2026-10-08T09:41:00'],
  ['p02', 'Ирина Лебедева', 'manager', 'Начальник площадки', 'f2', 'i.lebedeva', '+79035518842', 'shift', 74, 'edit', '2023-09-01', '2026-10-08T08:57:00'],
  ['p03', 'Тимур Ахмедов', 'manager', 'Начальник площадки', 'f3', 't.akhmedov', '+79267730115', 'shift', 96, 'edit', '2024-02-19', '2026-10-08T09:12:00'],
  ['p04', 'Мария Котова', 'manager', 'Начальник порта', 'f4', 'm.kotova', '+79154402296', 'shift', 88, 'edit', '2022-11-30', '2026-10-08T09:30:00'],
  ['p05', 'Павел Гусев', 'manager', 'Начальник заставы', 'f5', 'p.gusev', '+79998810437', 'off', 41, 'edit', '2024-06-05', '2026-10-07T18:20:00'],
  ['p06', 'Святослав Ершов', 'manager', 'Начальник рудника', 'f6', 's.ershov', '+79112236671', 'vacation', 0, 'edit', '2021-08-14', '2026-09-30T17:45:00'],
  ['p07', 'Алина Воронцова', 'admin', 'Директор по операциям', 'f1,f2,f3,f4,f5,f6,f7,f8', 'a.vorontsova', '+79057761200', 'shift', 67, 'full', '2021-03-01', '2026-10-08T09:44:00'],
  ['p08', 'Олег Румянцев', 'manager', 'Начальник узла связи', 'f8', 'o.rumyantsev', '+79246617780', 'shift', 100, 'edit', '2023-01-23', '2026-10-08T08:15:00'],
  ['p09', 'Дарья Миронова', 'analyst', 'Аналитик производства', 'f1,f2,f6', 'd.mironova', '+79680042318', 'shift', 58, 'view', '2026-10-06', '2026-10-08T09:02:00'],
  ['p10', 'Константин Белов', 'engineer', 'Инженер-механик', 'f1,f2', 'k.belov', '+79852290164', 'shift', 92, 'edit', '2023-05-17', '2026-10-08T07:58:00'],
  ['p11', 'Наталья Орлова', 'engineer', 'Инженер-химик', 'f7', 'n.orlova', '+79037714452', 'shift', 63, 'edit', '2024-10-01', '2026-10-08T09:20:00'],
  ['p12', 'Артём Зайцев', 'operator', 'Оператор линии', 'f3', 'a.zaitsev', '+79161198830', 'shift', 77, 'view', '2024-03-11', '2026-10-08T06:05:00'],
  ['p13', 'Елена Фомина', 'analyst', 'Специалист по запасам', 'f4,f6', 'e.fomina', '+79264450097', 'off', 35, 'view', '2022-08-22', '2026-10-07T19:10:00'],
  ['p14', 'Руслан Каримов', 'engineer', 'Инженер связи', 'f8,f5', 'r.karimov', '+79992201745', 'shift', 98, 'edit', '2023-07-03', '2026-10-08T09:38:00'],
  ['p15', 'Вера Полякова', 'operator', 'Диспетчер', 'f4', 'v.polyakova', '+79153362208', 'shift', 54, 'view', '2024-01-15', '2026-10-08T09:40:00'],
  ['p16', 'Денис Мельников', 'engineer', 'Инженер по охране труда', 'f1,f3,f6', 'd.melnikov', '+79057718841', 'vacation', 0, 'edit', '2022-04-28', '2026-09-26T16:30:00'],
  ['p17', 'Ольга Савина', 'analyst', 'Экономист', 'f1,f2,f3,f4,f5,f6,f7,f8', 'o.savina', '+79128840016', 'off', 22, 'view', '2023-11-20', '2026-10-07T17:55:00'],
  ['p18', 'Игорь Тарасов', 'operator', 'Оператор погрузки', 'f4', 'i.tarasov', '+79671105539', 'shift', 81, 'view', '2025-02-10', '2026-10-08T05:50:00'],
  ['p19', 'Ксения Гришина', 'engineer', 'Инженер-технолог', 'f6', 'k.grishina', '+79265537712', 'shift', 69, 'edit', '2024-08-19', '2026-10-08T08:44:00'],
  ['p20', 'Михаил Ковалёв', 'operator', 'Машинист буровой', 'f6', 'm.kovalev', '+79031184460', 'off', 47, 'view', '2023-03-06', '2026-10-07T20:02:00'],
  ['p21', 'Анна Дьячкова', 'admin', 'Администратор систем', 'f1,f2,f3,f4,f5,f6,f7,f8', 'a.dyachkova', '+79859921034', 'shift', 72, 'full', '2022-01-10', '2026-10-08T09:33:00'],
  ['p22', 'Сергей Новиков', 'operator', 'Оператор котельной', 'f2', 's.novikov', '+79164478825', 'vacation', 0, 'view', '2024-12-02', '2026-10-01T15:12:00'],
  ['p23', 'Юлия Ермакова', 'engineer', 'Метролог', 'f7,f1', 'yu.ermakova', '+79098863107', 'shift', 58, 'edit', '2025-04-14', '2026-10-08T09:08:00'],
  ['p24', 'Фёдор Литвинов', 'operator', 'Охранник периметра', 'f5', 'f.litvinov', '+79771230456', 'off', 18, 'view', '2025-06-30', '2026-10-06T22:40:00'],
]

export const PEOPLE: Person[] = ROWS.map(
  ([id, name, role, position, facilities, login, phone, presence, load, access, joinedAt, lastSeen]) => ({
    id,
    name,
    role,
    position,
    facilityIds: facilities.split(','),
    email: `${login}@endfield-ops.ru`,
    phone,
    presence,
    load,
    access,
    joinedAt,
    lastSeen,
    active: id !== 'p24',
  }),
)

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]))

export function personById(id: string): Person | undefined {
  return BY_ID.get(id)
}

export function personName(id: string): string {
  return BY_ID.get(id)?.name ?? 'Неизвестный'
}

export const INVITES: Invite[] = [
  {
    id: 'inv1',
    name: 'Роман Щербаков',
    email: 'r.shcherbakov@endfield-ops.ru',
    role: 'engineer',
    access: 'edit',
    facilityIds: ['f3'],
    invitedBy: 'p07',
    sentAt: '2026-10-05',
    expiresAt: '2026-10-12',
    token: 'K7Q2M9XHPA',
  },
  {
    id: 'inv2',
    name: 'Лидия Чернова',
    email: 'l.chernova@endfield-ops.ru',
    role: 'analyst',
    access: 'view',
    facilityIds: ['f4', 'f6'],
    invitedBy: 'p21',
    sentAt: '2026-10-07',
    expiresAt: '2026-10-14',
    token: 'R4T8W1ZNCE',
  },
  {
    id: 'inv3',
    name: 'Арсений Власов',
    email: 'a.vlasov@endfield-ops.ru',
    role: 'operator',
    access: 'view',
    facilityIds: ['f8'],
    invitedBy: 'p07',
    sentAt: null,
    expiresAt: '2026-10-15',
    token: 'H3D6Y0PLSV',
  },
]
