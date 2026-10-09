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
  Timeline,
  normalizeSearch,
  toast,
  type Column,
  type DateRange,
  type DateRangePreset,
  type SortState,
  type Tone,
} from 'endfield-vision'
import { Check, FileText, PhoneCall } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  SHIPMENT_STATUS,
  shipmentTimeline,
  warehouseName,
  type Shipment,
  type ShipmentStatus,
  type TimelineStep,
} from '@/lib/demo/inventory'
import { formatDate } from '@/lib/format'
import { bi, useT, type Bi } from '@/lib/i18n'
import s from './inventory.module.css'

/** «Сегодня» демо-данных: периоды считаются от него, а не от часов браузера. */
const TODAY = '2026-10-08'

const PRESETS: Array<Omit<DateRangePreset, 'label'> & { label: Bi }> = [
  { id: 'week', label: bi('Эта неделя', 'This week'), range: () => ({ from: '2026-10-05', to: '2026-10-11' }) },
  { id: 'next14', label: bi('Ближайшие 14 дней', 'Next 14 days'), range: () => ({ from: TODAY, to: addDaysIso(TODAY, 13) }) },
  { id: 'last14', label: bi('Последние 14 дней', 'Last 14 days'), range: () => ({ from: addDaysIso(TODAY, -13), to: TODAY }) },
  { id: 'sep', label: bi('Сентябрь', 'September'), range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
  { id: 'oct', label: bi('Октябрь', 'October'), range: () => ({ from: '2026-10-01', to: '2026-10-31' }) },
]

const STEP_STATE = { current: bi('текущий шаг', 'current step'), problem: bi('проблема', 'problem') } as const
const STEP_TONE: Record<TimelineStep['state'], Tone> = { done: 'success', current: 'accent', pending: 'neutral', problem: 'warning' }

interface ShipmentsTabProps {
  shipments: Shipment[]
  onAccept: (id: string) => void
}

export function ShipmentsTab({ shipments, onAccept }: ShipmentsTabProps) {
  const { t, tx, formatRub } = useT()
  const presets: DateRangePreset[] = PRESETS.map((p) => ({ ...p, label: tx(p.label) }))
  const statusOptions = (Object.keys(SHIPMENT_STATUS) as ShipmentStatus[]).map((k) => ({ value: k, label: tx(SHIPMENT_STATUS[k].label) }))
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
        (!q || normalizeSearch(`${sh.id} ${tx(sh.supplier)} ${tx(sh.carrier)}`).includes(q)),
    )
    if (!sort) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => (sort.key === 'value' ? a.value - b.value : a.eta.localeCompare(b.eta)) * dir)
  }, [shipments, query, range, status, sort, tx])

  const opened = shipments.find((sh) => sh.id === openId) ?? null

  const columns: Column<Shipment>[] = [
    {
      key: 'id',
      header: t('Поставка', 'Delivery'),
      primary: true,
      cell: (sh) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{tx(sh.supplier)}</span>
          <span className="ev-muted ev-mono">{sh.id}</span>
        </span>
      ),
    },
    { key: 'warehouse', header: t('Склад', 'Warehouse'), cell: (sh) => tx(warehouseName(sh.warehouse)) },
    { key: 'carrier', header: t('Перевозчик', 'Carrier'), hideOnMobile: true, cell: (sh) => tx(sh.carrier) },
    {
      key: 'eta',
      header: t('Прибытие', 'Arrival'),
      sortable: true,
      cell: (sh) => (
        <span className={s.etaCell}>
          {formatDate(sh.eta)}
          {sh.eta === TODAY && sh.status !== 'accepted' ? <Badge size="sm" tone="accent">{t('сегодня', 'today')}</Badge> : null}
        </span>
      ),
    },
    { key: 'positions', header: t('Позиций', 'Items'), numeric: true, hideOnMobile: true, cell: (sh) => sh.positions },
    { key: 'value', header: t('Сумма', 'Amount'), numeric: true, sortable: true, cell: (sh) => formatRub(sh.value) },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      cell: (sh) => <StatusPill tone={SHIPMENT_STATUS[sh.status].tone}>{tx(SHIPMENT_STATUS[sh.status].label)}</StatusPill>,
    },
  ]

  return (
    <div className={s.tab}>
      <Card
        flush
        toolbar={
          <FilterBar
            search={{ value: query, onChange: setQuery, placeholder: t('Номер, поставщик, перевозчик', 'Number, supplier, carrier') }}
            activeCount={(range ? 1 : 0) + (status ? 1 : 0)}
            onReset={() => {
              setQuery('')
              setRange(null)
              setStatus(null)
            }}
          >
            <DateRangePicker
              aria-label={t('Период прибытия', 'Arrival period')}
              value={range}
              onChange={setRange}
              presets={presets}
              clearable
              placeholder={t('Любая дата прибытия', 'Any arrival date')}
            />
            <Select
              aria-label={t('Статус поставки', 'Delivery status')}
              width={200}
              placeholder={t('Все статусы', 'All statuses')}
              clearable
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          </FilterBar>
        }
      >
        <DataTable
          aria-label={t('Поставки', 'Deliveries')}
          columns={columns}
          rows={rows}
          rowKey={(sh) => sh.id}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(sh) => setOpenId(sh.id)}
          rowMuted={(sh) => sh.status === 'rejected'}
          empty={t('Поставок за период нет', 'No deliveries for this period')}
          emptyDescription={t('Выберите другой период или статус.', 'Choose a different period or status.')}
        />
      </Card>

      <Drawer
        open={opened !== null}
        onClose={() => setOpenId(null)}
        width={520}
        title={opened ? `${t('Поставка', 'Delivery')} ${opened.id}` : undefined}
        subtitle={opened ? tx(opened.supplier) : undefined}
        footer={opened ? <ShipmentActions shipment={opened} onAccept={onAccept} /> : null}
      >
        {opened ? <ShipmentDetails shipment={opened} /> : null}
      </Drawer>
    </div>
  )
}

function ShipmentActions({ shipment: sh, onAccept }: { shipment: Shipment; onAccept: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  const { t, tx, plural, formatRub } = useT()
  return (
    <>
      {sh.status === 'transit' || sh.status === 'delayed' || sh.status === 'planned' ? (
        <Button
          icon={<PhoneCall size={15} />}
          onClick={() =>
            toast.info(t('Запрос отправлен перевозчику', 'Request sent to the carrier'), {
              description: `${tx(sh.carrier)}: ${t('ответ ожидается в течение часа.', 'a reply is expected within an hour.')}`,
            })
          }
        >
          {t('Запросить статус', 'Request status')}
        </Button>
      ) : null}
      {sh.status === 'accepted' ? (
        <Button icon={<FileText size={15} />} onClick={() => toast.success(t('Акт приёмки выгружен', 'Receiving report downloaded'), { description: `ACT-${sh.id}.pdf` })}>
          {t('Акт приёмки', 'Receiving report')}
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
            toast.success(t('Поставка принята на учёт', 'Delivery received into stock'), {
              description: t(
                `${sh.positions} ${plural(sh.positions, ['позиция', 'позиции', 'позиций'], ['item', 'items'])} на ${formatRub(sh.value)}`,
                `${sh.positions} ${plural(sh.positions, ['позиция', 'позиции', 'позиций'], ['item', 'items'])} worth ${formatRub(sh.value)}`,
              ),
            })
          }}
        >
          {t('Принять на учёт', 'Receive into stock')}
        </Button>
      ) : null}
    </>
  )
}

function ShipmentDetails({ shipment: sh }: { shipment: Shipment }) {
  const { t, tx, formatNum, formatRub } = useT()
  const steps = shipmentTimeline(sh)
  return (
    <div className={s.drawer}>
      <div className={s.drawerHead}>
        <StatusPill tone={SHIPMENT_STATUS[sh.status].tone}>{tx(SHIPMENT_STATUS[sh.status].label)}</StatusPill>
        <span className="ev-muted">
          {t('Ожидается', 'Expected')} {formatDate(sh.eta)}
        </span>
      </div>

      {sh.note ? (
        <Callout
          tone={sh.status === 'rejected' ? 'danger' : 'warning'}
          title={sh.status === 'rejected' ? t('Поставка отклонена', 'Delivery rejected') : t('Поставка задерживается', 'Delivery delayed')}
        >
          {tx(sh.note)}
        </Callout>
      ) : null}

      <KeyValueList
        labelWidth={150}
        items={[
          { key: 'supplier', label: t('Поставщик', 'Supplier'), value: tx(sh.supplier) },
          { key: 'warehouse', label: t('Склад приёмки', 'Receiving warehouse'), value: tx(warehouseName(sh.warehouse)) },
          { key: 'carrier', label: t('Перевозчик', 'Carrier'), value: tx(sh.carrier) },
          { key: 'ordered', label: t('Заказ', 'Ordered'), value: formatDate(sh.orderedAt) },
          { key: 'positions', label: t('Позиций', 'Items'), value: sh.positions },
          { key: 'weight', label: t('Масса брутто', 'Gross weight'), value: `${formatNum(sh.weight)} ${t('кг', 'kg')}` },
          { key: 'value', label: t('Сумма', 'Amount'), value: formatRub(sh.value) },
        ]}
      />

      <section className={s.timelineWrap}>
        <h3 className={s.sectionTitle}>{t('Ход поставки', 'Delivery progress')}</h3>
        <Timeline
          variant="compact"
          aria-label={`${t('Ход поставки', 'Delivery progress')} ${sh.id}`}
          items={steps.map((st) => ({
            id: st.id,
            tone: STEP_TONE[st.state],
            pending: st.state === 'pending',
            title:
              st.state === 'current' || st.state === 'problem' ? (
                <>
                  {tx(st.label)}
                  <span className="ev-visually-hidden">{`, ${tx(STEP_STATE[st.state])}`}</span>
                </>
              ) : (
                tx(st.label)
              ),
            time: st.at || t('ожидается', 'expected'),
          }))}
        />
      </section>
    </div>
  )
}
