'use client'

import {
  BarChart,
  Button,
  Card,
  DataTable,
  DateField,
  Field,
  IconButton,
  Menu,
  Modal,
  NumberInput,
  Progress,
  Select,
  StatusPill,
  toast,
  useModals,
  type Column,
} from 'endfield-vision'
import { ArrowRight, Ban, Check, MoreHorizontal, Plus } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import {
  MOVE_DAYS,
  STOCK,
  TRANSFER_STATUS,
  TRANSFERS,
  warehouseName,
  WAREHOUSES,
  type Transfer,
} from '@/lib/demo/inventory'
import { formatDate } from '@/lib/format'
import { bi, useT } from '@/lib/i18n'
import s from './inventory.module.css'

type WarehouseKey = 'w1' | 'w2' | 'w3' | 'w4'
const KEYS: WarehouseKey[] = ['w1', 'w2', 'w3', 'w4']

interface TransfersTabProps {
  transfers: Transfer[]
  onChange: (id: string, patch: Partial<Transfer>) => void
  onCreate: (t: Transfer) => void
}

export function TransfersTab({ transfers, onChange, onCreate }: TransfersTabProps) {
  const modals = useModals()
  const { t, tx, plural, formatNum } = useT()
  const [creating, setCreating] = useState(false)
  const rowsWord = (n: number) => plural(n, ['строка', 'строки', 'строк'], ['row', 'rows'])

  const totals = useMemo(() => {
    const list = KEYS.map((k) => ({ key: k, sum: MOVE_DAYS.reduce((a, d) => a + d[k], 0) }))
    const all = list.reduce((a, x) => a + x.sum, 0)
    return { list: list.sort((a, b) => b.sum - a.sum), all }
  }, [])

  const cancel = async (tr: Transfer) => {
    const ok = await modals.confirm({
      title: t(`Отменить перемещение ${tr.id}?`, `Cancel transfer ${tr.id}?`),
      message: `${tx(tr.item)}, ${formatNum(tr.qty)} ${tx(tr.unit)}: ${tx(warehouseName(tr.from))} → ${tx(warehouseName(tr.to))}. ${t(
        'Резерв на складе-отправителе будет снят.',
        'The reservation at the source warehouse will be released.',
      )}`,
      okLabel: t('Отменить перемещение', 'Cancel transfer'),
      cancelLabel: t('Не отменять', 'Keep transfer'),
      okVariant: 'danger',
      okIcon: <Ban size={15} />,
    })
    if (!ok) return
    onChange(tr.id, { status: 'cancelled' })
    toast.success(t('Перемещение отменено', 'Transfer cancelled'), { description: tr.id })
  }

  const columns: Column<Transfer>[] = [
    { key: 'id', header: t('Номер', 'Number'), primary: true, cell: (tr) => <span className="ev-mono">{tr.id}</span> },
    {
      key: 'route',
      header: t('Маршрут', 'Route'),
      cell: (tr) => (
        <span className={s.route}>
          {tx(warehouseName(tr.from))}
          <ArrowRight size={13} aria-label={t('на', 'to')} />
          {tx(warehouseName(tr.to))}
        </span>
      ),
    },
    { key: 'item', header: t('Позиция', 'Item'), cell: (tr) => tx(tr.item) },
    { key: 'qty', header: t('Количество', 'Quantity'), numeric: true, cell: (tr) => `${formatNum(tr.qty)} ${tx(tr.unit)}` },
    { key: 'date', header: t('Дата', 'Date'), hideOnMobile: true, cell: (tr) => formatDate(tr.date) },
    { key: 'author', header: t('Оформил', 'Created by'), hideOnMobile: true, cell: (tr) => <span className="ev-muted">{tx(tr.author)}</span> },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      cell: (tr) => <StatusPill tone={TRANSFER_STATUS[tr.status].tone}>{tx(TRANSFER_STATUS[tr.status].label)}</StatusPill>,
    },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      align: 'right',
      width: 56,
      hideOnMobile: true,
      cell: (tr) =>
        tr.status === 'planned' || tr.status === 'transit' ? (
          <Menu
            label={`${t('Действия', 'Actions')}: ${tr.id}`}
            trigger={<IconButton label={t('Действия с перемещением', 'Transfer actions')} size="sm" icon={<MoreHorizontal size={16} />} />}
            items={[
              {
                id: 'done',
                label: t('Подтвердить получение', 'Confirm receipt'),
                icon: <Check size={15} />,
                disabled: tr.status !== 'transit',
                hint: tr.status !== 'transit' ? t('Груз ещё не отправлен', 'Not dispatched yet') : undefined,
                onSelect: () => {
                  onChange(tr.id, { status: 'done' })
                  toast.success(t('Получение подтверждено', 'Receipt confirmed'), { description: `${tr.id}: ${tx(tr.item)}` })
                },
              },
              { type: 'separator', id: 'sep' },
              { id: 'cancel', label: t('Отменить', 'Cancel'), icon: <Ban size={15} />, danger: true, onSelect: () => void cancel(tr) },
            ]}
          />
        ) : null,
    },
  ]

  return (
    <div className={s.tab}>
      <div className="pg-split">
        <Card
          title={t('Отгрузки между складами', 'Inter-warehouse shipments')}
          description={t('Строк накладных в день по складу-отправителю, 14 дней.', 'Waybill rows per day by source warehouse, 14 days.')}
        >
          <BarChart
            aria-label={t('Отгрузки между складами по дням', 'Inter-warehouse shipments by day')}
            data={MOVE_DAYS}
            x={(d) => d.label}
            stacked
            height={260}
            series={KEYS.map((k) => ({ key: k, label: tx(warehouseName(k)), value: (d: (typeof MOVE_DAYS)[number]) => d[k] }))}
            format={(v) => `${formatNum(v)} ${rowsWord(v)}`}
            formatAxis={(v) => formatNum(v)}
          />
        </Card>
        <Card
          title={t('Доля складов', 'Warehouse share')}
          description={`${t('Всего за период', 'Total for the period')}: ${formatNum(totals.all)} ${rowsWord(totals.all)}.`}
        >
          <div className={s.shares}>
            {totals.list.map((x) => (
              <Progress
                key={x.key}
                label={tx(warehouseName(x.key))}
                value={x.sum}
                max={totals.all}
                size="sm"
                showValue={(v, max) => `${formatNum(v)} · ${Math.round((v / max) * 100)}%`}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card
        flush
        title={t('Перемещения', 'Transfers')}
        actions={
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            {t('Новое перемещение', 'New transfer')}
          </Button>
        }
      >
        <DataTable
          aria-label={t('Перемещения между складами', 'Transfers between warehouses')}
          columns={columns}
          rows={transfers}
          rowKey={(tr) => tr.id}
          rowMuted={(tr) => tr.status === 'cancelled'}
        />
      </Card>

      {creating ? (
        <NewTransferModal
          nextId={`TR-${2211 + transfers.length - TRANSFERS.length}`}
          onClose={() => setCreating(false)}
          onCreate={(tr) => {
            onCreate(tr)
            toast.success(t('Перемещение оформлено', 'Transfer created'), { description: `${tr.id}: ${tx(tr.item)}, ${formatNum(tr.qty)} ${tx(tr.unit)}` })
          }}
        />
      ) : null}
    </div>
  )
}

function NewTransferModal({ nextId, onClose, onCreate }: { nextId: string; onClose: () => void; onCreate: (t: Transfer) => void }) {
  const formId = useId()
  const { t, tx, formatNum } = useT()
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)
  const [qty, setQty] = useState<number | null>(null)
  const [date, setDate] = useState('2026-10-09')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const stock = STOCK.filter((it) => it.warehouse === from && it.qty > 0)
  const item = stock.find((it) => it.id === itemId)

  const submit = () => {
    const e: Record<string, string> = {}
    if (!from) e.from = t('Выберите склад-отправитель.', 'Select the source warehouse.')
    if (!to) e.to = t('Выберите склад-получатель.', 'Select the destination warehouse.')
    else if (to === from) e.to = t('Склады должны различаться.', 'The warehouses must be different.')
    if (!item) e.item = t('Выберите позицию.', 'Select an item.')
    if (!qty) e.qty = t('Укажите количество.', 'Enter a quantity.')
    else if (item && qty > item.qty)
      e.qty = t(`На складе только ${formatNum(item.qty)} ${tx(item.unit)}.`, `Only ${formatNum(item.qty)} ${tx(item.unit)} in stock.`)
    if (!date) e.date = t('Укажите дату.', 'Enter a date.')
    setErrors(e)
    if (Object.keys(e).length > 0 || !from || !to || !item || !qty) return
    onCreate({ id: nextId, from, to, item: item.name, qty, unit: item.unit, date, status: 'planned', author: bi('Вы', 'You') })
    onClose()
  }

  const clear = (k: string) => setErrors((x) => ({ ...x, [k]: undefined }))
  const whOptions = WAREHOUSES.map((w) => ({ value: w.id, label: tx(w.name), hint: w.code }))

  return (
    <Modal
      open
      onClose={onClose}
      title={t('Новое перемещение', 'New transfer')}
      subtitle={`${t('Номер будет присвоен автоматически', 'The number will be assigned automatically')}: ${nextId}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('Отмена', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Check size={15} />}>
            {t('Оформить', 'Create')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={s.formGrid}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('Откуда', 'From')} required error={errors.from}>
          <Select
            value={from}
            onChange={(v) => {
              setFrom(v)
              setItemId(null)
              clear('from')
            }}
            placeholder={t('Склад-отправитель', 'Source warehouse')}
            options={whOptions}
          />
        </Field>
        <Field label={t('Куда', 'To')} required error={errors.to}>
          <Select
            value={to}
            onChange={(v) => {
              setTo(v)
              clear('to')
            }}
            placeholder={t('Склад-получатель', 'Destination warehouse')}
            options={whOptions.map((o) => ({ ...o, disabled: o.value === from }))}
          />
        </Field>
        <Field
          label={t('Позиция', 'Item')}
          required
          error={errors.item}
          hint={from ? undefined : t('Сначала выберите склад-отправитель.', 'Select the source warehouse first.')}
          className={s.formWide}
        >
          <Select
            value={itemId}
            disabled={!from}
            onChange={(v) => {
              setItemId(v)
              clear('item')
            }}
            placeholder={t('Позиция на складе', 'Item in stock')}
            options={stock.map((it) => ({
              value: it.id,
              label: tx(it.name),
              hint: t(`${formatNum(it.qty)} ${tx(it.unit)} в наличии`, `${formatNum(it.qty)} ${tx(it.unit)} available`),
            }))}
          />
        </Field>
        <Field label={t('Количество', 'Quantity')} required error={errors.qty}>
          <NumberInput
            value={qty}
            onChange={(v) => {
              setQty(v)
              clear('qty')
            }}
            min={0}
            max={item?.qty}
            stepper
            unit={item ? tx(item.unit) : undefined}
          />
        </Field>
        <Field label={t('Дата отправки', 'Dispatch date')} required error={errors.date}>
          <DateField value={date} onChange={setDate} min="2026-10-08" />
        </Field>
      </form>
    </Modal>
  )
}
