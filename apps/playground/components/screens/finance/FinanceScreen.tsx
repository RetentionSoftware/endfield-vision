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
  invoiceNumber,
  invoiceTotal,
  INVOICES,
  RECEIVABLES_TREND,
  type FinanceDay,
  type Invoice,
  type InvoiceStatus,
} from '@/lib/demo/finance'
import { formatDate } from '@/lib/format'
import { bi, useCrumbs, useT, type Bi } from '@/lib/i18n'
import { InvoiceDrawer } from './InvoiceDrawer'
import { NewInvoiceModal } from './NewInvoiceModal'
import s from './finance.module.css'

type InvoiceTab = 'all' | InvoiceStatus

const PRESETS: Array<Omit<DateRangePreset, 'label'> & { label: Bi }> = [
  { id: 'last7', label: bi('Последние 7 дней', 'Last 7 days'), range: () => ({ from: addDaysIso(FINANCE_TODAY, -6), to: FINANCE_TODAY }) },
  { id: 'last30', label: bi('Последние 30 дней', 'Last 30 days'), range: () => ({ from: addDaysIso(FINANCE_TODAY, -29), to: FINANCE_TODAY }) },
  { id: 'october', label: bi('Октябрь', 'October'), range: () => ({ from: '2026-10-01', to: FINANCE_TODAY }) },
  { id: 'september', label: bi('Сентябрь', 'September'), range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
  { id: 'last90', label: bi('Последние 90 дней', 'Last 90 days'), range: () => ({ from: FINANCE_FIRST_DAY, to: FINANCE_TODAY }) },
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
  const { t, tx, plural, formatNum, formatRub, formatRubShort, intl } = useT()
  const breadcrumbs = useCrumbs('finance')
  const presets: DateRangePreset[] = PRESETS.map((p) => ({ ...p, label: tx(p.label) }))
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
      return [tx(i.number), cp ? tx(cp.name) : '', cp?.inn ?? '', tx(facilityName(i.facilityId)), tx(i.description)].some((v) =>
        normalizeSearch(v).includes(q),
      )
    })
    if (!sort) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sort.key === 'amount') return (invoiceTotal(a.net, a.vat) - invoiceTotal(b.net, b.vat)) * dir
      if (sort.key === 'dueAt') return a.dueAt.localeCompare(b.dueAt) * dir
      return a.seq.localeCompare(b.seq) * dir
    })
  }, [invoices, tab, query, sort, tx])

  const visibleTotal = visible.reduce((a, i) => a + invoiceTotal(i.net, i.vat), 0)
  const opened = invoices.find((i) => i.id === openId) ?? null

  const patchInvoice = (id: string, patch: Partial<Invoice>) => {
    setInvoices((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const nextNumber = useMemo(() => {
    const max = invoices.reduce((m, i) => Math.max(m, Number(i.seq)), 0)
    return String(max + 1).padStart(4, '0')
  }, [invoices])

  const exportReport = (title: string, file: string) => {
    toast.success(title, {
      description: t(`Файл ${file} за ${formatDate(from)} - ${formatDate(to)} сформирован.`, `${file} for ${formatDate(from)} - ${formatDate(to)} is ready.`),
    })
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: t('Номер', 'Number'),
      primary: true,
      sortable: true,
      cell: (i) => (
        <span className={s.twoLine}>
          <span className="ev-mono">{tx(i.number)}</span>
          <span className="ev-muted">
            {t('от', 'issued')} {formatDate(i.issuedAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'counterparty',
      header: t('Контрагент', 'Counterparty'),
      minWidth: 200,
      cell: (i) => {
        const cp = counterparty(i.counterpartyId)
        return <span className={s.counterparty}>{cp ? tx(cp.name) : null}</span>
      },
    },
    { key: 'facility', header: t('Объект', 'Facility'), hideOnMobile: true, cell: (i) => tx(facilityName(i.facilityId)) },
    { key: 'amount', header: t('Сумма', 'Amount'), numeric: true, sortable: true, cell: (i) => formatRub(invoiceTotal(i.net, i.vat)) },
    {
      key: 'dueAt',
      header: t('Срок оплаты', 'Due date'),
      sortable: true,
      cell: (i) => {
        const late = daysBetween(i.dueAt, FINANCE_TODAY)
        return (
          <span className={s.twoLine}>
            <span className="ev-num">{formatDate(i.dueAt)}</span>
            {i.status === 'overdue' ? (
              <span className={s.overdue}>
                {t('просрочка', 'overdue by')} {late} {plural(late, ['день', 'дня', 'дней'], ['day', 'days'])}
              </span>
            ) : i.status === 'paid' && i.paidAt ? (
              <span className="ev-muted">
                {t('оплачен', 'paid')} {formatDate(i.paidAt)}
              </span>
            ) : null}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      cell: (i) => <StatusPill tone={INVOICE_STATUS[i.status].tone}>{tx(INVOICE_STATUS[i.status].label)}</StatusPill>,
    },
  ]

  const tabLabels: Record<InvoiceTab, string> = {
    all: t('Все', 'All'),
    pending: t('Ожидают', 'Pending'),
    overdue: t('Просрочены', 'Overdue'),
    paid: t('Оплачены', 'Paid'),
    draft: t('Черновики', 'Drafts'),
  }

  return (
    <>
      <PageHeader
        title={t('Финансы', 'Finance')}
        subtitle={t('Выручка, расходы, бюджеты объектов и расчёты с контрагентами.', 'Revenue, expenses, facility budgets and counterparty settlements.')}
        breadcrumbs={breadcrumbs}
        meta={
          receivables.overdueCount > 0 ? (
            <Badge tone="danger" dot>
              {t('Просрочено счетов', 'Overdue invoices')}: {receivables.overdueCount}
            </Badge>
          ) : (
            <Badge tone="success" dot>
              {t('Просрочек нет', 'Nothing overdue')}
            </Badge>
          )
        }
        actions={
          <>
            <DateRangePicker
              aria-label={t('Период отчёта', 'Report period')}
              value={range}
              onChange={setRange}
              presets={presets}
              min={FINANCE_FIRST_DAY}
              max={FINANCE_TODAY}
            />
            <Menu
              label={t('Экспорт', 'Export')}
              trigger={<Button iconRight={<ChevronDown size={15} />}>{t('Экспорт', 'Export')}</Button>}
              items={[
                { type: 'label', id: 'l', label: t('За выбранный период', 'For the selected period') },
                {
                  id: 'csv',
                  label: t('Реестр счетов', 'Invoice register'),
                  hint: 'CSV',
                  icon: <FileSpreadsheet size={15} />,
                  onSelect: () => exportReport(t('Реестр счетов выгружен', 'Invoice register exported'), 'invoices.csv'),
                },
                {
                  id: 'pnl',
                  label: t('Доходы и расходы', 'Income and expenses'),
                  hint: 'XLSX',
                  icon: <FileSpreadsheet size={15} />,
                  onSelect: () => exportReport(t('Отчёт о доходах и расходах готов', 'Income and expense report ready'), 'pnl.xlsx'),
                },
                {
                  id: 'budget',
                  label: t('Исполнение бюджетов', 'Budget performance'),
                  hint: 'PDF',
                  icon: <FileText size={15} />,
                  onSelect: () => exportReport(t('Отчёт по бюджетам готов', 'Budget report ready'), 'budgets.pdf'),
                },
              ]}
            />
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
              {t('Новый счёт', 'New invoice')}
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '230px' }}>
          <StatTile
            label={t('Выручка', 'Revenue')}
            value={`${formatRubShort(stats.revenue)} ₽`}
            icon={<TrendingUp size={16} />}
            delta={stats.revenueDelta}
            deltaLabel={t('к прошлому периоду', 'vs previous period')}
            trend={<Sparkline values={days.map((d) => d.revenue)} width="auto" aria-label={t('Выручка по дням', 'Revenue by day')} />}
          />
          <StatTile
            label={t('Расходы', 'Expenses')}
            value={`${formatRubShort(stats.expenses)} ₽`}
            icon={<TrendingDown size={16} />}
            tone="warning"
            delta={stats.expensesDelta}
            positiveIsGood={false}
            deltaLabel={t('к прошлому периоду', 'vs previous period')}
            trend={
              <Sparkline values={days.map(dayExpenses)} width="auto" color="var(--ev-warning)" aria-label={t('Расходы по дням', 'Expenses by day')} />
            }
          />
          <StatTile
            label={t('Маржа', 'Margin')}
            value={`${stats.margin.toLocaleString(intl, { maximumFractionDigits: 1 })}%`}
            icon={<Percent size={16} />}
            tone="success"
            delta={stats.marginDelta}
            formatDelta={(d) => `${d > 0 ? '+' : ''}${d.toLocaleString(intl)} ${t('п.п.', 'pp')}`}
            deltaLabel={t('к прошлому периоду', 'vs previous period')}
            trend={
              <Sparkline
                values={days.map((d) => ((d.revenue - dayExpenses(d)) / d.revenue) * 100)}
                width="auto"
                color="var(--ev-success)"
                aria-label={t('Маржа по дням', 'Margin by day')}
              />
            }
          />
          <StatTile
            label={t('Дебиторская задолженность', 'Receivables')}
            value={`${formatRubShort(receivables.total)} ₽`}
            icon={<Landmark size={16} />}
            tone="danger"
            delta={2.7}
            positiveIsGood={false}
            deltaLabel={t('за неделю', 'this week')}
            hint={receivables.overdue > 0 ? `${t('Просрочено', 'Overdue')}: ${formatRub(receivables.overdue)}` : t('Просроченных счетов нет', 'No overdue invoices')}
            trend={
              <Sparkline
                values={RECEIVABLES_TREND}
                width="auto"
                color="var(--ev-danger)"
                aria-label={t('Задолженность за 8 недель', 'Receivables over 8 weeks')}
              />
            }
          />
        </div>

        <div className="pg-split">
          <Card title={t('Выручка и расходы', 'Revenue and expenses')} description={`${t('По дням', 'By day')}, ${formatDate(from)} - ${formatDate(to)}`}>
            <AreaChart
              aria-label={t('Выручка и расходы по дням', 'Revenue and expenses by day')}
              data={days}
              x={(d) => d.label}
              tooltipTitle={(d) => formatDate(d.date)!}
              height={280}
              series={[
                { key: 'revenue', label: t('Выручка', 'Revenue'), value: (d) => d.revenue },
                { key: 'expenses', label: t('Расходы', 'Expenses'), value: dayExpenses, color: 'var(--ev-chart-3)' },
              ]}
              format={formatRub}
              formatAxis={formatRubShort}
              emptyText={t('Нет данных за период', 'No data for this period')}
            />
          </Card>
          <Card
            title={t('Бюджеты объектов', 'Facility budgets')}
            description={`${tx(BUDGET_PERIOD)}: ${t('факт к лимиту', 'actual vs limit')}`}
            icon={<Wallet size={16} />}
          >
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
                    label={tx(facilityName(b.facilityId))}
                    showValue={(spent, limit) =>
                      `${formatRubShort(spent)} ${t('из', 'of')} ${formatRubShort(limit)}${spent > limit ? ` (+${pct - 100}%)` : ''}`
                    }
                  />
                )
              })}
            </div>
          </Card>
        </div>

        <div className="pg-split">
          <Card
            title={t('Расходы по категориям', 'Expenses by category')}
            description={days.length > 14 ? t('По неделям, ₽', 'By week, ₽') : t('По дням, ₽', 'By day, ₽')}
          >
            <BarChart
              aria-label={t('Расходы по категориям', 'Expenses by category')}
              data={buckets}
              x={(b) => b.label}
              tooltipTitle={(b) => b.title}
              stacked
              height={280}
              series={EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: tx(c.label), value: (b: ExpenseBucket) => b.values[c.key] ?? 0 }))}
              format={formatRub}
              formatAxis={formatRubShort}
              emptyText={t('Нет данных за период', 'No data for this period')}
            />
          </Card>
          <Card title={t('Структура расходов', 'Expense breakdown')} description={`${t('Всего', 'Total')}: ${formatRub(stats.expenses)}`}>
            <ul role="list" className={s.structure}>
              {structure.map((c) => (
                <li key={c.key} className={s.structureItem}>
                  <span className={s.dot} style={{ background: c.color }} aria-hidden="true" />
                  <span className={s.structureLabel}>{tx(c.label)}</span>
                  <span className="ev-num ev-muted">{c.share.toLocaleString(intl, { maximumFractionDigits: 1 })}%</span>
                  <span className={s.structureValue}>{formatRubShort(c.value)} ₽</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card
          title={t('Счета', 'Invoices')}
          description={t('Выставленные счета контрагентам', 'Invoices issued to counterparties')}
          icon={<ReceiptText size={16} />}
          flush
          actions={
            <SearchInput
              size="sm"
              wrapperClassName={s.search}
              value={query}
              onChange={setQuery}
              placeholder={t('Номер, контрагент, ИНН', 'Number, counterparty, TIN')}
              aria-label={t('Поиск по счетам', 'Search invoices')}
            />
          }
        >
          <Tabs
            aria-label={t('Статус счёта', 'Invoice status')}
            value={tab}
            onChange={setTab}
            items={(['all', 'pending', 'overdue', 'paid', 'draft'] as const).map((t) => ({ value: t, label: tabLabels[t], count: counts[t] }))}
          />
          <DataTable
            aria-label={t('Счета', 'Invoices')}
            columns={columns}
            rows={visible}
            rowKey={(i) => i.id}
            sort={sort}
            onSortChange={setSort}
            onRowClick={(i) => setOpenId(i.id)}
            rowMuted={(i) => i.status === 'draft'}
            empty={query ? t('Ничего не найдено', 'Nothing found') : t('Счетов нет', 'No invoices')}
            emptyDescription={query ? t('Измените запрос или выберите другую вкладку.', 'Change the search or pick another tab.') : undefined}
            footer={
              <span className="ev-muted ev-num">
                {formatNum(visible.length)} {plural(visible.length, ['счёт', 'счёта', 'счетов'], ['invoice', 'invoices'])}{' '}
                {t('на сумму', 'totaling')} {formatRub(visibleTotal)}
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
          number={tx(invoiceNumber(nextNumber))}
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const inv: Invoice = {
              ...draft,
              id: `inv-${nextNumber}`,
              seq: nextNumber,
              number: invoiceNumber(nextNumber),
              issuedAt: FINANCE_TODAY,
              paidAt: null,
              reminders: 0,
            }
            setInvoices((list) => [inv, ...list])
            setTab('all')
            setCreating(false)
            toast.success(inv.status === 'draft' ? t('Черновик сохранён', 'Draft saved') : t('Счёт выставлен', 'Invoice issued'), {
              description: `${tx(inv.number)} ${t('на', 'for')} ${formatRub(invoiceTotal(inv.net, inv.vat))}`,
              action: { label: t('Открыть', 'Open'), onClick: () => setOpenId(inv.id) },
            })
          }}
        />
      ) : null}
    </>
  )
}
