/*
 * Демо-данные финансов: выручка и расходы по дням, бюджеты объектов, счета.
 * Деньги - в копейках. Детерминированные (без Math.random и Date.now):
 * серверный и клиентский рендер совпадают. «Сегодня» демо - FINANCE_TODAY.
 */

import type { Tone } from 'endfield-vision'
import { FACILITIES } from './facilities'

export const FINANCE_TODAY = '2026-10-08'
/** Первый день с данными: 90 дней до FINANCE_TODAY включительно. */
export const FINANCE_FIRST_DAY = '2026-07-11'

export type ExpenseCategory = 'payroll' | 'energy' | 'materials' | 'logistics' | 'maintenance'

export const EXPENSE_CATEGORIES: Array<{ key: ExpenseCategory; label: string }> = [
  { key: 'payroll', label: 'Фонд оплаты труда' },
  { key: 'materials', label: 'Сырьё и материалы' },
  { key: 'energy', label: 'Энергия' },
  { key: 'logistics', label: 'Логистика' },
  { key: 'maintenance', label: 'Обслуживание' },
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

export const BUDGET_PERIOD = 'Сентябрь 2026'

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
  name: string
  inn: string
  email: string
}

export const COUNTERPARTIES: Counterparty[] = [
  { id: 'c1', name: 'АО «Энергосбыт Север»', inn: '7841029384', email: 'buh@energosbyt-sever.example' },
  { id: 'c2', name: 'ООО «Тяжмаш-Логистик»', inn: '6670418823', email: 'finance@tyazhmash-log.example' },
  { id: 'c3', name: 'ООО «Реагент-Снаб»', inn: '5406771290', email: 'oplata@reagent-snab.example' },
  { id: 'c4', name: 'АО «Терминал Ясный»', inn: '2536118004', email: 'accounts@terminal-yasny.example' },
  { id: 'c5', name: 'ООО «Горный инструмент»', inn: '4205390117', email: 'buh@gorinstrument.example' },
  { id: 'c6', name: 'ООО «Сигма Аналитика»', inn: '7703884561', email: 'invoices@sigma-an.example' },
  { id: 'c7', name: 'АО «Транзит-Восток»', inn: '2723190045', email: 'fin@tranzit-vostok.example' },
  { id: 'c8', name: 'ИП Карпов Андрей Викторович', inn: '540812345678', email: 'karpov.av@mail.example' },
]

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  paid: { label: 'Оплачен', tone: 'success' },
  pending: { label: 'Ожидает', tone: 'info' },
  overdue: { label: 'Просрочен', tone: 'danger' },
  draft: { label: 'Черновик', tone: 'neutral' },
}

export interface Invoice {
  id: string
  number: string
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
  description: string
}

/** Сумма с НДС, коп. */
export function invoiceTotal(net: number, vat: number): number {
  return net + Math.round((net * vat) / 100)
}

type Row = [string, string, string, number, number, string, string, InvoiceStatus, string | null, string]

const ROWS: Row[] = [
  ['0431', 'c4', 'f4', 3_840_000, 20, '2026-10-06', '2026-10-20', 'pending', null, 'Перевалка контейнеров, 1-я неделя октября'],
  ['0430', 'c1', 'f1', 2_215_500, 20, '2026-10-05', '2026-10-19', 'pending', null, 'Поставка продукции линии VAL-01 по договору 118/26'],
  ['0429', 'c6', 'f7', 486_000, 20, '2026-10-05', '2026-10-15', 'draft', null, 'Лабораторный анализ проб, серия 41-48'],
  ['0428', 'c2', 'f6', 5_120_000, 20, '2026-10-02', '2026-10-16', 'pending', null, 'Отгрузка руды, партия Р-2210'],
  ['0427', 'c7', 'f4', 1_930_000, 20, '2026-09-30', '2026-10-07', 'overdue', null, 'Хранение грузов на терминале, сентябрь'],
  ['0426', 'c5', 'f3', 742_300, 20, '2026-09-29', '2026-10-13', 'paid', '2026-10-06', 'Ремонт дробильного узла, акт 77'],
  ['0425', 'c3', 'f7', 318_900, 20, '2026-09-26', '2026-10-03', 'overdue', null, 'Реактивы для контроля качества'],
  ['0424', 'c4', 'f4', 3_610_000, 20, '2026-09-25', '2026-10-09', 'pending', null, 'Перевалка контейнеров, 4-я неделя сентября'],
  ['0423', 'c1', 'f2', 1_884_000, 20, '2026-09-24', '2026-10-08', 'paid', '2026-10-07', 'Поставка продукции линии VAL-02'],
  ['0422', 'c8', 'f5', 96_000, 0, '2026-09-22', '2026-09-29', 'overdue', null, 'Аренда спецтехники, 4 смены'],
  ['0421', 'c2', 'f6', 4_870_000, 20, '2026-09-19', '2026-10-03', 'paid', '2026-10-01', 'Отгрузка руды, партия Р-2207'],
  ['0420', 'c6', 'f7', 412_000, 20, '2026-09-18', '2026-09-28', 'paid', '2026-09-27', 'Лабораторный анализ проб, серия 33-40'],
  ['0419', 'c7', 'f8', 268_000, 20, '2026-09-17', '2026-09-30', 'overdue', null, 'Транспортировка оборудования ретранслятора'],
  ['0418', 'c4', 'f4', 3_455_000, 20, '2026-09-15', '2026-09-29', 'paid', '2026-09-26', 'Перевалка контейнеров, 2-я неделя сентября'],
  ['0417', 'c1', 'f1', 2_390_000, 20, '2026-09-12', '2026-09-26', 'paid', '2026-09-24', 'Поставка продукции линии VAL-01 по договору 118/26'],
  ['0416', 'c5', 'f6', 655_000, 20, '2026-09-10', '2026-09-24', 'paid', '2026-09-22', 'Буровой инструмент, возврат по рекламации'],
  ['0415', 'c3', 'f3', 210_400, 20, '2026-09-08', '2026-09-22', 'paid', '2026-09-19', 'Реагенты для флотации'],
  ['0414', 'c2', 'f6', 5_340_000, 20, '2026-09-05', '2026-09-19', 'paid', '2026-09-18', 'Отгрузка руды, партия Р-2201'],
  ['0413', 'c8', 'f2', 74_500, 0, '2026-09-03', '2026-09-10', 'paid', '2026-09-09', 'Услуги электромонтажа'],
  ['0412', 'c7', 'f4', 1_770_000, 20, '2026-09-01', '2026-09-15', 'paid', '2026-09-14', 'Хранение грузов на терминале, август'],
  ['0411', 'c6', 'f7', 395_000, 20, '2026-08-29', '2026-09-08', 'paid', '2026-09-05', 'Лабораторный анализ проб, серия 25-32'],
  ['0410', 'c1', 'f2', 1_702_000, 20, '2026-08-27', '2026-09-10', 'paid', '2026-09-08', 'Поставка продукции линии VAL-02'],
]

export const INVOICES: Invoice[] = ROWS.map(([n, cp, f, net, vat, issued, due, status, paidAt, description]) => ({
  id: `inv-${n}`,
  number: `СЧ-2026-${n}`,
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

export function facilityName(id: string): string {
  return FACILITIES.find((f) => f.id === id)?.name ?? id
}
