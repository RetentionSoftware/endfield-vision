'use client'

import { Button, Field, Modal, NumberInput, Select, Textarea } from 'endfield-vision'
import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { ADJUST_REASONS, CATEGORIES, warehouseName, type StockItem } from '@/lib/demo/inventory'
import { useT } from '@/lib/i18n'
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
  const { t, tx, formatNum, formatRub } = useT()
  const [qty, setQty] = useState<number | null>(item.qty)
  const [reason, setReason] = useState<Reason | null>(null)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<{ qty?: string; reason?: string; comment?: string }>({})
  const [busy, setBusy] = useState(false)

  const diff = qty === null ? 0 : qty - item.qty

  const submit = async () => {
    const e: typeof errors = {}
    if (qty === null) e.qty = t('Укажите количество.', 'Enter a quantity.')
    else if (qty === item.qty) e.qty = t('Количество не изменилось.', 'The quantity has not changed.')
    if (!reason) e.reason = t('Выберите причину корректировки.', 'Select an adjustment reason.')
    if ((reason === 'loss' || reason === 'damage') && comment.trim().length < 10)
      e.comment = t('Для недостачи и брака нужен комментарий: не меньше 10 символов.', 'Shortage and damage require a comment of at least 10 characters.')
    setErrors(e)
    if (Object.keys(e).length > 0 || qty === null || !reason) return
    setBusy(true)
    await new Promise((r) => window.setTimeout(r, 600))
    const label = ADJUST_REASONS.find((r) => r.value === reason)?.label
    onSave(item, qty, label ? tx(label) : reason)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={t('Корректировка остатка', 'Stock adjustment')}
      subtitle={`${tx(item.name)} · ${tx(warehouseName(item.warehouse))}`}
      footerLeft={
        diff !== 0 ? (
          <span className={s.diff} data-dir={diff > 0 ? 'up' : 'down'}>
            {diff > 0 ? '+' : ''}
            {formatNum(diff)} {tx(item.unit)} · {diff > 0 ? '+' : '-'}
            {formatRub(Math.abs(diff) * item.price)}
          </span>
        ) : null
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Отмена', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Check size={15} />} loading={busy}>
            {t('Сохранить', 'Save')}
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
            <dt>{t('Артикул', 'SKU')}</dt>
            <dd className="ev-mono">{item.sku}</dd>
          </div>
          <div>
            <dt>{t('Категория', 'Category')}</dt>
            <dd>{tx(CATEGORIES[item.category])}</dd>
          </div>
          <div>
            <dt>{t('По учёту', 'On record')}</dt>
            <dd className="ev-num">
              {formatNum(item.qty)} {tx(item.unit)}
            </dd>
          </div>
          <div>
            <dt>{t('Мин. / макс.', 'Min / max')}</dt>
            <dd className="ev-num">
              {formatNum(item.min)} / {formatNum(item.max)}
            </dd>
          </div>
        </dl>
        <Field
          label={t('Фактический остаток', 'Actual quantity')}
          required
          error={errors.qty}
          hint={t(
            `Не больше ёмкости места хранения: ${formatNum(item.max)} ${tx(item.unit)}.`,
            `Up to the storage capacity: ${formatNum(item.max)} ${tx(item.unit)}.`,
          )}
        >
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
            unit={tx(item.unit)}
          />
        </Field>
        <Field label={t('Причина', 'Reason')} required error={errors.reason}>
          <Select
            value={reason}
            onChange={(v) => {
              setReason(v)
              setErrors((x) => ({ ...x, reason: undefined }))
            }}
            placeholder={t('Выберите причину', 'Select a reason')}
            options={ADJUST_REASONS.map((r) => ({ value: r.value, label: tx(r.label) }))}
          />
        </Field>
        <Field label={t('Комментарий', 'Comment')} error={errors.comment} hint={t('Попадёт в акт корректировки.', 'Goes into the adjustment report.')}>
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
            placeholder={t('Например: пересчёт после инвентаризации 07.10', 'For example: recount after the 07.10 stock count')}
          />
        </Field>
      </form>
    </Modal>
  )
}
