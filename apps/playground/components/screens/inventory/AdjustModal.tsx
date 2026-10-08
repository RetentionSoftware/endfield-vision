'use client'

import { Button, Field, Modal, NumberInput, Select, Textarea } from 'endfield-vision'
import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { ADJUST_REASONS, CATEGORIES, warehouseName, type StockItem } from '@/lib/demo/inventory'
import { formatNum, formatRub } from '@/lib/format'
import s from './inventory.module.css'

interface AdjustModalProps {
  item: StockItem | null
  onClose: () => void
  onSave: (item: StockItem, qty: number, reasonLabel: string) => void
}

/** Корректировка остатка: новое количество, причина, комментарий. */
export function AdjustModal({ item, ...rest }: AdjustModalProps) {
  return item ? <AdjustForm key={item.id} item={item} {...rest} /> : null
}

type Reason = (typeof ADJUST_REASONS)[number]['value']

function AdjustForm({ item, onClose, onSave }: AdjustModalProps & { item: StockItem }) {
  const formId = useId()
  const [qty, setQty] = useState<number | null>(item.qty)
  const [reason, setReason] = useState<Reason | null>(null)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<{ qty?: string; reason?: string; comment?: string }>({})
  const [busy, setBusy] = useState(false)

  const diff = qty === null ? 0 : qty - item.qty

  const submit = async () => {
    const e: typeof errors = {}
    if (qty === null) e.qty = 'Укажите количество.'
    else if (qty === item.qty) e.qty = 'Количество не изменилось.'
    if (!reason) e.reason = 'Выберите причину корректировки.'
    if ((reason === 'loss' || reason === 'damage') && comment.trim().length < 10) e.comment = 'Для недостачи и брака нужен комментарий: не меньше 10 символов.'
    setErrors(e)
    if (Object.keys(e).length > 0 || qty === null || !reason) return
    setBusy(true)
    await new Promise((r) => window.setTimeout(r, 600))
    onSave(item, qty, ADJUST_REASONS.find((r) => r.value === reason)?.label ?? reason)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title="Корректировка остатка"
      subtitle={`${item.name} · ${warehouseName(item.warehouse)}`}
      footerLeft={
        diff !== 0 ? (
          <span className={s.diff} data-dir={diff > 0 ? 'up' : 'down'}>
            {diff > 0 ? '+' : ''}
            {formatNum(diff)} {item.unit} · {diff > 0 ? '+' : '-'}
            {formatRub(Math.abs(diff) * item.price)}
          </span>
        ) : null
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Check size={15} />} loading={busy}>
            Сохранить
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="ev-stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <dl className={s.adjustFacts}>
          <div>
            <dt>Артикул</dt>
            <dd className="ev-mono">{item.sku}</dd>
          </div>
          <div>
            <dt>Категория</dt>
            <dd>{CATEGORIES[item.category]}</dd>
          </div>
          <div>
            <dt>По учёту</dt>
            <dd className="ev-num">
              {formatNum(item.qty)} {item.unit}
            </dd>
          </div>
          <div>
            <dt>Мин. / макс.</dt>
            <dd className="ev-num">
              {formatNum(item.min)} / {formatNum(item.max)}
            </dd>
          </div>
        </dl>
        <Field label="Фактический остаток" required error={errors.qty} hint={`Не больше ёмкости места хранения: ${formatNum(item.max)} ${item.unit}.`}>
          <NumberInput
            value={qty}
            onChange={(v) => {
              setQty(v)
              setErrors((x) => ({ ...x, qty: undefined }))
            }}
            min={0}
            max={item.max}
            step={item.max >= 1000 ? 10 : 1}
            stepper
            unit={item.unit}
          />
        </Field>
        <Field label="Причина" required error={errors.reason}>
          <Select
            value={reason}
            onChange={(v) => {
              setReason(v)
              setErrors((x) => ({ ...x, reason: undefined }))
            }}
            placeholder="Выберите причину"
            options={ADJUST_REASONS.map((r) => ({ value: r.value, label: r.label }))}
          />
        </Field>
        <Field label="Комментарий" error={errors.comment} hint="Попадёт в акт корректировки.">
          <Textarea
            value={comment}
            rows={2}
            autoResize
            maxLength={300}
            showCount
            onChange={(e) => {
              setComment(e.target.value)
              setErrors((x) => ({ ...x, comment: undefined }))
            }}
            placeholder="Например: пересчёт после инвентаризации 07.10"
          />
        </Field>
      </form>
    </Modal>
  )
}
