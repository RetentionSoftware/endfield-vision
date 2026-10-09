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
import { formatDateTime } from '@/lib/format'
import { useCrumbs, useT, type Translator } from '@/lib/i18n'
import { actorName, AuditDrawer, isExternalIp } from './AuditDrawer'
import s from './audit.module.css'

/** Пресеты от «сегодня» демо-консоли: данные журнала зафиксированы. */
function presets({ t }: Translator): DateRangePreset[] {
  return [
    { id: 'today', label: t('Сегодня', 'Today'), range: () => ({ from: TODAY, to: TODAY }) },
    {
      id: 'yesterday',
      label: t('Вчера', 'Yesterday'),
      range: () => ({ from: '2026-10-07', to: '2026-10-07' }),
    },
    {
      id: 'week',
      label: t('Последние 7 дней', 'Last 7 days'),
      range: () => ({ from: '2026-10-02', to: TODAY }),
    },
    {
      id: 'twoWeeks',
      label: t('Последние 14 дней', 'Last 14 days'),
      range: () => ({ from: AUDIT_DAYS[0]!, to: TODAY }),
    },
    {
      id: 'september',
      label: t('Сентябрь', 'September'),
      range: () => ({ from: '2026-09-01', to: '2026-09-30' }),
    },
  ]
}

function actionOptions({ tx }: Translator): SelectOption<AuditAction>[] {
  return (Object.keys(AUDIT_ACTIONS) as AuditAction[]).map((a) => ({
    value: a,
    label: tx(AUDIT_ACTIONS[a].label),
  }))
}

const ACTOR_IDS = Array.from(new Set(AUDIT_EVENTS.map((e) => e.actorId)))

function actorOptions({ t, tx, intl }: Translator): SelectOption[] {
  return ACTOR_IDS.map((id) => {
    const p = personById(id)
    const name = tx(actorName(id))
    return {
      value: id,
      label: name,
      hint: p ? tx(p.position) : t('Автоматические задания', 'Automated jobs'),
      icon: <Avatar name={name} size={20} />,
    }
  }).sort((a, b) =>
    a.value === SYSTEM_ACTOR ? 1 : b.value === SYSTEM_ACTOR ? -1 : a.label.localeCompare(b.label, intl),
  )
}

const CHANGE_ACTIONS = new Set<AuditAction>(['create', 'update', 'delete'])

function dayLabel(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}

export function AuditScreen() {
  const tr = useT()
  const { t, tx, plural, formatNum } = tr
  const breadcrumbs = useCrumbs('audit')
  const eventWord = (n: number) => plural(n, ['событие', 'события', 'событий'], ['event', 'events'])
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
      return normalizeSearch(
        `${e.id} ${tx(e.object)} ${tx(e.summary)} ${tx(actorName(e.actorId))} ${e.ip}`,
      ).includes(needle)
    })
  }, [q, action, actors, tx])

  const rangePresets = useMemo(() => presets(tr), [tr])
  const actions = useMemo(() => actionOptions(tr), [tr])
  const actorOpts = useMemo(() => actorOptions(tr), [tr])

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
      toast.warning(t('Нечего выгружать', 'Nothing to export'), {
        description: t('По условиям фильтра событий нет.', 'No events match the filter.'),
      })
      return
    }
    toast.success(t('Журнал выгружен', 'Audit log exported'), {
      description: `${formatNum(filtered.length)} ${eventWord(filtered.length)}, ${format}`,
    })
  }

  const columns: Column<AuditEvent>[] = [
    {
      key: 'at',
      header: t('Время', 'Time'),
      sortable: true,
      width: 150,
      cell: (e) => <span className="ev-num">{formatDateTime(e.at)}</span>,
    },
    {
      key: 'actor',
      header: t('Пользователь', 'User'),
      cell: (e) => (
        <span className={s.actor}>
          <Avatar
            name={tx(actorName(e.actorId))}
            size={24}
            tone={e.actorId === SYSTEM_ACTOR ? 'neutral' : undefined}
          />
          <span className="ev-truncate">{tx(actorName(e.actorId))}</span>
        </span>
      ),
    },
    {
      key: 'action',
      header: t('Действие', 'Action'),
      cell: (e) => <Badge tone={AUDIT_ACTIONS[e.action].tone}>{tx(AUDIT_ACTIONS[e.action].label)}</Badge>,
    },
    {
      key: 'object',
      header: t('Объект', 'Object'),
      primary: true,
      minWidth: 260,
      cell: (e) => (
        <span className={s.object}>
          <span className="ev-truncate">{tx(e.object)}</span>
          <span className="ev-muted ev-truncate">
            {tx(e.objectType)} - {tx(e.summary)}
          </span>
        </span>
      ),
    },
    {
      key: 'ip',
      header: t('IP-адрес', 'IP address'),
      align: 'right',
      cell: (e) => (
        <span className={isExternalIp(e.ip) ? `${s.ipExternal} ev-mono` : 'ev-mono ev-muted'}>{e.ip}</span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('Журнал', 'Audit log')}
        subtitle={t(
          'Действия пользователей и автоматических заданий: изменения данных, входы, выгрузки.',
          'Actions by users and automated jobs: data changes, sign-ins, exports.',
        )}
        breadcrumbs={breadcrumbs}
        meta={<Badge tone="neutral">{t('Хранение 365 дней', 'Retention 365 days')}</Badge>}
        actions={
          <Menu
            label={t('Экспорт журнала', 'Export audit log')}
            trigger={
              <Button icon={<Download size={15} />} iconRight={<ChevronDown size={14} />}>
                {t('Экспорт', 'Export')}
              </Button>
            }
            items={[
              {
                type: 'label',
                id: 'l',
                label: t(
                  `По фильтру: ${formatNum(filtered.length)} ${eventWord(filtered.length)}`,
                  `Filtered: ${formatNum(filtered.length)} ${eventWord(filtered.length)}`,
                ),
              },
              {
                id: 'csv',
                label: 'CSV',
                hint: t('Таблица для Excel', 'Spreadsheet for Excel'),
                icon: <FileSpreadsheet size={15} />,
                onSelect: () => exportAs('CSV'),
              },
              {
                id: 'json',
                label: 'JSON',
                hint: t('С полями изменений', 'With changed fields'),
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
            placeholder: t('Объект, пользователь, IP, ID события', 'Object, user, IP, event ID'),
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
            aria-label={t('Тип действия', 'Action type')}
            placeholder={t('Все действия', 'All actions')}
            value={action}
            onChange={withReset(setAction)}
            options={actions}
            clearable
            searchable={false}
          />
          <MultiSelect
            aria-label={t('Пользователи', 'Users')}
            placeholder={t('Все пользователи', 'All users')}
            value={actors}
            onChange={withReset(setActors)}
            options={actorOpts}
            dropdownMinWidth={300}
          />
          <DateRangePicker
            aria-label={t('Период', 'Period')}
            value={range}
            onChange={withReset(setRange)}
            presets={rangePresets}
            clearable
            min="2026-09-01"
            max={TODAY}
          />
        </FilterBar>

        <Card
          title={t('События по дням', 'Events by day')}
          description={t(
            `${formatNum(filtered.length)} ${eventWord(filtered.length)} за ${range ? 'выбранный период' : 'две недели'}${external > 0 ? `, входов из внешней сети: ${external}` : ''}`,
            `${formatNum(filtered.length)} ${eventWord(filtered.length)} ${range ? 'in the selected period' : 'in two weeks'}${external > 0 ? `, sign-ins from external networks: ${external}` : ''}`,
          )}
        >
          <BarChart
            aria-label={t('Количество событий по дням', 'Number of events by day')}
            data={chartData}
            x={(d) => dayLabel(d.day)}
            tooltipTitle={(d) => d.day.split('-').reverse().join('.')}
            stacked
            height={200}
            integer
            series={[
              { key: 'changes', label: t('Изменения данных', 'Data changes'), value: (d) => d.changes },
              { key: 'logins', label: t('Входы', 'Sign-ins'), value: (d) => d.logins },
              { key: 'other', label: t('Доступ и выгрузки', 'Access and exports'), value: (d) => d.other },
            ]}
            emptyText={t('Нет событий за период', 'No events in this period')}
          />
        </Card>

        <Card flush>
          <DataTable
            aria-label={t('События журнала', 'Audit log events')}
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
                title={t('Событий не найдено', 'No events found')}
                description={t('Измените период или условия фильтра.', 'Change the period or the filter.')}
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
