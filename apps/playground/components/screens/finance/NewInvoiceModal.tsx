'use client'

import { addDaysIso, Button, DateField, Field, Modal, MoneyInput, NumberInput, Select, Textarea } from 'endfield-vision'
import { Save, Send } from 'lucide-react'
import { useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { COUNTERPARTIES, FINANCE_TODAY, invoiceTotal, type Invoice, type InvoiceStatus } from '@/lib/demo/finance'
import { bi, useT } from '@/lib/i18n'
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
  const { t, tx, formatRub } = useT()
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
    if (!cp) next.counterparty = t('Выберите контрагента', 'Select a counterparty')
    if (!facility) next.facility = t('Выберите объект', 'Select a facility')
    if (status !== 'draft') {
      if (!net || net <= 0) next.amount = t('Укажите сумму больше нуля', 'Enter an amount greater than zero')
      if (!due) next.due = t('Укажите срок оплаты', 'Enter a due date')
    }
    if (vat === null) next.vat = t('Укажите ставку', 'Enter a rate')
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
      description: note.trim() || bi('Без описания', 'No description'),
      status,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy !== null}
      size="md"
      title={t('Новый счёт', 'New invoice')}
      subtitle={`${t('Номер будет присвоен автоматически', 'The number will be assigned automatically')}: ${number}`}
      footerLeft={<span className="ev-muted">{t('Черновик можно сохранить без суммы', 'A draft can be saved without an amount')}</span>}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy !== null}>
            {t('Отмена', 'Cancel')}
          </Button>
          <Button icon={<Save size={15} />} loading={busy === 'draft'} disabled={busy === 'pending'} onClick={() => void submit('draft')}>
            {t('Черновик', 'Draft')}
          </Button>
          <Button variant="primary" icon={<Send size={15} />} loading={busy === 'pending'} disabled={busy === 'draft'} onClick={() => void submit('pending')}>
            {t('Выставить', 'Issue')}
          </Button>
        </>
      }
    >
      <div className="ev-stack">
        <Field label={t('Контрагент', 'Counterparty')} required error={errors.counterparty}>
          <Select
            value={cp}
            onChange={setCp}
            placeholder={t('Выберите контрагента', 'Select a counterparty')}
            options={COUNTERPARTIES.map((c) => ({ value: c.id, label: tx(c.name), hint: `${t('ИНН', 'TIN')} ${c.inn}` }))}
          />
        </Field>
        <Field
          label={t('Объект', 'Facility')}
          required
          error={errors.facility}
          hint={t('Выручка будет отнесена на объект.', 'Revenue will be attributed to this facility.')}
        >
          <Select
            value={facility}
            onChange={setFacility}
            placeholder={t('Выберите объект', 'Select a facility')}
            options={FACILITIES.map((f) => ({ value: f.id, label: tx(f.name), hint: f.code, group: tx(f.region) }))}
          />
        </Field>
        <div className={s.formRow}>
          <Field label={t('Сумма без НДС', 'Amount excl. VAT')} required error={errors.amount}>
            <MoneyInput value={net} onChange={setNet} placeholder={t('0,00', '0.00')} />
          </Field>
          <Field label={t('НДС', 'VAT')} error={errors.vat}>
            <NumberInput value={vat} onChange={setVat} min={0} max={30} unit="%" stepper />
          </Field>
          <Field label={t('Срок оплаты', 'Due date')} required error={errors.due}>
            <DateField value={due} onChange={setDue} min={FINANCE_TODAY} />
          </Field>
        </div>
        <Field label={t('Назначение платежа', 'Payment purpose')} hint={t('Попадёт в счёт и акт.', 'Goes into the invoice and the completion report.')}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            autoResize
            maxLength={240}
            showCount
            placeholder={t('Например: поставка продукции по договору 118/26', 'For example: supply of products under contract 118/26')}
          />
        </Field>
        <div className={s.formTotal} aria-live="polite">
          <div className={s.totalRow}>
            <span className="ev-muted">{t('Сумма без НДС', 'Amount excl. VAT')}</span>
            <span className="ev-num">{formatRub(netValue)}</span>
          </div>
          <div className={s.totalRow}>
            <span className="ev-muted">{vatValue > 0 ? `${t('НДС', 'VAT')} ${vatValue}%` : t('Без НДС', 'No VAT')}</span>
            <span className="ev-num">{formatRub(total - netValue)}</span>
          </div>
          <div className={s.totalRow} data-total="">
            <span>{t('Итого к оплате', 'Total due')}</span>
            <span className="ev-num">{formatRub(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
