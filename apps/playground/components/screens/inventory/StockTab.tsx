'use client'

import {
  Button,
  Callout,
  Card,
  DataTable,
  FilterBar,
  IconButton,
  Menu,
  MultiSelect,
  Pagination,
  Progress,
  Select,
  StatusPill,
  normalizeSearch,
  toast,
  useModals,
  type Column,
  type SortState,
} from 'endfield-vision'
import { Download, MoreHorizontal, PackagePlus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CATEGORIES,
  STOCK_STATE,
  stockState,
  warehouseName,
  WAREHOUSES,
  type Category,
  type StockItem,
} from '@/lib/demo/inventory'
import { formatDate } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { AdjustModal } from './AdjustModal'
import s from './inventory.module.css'

interface StockTabProps {
  items: StockItem[]
  onChangeQty: (id: string, qty: number) => void
  onWriteOff: (ids: string[]) => void
}

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/** Сортировка; без выбранной колонки - по названию на текущем языке, затем по складу. */
function sortItems(list: StockItem[], sort: SortState | null, name: (it: StockItem) => string, locale: string): StockItem[] {
  if (!sort) return [...list].sort((a, b) => name(a).localeCompare(name(b), locale) || a.warehouse.localeCompare(b.warehouse))
  const dir = sort.dir === 'asc' ? 1 : -1
  const val = (it: StockItem): number | string => {
    switch (sort.key) {
      case 'qty':
        return it.qty / it.max
      case 'value':
        return it.qty * it.price
      case 'movedAt':
        return it.movedAt
      default:
        return name(it)
    }
  }
  return [...list].sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), locale)) * dir
  })
}

export function StockTab({ items, onChangeQty, onWriteOff }: StockTabProps) {
  const modals = useModals()
  const { t, tx, plural, formatNum, formatRub, intl } = useT()
  const categoryOptions = (Object.keys(CATEGORIES) as Category[]).map((c) => ({ value: c, label: tx(CATEGORIES[c]) }))
  const warehouseOptions = WAREHOUSES.map((w) => ({ value: w.id, label: tx(w.name), hint: w.code }))
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouse, setWarehouse] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [adjusting, setAdjusting] = useState<StockItem | null>(null)

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    const list = items.filter(
      (it) =>
        (categories.length === 0 || categories.includes(it.category)) &&
        (!warehouse || it.warehouse === warehouse) &&
        (!q || normalizeSearch(`${tx(it.name)} ${it.sku}`).includes(q)),
    )
    return sortItems(list, sort, (it) => tx(it.name), intl)
  }, [items, query, categories, warehouse, sort, tx, intl])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)

  const selectedItems = items.filter((it) => selected.includes(it.id))
  const selectedValue = selectedItems.reduce((a, it) => a + it.qty * it.price, 0)

  const withReset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

  const reset = () => {
    setQuery('')
    setCategories([])
    setWarehouse(null)
    setPage(1)
  }

  const writeOff = async (list: StockItem[]) => {
    const total = list.reduce((a, it) => a + it.qty * it.price, 0)
    const one = list.length === 1 ? list[0] : undefined
    const ok = await modals.confirm({
      title: one
        ? t(`Списать остаток «${tx(one.name)}»?`, `Write off "${tx(one.name)}"?`)
        : `${t('Списать', 'Write off')} ${list.length} ${plural(list.length, ['позицию', 'позиции', 'позиций'], ['item', 'items'])}?`,
      message: (
        <>
          {t('Остаток будет обнулён, в учёт уйдёт акт списания на сумму', 'Stock will be set to zero and a write-off report will be posted for')}{' '}
          <b>{formatRub(total)}</b>. {t('Действие нельзя отменить из консоли.', 'This cannot be undone from the console.')}
        </>
      ),
      okLabel: t('Списать', 'Write off'),
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
      onOk: () => delay(700),
    })
    if (!ok) return
    const ids = list.map((it) => it.id)
    onWriteOff(ids)
    setSelected((sel) => sel.filter((k) => !ids.includes(k)))
    toast.success(t('Остаток списан', 'Stock written off'), {
      description: t(`Акт АС-${1040 + ids.length} на ${formatRub(total)}`, `Report WO-${1040 + ids.length} for ${formatRub(total)}`),
    })
  }

  const reorder = (list: StockItem[]) => {
    toast.success(t('Заявка на пополнение создана', 'Restock request created'), {
      description: `${list.length} ${plural(list.length, ['позиция', 'позиции', 'позиций'], ['item', 'items'])}, ${t('отправлена в снабжение', 'sent to procurement')}`,
    })
  }

  const columns: Column<StockItem>[] = [
    {
      key: 'name',
      header: t('Позиция', 'Item'),
      primary: true,
      sortable: true,
      minWidth: 220,
      cell: (it) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{tx(it.name)}</span>
          <span className="ev-muted ev-mono">{it.sku}</span>
        </span>
      ),
    },
    { key: 'category', header: t('Категория', 'Category'), hideOnMobile: true, cell: (it) => tx(CATEGORIES[it.category]) },
    { key: 'warehouse', header: t('Склад', 'Warehouse'), cell: (it) => tx(warehouseName(it.warehouse)) },
    {
      key: 'qty',
      header: t('Остаток', 'Quantity'),
      sortable: true,
      width: 200,
      cell: (it) => (
        <Progress
          value={it.qty}
          max={it.max}
          size="sm"
          tone={STOCK_STATE[stockState(it)].tone}
          showValue={(v, max) => `${formatNum(v)} / ${formatNum(max)} ${tx(it.unit)}`}
          aria-label={`${t('Остаток', 'Quantity')}: ${tx(it.name)}`}
        />
      ),
    },
    {
      key: 'state',
      header: t('Уровень', 'Level'),
      cell: (it) => {
        const st = STOCK_STATE[stockState(it)]
        return <StatusPill tone={st.tone}>{tx(st.label)}</StatusPill>
      },
    },
    { key: 'value', header: t('Стоимость', 'Value'), numeric: true, sortable: true, cell: (it) => formatRub(it.qty * it.price) },
    { key: 'movedAt', header: t('Движение', 'Last movement'), sortable: true, hideOnMobile: true, cell: (it) => <span className="ev-muted">{formatDate(it.movedAt)}</span> },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      align: 'right',
      width: 56,
      hideOnMobile: true,
      cell: (it) => (
        <Menu
          label={`${t('Действия', 'Actions')}: ${tx(it.name)}`}
          trigger={<IconButton label={t('Действия с позицией', 'Item actions')} size="sm" icon={<MoreHorizontal size={16} />} />}
          items={[
            { id: 'adjust', label: t('Корректировать остаток', 'Adjust quantity'), icon: <SlidersHorizontal size={15} />, onSelect: () => setAdjusting(it) },
            { id: 'reorder', label: t('Заказать пополнение', 'Request restock'), icon: <PackagePlus size={15} />, onSelect: () => reorder([it]) },
            { type: 'separator', id: 'sep' },
            {
              id: 'writeoff',
              label: t('Списать остаток', 'Write off stock'),
              icon: <Trash2 size={15} />,
              danger: true,
              disabled: it.qty === 0,
              onSelect: () => void writeOff([it]),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className={s.tab}>
      {selected.length > 0 ? (
        <Callout
          tone="info"
          title={`${t('Выбрано', 'Selected')}: ${selected.length} ${plural(selected.length, ['позиция', 'позиции', 'позиций'], ['item', 'items'])}`}
          actions={
            <>
              <Button size="sm" icon={<PackagePlus size={14} />} onClick={() => {
                reorder(selectedItems)
                setSelected([])
              }}>
                {t('Заявка на пополнение', 'Restock request')}
              </Button>
              <Button size="sm" variant="danger-ghost" icon={<Trash2 size={14} />} onClick={() => void writeOff(selectedItems)}>
                {t('Списать', 'Write off')}
              </Button>
              <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSelected([])}>
                {t('Снять выбор', 'Clear selection')}
              </Button>
            </>
          }
        >
          {t('Стоимость выбранного по учётной цене', 'Value of the selection at book price')}: {formatRub(selectedValue)}.
        </Callout>
      ) : null}

      <Card
        flush
        toolbar={
          <FilterBar
            search={{ value: query, onChange: withReset(setQuery), placeholder: t('Название или артикул', 'Name or SKU') }}
            activeCount={(categories.length > 0 ? 1 : 0) + (warehouse ? 1 : 0)}
            onReset={reset}
            actions={
              <Button
                icon={<Download size={15} />}
                onClick={() =>
                  toast.success(t('Остатки выгружены', 'Stock exported'), {
                    description: `stock-2026-10-08.xlsx, ${filtered.length} ${t('строк', 'rows')}`,
                  })
                }
              >
                {t('Выгрузить', 'Export')}
              </Button>
            }
          >
            <MultiSelect
              aria-label={t('Категории', 'Categories')}
              width={220}
              placeholder={t('Все категории', 'All categories')}
              value={categories}
              onChange={withReset(setCategories)}
              options={categoryOptions}
            />
            <Select
              aria-label={t('Склад', 'Warehouse')}
              width={220}
              placeholder={t('Все склады', 'All warehouses')}
              clearable
              value={warehouse}
              onChange={withReset(setWarehouse)}
              options={warehouseOptions}
            />
          </FilterBar>
        }
      >
        <DataTable
          aria-label={t('Остатки на складах', 'Stock by warehouse')}
          columns={columns}
          rows={rows}
          rowKey={(it) => it.id}
          sort={sort}
          onSortChange={(v) => {
            setSort(v)
            setPage(1)
          }}
          selected={selected}
          onSelectedChange={setSelected}
          rowMuted={(it) => it.qty === 0}
          empty={t('Позиции не найдены', 'No items found')}
          emptyDescription={t('Измените запрос или сбросьте фильтры.', 'Change the search or reset the filters.')}
          footer={
            <Pagination
              page={current}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n)
                setPage(1)
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          }
        />
      </Card>

      <AdjustModal
        item={adjusting}
        onClose={() => setAdjusting(null)}
        onSave={(it, qty, reason) => {
          onChangeQty(it.id, qty)
          toast.success(t('Остаток скорректирован', 'Quantity adjusted'), {
            description: `${tx(it.name)}: ${formatNum(it.qty)} → ${formatNum(qty)} ${tx(it.unit)}. ${t('Причина', 'Reason')}: ${reason}.`,
          })
        }}
      />
    </div>
  )
}
