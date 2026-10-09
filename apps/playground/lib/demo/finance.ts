/*
 * Демо-данные финансов: выручка и расходы по дням, бюджеты объектов, счета.
 * Деньги - в копейках. Детерминированные (без Math.random и Date.now):
 * серверный и клиентский рендер совпадают. «Сегодня» демо - FINANCE_TODAY.
 */

import type { Tone } from 'endfield-vision'
import { bi, type Bi } from '../lang'
import { FACILITIES } from './facilities'

export const FINANCE_TODAY = '2026-10-08'
/** Первый день с данными: 90 дней до FINANCE_TODAY включительно. */
export const FINANCE_FIRST_DAY = '2026-07-11'

export type ExpenseCategory = 'payroll' | 'energy' | 'materials' | 'logistics' | 'maintenance'

export const EXPENSE_CATEGORIES: Array<{ key: ExpenseCategory; label: Bi }> = [
  { key: 'payroll', label: bi('Фонд оплаты труда', 'Payroll') },
  { key: 'materials', label: bi('Сырьё и материалы', 'Raw materials and supplies') },
  { key: 'energy', label: bi('Энергия', 'Energy') },
  { key: 'logistics', label: bi('Логистика', 'Logistics') },
  { key: 'maintenance', label: bi('Обслуживание', 'Maintenance') },
]

export interface FinanceDay {
  /** YYYY-MM-DD */
  date: string
  /** ДД.ММ - подпись оси. */
  label: string
  revenue: number
  expenses: Record<ExpenseCategory, number>
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function rub(n: number): number {
  return Math.round(n) * 100
}

export const FINANCE_DAYS: FinanceDay[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 6, 11 + i))
  const dow = d.getUTCDay()
  const weekend = dow === 0 || dow === 6
  const revenue = (2_150_000 + 320_000 * Math.sin(i / 4.1) + i * 3_500 + ((i * 37) % 11) * 18_000) * (weekend ? 0.64 : 1)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    label: `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`,
    revenue: rub(revenue),
    expenses: {
      payroll: rub(610_000 + (i % 5) * 6_000),
      energy: rub(290_000 + 40_000 * Math.sin(i / 6)),
      materials: rub((480_000 + 90_000 * Math.sin(i / 3.3 + 1) + ((i * 13) % 7) * 9_000) * (weekend ? 0.55 : 1)),
      logistics: rub(170_000 + ((i * 7) % 9) * 12_000),
      maintenance: rub(90_000 + (i % 14 === 3 ? 380_000 : 0)),
    },
  }
})

export function dayExpenses(d: FinanceDay): number {
  return EXPENSE_CATEGORIES.reduce((sum, c) => sum + d.expenses[c.key], 0)
}

/** Дебиторская задолженность на конец недели за 8 недель - для мини-графика. */
export const RECEIVABLES_TREND = [1_840_000_000, 1_910_000_000, 1_870_000_000, 2_020_000_000, 2_110_000_000, 2_060_000_000, 2_190_000_000, 2_250_000_000]

/* --- Бюджеты объектов --- */

export interface FacilityBudget {
  facilityId: string
  limit: number
  spent: number
}

export const BUDGET_PERIOD = bi('Сентябрь 2026', 'September 2026')

export const BUDGETS: FacilityBudget[] = [
  { facilityId: 'f4', limit: rub(14_500_000), spent: rub(13_120_000) },
  { facilityId: 'f1', limit: rub(12_000_000), spent: rub(10_480_000) },
  { facilityId: 'f6', limit: rub(11_800_000), spent: rub(11_330_000) },
  { facilityId: 'f2', limit: rub(9_400_000), spent: rub(7_150_000) },
  { facilityId: 'f3', limit: rub(7_200_000), spent: rub(7_790_000) },
  { facilityId: 'f7', limit: rub(4_600_000), spent: rub(3_020_000) },
  { facilityId: 'f5', limit: rub(2_100_000), spent: rub(2_410_000) },
  { facilityId: 'f8', limit: rub(900_000), spent: rub(610_000) },
]

/* --- Контрагенты и счета --- */

export interface Counterparty {
  id: string
  name: Bi
  inn: string
  email: string
}

export const COUNTERPARTIES: Counterparty[] = [
  { id: 'c1', name: bi('АО «Энергосбыт Север»', 'Energosbyt Sever JSC'), inn: '7841029384', email: 'buh@energosbyt-sever.example' },
  { id: 'c2', name: bi('ООО «Тяжмаш-Логистик»', 'Tyazhmash Logistics LLC'), inn: '6670418823', email: 'finance@tyazhmash-log.example' },
  { id: 'c3', name: bi('ООО «Реагент-Снаб»', 'Reagent Supply LLC'), inn: '5406771290', email: 'oplata@reagent-snab.example' },
  { id: 'c4', name: bi('АО «Терминал Ясный»', 'Clearwater Terminal JSC'), inn: '2536118004', email: 'accounts@terminal-yasny.example' },
  { id: 'c5', name: bi('ООО «Горный инструмент»', 'Mining Tools LLC'), inn: '4205390117', email: 'buh@gorinstrument.example' },
  { id: 'c6', name: bi('ООО «Сигма Аналитика»', 'Sigma Analytics LLC'), inn: '7703884561', email: 'invoices@sigma-an.example' },
  { id: 'c7', name: bi('АО «Транзит-Восток»', 'Transit East JSC'), inn: '2723190045', email: 'fin@tranzit-vostok.example' },
  { id: 'c8', name: bi('ИП Карпов Андрей Викторович', 'Andrey Karpov, sole proprietor'), inn: '540812345678', email: 'karpov.av@mail.example' },
]

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

export const INVOICE_STATUS: Record<InvoiceStatus, { label: Bi; tone: Tone }> = {
  paid: { label: bi('Оплачен', 'Paid'), tone: 'success' },
  pending: { label: bi('Ожидает', 'Pending'), tone: 'info' },
  overdue: { label: bi('Просрочен', 'Overdue'), tone: 'danger' },
  draft: { label: bi('Черновик', 'Draft'), tone: 'neutral' },
}

export interface Invoice {
  id: string
  /** Порядковый номер, 4 цифры: 0431. */
  seq: string
  /** Номер для показа: СЧ-2026-0431 / INV-2026-0431. */
  number: Bi
  counterpartyId: string
  facilityId: string
  /** Сумма без НДС, коп. */
  net: number
  /** Ставка НДС, %. */
  vat: number
  issuedAt: string
  dueAt: string
  status: InvoiceStatus
  paidAt: string | null
  /** Сколько раз отправлено напоминание. */
  reminders: number
  /** Назначение платежа: из демо-данных - на двух языках, введённое в форме - как есть. */
  description: Bi | string
}

/** Номер счёта на двух языках. */
export function invoiceNumber(seq: string): Bi {
  return bi(`СЧ-2026-${seq}`, `INV-2026-${seq}`)
}

/** Сумма с НДС, коп. */
export function invoiceTotal(net: number, vat: number): number {
  return net + Math.round((net * vat) / 100)
}

type Row = [string, string, string, number, number, string, string, InvoiceStatus, string | null, Bi]

const ROWS: Row[] = [
  ['0431', 'c4', 'f4', 3_840_000, 20, '2026-10-06', '2026-10-20', 'pending', null, bi('Перевалка контейнеров, 1-я неделя октября', 'Container handling, 1st week of October')],
  ['0430', 'c1', 'f1', 2_215_500, 20, '2026-10-05', '2026-10-19', 'pending', null, bi('Поставка продукции линии VAL-01 по договору 118/26', 'Supply of VAL-01 line output under contract 118/26')],
  ['0429', 'c6', 'f7', 486_000, 20, '2026-10-05', '2026-10-15', 'draft', null, bi('Лабораторный анализ проб, серия 41-48', 'Lab sample analysis, series 41-48')],
  ['0428', 'c2', 'f6', 5_120_000, 20, '2026-10-02', '2026-10-16', 'pending', null, bi('Отгрузка руды, партия Р-2210', 'Ore shipment, batch R-2210')],
  ['0427', 'c7', 'f4', 1_930_000, 20, '2026-09-30', '2026-10-07', 'overdue', null, bi('Хранение грузов на терминале, сентябрь', 'Cargo storage at the terminal, September')],
  ['0426', 'c5', 'f3', 742_300, 20, '2026-09-29', '2026-10-13', 'paid', '2026-10-06', bi('Ремонт дробильного узла, акт 77', 'Crusher unit repair, report 77')],
  ['0425', 'c3', 'f7', 318_900, 20, '2026-09-26', '2026-10-03', 'overdue', null, bi('Реактивы для контроля качества', 'Reagents for quality control')],
  ['0424', 'c4', 'f4', 3_610_000, 20, '2026-09-25', '2026-10-09', 'pending', null, bi('Перевалка контейнеров, 4-я неделя сентября', 'Container handling, 4th week of September')],
  ['0423', 'c1', 'f2', 1_884_000, 20, '2026-09-24', '2026-10-08', 'paid', '2026-10-07', bi('Поставка продукции линии VAL-02', 'Supply of VAL-02 line output')],
  ['0422', 'c8', 'f5', 96_000, 0, '2026-09-22', '2026-09-29', 'overdue', null, bi('Аренда спецтехники, 4 смены', 'Special equipment rental, 4 shifts')],
  ['0421', 'c2', 'f6', 4_870_000, 20, '2026-09-19', '2026-10-03', 'paid', '2026-10-01', bi('Отгрузка руды, партия Р-2207', 'Ore shipment, batch R-2207')],
  ['0420', 'c6', 'f7', 412_000, 20, '2026-09-18', '2026-09-28', 'paid', '2026-09-27', bi('Лабораторный анализ проб, серия 33-40', 'Lab sample analysis, series 33-40')],
  ['0419', 'c7', 'f8', 268_000, 20, '2026-09-17', '2026-09-30', 'overdue', null, bi('Транспортировка оборудования ретранслятора', 'Transport of relay equipment')],
  ['0418', 'c4', 'f4', 3_455_000, 20, '2026-09-15', '2026-09-29', 'paid', '2026-09-26', bi('Перевалка контейнеров, 2-я неделя сентября', 'Container handling, 2nd week of September')],
  ['0417', 'c1', 'f1', 2_390_000, 20, '2026-09-12', '2026-09-26', 'paid', '2026-09-24', bi('Поставка продукции линии VAL-01 по договору 118/26', 'Supply of VAL-01 line output under contract 118/26')],
  ['0416', 'c5', 'f6', 655_000, 20, '2026-09-10', '2026-09-24', 'paid', '2026-09-22', bi('Буровой инструмент, возврат по рекламации', 'Drilling tools, return under a claim')],
  ['0415', 'c3', 'f3', 210_400, 20, '2026-09-08', '2026-09-22', 'paid', '2026-09-19', bi('Реагенты для флотации', 'Flotation reagents')],
  ['0414', 'c2', 'f6', 5_340_000, 20, '2026-09-05', '2026-09-19', 'paid', '2026-09-18', bi('Отгрузка руды, партия Р-2201', 'Ore shipment, batch R-2201')],
  ['0413', 'c8', 'f2', 74_500, 0, '2026-09-03', '2026-09-10', 'paid', '2026-09-09', bi('Услуги электромонтажа', 'Electrical installation services')],
  ['0412', 'c7', 'f4', 1_770_000, 20, '2026-09-01', '2026-09-15', 'paid', '2026-09-14', bi('Хранение грузов на терминале, август', 'Cargo storage at the terminal, August')],
  ['0411', 'c6', 'f7', 395_000, 20, '2026-08-29', '2026-09-08', 'paid', '2026-09-05', bi('Лабораторный анализ проб, серия 25-32', 'Lab sample analysis, series 25-32')],
  ['0410', 'c1', 'f2', 1_702_000, 20, '2026-08-27', '2026-09-10', 'paid', '2026-09-08', bi('Поставка продукции линии VAL-02', 'Supply of VAL-02 line output')],
]

export const INVOICES: Invoice[] = ROWS.map(([n, cp, f, net, vat, issued, due, status, paidAt, description]) => ({
  id: `inv-${n}`,
  seq: n,
  number: invoiceNumber(n),
  counterpartyId: cp,
  facilityId: f,
  net: rub(net),
  vat,
  issuedAt: issued,
  dueAt: due,
  status,
  paidAt,
  reminders: status === 'overdue' ? 1 : 0,
  description,
}))

export function counterparty(id: string): Counterparty | undefined {
  return COUNTERPARTIES.find((c) => c.id === id)
}

/** Дней между датами YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number)
  const pb = b.split('-').map(Number)
  const ta = Date.UTC(pa[0]!, pa[1]! - 1, pa[2]!)
  const tb = Date.UTC(pb[0]!, pb[1]! - 1, pb[2]!)
  return Math.round((tb - ta) / 86_400_000)
}

export function facilityName(id: string): Bi {
  return FACILITIES.find((f) => f.id === id)?.name ?? bi(id, id)
}
