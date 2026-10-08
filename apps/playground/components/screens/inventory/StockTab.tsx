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
import { formatDate, formatNum, formatRub, plural } from '@/lib/format'
import { AdjustModal } from './AdjustModal'
import s from './inventory.module.css'

interface StockTabProps {
  items: StockItem[]
  onChangeQty: (id: string, qty: number) => void
  onWriteOff: (ids: string[]) => void
}

const CATEGORY_OPTIONS = (Object.keys(CATEGORIES) as Category[]).map((c) => ({ value: c, label: CATEGORIES[c] }))
const WAREHOUSE_OPTIONS = WAREHOUSES.map((w) => ({ value: w.id, label: w.name, hint: w.code }))

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function sortItems(list: StockItem[], sort: SortState | null): StockItem[] {
  if (!sort) return list
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
        return it.name
    }
  }
  return [...list].sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ru')) * dir
  })
}

export function StockTab({ items, onChangeQty, onWriteOff }: StockTabProps) {
  const modals = useModals()
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
        (!q || normalizeSearch(`${it.name} ${it.sku}`).includes(q)),
    )
    return sortItems(list, sort)
  }, [items, query, categories, warehouse, sort])

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
      title: one ? `Списать остаток «${one.name}»?` : `Списать ${list.length} ${plural(list.length, 'позицию', 'позиции', 'позиций')}?`,
      message: (
        <>
          Остаток будет обнулён, в учёт уйдёт акт списания на сумму <b>{formatRub(total)}</b>. Действие нельзя отменить из консоли.
        </>
      ),
      okLabel: 'Списать',
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
      onOk: () => delay(700),
    })
    if (!ok) return
    const ids = list.map((it) => it.id)
    onWriteOff(ids)
    setSelected((sel) => sel.filter((k) => !ids.includes(k)))
    toast.success('Остаток списан', { description: `Акт АС-${1040 + ids.length} на ${formatRub(total)}` })
  }

  const reorder = (list: StockItem[]) => {
    toast.success('Заявка на пополнение создана', {
      description: `${list.length} ${plural(list.length, 'позиция', 'позиции', 'позиций')}, отправлена в снабжение`,
    })
  }

  const columns: Column<StockItem>[] = [
    {
      key: 'name',
      header: 'Позиция',
      primary: true,
      sortable: true,
      minWidth: 220,
      cell: (it) => (
        <span className={s.nameCell}>
          <span className={s.nameText}>{it.name}</span>
          <span className="ev-muted ev-mono">{it.sku}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Категория', hideOnMobile: true, cell: (it) => CATEGORIES[it.category] },
    { key: 'warehouse', header: 'Склад', cell: (it) => warehouseName(it.warehouse) },
    {
      key: 'qty',
      header: 'Остаток',
      sortable: true,
      width: 200,
      cell: (it) => (
        <Progress
          value={it.qty}
          max={it.max}
          size="sm"
          tone={STOCK_STATE[stockState(it)].tone}
          showValue={(v, max) => `${formatNum(v)} / ${formatNum(max)} ${it.unit}`}
          aria-label={`Остаток: ${it.name}`}
        />
      ),
    },
    {
      key: 'state',
      header: 'Уровень',
      cell: (it) => {
        const st = STOCK_STATE[stockState(it)]
        return <StatusPill tone={st.tone}>{st.label}</StatusPill>
      },
    },
    { key: 'value', header: 'Стоимость', numeric: true, sortable: true, cell: (it) => formatRub(it.qty * it.price) },
    { key: 'movedAt', header: 'Движение', sortable: true, hideOnMobile: true, cell: (it) => <span className="ev-muted">{formatDate(it.movedAt)}</span> },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">Действия</span>,
      align: 'right',
      width: 56,
      hideOnMobile: true,
      cell: (it) => (
        <Menu
          label={`Действия: ${it.name}`}
          trigger={<IconButton label="Действия с позицией" size="sm" icon={<MoreHorizontal size={16} />} />}
          items={[
            { id: 'adjust', label: 'Корректировать остаток', icon: <SlidersHorizontal size={15} />, onSelect: () => setAdjusting(it) },
            { id: 'reorder', label: 'Заказать пополнение', icon: <PackagePlus size={15} />, onSelect: () => reorder([it]) },
            { type: 'separator', id: 'sep' },
            {
              id: 'writeoff',
              label: 'Списать остаток',
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
          title={`Выбрано: ${selected.length} ${plural(selected.length, 'позиция', 'позиции', 'позиций')}`}
          actions={
            <>
              <Button size="sm" icon={<PackagePlus size={14} />} onClick={() => {
                reorder(selectedItems)
                setSelected([])
              }}>
                Заявка на пополнение
              </Button>
              <Button size="sm" variant="danger-ghost" icon={<Trash2 size={14} />} onClick={() => void writeOff(selectedItems)}>
                Списать
              </Button>
              <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSelected([])}>
                Снять выбор
              </Button>
            </>
          }
        >
          Стоимость выбранного по учётной цене: {formatRub(selectedValue)}.
        </Callout>
      ) : null}

      <Card
        flush
        toolbar={
          <FilterBar
            search={{ value: query, onChange: withReset(setQuery), placeholder: 'Название или артикул' }}
            activeCount={(categories.length > 0 ? 1 : 0) + (warehouse ? 1 : 0)}
            onReset={reset}
            actions={
              <Button icon={<Download size={15} />} onClick={() => toast.success('Остатки выгружены', { description: `stock-2026-10-08.xlsx, ${filtered.length} строк` })}>
                Выгрузить
              </Button>
            }
          >
            <MultiSelect
              aria-label="Категории"
              width={220}
              placeholder="Все категории"
              value={categories}
              onChange={withReset(setCategories)}
              options={CATEGORY_OPTIONS}
            />
            <Select
              aria-label="Склад"
              width={220}
              placeholder="Все склады"
              clearable
              value={warehouse}
              onChange={withReset(setWarehouse)}
              options={WAREHOUSE_OPTIONS}
            />
          </FilterBar>
        }
      >
        <DataTable
          aria-label="Остатки на складах"
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
          empty="Позиции не найдены"
          emptyDescription="Измените запрос или сбросьте фильтры."
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
          toast.success('Остаток скорректирован', {
            description: `${it.name}: ${formatNum(it.qty)} → ${formatNum(qty)} ${it.unit}. Причина: ${reason}.`,
          })
        }}
      />
    </div>
  )
}
