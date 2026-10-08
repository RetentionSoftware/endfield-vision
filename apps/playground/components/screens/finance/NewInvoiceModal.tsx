'use client'

import { addDaysIso, Button, DateField, Field, Modal, MoneyInput, NumberInput, Select, Textarea } from 'endfield-vision'
import { Save, Send } from 'lucide-react'
import { useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { COUNTERPARTIES, FINANCE_TODAY, invoiceTotal, type Invoice, type InvoiceStatus } from '@/lib/demo/finance'
import { formatRub } from '@/lib/format'
import s from './finance.module.css'

export type InvoiceDraft = Pick<Invoice, 'counterpartyId' | 'facilityId' | 'net' | 'vat' | 'dueAt' | 'description' | 'status'>

type Errors = Partial<Record<'counterparty' | 'facility' | 'amount' | 'due' | 'vat', string>>

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Новый счёт: контрагент, сумма без НДС, ставка, срок. Итог считается на лету. */
export function NewInvoiceModal({
  number,
  onClose,
  onCreate,
}: {
  number: string
  onClose: () => void
  onCreate: (draft: InvoiceDraft) => void
}) {
  const [cp, setCp] = useState<string | null>(null)
  const [facility, setFacility] = useState<string | null>(null)
  const [net, setNet] = useState<number | null>(null)
  const [vat, setVat] = useState<number | null>(20)
  const [due, setDue] = useState(addDaysIso(FINANCE_TODAY, 14))
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState<InvoiceStatus | null>(null)

  const netValue = net ?? 0
  const vatValue = vat ?? 0
  const total = invoiceTotal(netValue, vatValue)

  const submit = async (status: InvoiceStatus) => {
    const next: Errors = {}
    if (!cp) next.counterparty = 'Выберите контрагента'
    if (!facility) next.facility = 'Выберите объект'
    if (status !== 'draft') {
      if (!net || net <= 0) next.amount = 'Укажите сумму больше нуля'
      if (!due) next.due = 'Укажите срок оплаты'
    }
    if (vat === null) next.vat = 'Укажите ставку'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(status)
    await wait(700)
    onCreate({
      counterpartyId: cp!,
      facilityId: facility!,
      net: netValue,
      vat: vatValue,
      dueAt: due || addDaysIso(FINANCE_TODAY, 14),
      description: note.trim() || 'Без описания',
      status,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy !== null}
      size="md"
      title="Новый счёт"
      subtitle={`Номер будет присвоен автоматически: ${number}`}
      footerLeft={<span className="ev-muted">Черновик можно сохранить без суммы</span>}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy !== null}>
            Отмена
          </Button>
          <Button icon={<Save size={15} />} loading={busy === 'draft'} disabled={busy === 'pending'} onClick={() => void submit('draft')}>
            Черновик
          </Button>
          <Button variant="primary" icon={<Send size={15} />} loading={busy === 'pending'} disabled={busy === 'draft'} onClick={() => void submit('pending')}>
            Выставить
          </Button>
        </>
      }
    >
      <div className="ev-stack">
        <Field label="Контрагент" required error={errors.counterparty}>
          <Select
            value={cp}
            onChange={setCp}
            placeholder="Выберите контрагента"
            options={COUNTERPARTIES.map((c) => ({ value: c.id, label: c.name, hint: `ИНН ${c.inn}` }))}
          />
        </Field>
        <Field label="Объект" required error={errors.facility} hint="Выручка будет отнесена на объект.">
          <Select
            value={facility}
            onChange={setFacility}
            placeholder="Выберите объект"
            options={FACILITIES.map((f) => ({ value: f.id, label: f.name, hint: f.code, group: f.region }))}
          />
        </Field>
        <div className={s.formRow}>
          <Field label="Сумма без НДС" required error={errors.amount}>
            <MoneyInput value={net} onChange={setNet} placeholder="0,00" />
          </Field>
          <Field label="НДС" error={errors.vat}>
            <NumberInput value={vat} onChange={setVat} min={0} max={30} unit="%" stepper />
          </Field>
          <Field label="Срок оплаты" required error={errors.due}>
            <DateField value={due} onChange={setDue} min={FINANCE_TODAY} />
          </Field>
        </div>
        <Field label="Назначение платежа" hint="Попадёт в счёт и акт.">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            autoResize
            maxLength={240}
            showCount
            placeholder="Например: поставка продукции по договору 118/26"
          />
        </Field>
        <div className={s.formTotal} aria-live="polite">
          <div className={s.totalRow}>
            <span className="ev-muted">Сумма без НДС</span>
            <span className="ev-num">{formatRub(netValue)}</span>
          </div>
          <div className={s.totalRow}>
            <span className="ev-muted">{vatValue > 0 ? `НДС ${vatValue}%` : 'Без НДС'}</span>
            <span className="ev-num">{formatRub(total - netValue)}</span>
          </div>
          <div className={s.totalRow} data-total="">
            <span>Итого к оплате</span>
            <span className="ev-num">{formatRub(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
