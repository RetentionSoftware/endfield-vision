'use client'

import { Button, Card, ContextMenu, DataTable, KeyValueList, Switch, toast, type Column, type MenuEntry } from 'endfield-vision'
import { ChevronsDownUp, ChevronsUpDown, Copy, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'

/*
 * DataTable: свойства строки. Движения по дням: тон строки (минус за день,
 * сегодняшние записи), атрибуты для контекстного меню, раскрытие дня с
 * операциями, итоговая строка, шапка у верха страницы.
 */

interface Operation {
  id: string
  party: string
  /** Копейки: плюс - поступление, минус - списание. */
  amount: number
}

interface Day {
  id: string
  date: string
  income: number
  expense: number
  ops: Operation[]
  today: boolean
}

const PARTIES: Bi[] = [
  bi('ООО «Северный путь»', 'Northern Route LLC'),
  bi('АО «Трансгрупп»', 'Transgroup JSC'),
  bi('Топливная карта', 'Fuel card'),
  bi('ИП Гарипов Р. Ф.', 'Sole trader R. Garipov'),
  bi('Аренда стоянки', 'Parking lease'),
  bi('Страховая премия', 'Insurance premium'),
]

/** Детерминированные дни: без Math.random, рендер на сервере и клиенте совпадает. */
function days({ tx }: Translator): Day[] {
  return Array.from({ length: 14 }, (_, i) => {
    const dd = String(28 - i).padStart(2, '0')
    const ops = Array.from({ length: 2 + (i % 3) }, (_, j) => {
      const sign = (i + j) % 3 === 0 ? -1 : 1
      const party = PARTIES[(i * 2 + j) % PARTIES.length]
      return {
        id: `op${i}-${j}`,
        party: party ? tx(party) : '',
        amount: sign * (180_000_00 + ((i * 7919 + j * 104_729) % 900) * 1_000_00),
      }
    })
    const income = ops.filter((o) => o.amount > 0).reduce((s, o) => s + o.amount, 0)
    const expense = -ops.filter((o) => o.amount < 0).reduce((s, o) => s + o.amount, 0)
    return { id: `d${dd}`, date: `${dd}.10.2026`, income, expense, ops, today: i === 0 }
  })
}

export function TableRowsCard() {
  const tr = useT()
  const { t, formatNum, formatRub } = tr
  const rows = useMemo(() => days(tr), [tr])
  const [expanded, setExpanded] = useState<string[]>(['d27'])
  const [sticky, setSticky] = useState(true)

  const net = (d: Day) => d.income - d.expense
  const sum = (list: Day[], pick: (d: Day) => number) => list.reduce((s, d) => s + pick(d), 0)

  const columns: Column<Day>[] = [
    { key: 'date', header: t('День', 'Day'), primary: true, cell: (d) => (d.today ? `${d.date}, ${t('сегодня', 'today')}` : d.date), footerCell: t('Итого', 'Total') },
    { key: 'income', header: t('Поступления', 'Incoming'), numeric: true, cell: (d) => formatRub(d.income), footerCell: (list) => formatRub(sum(list, (d) => d.income)) },
    { key: 'expense', header: t('Списания', 'Outgoing'), numeric: true, cell: (d) => (d.expense ? formatRub(d.expense) : null), footerCell: (list) => formatRub(sum(list, (d) => d.expense)) },
    { key: 'net', header: t('Сальдо', 'Net'), numeric: true, cell: (d) => formatRub(net(d)), footerCell: (list) => formatRub(sum(list, net)) },
    { key: 'ops', header: t('Операций', 'Entries'), numeric: true, hideOnMobile: true, cell: (d) => formatNum(d.ops.length), footerCell: (list) => formatNum(sum(list, (d) => d.ops.length)) },
  ]

  // Одна обёртка на таблицу: строка помечена data-ctx-id через rowAttributes, меню - по всей строке.
  const menuFor = (target: HTMLElement): MenuEntry[] | null => {
    const day = rows.find((d) => d.id === target.closest<HTMLElement>('[data-ctx-kind="day"]')?.dataset.ctxId)
    if (!day) return null
    const open = expanded.includes(day.id)
    return [
      { type: 'label', id: 'head', label: day.date },
      { id: 'statement', label: t('Открыть выписку', 'Open statement'), icon: <ExternalLink size={15} />, onSelect: () => toast.info(t('Выписка за день', 'Daily statement'), { description: day.date }) },
      {
        id: 'toggle',
        label: open ? t('Свернуть', 'Collapse') : t('Раскрыть', 'Expand'),
        icon: open ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />,
        onSelect: () => setExpanded((e) => (open ? e.filter((k) => k !== day.id) : [...e, day.id])),
      },
      { id: 'copy', label: t('Скопировать сальдо', 'Copy net'), icon: <Copy size={15} />, onSelect: () => toast.success(t('Скопировано', 'Copied'), { description: formatRub(net(day)) }) },
    ]
  }

  return (
    <Card
      title={t('DataTable: строки', 'DataTable: rows')}
      description={t(
        'rowTone - тон строки фоном (минус за день, сегодняшние записи), rowAttributes - свои data-* и aria-* на строке: здесь по ним работает контекстное меню по всей строке. renderExpanded - раскрытие дня с операциями (клик по строке или стрелка), footerCell у колонок - итоговая строка. stickyHeader - шапка липнет к верху страницы под шапкой консоли, без maxHeight.',
        'rowTone tints a row (a negative day, today’s entries), rowAttributes puts your own data-* and aria-* on the row: here they drive a context menu across the whole row. renderExpanded opens a day with its entries (click the row or the arrow), footerCell on columns adds a totals row. stickyHeader keeps the header at the top of the page below the console bar, without maxHeight.',
      )}
      flush
      actions={
        <div className="ev-row">
          <Switch size="sm" checked={sticky} onChange={setSticky} label={t('Липкая шапка', 'Sticky header')} />
          <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded.length ? [] : rows.map((d) => d.id))}>
            {expanded.length ? t('Свернуть все', 'Collapse all') : t('Раскрыть все', 'Expand all')}
          </Button>
        </div>
      }
    >
      <ContextMenu items={menuFor}>
        <div>
          <DataTable
            aria-label={t('Движения по дням', 'Daily movements')}
            columns={columns}
            rows={rows}
            rowKey={(d) => d.id}
            rowTone={(d) => (net(d) < 0 ? 'danger' : d.today ? 'accent' : undefined)}
            rowAttributes={(d) => ({ 'data-ctx-kind': 'day', 'data-ctx-id': d.id })}
            renderExpanded={(d) => (
              <KeyValueList
                items={d.ops.map((o) => ({
                  key: o.id,
                  label: o.party,
                  value: <span className={o.amount < 0 ? 'ev-muted' : undefined}>{formatRub(o.amount)}</span>,
                }))}
              />
            )}
            expanded={expanded}
            onExpandedChange={setExpanded}
            stickyHeader={sticky}
            dense
          />
        </div>
      </ContextMenu>
    </Card>
  )
}
