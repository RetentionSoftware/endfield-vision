'use client'

import {
  addDaysIso,
  Badge,
  Button,
  Callout,
  Card,
  DataTable,
  DateRangePicker,
  Drawer,
  FilterBar,
  KeyValueList,
  Select,
  StatusPill,
  normalizeSearch,
  toast,
  type Column,
  type DateRange,
  type DateRangePreset,
  type SortState,
} from 'endfield-vision'
import { Check, FileText, PhoneCall } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  SHIPMENT_STATUS,
  shipmentTimeline,
  warehouseName,
  type Shipment,
  type ShipmentStatus,
} from '@/lib/demo/inventory'
import { formatDate, formatNum, formatRub } from '@/lib/format'
import s from './inventory.module.css'

/** «Сегодня» демо-данных: периоды считаются от него, а не от часов браузера. */
const TODAY = '2026-10-08'

const PRESETS: DateRangePreset[] = [
  { id: 'week', label: 'Эта неделя', range: () => ({ from: '2026-10-05', to: '2026-10-11' }) },
  { id: 'next14', label: 'Ближайшие 14 дней', range: () => ({ from: TODAY, to: addDaysIso(TODAY, 13) }) },
  { id: 'last14', label: 'Последние 14 дней', range: () => ({ from: addDaysIso(TODAY, -13), to: TODAY }) },
  { id: 'sep', label: 'Сентябрь', range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
  { id: 'oct', label: 'Октябрь', range: () => ({ from: '2026-10-01', to: '2026-10-31' }) },
]

const STEP_STATE = { done: 'выполнено', current: 'текущий шаг', pending: 'впереди', problem: 'проблема' } as const

const STATUS_OPTIONS =(Object.keys(SHIPMENT_STATUS) as ShipmentStatus[]).map((k) => ({ value: k, label: SHIPMENT_STATUS[k].label }))

interface ShipmentsTabProps {
  shipments: Shipment[]
  onAccept: (id: string) => void
}

export function ShipmentsTab({ shipments, onAccept }: ShipmentsTabProps) {
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<DateRange | null>(null)
  const [status, setStatus] = useState<ShipmentStatus | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'eta', dir: 'desc' })
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = normalizeSearch(query)
    const list = shipments.filter(
      (sh) =>
        (!status || sh.status === status) &&
        (!range || (sh.eta >= range.from && sh.eta <= range.to)) &&
        (!q || normalizeSearch(`${sh.id} ${sh.supplier} ${sh.carrier}`).includes(q)),
    )
    if (!sort) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => (sort.key === 'value' ? a.value - b.value : a.eta.localeCompare(b.eta)) * dir)
  }, [shipments, query, range, status, sort])

  const opened = shipments.find((sh) => sh.id === openId) ?? null

  const columns: Column<Shipment>[] = [
    {
      key: 'id',
      header: 'Поставка',
      primary: true,
      cell: (sh) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{sh.supplier}</span>
          <span className="ev-muted ev-mono">{sh.id}</span>
        </span>
      ),
    },
    { key: 'warehouse', header: 'Склад', cell: (sh) => warehouseName(sh.warehouse) },
    { key: 'carrier', header: 'Перевозчик', hideOnMobile: true, cell: (sh) => sh.carrier },
    {
      key: 'eta',
      header: 'Прибытие',
      sortable: true,
      cell: (sh) => (
        <span className={s.etaCell}>
          {formatDate(sh.eta)}
          {sh.eta === TODAY && sh.status !== 'accepted' ? <Badge size="sm" tone="accent">сегодня</Badge> : null}
        </span>
      ),
    },
    { key: 'positions', header: 'Позиций', numeric: true, hideOnMobile: true, cell: (sh) => sh.positions },
    { key: 'value', header: 'Сумма', numeric: true, sortable: true, cell: (sh) => formatRub(sh.value) },
    {
      key: 'status',
      header: 'Статус',
      cell: (sh) => <StatusPill tone={SHIPMENT_STATUS[sh.status].tone}>{SHIPMENT_STATUS[sh.status].label}</StatusPill>,
    },
  ]

  return (
    <div className={s.tab}>
      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: 'Номер, поставщик, перевозчик' }}
        activeCount={(range ? 1 : 0) + (status ? 1 : 0)}
        onReset={() => {
          setQuery('')
          setRange(null)
          setStatus(null)
        }}
      >
        <DateRangePicker aria-label="Период прибытия" value={range} onChange={setRange} presets={PRESETS} clearable placeholder="Любая дата прибытия" />
        <Select aria-label="Статус поставки" width={200} placeholder="Все статусы" clearable value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </FilterBar>

      <Card flush>
        <DataTable
          aria-label="Поставки"
          columns={columns}
          rows={rows}
          rowKey={(sh) => sh.id}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(sh) => setOpenId(sh.id)}
          rowMuted={(sh) => sh.status === 'rejected'}
          empty="Поставок за период нет"
          emptyDescription="Выберите другой период или статус."
        />
      </Card>

      <Drawer
        open={opened !== null}
        onClose={() => setOpenId(null)}
        width={520}
        title={opened ? `Поставка ${opened.id}` : undefined}
        subtitle={opened?.supplier}
        footer={opened ? <ShipmentActions shipment={opened} onAccept={onAccept} /> : null}
      >
        {opened ? <ShipmentDetails shipment={opened} /> : null}
      </Drawer>
    </div>
  )
}

function ShipmentActions({ shipment: sh, onAccept }: { shipment: Shipment; onAccept: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <>
      {sh.status === 'transit' || sh.status === 'delayed' || sh.status === 'planned' ? (
        <Button icon={<PhoneCall size={15} />} onClick={() => toast.info('Запрос отправлен перевозчику', { description: `${sh.carrier}: ответ ожидается в течение часа.` })}>
          Запросить статус
        </Button>
      ) : null}
      {sh.status === 'accepted' ? (
        <Button icon={<FileText size={15} />} onClick={() => toast.success('Акт приёмки выгружен', { description: `ACT-${sh.id}.pdf` })}>
          Акт приёмки
        </Button>
      ) : null}
      {sh.status === 'arrived' ? (
        <Button
          variant="primary"
          icon={<Check size={15} />}
          loading={busy}
          onClick={async () => {
            setBusy(true)
            await new Promise((r) => window.setTimeout(r, 700))
            setBusy(false)
            onAccept(sh.id)
            toast.success('Поставка принята на учёт', { description: `${sh.positions} позиций на ${formatRub(sh.value)}` })
          }}
        >
          Принять на учёт
        </Button>
      ) : null}
    </>
  )
}

function ShipmentDetails({ shipment: sh }: { shipment: Shipment }) {
  const steps = shipmentTimeline(sh)
  return (
    <div className={s.drawer}>
      <div className={s.drawerHead}>
        <StatusPill tone={SHIPMENT_STATUS[sh.status].tone}>{SHIPMENT_STATUS[sh.status].label}</StatusPill>
        <span className="ev-muted">Ожидается {formatDate(sh.eta)}</span>
      </div>

      {sh.note ? (
        <Callout tone={sh.status === 'rejected' ? 'danger' : 'warning'} title={sh.status === 'rejected' ? 'Поставка отклонена' : 'Поставка задерживается'}>
          {sh.note}
        </Callout>
      ) : null}

      <KeyValueList
        labelWidth={150}
        items={[
          { key: 'supplier', label: 'Поставщик', value: sh.supplier },
          { key: 'warehouse', label: 'Склад приёмки', value: warehouseName(sh.warehouse) },
          { key: 'carrier', label: 'Перевозчик', value: sh.carrier },
          { key: 'ordered', label: 'Заказ', value: formatDate(sh.orderedAt) },
          { key: 'positions', label: 'Позиций', value: sh.positions },
          { key: 'weight', label: 'Масса брутто', value: `${formatNum(sh.weight)} кг` },
          { key: 'value', label: 'Сумма', value: formatRub(sh.value) },
        ]}
      />

      <section className={s.timelineWrap}>
        <h3 className={s.sectionTitle}>Ход поставки</h3>
        <ol className={s.timeline}>
          {steps.map((st) => (
            <li key={st.id} className={s.step} data-state={st.state}>
              <span className={s.stepDot} aria-hidden="true" />
              <span className={s.stepLabel}>
                {st.label}
                <span className="ev-visually-hidden">{`, ${STEP_STATE[st.state]}`}</span>
              </span>
              <span className={s.stepAt}>{st.at || 'ожидается'}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
