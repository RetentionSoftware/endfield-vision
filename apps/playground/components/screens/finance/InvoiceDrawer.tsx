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
import { formatDate } from '@/lib/format'
import { useT } from '@/lib/i18n'
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
  const { t, tx, plural, formatRub } = useT()
  if (!invoice) return null

  const cp = counterparty(invoice.counterpartyId)
  const number = tx(invoice.number)
  const days = (n: number) => plural(n, ['день', 'дня', 'дней'], ['day', 'days'])
  const total = invoiceTotal(invoice.net, invoice.vat)
  const vatAmount = total - invoice.net
  const status = INVOICE_STATUS[invoice.status]
  const late = daysBetween(invoice.dueAt, FINANCE_TODAY)
  const left = -late

  const markPaid = () =>
    void modals.confirm({
      title: t('Отметить счёт оплаченным?', 'Mark invoice as paid?'),
      message: t(
        `${number} на ${formatRub(total)} от ${cp ? tx(cp.name) : 'контрагента'}. Дата оплаты - ${formatDate(FINANCE_TODAY)}.`,
        `${number} for ${formatRub(total)} from ${cp ? tx(cp.name) : 'the counterparty'}. Payment date - ${formatDate(FINANCE_TODAY)}.`,
      ),
      okLabel: t('Отметить оплаченным', 'Mark as paid'),
      okIcon: <CheckCircle2 size={15} />,
      onOk: async () => {
        await wait(600)
        onMarkPaid(invoice.id)
        toast.success(t('Оплата зафиксирована', 'Payment recorded'), { description: number })
      },
    })

  const remind = () => {
    onReminded(invoice.id)
    toast.success(t('Напоминание отправлено', 'Reminder sent'), {
      description: `${cp?.email ?? t('Контрагенту', 'To the counterparty')}: ${number}, ${formatRub(total)}`,
    })
  }

  const issue = () => {
    onIssue(invoice.id)
    toast.success(t('Счёт выставлен', 'Invoice issued'), {
      description: t(`${number} отправлен на ${cp?.email ?? 'почту контрагента'}`, `${number} sent to ${cp?.email ?? "the counterparty's email"}`),
    })
  }

  const download = () => toast.info(t('PDF сформирован', 'PDF generated'), { description: `${number}.pdf` })

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title={<span className="ev-mono">{number}</span>}
      subtitle={`${t('Выставлен', 'Issued')} ${formatDate(invoice.issuedAt)}`}
      footer={
        <>
          <Button variant="ghost" icon={<Download size={15} />} onClick={download}>
            PDF
          </Button>
          {invoice.status === 'pending' || invoice.status === 'overdue' ? (
            <>
              <Button icon={<BellRing size={15} />} onClick={remind}>
                {t('Напомнить', 'Remind')}
              </Button>
              <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={markPaid}>
                {t('Оплачен', 'Paid')}
              </Button>
            </>
          ) : null}
          {invoice.status === 'draft' ? (
            <Button variant="primary" icon={<Send size={15} />} onClick={issue}>
              {t('Выставить', 'Issue')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="ev-stack">
        <div className={s.drawerSum}>
          <StatusPill tone={status.tone}>{tx(status.label)}</StatusPill>
          <div className={s.drawerAmount}>{formatRub(total)}</div>
          <div className="ev-muted">{tx(invoice.description)}</div>
        </div>

        {invoice.status === 'overdue' ? (
          <Callout tone="danger" title={t(`Просрочка ${late} ${days(late)}`, `Overdue by ${late} ${days(late)}`)}>
            {t('Срок оплаты истёк', 'Payment was due')} {formatDate(invoice.dueAt)}.
            {invoice.reminders > 0
              ? t(` Напоминаний отправлено: ${invoice.reminders}.`, ` Reminders sent: ${invoice.reminders}.`)
              : t(' Напоминания не отправлялись.', ' No reminders sent yet.')}
          </Callout>
        ) : null}
        {invoice.status === 'pending' && left <= 3 ? (
          <Callout tone="warning">
            {left === 0
              ? t('Срок оплаты - сегодня.', 'Payment is due today.')
              : t(`До срока оплаты ${left} ${days(left)}.`, `Payment is due in ${left} ${days(left)}.`)}
          </Callout>
        ) : null}
        {invoice.status === 'draft' ? (
          <Callout tone="info">
            {t('Черновик не отправлен контрагенту и не учитывается в задолженности.', 'The draft has not been sent to the counterparty and is not counted in receivables.')}
          </Callout>
        ) : null}

        <KeyValueList
          labelWidth={150}
          items={[
            { key: 'cp', label: t('Контрагент', 'Counterparty'), value: cp ? tx(cp.name) : undefined, hint: cp ? `${t('ИНН', 'TIN')} ${cp.inn}` : undefined },
            { key: 'email', label: t('Почта для счетов', 'Billing email'), value: cp?.email },
            { key: 'facility', label: t('Объект', 'Facility'), value: tx(facilityName(invoice.facilityId)) },
            { key: 'due', label: t('Срок оплаты', 'Due date'), value: formatDate(invoice.dueAt) },
            { key: 'paid', label: t('Дата оплаты', 'Payment date'), value: invoice.paidAt ? formatDate(invoice.paidAt) : null },
            { key: 'reminders', label: t('Напоминания', 'Reminders'), value: invoice.reminders > 0 ? String(invoice.reminders) : null },
          ]}
        />

        <div className={s.drawerTotals}>
          <div className={s.totalRow}>
            <span className="ev-muted">{t('Сумма без НДС', 'Amount excl. VAT')}</span>
            <span className="ev-num">{formatRub(invoice.net)}</span>
          </div>
          <div className={s.totalRow}>
            <span className="ev-muted">{invoice.vat > 0 ? `${t('НДС', 'VAT')} ${invoice.vat}%` : t('Без НДС', 'No VAT')}</span>
            <span className="ev-num">{formatRub(vatAmount)}</span>
          </div>
          <div className={s.totalRow} data-total="">
            <span>{t('Итого к оплате', 'Total due')}</span>
            <span className="ev-num">{formatRub(total)}</span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
