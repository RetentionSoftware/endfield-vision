'use client'

import { Button, Callout, Drawer, KeyValueList, StatusPill, toast, useModals } from 'endfield-vision'
import { BellRing, CheckCircle2, Download, Send } from 'lucide-react'
import {
  counterparty,
  daysBetween,
  facilityName,
  FINANCE_TODAY,
  INVOICE_STATUS,
  invoiceTotal,
  type Invoice,
} from '@/lib/demo/finance'
import { formatDate, formatRub, plural } from '@/lib/format'
import s from './finance.module.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

interface InvoiceDrawerProps {
  invoice: Invoice | null
  onClose: () => void
  onMarkPaid: (id: string) => void
  onReminded: (id: string) => void
  onIssue: (id: string) => void
}

/** Карточка счёта: реквизиты, суммы и действия по статусу. */
export function InvoiceDrawer({ invoice, onClose, onMarkPaid, onReminded, onIssue }: InvoiceDrawerProps) {
  const modals = useModals()
  if (!invoice) return null

  const cp = counterparty(invoice.counterpartyId)
  const total = invoiceTotal(invoice.net, invoice.vat)
  const vatAmount = total - invoice.net
  const status = INVOICE_STATUS[invoice.status]
  const late = daysBetween(invoice.dueAt, FINANCE_TODAY)
  const left = -late

  const markPaid = () =>
    void modals.confirm({
      title: 'Отметить счёт оплаченным?',
      message: `${invoice.number} на ${formatRub(total)} от ${cp?.name ?? 'контрагента'}. Дата оплаты - ${formatDate(FINANCE_TODAY)}.`,
      okLabel: 'Отметить оплаченным',
      okIcon: <CheckCircle2 size={15} />,
      onOk: async () => {
        await wait(600)
        onMarkPaid(invoice.id)
        toast.success('Оплата зафиксирована', { description: invoice.number })
      },
    })

  const remind = () => {
    onReminded(invoice.id)
    toast.success('Напоминание отправлено', { description: `${cp?.email ?? 'Контрагенту'}: ${invoice.number}, ${formatRub(total)}` })
  }

  const issue = () => {
    onIssue(invoice.id)
    toast.success('Счёт выставлен', { description: `${invoice.number} отправлен на ${cp?.email ?? 'почту контрагента'}` })
  }

  const download = () => toast.info('PDF сформирован', { description: `${invoice.number}.pdf` })

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title={<span className="ev-mono">{invoice.number}</span>}
      subtitle={`Выставлен ${formatDate(invoice.issuedAt)}`}
      footer={
        <>
          <Button variant="ghost" icon={<Download size={15} />} onClick={download}>
            PDF
          </Button>
          {invoice.status === 'pending' || invoice.status === 'overdue' ? (
            <>
              <Button icon={<BellRing size={15} />} onClick={remind}>
                Напомнить
              </Button>
              <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={markPaid}>
                Оплачен
              </Button>
            </>
          ) : null}
          {invoice.status === 'draft' ? (
            <Button variant="primary" icon={<Send size={15} />} onClick={issue}>
              Выставить
            </Button>
          ) : null}
        </>
      }
    >
      <div className="ev-stack">
        <div className={s.drawerSum}>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <div className={s.drawerAmount}>{formatRub(total)}</div>
          <div className="ev-muted">{invoice.description}</div>
        </div>

        {invoice.status === 'overdue' ? (
          <Callout tone="danger" title={`Просрочка ${late} ${plural(late, 'день', 'дня', 'дней')}`}>
            Срок оплаты истёк {formatDate(invoice.dueAt)}.
            {invoice.reminders > 0 ? ` Напоминаний отправлено: ${invoice.reminders}.` : ' Напоминания не отправлялись.'}
          </Callout>
        ) : null}
        {invoice.status === 'pending' && left <= 3 ? (
          <Callout tone="warning">
            {left === 0 ? 'Срок оплаты - сегодня.' : `До срока оплаты ${left} ${plural(left, 'день', 'дня', 'дней')}.`}
          </Callout>
        ) : null}
        {invoice.status === 'draft' ? <Callout tone="info">Черновик не отправлен контрагенту и не учитывается в задолженности.</Callout> : null}

        <KeyValueList
          labelWidth={150}
          items={[
            { key: 'cp', label: 'Контрагент', value: cp?.name, hint: cp ? `ИНН ${cp.inn}` : undefined },
            { key: 'email', label: 'Почта для счетов', value: cp?.email },
            { key: 'facility', label: 'Объект', value: facilityName(invoice.facilityId) },
            { key: 'due', label: 'Срок оплаты', value: formatDate(invoice.dueAt) },
            { key: 'paid', label: 'Дата оплаты', value: invoice.paidAt ? formatDate(invoice.paidAt) : null },
            { key: 'reminders', label: 'Напоминания', value: invoice.reminders > 0 ? String(invoice.reminders) : null },
          ]}
        />

        <div className={s.drawerTotals}>
          <div className={s.totalRow}>
            <span className="ev-muted">Сумма без НДС</span>
            <span className="ev-num">{formatRub(invoice.net)}</span>
          </div>
          <div className={s.totalRow}>
            <span className="ev-muted">{invoice.vat > 0 ? `НДС ${invoice.vat}%` : 'Без НДС'}</span>
            <span className="ev-num">{formatRub(vatAmount)}</span>
          </div>
          <div className={s.totalRow} data-total="">
            <span>Итого к оплате</span>
            <span className="ev-num">{formatRub(total)}</span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
