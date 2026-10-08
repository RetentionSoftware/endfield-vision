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
import { facilityProfile, loadTone, REGIONS, type FacilityProfile } from '@/lib/demo/facility-details'
import { formatNum, plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { AddFacilityModal, type NewFacility } from './AddFacilityModal'
import { FacilityDrawer } from './FacilityDrawer'
import s from './facilities.module.css'

type StatusFilter = 'all' | FacilityStatus
type View = 'grid' | 'table'

const STATUS_ORDER: FacilityStatus[] = ['online', 'degraded', 'maintenance', 'offline']

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function sortFacilities(list: Facility[], sort: SortState | null): Facility[] {
  if (!sort) return list
  const dir = sort.dir === 'asc' ? 1 : -1
  const key = sort.key as keyof Facility
  return [...list].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), 'ru') * dir
  })
}

export function FacilitiesScreen() {
  const modals = useModals()
  const [items, setItems] = useState<Facility[]>(FACILITIES)
  const [profiles, setProfiles] = useState<Record<string, FacilityProfile>>({})
  const [query, setQuery] = useState('')
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
        (!region || f.region === region) &&
        (!q || normalizeSearch(`${f.name} ${f.code} ${f.manager}`).includes(q)),
    )
  }, [items, query, region])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: base.length, online: 0, degraded: 0, maintenance: 0, offline: 0 }
    for (const f of base) c[f.status] += 1
    return c
  }, [base])

  const visible = useMemo(
    () => sortFacilities(status === 'all' ? base : base.filter((f) => f.status === status), sort),
    [base, status, sort],
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
      title: `Перевести «${f.name}» в обслуживание?`,
      message: 'Выпуск на объекте будет остановлен, персонал смены получит уведомление. Вернуть объект в работу можно из его карточки.',
      okLabel: 'Перевести',
      okIcon: <Wrench size={15} />,
      onOk: () => delay(600),
    })
    if (!ok) return
    patch(f.id, { status: 'maintenance', load: 0, output: 0 })
    toast.success('Объект переведён в обслуживание', { description: `${f.code} ${f.name}` })
  }

  const resume = (f: Facility) => {
    patch(f.id, { status: 'online', load: 35, output: Math.round(facilityProfile(f).capacity * 0.3) })
    toast.success('Объект возвращён в работу', { description: 'Выход на плановую мощность - в течение смены.' })
  }

  const exportPassport = (f: Facility) => {
    toast.success('Паспорт объекта выгружен', { description: `${f.code}.pdf, 4 страницы` })
  }

  const create = (n: NewFacility) => {
    const id = `n${items.length + 1}`
    const facility: Facility = {
      id,
      code: n.code,
      name: n.name,
      region: n.region,
      status: n.active ? 'online' : 'maintenance',
      load: 0,
      output: 0,
      energy: 0,
      staff: n.staff,
      history: Array.from({ length: 14 }, () => 0),
      manager: 'Не назначен',
      openedAt: '2026-10-08',
    }
    setItems((list) => [facility, ...list])
    setProfiles((p) => ({
      ...p,
      [id]: { capacity: n.capacity, address: `${n.region}, адрес уточняется`, shifts: 1, lastInspection: '', nextInspection: '', energyLimit: Math.round(n.capacity / 3) },
    }))
    toast.success('Объект добавлен', {
      description: `${n.code} ${n.name}`,
      action: { label: 'Открыть', onClick: () => setOpenId(id) },
    })
  }

  const menu = (f: Facility): MenuEntry[] => [
    { id: 'open', label: 'Открыть карточку', icon: <Eye size={15} />, onSelect: () => setOpenId(f.id) },
    f.status === 'maintenance'
      ? { id: 'resume', label: 'Вернуть в работу', icon: <Play size={15} />, onSelect: () => resume(f) }
      : {
          id: 'maintenance',
          label: 'В обслуживание',
          icon: <Wrench size={15} />,
          disabled: f.status === 'offline',
          hint: f.status === 'offline' ? 'Нет связи с объектом' : undefined,
          onSelect: () => void toMaintenance(f),
        },
    { type: 'separator', id: 'sep' },
    { id: 'export', label: 'Выгрузить паспорт', icon: <FileDown size={15} />, onSelect: () => exportPassport(f) },
  ]

  const rowMenu = (f: Facility) => (
    <Menu
      label={`Действия: ${f.name}`}
      trigger={<IconButton label="Действия с объектом" icon={<MoreHorizontal size={16} />} size="sm" />}
      items={menu(f)}
    />
  )

  const columns: Column<Facility>[] = [
    {
      key: 'name',
      header: 'Объект',
      primary: true,
      sortable: true,
      cell: (f) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{f.name}</span>
          <span className="ev-muted ev-mono">{f.code}</span>
        </span>
      ),
    },
    { key: 'region', header: 'Регион', sortable: true, hideOnMobile: true, cell: (f) => f.region },
    {
      key: 'status',
      header: 'Статус',
      cell: (f) => <StatusPill tone={FACILITY_STATUS[f.status].tone}>{FACILITY_STATUS[f.status].label}</StatusPill>,
    },
    {
      key: 'load',
      header: 'Загрузка',
      sortable: true,
      width: 170,
      cell: (f) => <Progress value={f.load} tone={loadTone(f.load)} size="sm" showValue aria-label={`Загрузка: ${f.name}`} />,
    },
    { key: 'output', header: 'Выпуск, ед.', numeric: true, sortable: true, cell: (f) => formatNum(f.output) },
    { key: 'energy', header: 'Энергия, МВт·ч', numeric: true, sortable: true, hideOnMobile: true, cell: (f) => formatNum(f.energy) },
    { key: 'staff', header: 'Персонал', numeric: true, sortable: true, cell: (f) => formatNum(f.staff) },
    { key: 'manager', header: 'Руководитель', hideOnMobile: true, cell: (f) => f.manager },
    { key: 'actions', header: <span className="ev-visually-hidden">Действия</span>, align: 'right', width: 56, hideOnMobile: true, cell: rowMenu },
  ]

  const empty = (
    <EmptyState
      compact
      icon={<SearchX size={22} />}
      title="Объекты не найдены"
      description="Измените запрос или сбросьте фильтры."
      actions={
        <Button size="sm" onClick={resetFilters}>
          Сбросить фильтры
        </Button>
      }
    />
  )

  return (
    <>
      <PageHeader
        title="Объекты"
        subtitle="Производственные площадки: статус, загрузка, выпуск и персонал."
        breadcrumbs={crumbs('facilities')}
        meta={
          <Badge tone="neutral">
            {items.length} {plural(items.length, 'объект', 'объекта', 'объектов')}
          </Badge>
        }
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={() => toast.success('Реестр объектов выгружен', { description: 'objects-2026-10-08.xlsx' })}>
              Реестр
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
              Добавить объект
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
              placeholder="Название, код, руководитель"
              aria-label="Поиск объектов"
            />
            <Select
              aria-label="Регион"
              width={220}
              value={region}
              onChange={setRegion}
              clearable
              placeholder="Все регионы"
              options={REGIONS.map((r) => ({ value: r, label: r }))}
            />
            <div className={s.segmentWrap}>
              <SegmentedControl
                aria-label="Статус объекта"
                size="sm"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'Все', count: counts.all },
                  ...STATUS_ORDER.map((k) => ({ value: k, label: FACILITY_STATUS[k].label, count: counts[k] })),
                ]}
              />
            </div>
          </div>
          <div className={s.viewToggle} role="group" aria-label="Вид списка">
            <IconButton label="Карточки" icon={<LayoutGrid size={16} />} pressed={view === 'grid'} onClick={() => setView('grid')} />
            <IconButton label="Таблица" icon={<List size={16} />} pressed={view === 'table'} onClick={() => setView('table')} />
          </div>
        </div>

        <div className={s.summary}>
          <span>
            Показано {visible.length} из {items.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>Выпуск за сутки: {formatNum(totals.output)} ед.</span>
          <span aria-hidden="true">·</span>
          <span>Персонал: {formatNum(totals.staff)}</span>
          {filtersActive ? (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Сбросить фильтры
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
              aria-label="Объекты"
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
          {f.name}
        </button>
      }
      description={
        <>
          <span className="ev-mono">{f.code}</span> · {f.region}
        </>
      }
      actions={menu}
    >
      <div className={s.cardBody}>
        <div className={s.cardStatus}>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          <span className="ev-muted ev-truncate">{f.manager}</span>
        </div>
        <Progress label="Загрузка мощностей" value={f.load} tone={loadTone(f.load)} showValue size="sm" />
        <div className={s.trend}>
          <div className={s.trendText}>
            <span className={s.metricLabel}>Выпуск, 14 дней</span>
            <span className={s.trendDelta} data-dir={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
          </div>
          <Sparkline
            values={f.history}
            width={132}
            height={34}
            color={f.status === 'offline' ? 'var(--ev-danger)' : f.status === 'degraded' ? 'var(--ev-warning)' : undefined}
            aria-label={`Выпуск за 14 дней: ${f.name}`}
          />
        </div>
        <dl className={s.metrics}>
          <div className={s.metric}>
            <dt className={s.metricLabel}>Выпуск</dt>
            <dd className={s.metricValue}>{formatNum(f.output)}</dd>
          </div>
          <div className={s.metric}>
            <dt className={s.metricLabel}>МВт·ч</dt>
            <dd className={s.metricValue}>{formatNum(f.energy)}</dd>
          </div>
          <div className={s.metric}>
            <dt className={s.metricLabel}>Персонал</dt>
            <dd className={s.metricValue}>{formatNum(f.staff)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
