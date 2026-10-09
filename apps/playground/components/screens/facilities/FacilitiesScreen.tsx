'use client'

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  Menu,
  PageHeader,
  Progress,
  SearchInput,
  SegmentedControl,
  Select,
  Sparkline,
  StatusPill,
  normalizeSearch,
  toast,
  useModals,
  type Column,
  type MenuEntry,
  type SortState,
} from 'endfield-vision'
import { Download, Eye, FileDown, LayoutGrid, List, MoreHorizontal, Play, Plus, SearchX, Wrench } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { FACILITIES, FACILITY_STATUS, type Facility, type FacilityStatus } from '@/lib/demo/facilities'
import { facilityProfile, loadTone, pendingAddress, REGIONS, type FacilityProfile } from '@/lib/demo/facility-details'
import { bi, useCrumbs, useT, type Bi, type Lang } from '@/lib/i18n'
import { AddFacilityModal, type NewFacility } from './AddFacilityModal'
import { FacilityDrawer } from './FacilityDrawer'
import s from './facilities.module.css'

type StatusFilter = 'all' | FacilityStatus
type View = 'grid' | 'table'

const STATUS_ORDER: FacilityStatus[] = ['online', 'degraded', 'maintenance', 'offline']

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function sortFacilities(list: Facility[], sort: SortState | null, lang: Lang): Facility[] {
  if (!sort) return list
  const dir = sort.dir === 'asc' ? 1 : -1
  const key = sort.key as keyof Facility
  // Двуязычные поля (название, регион) сортируются по тексту на текущем языке.
  const text = (v: Facility[keyof Facility]) => (typeof v === 'object' && v !== null && 'ru' in v ? (v as Bi)[lang] : String(v))
  return [...list].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return text(va).localeCompare(text(vb), lang) * dir
  })
}

export function FacilitiesScreen() {
  const modals = useModals()
  const { t, tx, plural, formatNum, lang } = useT()
  const breadcrumbs = useCrumbs('facilities')
  const [items, setItems] = useState<Facility[]>(FACILITIES)
  const [profiles, setProfiles] = useState<Record<string, FacilityProfile>>({})
  const [query, setQuery] = useState('')
  // Регион фильтра - по русскому названию (ключ, не зависит от языка).
  const [region, setRegion] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [view, setView] = useState<View>('grid')
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const base = useMemo(() => {
    const q = normalizeSearch(query)
    return items.filter(
      (f) =>
        (!region || f.region.ru === region) &&
        (!q || normalizeSearch(`${f.name[lang]} ${f.code} ${f.manager[lang]}`).includes(q)),
    )
  }, [items, query, region, lang])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: base.length, online: 0, degraded: 0, maintenance: 0, offline: 0 }
    for (const f of base) c[f.status] += 1
    return c
  }, [base])

  const visible = useMemo(
    () => sortFacilities(status === 'all' ? base : base.filter((f) => f.status === status), sort, lang),
    [base, status, sort, lang],
  )

  const totals = useMemo(
    () => ({
      output: visible.reduce((a, f) => a + f.output, 0),
      staff: visible.reduce((a, f) => a + f.staff, 0),
    }),
    [visible],
  )

  const opened = items.find((f) => f.id === openId) ?? null
  const filtersActive = Boolean(query || region || status !== 'all')

  const resetFilters = () => {
    setQuery('')
    setRegion(null)
    setStatus('all')
  }

  const patch = (id: string, next: Partial<Facility>) => setItems((list) => list.map((f) => (f.id === id ? { ...f, ...next } : f)))

  const toMaintenance = async (f: Facility) => {
    const ok = await modals.confirm({
      title: t(`Перевести «${f.name.ru}» в обслуживание?`, `Put ${f.name.en} into maintenance?`),
      message: t(
        'Выпуск на объекте будет остановлен, персонал смены получит уведомление. Вернуть объект в работу можно из его карточки.',
        'Output at the facility will stop and shift staff will be notified. You can bring the facility back online from its card.',
      ),
      okLabel: t('Перевести', 'Confirm'),
      okIcon: <Wrench size={15} />,
      onOk: () => delay(600),
    })
    if (!ok) return
    patch(f.id, { status: 'maintenance', load: 0, output: 0 })
    toast.success(t('Объект переведён в обслуживание', 'Facility put into maintenance'), { description: `${f.code} ${tx(f.name)}` })
  }

  const resume = (f: Facility) => {
    patch(f.id, { status: 'online', load: 35, output: Math.round(facilityProfile(f).capacity * 0.3) })
    toast.success(t('Объект возвращён в работу', 'Facility back online'), {
      description: t('Выход на плановую мощность - в течение смены.', 'Planned capacity will be reached within the shift.'),
    })
  }

  const exportPassport = (f: Facility) => {
    toast.success(t('Паспорт объекта выгружен', 'Facility passport exported'), {
      description: t(`${f.code}.pdf, 4 страницы`, `${f.code}.pdf, 4 pages`),
    })
  }

  const create = (n: NewFacility) => {
    const id = `n${items.length + 1}`
    const facility: Facility = {
      id,
      code: n.code,
      // Название вводит пользователь - одно на оба языка.
      name: bi(n.name, n.name),
      region: n.region,
      status: n.active ? 'online' : 'maintenance',
      load: 0,
      output: 0,
      energy: 0,
      staff: n.staff,
      history: Array.from({ length: 14 }, () => 0),
      manager: bi('Не назначен', 'Unassigned'),
      openedAt: '2026-10-08',
    }
    setItems((list) => [facility, ...list])
    setProfiles((p) => ({
      ...p,
      [id]: { capacity: n.capacity, address: pendingAddress(n.region), shifts: 1, lastInspection: '', nextInspection: '', energyLimit: Math.round(n.capacity / 3) },
    }))
    toast.success(t('Объект добавлен', 'Facility added'), {
      description: `${n.code} ${n.name}`,
      action: { label: t('Открыть', 'Open'), onClick: () => setOpenId(id) },
    })
  }

  const menu = (f: Facility): MenuEntry[] => [
    { id: 'open', label: t('Открыть карточку', 'Open card'), icon: <Eye size={15} />, onSelect: () => setOpenId(f.id) },
    f.status === 'maintenance'
      ? { id: 'resume', label: t('Вернуть в работу', 'Bring back online'), icon: <Play size={15} />, onSelect: () => resume(f) }
      : {
          id: 'maintenance',
          label: t('В обслуживание', 'Put into maintenance'),
          icon: <Wrench size={15} />,
          disabled: f.status === 'offline',
          hint: f.status === 'offline' ? t('Нет связи с объектом', 'Facility unreachable') : undefined,
          onSelect: () => void toMaintenance(f),
        },
    { type: 'separator', id: 'sep' },
    { id: 'export', label: t('Выгрузить паспорт', 'Export passport'), icon: <FileDown size={15} />, onSelect: () => exportPassport(f) },
  ]

  const rowMenu = (f: Facility) => (
    <Menu
      label={`${t('Действия', 'Actions')}: ${tx(f.name)}`}
      trigger={<IconButton label={t('Действия с объектом', 'Facility actions')} icon={<MoreHorizontal size={16} />} size="sm" />}
      items={menu(f)}
    />
  )

  const columns: Column<Facility>[] = [
    {
      key: 'name',
      header: t('Объект', 'Facility'),
      primary: true,
      sortable: true,
      cell: (f) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{tx(f.name)}</span>
          <span className="ev-muted ev-mono">{f.code}</span>
        </span>
      ),
    },
    { key: 'region', header: t('Регион', 'Region'), sortable: true, hideOnMobile: true, cell: (f) => tx(f.region) },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      cell: (f) => <StatusPill tone={FACILITY_STATUS[f.status].tone}>{tx(FACILITY_STATUS[f.status].label)}</StatusPill>,
    },
    {
      key: 'load',
      header: t('Загрузка', 'Load'),
      sortable: true,
      width: 170,
      cell: (f) => <Progress value={f.load} tone={loadTone(f.load)} size="sm" showValue aria-label={`${t('Загрузка', 'Load')}: ${tx(f.name)}`} />,
    },
    { key: 'output', header: t('Выпуск, ед.', 'Output, units'), numeric: true, sortable: true, cell: (f) => formatNum(f.output) },
    { key: 'energy', header: t('Энергия, МВт·ч', 'Energy, MWh'), numeric: true, sortable: true, hideOnMobile: true, cell: (f) => formatNum(f.energy) },
    { key: 'staff', header: t('Персонал', 'Staff'), numeric: true, sortable: true, cell: (f) => formatNum(f.staff) },
    { key: 'manager', header: t('Руководитель', 'Manager'), hideOnMobile: true, cell: (f) => tx(f.manager) },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      align: 'right',
      width: 56,
      hideOnMobile: true,
      cell: rowMenu,
    },
  ]

  const empty = (
    <EmptyState
      compact
      icon={<SearchX size={22} />}
      title={t('Объекты не найдены', 'No facilities found')}
      description={t('Измените запрос или сбросьте фильтры.', 'Change the query or reset the filters.')}
      actions={
        <Button size="sm" onClick={resetFilters}>
          {t('Сбросить фильтры', 'Reset filters')}
        </Button>
      }
    />
  )

  return (
    <>
      <PageHeader
        title={t('Объекты', 'Facilities')}
        subtitle={t('Производственные площадки: статус, загрузка, выпуск и персонал.', 'Production sites: status, load, output and staff.')}
        breadcrumbs={breadcrumbs}
        meta={
          <Badge tone="neutral">
            {items.length} {plural(items.length, ['объект', 'объекта', 'объектов'], ['facility', 'facilities'])}
          </Badge>
        }
        actions={
          <>
            <Button
              icon={<Download size={15} />}
              onClick={() => toast.success(t('Реестр объектов выгружен', 'Facility register exported'), { description: 'objects-2026-10-08.xlsx' })}
            >
              {t('Реестр', 'Register')}
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
              {t('Добавить объект', 'Add facility')}
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className={s.toolbar}>
          <div className={s.filters}>
            <SearchInput
              wrapperClassName={s.search}
              value={query}
              onChange={setQuery}
              placeholder={t('Название, код, руководитель', 'Name, code, manager')}
              aria-label={t('Поиск объектов', 'Search facilities')}
            />
            <Select
              aria-label={t('Регион', 'Region')}
              width={220}
              value={region}
              onChange={setRegion}
              clearable
              placeholder={t('Все регионы', 'All regions')}
              options={REGIONS.map((r) => ({ value: r.ru, label: tx(r) }))}
            />
            <SegmentedControl
              aria-label={t('Статус объекта', 'Facility status')}
              size="sm"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: t('Все', 'All'), count: counts.all },
                ...STATUS_ORDER.map((k) => ({ value: k, label: tx(FACILITY_STATUS[k].label), count: counts[k] })),
              ]}
            />
          </div>
          <SegmentedControl
            aria-label={t('Вид списка', 'List view')}
            className={s.viewToggle}
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', icon: <LayoutGrid size={16} />, 'aria-label': t('Карточки', 'Cards') },
              { value: 'table', icon: <List size={16} />, 'aria-label': t('Таблица', 'Table') },
            ]}
          />
        </div>

        <div className={s.summary}>
          <span>{t(`Показано ${visible.length} из ${items.length}`, `Showing ${visible.length} of ${items.length}`)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t('Выпуск за сутки', 'Daily output')}: {formatNum(totals.output)} {t('ед.', 'units')}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t('Персонал', 'Staff')}: {formatNum(totals.staff)}
          </span>
          {filtersActive ? (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              {t('Сбросить фильтры', 'Reset filters')}
            </Button>
          ) : null}
        </div>

        {view === 'grid' ? (
          visible.length === 0 ? (
            <Card>{empty}</Card>
          ) : (
            <div className={s.grid}>
              {visible.map((f) => (
                <FacilityCard key={f.id} facility={f} onOpen={() => setOpenId(f.id)} menu={rowMenu(f)} />
              ))}
            </div>
          )
        ) : (
          <Card flush>
            <DataTable
              aria-label={t('Объекты', 'Facilities')}
              columns={columns}
              rows={visible}
              rowKey={(f) => f.id}
              sort={sort}
              onSortChange={setSort}
              onRowClick={(f) => setOpenId(f.id)}
              rowMuted={(f) => f.status === 'offline'}
              empty={empty}
            />
          </Card>
        )}
      </div>

      <FacilityDrawer
        facility={opened}
        profile={opened ? (profiles[opened.id] ?? facilityProfile(opened)) : null}
        onClose={() => setOpenId(null)}
        onMaintenance={(f) => void toMaintenance(f)}
        onResume={resume}
        onExport={exportPassport}
      />

      <AddFacilityModal open={adding} onClose={() => setAdding(false)} onCreate={create} existingCodes={items.map((f) => f.code)} />
    </>
  )
}

function FacilityCard({ facility: f, onOpen, menu }: { facility: Facility; onOpen: () => void; menu: ReactNode }) {
  const { t, tx, formatNum } = useT()
  const st = FACILITY_STATUS[f.status]
  const first = f.history[0] ?? 0
  const last = f.history[f.history.length - 1] ?? 0
  const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0
  return (
    <Card
      as="article"
      className={s.card}
      title={
        <button type="button" className={s.cardTitle} onClick={onOpen}>
          {tx(f.name)}
        </button>
      }
      description={
        <>
          <span className="ev-mono">{f.code}</span> · {tx(f.region)}
        </>
      }
      actions={menu}
    >
      <div className={s.cardBody}>
        <div className={s.cardStatus}>
          <StatusPill tone={st.tone}>{tx(st.label)}</StatusPill>
          <span className="ev-muted ev-truncate">{tx(f.manager)}</span>
        </div>
        <Progress label={t('Загрузка мощностей', 'Capacity utilization')} value={f.load} tone={loadTone(f.load)} showValue size="sm" />
        <div className={s.trend}>
          <div className={s.trendText}>
            <span className={s.metricLabel}>{t('Выпуск, 14 дней', 'Output, 14 days')}</span>
            <span className={s.trendDelta} data-dir={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
          </div>
          <Sparkline
            values={f.history}
            width="auto"
            height={34}
            color={f.status === 'offline' ? 'var(--ev-danger)' : f.status === 'degraded' ? 'var(--ev-warning)' : undefined}
            aria-label={`${t('Выпуск за 14 дней', 'Output over 14 days')}: ${tx(f.name)}`}
          />
        </div>
        <dl className={s.metrics}>
          <div className={s.metric}>
            <dt className={s.metricLabel}>{t('Выпуск', 'Output')}</dt>
            <dd className={s.metricValue}>{formatNum(f.output)}</dd>
          </div>
          <div className={s.metric}>
            <dt className={s.metricLabel}>{t('МВт·ч', 'MWh')}</dt>
            <dd className={s.metricValue}>{formatNum(f.energy)}</dd>
          </div>
          <div className={s.metric}>
            <dt className={s.metricLabel}>{t('Персонал', 'Staff')}</dt>
            <dd className={s.metricValue}>{formatNum(f.staff)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
