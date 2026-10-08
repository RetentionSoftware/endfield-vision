'use client'

import {
  addDaysIso,
  AreaChart,
  Badge,
  BarChart,
  Button,
  Card,
  DataTable,
  DateRangePicker,
  Menu,
  PageHeader,
  Progress,
  SearchInput,
  Sparkline,
  StatTile,
  StatusPill,
  Tabs,
  toast,
  normalizeSearch,
  type Column,
  type DateRange,
  type DateRangePreset,
  type SortState,
} from 'endfield-vision'
import { ChevronDown, FileSpreadsheet, FileText, Landmark, Percent, Plus, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  BUDGET_PERIOD,
  BUDGETS,
  counterparty,
  daysBetween,
  dayExpenses,
  EXPENSE_CATEGORIES,
  facilityName,
  FINANCE_DAYS,
  FINANCE_FIRST_DAY,
  FINANCE_TODAY,
  INVOICE_STATUS,
  invoiceTotal,
  INVOICES,
  RECEIVABLES_TREND,
  type FinanceDay,
  type Invoice,
  type InvoiceStatus,
} from '@/lib/demo/finance'
import { formatDate, formatNum, formatRub, formatRubShort, plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { InvoiceDrawer } from './InvoiceDrawer'
import { NewInvoiceModal } from './NewInvoiceModal'
import s from './finance.module.css'

type InvoiceTab = 'all' | InvoiceStatus

const PRESETS: DateRangePreset[] = [
  { id: 'last7', label: 'Последние 7 дней', range: () => ({ from: addDaysIso(FINANCE_TODAY, -6), to: FINANCE_TODAY }) },
  { id: 'last30', label: 'Последние 30 дней', range: () => ({ from: addDaysIso(FINANCE_TODAY, -29), to: FINANCE_TODAY }) },
  { id: 'october', label: 'Октябрь', range: () => ({ from: '2026-10-01', to: FINANCE_TODAY }) },
  { id: 'september', label: 'Сентябрь', range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
  { id: 'last90', label: 'Последние 90 дней', range: () => ({ from: FINANCE_FIRST_DAY, to: FINANCE_TODAY }) },
]

const DEFAULT_RANGE: DateRange = { from: addDaysIso(FINANCE_TODAY, -29), to: FINANCE_TODAY }

function sumRevenue(days: FinanceDay[]): number {
  return days.reduce((a, d) => a + d.revenue, 0)
}

function sumExpenses(days: FinanceDay[]): number {
  return days.reduce((a, d) => a + dayExpenses(d), 0)
}

function pctChange(cur: number, prev: number | null): number | null {
  if (prev === null || prev === 0) return null
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

function daysIn(range: DateRange): FinanceDay[] {
  return FINANCE_DAYS.filter((d) => d.date >= range.from && d.date <= range.to)
}

interface ExpenseBucket {
  label: string
  title: string
  values: Record<string, number>
}

/** Расходы по категориям: по дням для коротких периодов, по неделям - для длинных. */
function bucketize(days: FinanceDay[]): ExpenseBucket[] {
  const size = days.length <= 14 ? 1 : 7
  const out: ExpenseBucket[] = []
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size)
    const first = chunk[0]!
    const last = chunk[chunk.length - 1]!
    const values: Record<string, number> = {}
    for (const c of EXPENSE_CATEGORIES) values[c.key] = chunk.reduce((a, d) => a + d.expenses[c.key], 0)
    out.push({
      label: first.label,
      title: size === 1 ? formatDate(first.date)! : `${formatDate(first.date)} - ${formatDate(last.date)}`,
      values,
    })
  }
  return out
}

export function FinanceScreen() {
  const [range, setRange] = useState<DateRange | null>(DEFAULT_RANGE)
  const [invoices, setInvoices] = useState<Invoice[]>(INVOICES)
  const [tab, setTab] = useState<InvoiceTab>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const from = range?.from ?? FINANCE_FIRST_DAY
  const to = range?.to ?? FINANCE_TODAY
  const days = useMemo(() => daysIn({ from, to }), [from, to])

  const stats = useMemo(() => {
    const len = daysBetween(from, to) + 1
    const prevDays = daysIn({ from: addDaysIso(from, -len), to: addDaysIso(from, -1) })
    const hasPrev = prevDays.length === len
    const revenue = sumRevenue(days)
    const expenses = sumExpenses(days)
    const margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0
    const prevRevenue = hasPrev ? sumRevenue(prevDays) : null
    const prevExpenses = hasPrev ? sumExpenses(prevDays) : null
    const prevMargin = prevRevenue && prevExpenses !== null ? ((prevRevenue - prevExpenses) / prevRevenue) * 100 : null
    return {
      revenue,
      expenses,
      margin,
      revenueDelta: pctChange(revenue, prevRevenue),
      expensesDelta: pctChange(expenses, prevExpenses),
      marginDelta: prevMargin === null ? null : Math.round((margin - prevMargin) * 10) / 10,
    }
  }, [days, from, to])

  const receivables = useMemo(() => {
    const open = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue')
    const overdue = invoices.filter((i) => i.status === 'overdue')
    return {
      total: open.reduce((a, i) => a + invoiceTotal(i.net, i.vat), 0),
      overdue: overdue.reduce((a, i) => a + invoiceTotal(i.net, i.vat), 0),
      overdueCount: overdue.length,
    }
  }, [invoices])

  const buckets = useMemo(() => bucketize(days), [days])

  const structure = useMemo(() => {
    const total = sumExpenses(days)
    return EXPENSE_CATEGORIES.map((c, i) => {
      const value = days.reduce((a, d) => a + d.expenses[c.key], 0)
      return { ...c, value, share: total > 0 ? (value / total) * 100 : 0, color: `var(--ev-chart-${i + 1})` }
    })
  }, [days])

  const counts = useMemo(() => {
    const c: Record<InvoiceTab, number> = { all: invoices.length, paid: 0, pending: 0, overdue: 0, draft: 0 }
    for (const i of invoices) c[i.status] += 1
    return c
  }, [invoices])

  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    const list = invoices.filter((i) => {
      if (tab !== 'all' && i.status !== tab) return false
      if (!q) return true
      const cp = counterparty(i.counterpartyId)
      return [i.number, cp?.name ?? '', cp?.inn ?? '', facilityName(i.facilityId), i.description].some((v) => normalizeSearch(v).includes(q))
    })
    if (!sort) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sort.key === 'amount') return (invoiceTotal(a.net, a.vat) - invoiceTotal(b.net, b.vat)) * dir
      if (sort.key === 'dueAt') return a.dueAt.localeCompare(b.dueAt) * dir
      return a.number.localeCompare(b.number) * dir
    })
  }, [invoices, tab, query, sort])

  const visibleTotal = visible.reduce((a, i) => a + invoiceTotal(i.net, i.vat), 0)
  const opened = invoices.find((i) => i.id === openId) ?? null

  const patchInvoice = (id: string, patch: Partial<Invoice>) => {
    setInvoices((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const nextNumber = useMemo(() => {
    const max = invoices.reduce((m, i) => Math.max(m, Number(i.number.slice(-4))), 0)
    return String(max + 1).padStart(4, '0')
  }, [invoices])

  const exportReport = (title: string, file: string) => {
    toast.success(title, { description: `Файл ${file} за ${formatDate(from)} - ${formatDate(to)} сформирован.` })
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Номер',
      primary: true,
      sortable: true,
      cell: (i) => (
        <span className={s.twoLine}>
          <span className="ev-mono">{i.number}</span>
          <span className="ev-muted">от {formatDate(i.issuedAt)}</span>
        </span>
      ),
    },
    {
      key: 'counterparty',
      header: 'Контрагент',
      minWidth: 200,
      cell: (i) => <span className={s.counterparty}>{counterparty(i.counterpartyId)?.name}</span>,
    },
    { key: 'facility', header: 'Объект', hideOnMobile: true, cell: (i) => facilityName(i.facilityId) },
    { key: 'amount', header: 'Сумма', numeric: true, sortable: true, cell: (i) => formatRub(invoiceTotal(i.net, i.vat)) },
    {
      key: 'dueAt',
      header: 'Срок оплаты',
      sortable: true,
      cell: (i) => {
        const late = daysBetween(i.dueAt, FINANCE_TODAY)
        return (
          <span className={s.twoLine}>
            <span className="ev-num">{formatDate(i.dueAt)}</span>
            {i.status === 'overdue' ? (
              <span className={s.overdue}>
                просрочка {late} {plural(late, 'день', 'дня', 'дней')}
              </span>
            ) : i.status === 'paid' && i.paidAt ? (
              <span className="ev-muted">оплачен {formatDate(i.paidAt)}</span>
            ) : null}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (i) => <StatusPill tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</StatusPill>,
    },
  ]

  const tabLabels: Record<InvoiceTab, string> = { all: 'Все', pending: 'Ожидают', overdue: 'Просрочены', paid: 'Оплачены', draft: 'Черновики' }

  return (
    <>
      <PageHeader
        title="Финансы"
        subtitle="Выручка, расходы, бюджеты объектов и расчёты с контрагентами."
        breadcrumbs={crumbs('finance')}
        meta={
          receivables.overdueCount > 0 ? (
            <Badge tone="danger" dot>
              Просрочено счетов: {receivables.overdueCount}
            </Badge>
          ) : (
            <Badge tone="success" dot>
              Просрочек нет
            </Badge>
          )
        }
        actions={
          <>
            <DateRangePicker
              aria-label="Период отчёта"
              value={range}
              onChange={setRange}
              presets={PRESETS}
              min={FINANCE_FIRST_DAY}
              max={FINANCE_TODAY}
            />
            <Menu
              label="Экспорт"
              trigger={<Button iconRight={<ChevronDown size={15} />}>Экспорт</Button>}
              items={[
                { type: 'label', id: 'l', label: 'За выбранный период' },
                {
                  id: 'csv',
                  label: 'Реестр счетов',
                  hint: 'CSV',
                  icon: <FileSpreadsheet size={15} />,
                  onSelect: () => exportReport('Реестр счетов выгружен', 'invoices.csv'),
                },
                {
                  id: 'pnl',
                  label: 'Доходы и расходы',
                  hint: 'XLSX',
                  icon: <FileSpreadsheet size={15} />,
                  onSelect: () => exportReport('Отчёт о доходах и расходах готов', 'pnl.xlsx'),
                },
                {
                  id: 'budget',
                  label: 'Исполнение бюджетов',
                  hint: 'PDF',
                  icon: <FileText size={15} />,
                  onSelect: () => exportReport('Отчёт по бюджетам готов', 'budgets.pdf'),
                },
              ]}
            />
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
              Новый счёт
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '230px' }}>
          <StatTile
            label="Выручка"
            value={`${formatRubShort(stats.revenue)} ₽`}
            icon={<TrendingUp size={16} />}
            delta={stats.revenueDelta}
            deltaLabel="к прошлому периоду"
            trend={<Sparkline values={days.map((d) => d.revenue)} width="auto" aria-label="Выручка по дням" />}
          />
          <StatTile
            label="Расходы"
            value={`${formatRubShort(stats.expenses)} ₽`}
            icon={<TrendingDown size={16} />}
            tone="warning"
            delta={stats.expensesDelta}
            positiveIsGood={false}
            deltaLabel="к прошлому периоду"
            trend={<Sparkline values={days.map(dayExpenses)} width="auto" color="var(--ev-warning)" aria-label="Расходы по дням" />}
          />
          <StatTile
            label="Маржа"
            value={`${stats.margin.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`}
            icon={<Percent size={16} />}
            tone="success"
            delta={stats.marginDelta}
            formatDelta={(d) => `${d > 0 ? '+' : ''}${d.toLocaleString('ru-RU')} п.п.`}
            deltaLabel="к прошлому периоду"
            trend={
              <Sparkline
                values={days.map((d) => ((d.revenue - dayExpenses(d)) / d.revenue) * 100)}
                width="auto"
                color="var(--ev-success)"
                aria-label="Маржа по дням"
              />
            }
          />
          <StatTile
            label="Дебиторская задолженность"
            value={`${formatRubShort(receivables.total)} ₽`}
            icon={<Landmark size={16} />}
            tone="danger"
            delta={2.7}
            positiveIsGood={false}
            deltaLabel="за неделю"
            hint={receivables.overdue > 0 ? `Просрочено: ${formatRub(receivables.overdue)}` : 'Просроченных счетов нет'}
            trend={<Sparkline values={RECEIVABLES_TREND} width="auto" color="var(--ev-danger)" aria-label="Задолженность за 8 недель" />}
          />
        </div>

        <div className="pg-split">
          <Card title="Выручка и расходы" description={`По дням, ${formatDate(from)} - ${formatDate(to)}`}>
            <AreaChart
              aria-label="Выручка и расходы по дням"
              data={days}
              x={(d) => d.label}
              tooltipTitle={(d) => formatDate(d.date)!}
              height={280}
              series={[
                { key: 'revenue', label: 'Выручка', value: (d) => d.revenue },
                { key: 'expenses', label: 'Расходы', value: dayExpenses, color: 'var(--ev-chart-3)' },
              ]}
              format={formatRub}
              formatAxis={formatRubShort}
              emptyText="Нет данных за период"
            />
          </Card>
          <Card title="Бюджеты объектов" description={`${BUDGET_PERIOD}: факт к лимиту`} icon={<Wallet size={16} />}>
            <div className={s.budgets}>
              {BUDGETS.map((b) => {
                const pct = Math.round((b.spent / b.limit) * 100)
                return (
                  <Progress
                    key={b.facilityId}
                    size="sm"
                    tone={pct >= 90 ? 'warning' : 'accent'}
                    value={b.spent}
                    max={b.limit}
                    label={facilityName(b.facilityId)}
                    showValue={(spent, limit) =>
                      `${formatRubShort(spent)} из ${formatRubShort(limit)}${spent > limit ? ` (+${pct - 100}%)` : ''}`
                    }
                  />
                )
              })}
            </div>
          </Card>
        </div>

        <div className="pg-split">
          <Card title="Расходы по категориям" description={days.length > 14 ? 'По неделям, ₽' : 'По дням, ₽'}>
            <BarChart
              aria-label="Расходы по категориям"
              data={buckets}
              x={(b) => b.label}
              tooltipTitle={(b) => b.title}
              stacked
              height={280}
              series={EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, value: (b: ExpenseBucket) => b.values[c.key] ?? 0 }))}
              format={formatRub}
              formatAxis={formatRubShort}
              emptyText="Нет данных за период"
            />
          </Card>
          <Card title="Структура расходов" description={`Всего: ${formatRub(stats.expenses)}`}>
            <ul role="list" className={s.structure}>
              {structure.map((c) => (
                <li key={c.key} className={s.structureItem}>
                  <span className={s.dot} style={{ background: c.color }} aria-hidden="true" />
                  <span className={s.structureLabel}>{c.label}</span>
                  <span className="ev-num ev-muted">{c.share.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%</span>
                  <span className={s.structureValue}>{formatRubShort(c.value)} ₽</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card
          title="Счета"
          description="Выставленные счета контрагентам"
          icon={<ReceiptText size={16} />}
          flush
          actions={
            <SearchInput
              size="sm"
              wrapperClassName={s.search}
              value={query}
              onChange={setQuery}
              placeholder="Номер, контрагент, ИНН"
              aria-label="Поиск по счетам"
            />
          }
        >
          <Tabs
            aria-label="Статус счёта"
            value={tab}
            onChange={setTab}
            items={(['all', 'pending', 'overdue', 'paid', 'draft'] as const).map((t) => ({ value: t, label: tabLabels[t], count: counts[t] }))}
          />
          <DataTable
            aria-label="Счета"
            columns={columns}
            rows={visible}
            rowKey={(i) => i.id}
            sort={sort}
            onSortChange={setSort}
            onRowClick={(i) => setOpenId(i.id)}
            rowMuted={(i) => i.status === 'draft'}
            empty={query ? 'Ничего не найдено' : 'Счетов нет'}
            emptyDescription={query ? 'Измените запрос или выберите другую вкладку.' : undefined}
            footer={
              <span className="ev-muted ev-num">
                {formatNum(visible.length)} {plural(visible.length, 'счёт', 'счёта', 'счетов')} на сумму {formatRub(visibleTotal)}
              </span>
            }
          />
        </Card>
      </div>

      <InvoiceDrawer
        invoice={opened}
        onClose={() => setOpenId(null)}
        onMarkPaid={(id) => patchInvoice(id, { status: 'paid', paidAt: FINANCE_TODAY })}
        onReminded={(id) => patchInvoice(id, { reminders: (invoices.find((i) => i.id === id)?.reminders ?? 0) + 1 })}
        onIssue={(id) => patchInvoice(id, { status: 'pending', issuedAt: FINANCE_TODAY })}
      />

      {creating ? (
        <NewInvoiceModal
          number={`СЧ-2026-${nextNumber}`}
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const inv: Invoice = { ...draft, id: `inv-${nextNumber}`, number: `СЧ-2026-${nextNumber}`, issuedAt: FINANCE_TODAY, paidAt: null, reminders: 0 }
            setInvoices((list) => [inv, ...list])
            setTab('all')
            setCreating(false)
            toast.success(inv.status === 'draft' ? 'Черновик сохранён' : 'Счёт выставлен', {
              description: `${inv.number} на ${formatRub(invoiceTotal(inv.net, inv.vat))}`,
              action: { label: 'Открыть', onClick: () => setOpenId(inv.id) },
            })
          }}
        />
      ) : null}
    </>
  )
}
