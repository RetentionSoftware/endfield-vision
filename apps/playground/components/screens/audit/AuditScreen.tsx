'use client'

import {
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  DataTable,
  DateRangePicker,
  EmptyState,
  FilterBar,
  Menu,
  MultiSelect,
  normalizeSearch,
  PageHeader,
  Pagination,
  Select,
  toast,
  type Column,
  type DateRange,
  type DateRangePreset,
  type SelectOption,
  type SortState,
} from 'endfield-vision'
import { ChevronDown, Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AUDIT_ACTIONS,
  AUDIT_DAYS,
  AUDIT_EVENTS,
  SYSTEM_ACTOR,
  type AuditAction,
  type AuditEvent,
} from '@/lib/demo/audit'
import { TODAY } from '@/lib/demo/tasks'
import { personById } from '@/lib/demo/team'
import { formatDateTime, formatNum, plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { actorName, AuditDrawer, isExternalIp } from './AuditDrawer'
import s from './audit.module.css'

/** Пресеты от «сегодня» демо-консоли: данные журнала зафиксированы. */
const PRESETS: DateRangePreset[] = [
  { id: 'today', label: 'Сегодня', range: () => ({ from: TODAY, to: TODAY }) },
  { id: 'yesterday', label: 'Вчера', range: () => ({ from: '2026-10-07', to: '2026-10-07' }) },
  { id: 'week', label: 'Последние 7 дней', range: () => ({ from: '2026-10-02', to: TODAY }) },
  { id: 'twoWeeks', label: 'Последние 14 дней', range: () => ({ from: AUDIT_DAYS[0]!, to: TODAY }) },
  { id: 'september', label: 'Сентябрь', range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
]

const ACTION_OPTIONS: SelectOption<AuditAction>[] = (Object.keys(AUDIT_ACTIONS) as AuditAction[]).map(
  (a) => ({ value: a, label: AUDIT_ACTIONS[a].label }),
)

const ACTOR_OPTIONS: SelectOption[] = Array.from(new Set(AUDIT_EVENTS.map((e) => e.actorId)))
  .map((id) => {
    const p = personById(id)
    return {
      value: id,
      label: actorName(id),
      hint: p ? p.position : 'Автоматические задания',
      icon: <Avatar name={actorName(id)} size={20} />,
    }
  })
  .sort((a, b) =>
    a.value === SYSTEM_ACTOR ? 1 : b.value === SYSTEM_ACTOR ? -1 : a.label.localeCompare(b.label, 'ru'),
  )

const CHANGE_ACTIONS = new Set<AuditAction>(['create', 'update', 'delete'])

function dayLabel(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}

function eventWord(n: number) {
  return plural(n, 'событие', 'события', 'событий')
}

export function AuditScreen() {
  const [q, setQ] = useState('')
  const [action, setAction] = useState<AuditAction | null>(null)
  const [actors, setActors] = useState<string[]>([])
  const [range, setRange] = useState<DateRange | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'at', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [openId, setOpenId] = useState<string | null>(null)

  // Все фильтры, кроме периода: для графика (он сам режется периодом по дням).
  const byAttrs = useMemo(() => {
    const needle = normalizeSearch(q)
    return AUDIT_EVENTS.filter((e) => {
      if (action && e.action !== action) return false
      if (actors.length > 0 && !actors.includes(e.actorId)) return false
      if (!needle) return true
      return normalizeSearch(`${e.id} ${e.object} ${e.summary} ${actorName(e.actorId)} ${e.ip}`).includes(
        needle,
      )
    })
  }, [q, action, actors])

  const filtered = useMemo(() => {
    const list = range
      ? byAttrs.filter((e) => e.at.slice(0, 10) >= range.from && e.at.slice(0, 10) <= range.to)
      : [...byAttrs]
    if (sort?.key === 'at' && sort.dir === 'asc') list.reverse()
    return list
  }, [byAttrs, range, sort])

  const chartData = useMemo(() => {
    const days = range ? AUDIT_DAYS.filter((d) => d >= range.from && d <= range.to) : AUDIT_DAYS
    return days.map((day) => {
      const list = byAttrs.filter((e) => e.at.startsWith(day))
      return {
        day,
        changes: list.filter((e) => CHANGE_ACTIONS.has(e.action)).length,
        logins: list.filter((e) => e.action === 'login').length,
        other: list.filter((e) => e.action === 'export' || e.action === 'access').length,
      }
    })
  }, [byAttrs, range])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const openEvent = openId ? (AUDIT_EVENTS.find((e) => e.id === openId) ?? null) : null
  const external = filtered.filter((e) => isExternalIp(e.ip) && e.action === 'login').length
  const activeFilters = (action ? 1 : 0) + (actors.length > 0 ? 1 : 0) + (range ? 1 : 0)

  const withReset =
    <A,>(fn: (v: A) => void) =>
    (v: A) => {
      fn(v)
      setPage(1)
    }

  const exportAs = (format: 'CSV' | 'JSON') => {
    if (filtered.length === 0) {
      toast.warning('Нечего выгружать', { description: 'По условиям фильтра событий нет.' })
      return
    }
    toast.success('Журнал выгружен', {
      description: `${formatNum(filtered.length)} ${eventWord(filtered.length)}, ${format}`,
    })
  }

  const columns: Column<AuditEvent>[] = [
    {
      key: 'at',
      header: 'Время',
      sortable: true,
      width: 150,
      cell: (e) => <span className="ev-num">{formatDateTime(e.at)}</span>,
    },
    {
      key: 'actor',
      header: 'Пользователь',
      cell: (e) => (
        <span className={s.actor}>
          <Avatar
            name={actorName(e.actorId)}
            size={24}
            tone={e.actorId === SYSTEM_ACTOR ? 'neutral' : undefined}
          />
          <span className="ev-truncate">{actorName(e.actorId)}</span>
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Действие',
      cell: (e) => <Badge tone={AUDIT_ACTIONS[e.action].tone}>{AUDIT_ACTIONS[e.action].label}</Badge>,
    },
    {
      key: 'object',
      header: 'Объект',
      primary: true,
      minWidth: 260,
      cell: (e) => (
        <span className={s.object}>
          <span className="ev-truncate">{e.object}</span>
          <span className="ev-muted ev-truncate">
            {e.objectType} - {e.summary}
          </span>
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP-адрес',
      align: 'right',
      cell: (e) => (
        <span className={isExternalIp(e.ip) ? `${s.ipExternal} ev-mono` : 'ev-mono ev-muted'}>{e.ip}</span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Журнал"
        subtitle="Действия пользователей и автоматических заданий: изменения данных, входы, выгрузки."
        breadcrumbs={crumbs('audit')}
        meta={<Badge tone="neutral">Хранение 365 дней</Badge>}
        actions={
          <Menu
            label="Экспорт журнала"
            trigger={
              <Button icon={<Download size={15} />} iconRight={<ChevronDown size={14} />}>
                Экспорт
              </Button>
            }
            items={[
              {
                type: 'label',
                id: 'l',
                label: `По фильтру: ${formatNum(filtered.length)} ${eventWord(filtered.length)}`,
              },
              {
                id: 'csv',
                label: 'CSV',
                hint: 'Таблица для Excel',
                icon: <FileSpreadsheet size={15} />,
                onSelect: () => exportAs('CSV'),
              },
              {
                id: 'json',
                label: 'JSON',
                hint: 'С полями изменений',
                icon: <FileJson size={15} />,
                onSelect: () => exportAs('JSON'),
              },
            ]}
          />
        }
      />

      <div className={s.page}>
        <FilterBar
          search={{
            value: q,
            onChange: withReset(setQ),
            placeholder: 'Объект, пользователь, IP, ID события',
          }}
          activeCount={activeFilters}
          onReset={() => {
            setQ('')
            setAction(null)
            setActors([])
            setRange(null)
            setPage(1)
          }}
        >
          <Select
            aria-label="Тип действия"
            placeholder="Все действия"
            value={action}
            onChange={withReset(setAction)}
            options={ACTION_OPTIONS}
            clearable
            searchable={false}
          />
          <MultiSelect
            aria-label="Пользователи"
            placeholder="Все пользователи"
            value={actors}
            onChange={withReset(setActors)}
            options={ACTOR_OPTIONS}
            dropdownMinWidth={300}
          />
          <DateRangePicker
            aria-label="Период"
            value={range}
            onChange={withReset(setRange)}
            presets={PRESETS}
            clearable
            min="2026-09-01"
            max={TODAY}
          />
        </FilterBar>

        <Card
          title="События по дням"
          description={`${formatNum(filtered.length)} ${eventWord(filtered.length)} за ${range ? 'выбранный период' : 'две недели'}${external > 0 ? `, входов из внешней сети: ${external}` : ''}`}
        >
          <BarChart
            aria-label="Количество событий по дням"
            data={chartData}
            x={(d) => dayLabel(d.day)}
            tooltipTitle={(d) => d.day.split('-').reverse().join('.')}
            stacked
            height={200}
            integer
            series={[
              { key: 'changes', label: 'Изменения данных', value: (d) => d.changes },
              { key: 'logins', label: 'Входы', value: (d) => d.logins },
              { key: 'other', label: 'Доступ и выгрузки', value: (d) => d.other },
            ]}
            emptyText="Нет событий за период"
          />
        </Card>

        <Card flush>
          <DataTable
            aria-label="События журнала"
            columns={columns}
            rows={pageRows}
            rowKey={(e) => e.id}
            sort={sort}
            sortClearable={false}
            onSortChange={(next) => {
              setSort(next)
              setPage(1)
            }}
            onRowClick={(e) => setOpenId(e.id)}
            empty={
              <EmptyState
                compact
                title="Событий не найдено"
                description="Измените период или условия фильтра."
              />
            }
            footer={
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n)
                  setPage(1)
                }}
                pageSizeOptions={[25, 50, 100]}
              />
            }
          />
        </Card>
      </div>

      <AuditDrawer event={openEvent} onClose={() => setOpenId(null)} />
    </>
  )
}
