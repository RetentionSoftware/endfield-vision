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
import { formatDate, formatNum } from '@/lib/format'
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
  const [creating, setCreating] = useState(false)

  const totals = useMemo(() => {
    const t = KEYS.map((k) => ({ key: k, sum: MOVE_DAYS.reduce((a, d) => a + d[k], 0) }))
    const all = t.reduce((a, x) => a + x.sum, 0)
    return { list: t.sort((a, b) => b.sum - a.sum), all }
  }, [])

  const cancel = async (t: Transfer) => {
    const ok = await modals.confirm({
      title: `Отменить перемещение ${t.id}?`,
      message: `${t.item}, ${formatNum(t.qty)} ${t.unit}: ${warehouseName(t.from)} → ${warehouseName(t.to)}. Резерв на складе-отправителе будет снят.`,
      okLabel: 'Отменить перемещение',
      cancelLabel: 'Не отменять',
      okVariant: 'danger',
      okIcon: <Ban size={15} />,
    })
    if (!ok) return
    onChange(t.id, { status: 'cancelled' })
    toast.success('Перемещение отменено', { description: t.id })
  }

  const columns: Column<Transfer>[] = [
    { key: 'id', header: 'Номер', primary: true, cell: (t) => <span className="ev-mono">{t.id}</span> },
    {
      key: 'route',
      header: 'Маршрут',
      cell: (t) => (
        <span className={s.route}>
          {warehouseName(t.from)}
          <ArrowRight size={13} aria-label="на" />
          {warehouseName(t.to)}
        </span>
      ),
    },
    { key: 'item', header: 'Позиция', cell: (t) => t.item },
    { key: 'qty', header: 'Количество', numeric: true, cell: (t) => `${formatNum(t.qty)} ${t.unit}` },
    { key: 'date', header: 'Дата', hideOnMobile: true, cell: (t) => formatDate(t.date) },
    { key: 'author', header: 'Оформил', hideOnMobile: true, cell: (t) => <span className="ev-muted">{t.author}</span> },
    { key: 'status', header: 'Статус', cell: (t) => <StatusPill tone={TRANSFER_STATUS[t.status].tone}>{TRANSFER_STATUS[t.status].label}</StatusPill> },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">Действия</span>,
      align: 'right',
      width: 56,
      hideOnMobile: true,
      cell: (t) =>
        t.status === 'planned' || t.status === 'transit' ? (
          <Menu
            label={`Действия: ${t.id}`}
            trigger={<IconButton label="Действия с перемещением" size="sm" icon={<MoreHorizontal size={16} />} />}
            items={[
              {
                id: 'done',
                label: 'Подтвердить получение',
                icon: <Check size={15} />,
                disabled: t.status !== 'transit',
                hint: t.status !== 'transit' ? 'Груз ещё не отправлен' : undefined,
                onSelect: () => {
                  onChange(t.id, { status: 'done' })
                  toast.success('Получение подтверждено', { description: `${t.id}: ${t.item}` })
                },
              },
              { type: 'separator', id: 'sep' },
              { id: 'cancel', label: 'Отменить', icon: <Ban size={15} />, danger: true, onSelect: () => void cancel(t) },
            ]}
          />
        ) : null,
    },
  ]

  return (
    <div className={s.tab}>
      <div className="pg-split">
        <Card title="Отгрузки между складами" description="Строк накладных в день по складу-отправителю, 14 дней.">
          <BarChart
            aria-label="Отгрузки между складами по дням"
            data={MOVE_DAYS}
            x={(d) => d.label}
            stacked
            height={260}
            series={KEYS.map((k) => ({ key: k, label: warehouseName(k), value: (d: (typeof MOVE_DAYS)[number]) => d[k] }))}
            format={(v) => `${formatNum(v)} строк`}
            formatAxis={(v) => formatNum(v)}
          />
        </Card>
        <Card title="Доля складов" description={`Всего за период: ${formatNum(totals.all)} строк.`}>
          <div className={s.shares}>
            {totals.list.map((t) => (
              <Progress
                key={t.key}
                label={warehouseName(t.key)}
                value={t.sum}
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
        title="Перемещения"
        actions={
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            Новое перемещение
          </Button>
        }
      >
        <DataTable aria-label="Перемещения между складами" columns={columns} rows={transfers} rowKey={(t) => t.id} rowMuted={(t) => t.status === 'cancelled'} />
      </Card>

      {creating ? (
        <NewTransferModal
          nextId={`TR-${2211 + transfers.length - TRANSFERS.length}`}
          onClose={() => setCreating(false)}
          onCreate={(t) => {
            onCreate(t)
            toast.success('Перемещение оформлено', { description: `${t.id}: ${t.item}, ${formatNum(t.qty)} ${t.unit}` })
          }}
        />
      ) : null}
    </div>
  )
}

function NewTransferModal({ nextId, onClose, onCreate }: { nextId: string; onClose: () => void; onCreate: (t: Transfer) => void }) {
  const formId = useId()
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
    if (!from) e.from = 'Выберите склад-отправитель.'
    if (!to) e.to = 'Выберите склад-получатель.'
    else if (to === from) e.to = 'Склады должны различаться.'
    if (!item) e.item = 'Выберите позицию.'
    if (!qty) e.qty = 'Укажите количество.'
    else if (item && qty > item.qty) e.qty = `На складе только ${formatNum(item.qty)} ${item.unit}.`
    if (!date) e.date = 'Укажите дату.'
    setErrors(e)
    if (Object.keys(e).length > 0 || !from || !to || !item || !qty) return
    onCreate({ id: nextId, from, to, item: item.name, qty, unit: item.unit, date, status: 'planned', author: 'Вы' })
    onClose()
  }

  const clear = (k: string) => setErrors((x) => ({ ...x, [k]: undefined }))
  const whOptions = WAREHOUSES.map((w) => ({ value: w.id, label: w.name, hint: w.code }))

  return (
    <Modal
      open
      onClose={onClose}
      title="Новое перемещение"
      subtitle={`Номер будет присвоен автоматически: ${nextId}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Check size={15} />}>
            Оформить
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
        <Field label="Откуда" required error={errors.from}>
          <Select
            value={from}
            onChange={(v) => {
              setFrom(v)
              setItemId(null)
              clear('from')
            }}
            placeholder="Склад-отправитель"
            options={whOptions}
          />
        </Field>
        <Field label="Куда" required error={errors.to}>
          <Select
            value={to}
            onChange={(v) => {
              setTo(v)
              clear('to')
            }}
            placeholder="Склад-получатель"
            options={whOptions.map((o) => ({ ...o, disabled: o.value === from }))}
          />
        </Field>
        <Field label="Позиция" required error={errors.item} hint={from ? undefined : 'Сначала выберите склад-отправитель.'} className={s.formWide}>
          <Select
            value={itemId}
            disabled={!from}
            onChange={(v) => {
              setItemId(v)
              clear('item')
            }}
            placeholder="Позиция на складе"
            options={stock.map((it) => ({ value: it.id, label: it.name, hint: `${formatNum(it.qty)} ${it.unit} в наличии` }))}
          />
        </Field>
        <Field label="Количество" required error={errors.qty}>
          <NumberInput
            value={qty}
            onChange={(v) => {
              setQty(v)
              clear('qty')
            }}
            min={0}
            max={item?.qty}
            stepper
            unit={item?.unit}
          />
        </Field>
        <Field label="Дата отправки" required error={errors.date}>
          <DateField value={date} onChange={setDate} min="2026-10-08" />
        </Field>
      </form>
    </Modal>
  )
}
