'use client'

import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CopyButton,
  CopyValue,
  DataTable,
  EmptyState,
  FilterBar,
  KeyValueList,
  normalizeSearch,
  Pagination,
  Panel,
  Progress,
  Select,
  Sparkline,
  StatTile,
  StatusPill,
  Switch,
  toast,
  type Column,
  type SortState,
  type Tone,
} from 'endfield-vision'
import { Boxes, CircleCheck, PackageX, Truck, Wallet } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { formatNum, formatRub } from '@/lib/format'
import { HelpersCard } from './HelpersCard'
import { Subhead } from './parts'
import { TimelineCard, UptimeCard } from './StatusCards'
import s from './vision.module.css'

type StockStatus = 'ok' | 'low' | 'out' | 'reserved'

interface StockItem {
  id: string
  sku: string
  name: string
  warehouse: string
  qty: number
  unit: string
  /** Цена за единицу, копейки. */
  price: number
  status: StockStatus
  keeper: string
}

/*
 * «Фото» для Avatar: SVG, собранный в коде, как data URI - без внешних загрузок.
 * Цвета здесь - содержимое картинки, а не стили экрана.
 */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2b3a55"/><circle cx="32" cy="25" r="12" fill="#c9d4e8"/><path d="M10 64c2-14 11-21 22-21s20 7 22 21z" fill="#c9d4e8"/></svg>',
)}`
/** Битый data URI: картинка не декодируется - Avatar показывает инициалы. */
const BROKEN_PHOTO = 'data:image/png;base64,AAAA'

const STOCK_STATUS: Record<StockStatus, { label: string; tone: Tone }> = {
  ok: { label: 'В наличии', tone: 'success' },
  low: { label: 'Мало', tone: 'warning' },
  out: { label: 'Нет на складе', tone: 'danger' },
  reserved: { label: 'В резерве', tone: 'info' },
}

const NAMES = ['Фильтр гидравлический', 'Подшипник 6205', 'Кабель силовой 3x2,5', 'Реагент Р-12', 'Перчатки защитные', 'Датчик давления', 'Ремень приводной', 'Смазка литиевая', 'Клапан обратный']
const WAREHOUSES = ['Долина-1', 'Хребет', 'Застава', 'Логистический узел']
const UNITS = ['шт.', 'шт.', 'м', 'кг', 'пар', 'шт.', 'шт.', 'кг', 'шт.']
const KEEPERS = ['Глеб Сорокин', 'Ирина Лебедева', 'Тимур Рахимов', 'Анна Петрова']

/** Детерминированные позиции склада: без Math.random, рендер на сервере и клиенте совпадает. */
const STOCK: StockItem[] = Array.from({ length: 27 }, (_, i) => {
  const qty = (i * 37 + 11) % 240
  const status: StockStatus = qty === 0 || i % 9 === 4 ? 'out' : i % 7 === 2 ? 'reserved' : qty < 40 ? 'low' : 'ok'
  return {
    id: `it${i + 1}`,
    sku: `SKU-${40200 + i * 17}`,
    name: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` (партия ${Math.floor(i / NAMES.length) + 1})` : ''}`,
    warehouse: WAREHOUSES[i % WAREHOUSES.length] ?? '',
    qty: status === 'out' ? 0 : qty,
    unit: UNITS[i % UNITS.length] ?? 'шт.',
    price: 25_000 + ((i * 7919) % 900) * 1_150,
    status,
    keeper: KEEPERS[i % KEEPERS.length] ?? '',
  }
})

const COLUMNS: Column<StockItem>[] = [
  {
    key: 'name',
    header: 'Позиция',
    sortable: true,
    primary: true,
    minWidth: 220,
    cell: (r) => (
      <span className="ev-stack" style={{ '--ev-gap': '0px' } as CSSProperties}>
        <span className="ev-truncate">{r.name}</span>
        <span className="ev-mono ev-muted" style={{ fontSize: 'var(--ev-fs-xs)' }}>
          {r.sku}
        </span>
      </span>
    ),
  },
  { key: 'warehouse', header: 'Склад', sortable: true, hideOnMobile: true, cell: (r) => r.warehouse },
  {
    key: 'keeper',
    header: 'Ответственный',
    hideOnMobile: true,
    cell: (r) => (
      <span className="ev-row" data-nowrap="">
        <Avatar name={r.keeper} size={24} />
        <span className="ev-truncate">{r.keeper}</span>
      </span>
    ),
  },
  { key: 'qty', header: 'Остаток', numeric: true, sortable: true, cell: (r) => (r.qty ? `${formatNum(r.qty)} ${r.unit}` : null) },
  { key: 'price', header: 'Цена', numeric: true, sortable: true, cell: (r) => formatRub(r.price) },
  { key: 'status', header: 'Статус', sortable: true, cell: (r) => <StatusPill tone={STOCK_STATUS[r.status].tone}>{STOCK_STATUS[r.status].label}</StatusPill> },
]

function TableCard() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StockStatus | null>(null)
  const [warehouse, setWarehouse] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [dense, setDense] = useState(false)
  const [clearable, setClearable] = useState(true)

  const filtered = useMemo(() => {
    const needle = normalizeSearch(q)
    let rows = STOCK.filter(
      (r) =>
        (!needle || normalizeSearch(`${r.name} ${r.sku}`).includes(needle)) &&
        (!status || r.status === status) &&
        (!warehouse || r.warehouse === warehouse),
    )
    if (sort) {
      const k = sort.key as keyof StockItem
      rows = [...rows].sort((a, b) => {
        const va = a[k]
        const vb = b[k]
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ru')
        return sort.dir === 'asc' ? r : -r
      })
    }
    return rows
  }, [q, status, warehouse, sort])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <Card
      title="DataTable, FilterBar и Pagination"
      description="Список сущностей: поиск и фильтры над таблицей (слот toolbar карточки), сортировка, выбор строк, клик по строке, загрузка, ошибка и пустой результат. sortClearable={false} - третий клик по заголовку не снимает сортировку. На узком экране строки становятся карточками."
      flush
      toolbar={
        <div className="ev-stack">
          <FilterBar
            search={{ value: q, onChange: resetPage(setQ), placeholder: 'Название или артикул' }}
            activeCount={(status ? 1 : 0) + (warehouse ? 1 : 0)}
            onReset={() => {
              setQ('')
              setStatus(null)
              setWarehouse(null)
              setPage(1)
            }}
            actions={
              <>
                <Switch size="sm" checked={loading} onChange={setLoading} label="Загрузка" />
                <Switch size="sm" checked={failed} onChange={setFailed} label="Ошибка" />
                <Switch size="sm" checked={dense} onChange={setDense} label="Плотно" />
                <Switch size="sm" checked={clearable} onChange={setClearable} label="Снимать сортировку" />
              </>
            }
          >
            <Select<StockStatus>
              aria-label="Статус"
              placeholder="Любой статус"
              value={status}
              onChange={resetPage(setStatus)}
              clearable
              options={(Object.keys(STOCK_STATUS) as StockStatus[]).map((k) => ({ value: k, label: STOCK_STATUS[k].label }))}
            />
            <Select
              aria-label="Склад"
              placeholder="Все склады"
              value={warehouse}
              onChange={resetPage(setWarehouse)}
              clearable
              options={WAREHOUSES.map((w) => ({ value: w, label: w }))}
            />
          </FilterBar>
          {selected.length > 0 ? (
            <Callout
              tone="info"
              icon={false}
              actions={
                <>
                  <Button size="sm" variant="primary" icon={<Truck size={14} />} onClick={() => toast.success('Заявка на перемещение создана', { description: `Позиций: ${selected.length}` })}>
                    Переместить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                    Снять выбор
                  </Button>
                </>
              }
            >
              Выбрано позиций: {selected.length}
            </Callout>
          ) : null}
        </div>
      }
    >
      <DataTable
        aria-label="Складские позиции"
        columns={COLUMNS}
        rows={loading ? undefined : pageRows}
        rowKey={(r) => r.id}
        loading={loading}
        error={failed ? { message: 'Сервер склада не ответил за 10 секунд.' } : null}
        onRetry={() => setFailed(false)}
        sort={sort}
        onSortChange={setSort}
        sortClearable={clearable}
        selected={selected}
        onSelectedChange={setSelected}
        rowMuted={(r) => r.status === 'out'}
        onRowClick={(r) => toast.info('Открыть позицию', { description: `${r.sku} - ${r.name}` })}
        empty={<EmptyState compact title="Позиции не найдены" description="Измените условия поиска или сбросьте фильтры." />}
        dense={dense}
        maxHeight={460}
        footer={
          <Pagination
            page={page}
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
  )
}

function BadgesCard() {
  const tones: Array<{ tone: Tone; label: string }> = [
    { tone: 'neutral', label: 'Черновик' },
    { tone: 'accent', label: 'Новая' },
    { tone: 'success', label: 'Принята' },
    { tone: 'warning', label: 'Ожидает' },
    { tone: 'danger', label: 'Брак' },
    { tone: 'info', label: 'В пути' },
    { tone: 'violet', label: 'Проект' },
  ]
  return (
    <Card title="Badge, StatusPill и Avatar" description="Badge - метка категории или счётчик; StatusPill - статус сущности: точка и подпись, цвет не единственный носитель смысла. Avatar - фото (src) или инициалы, тон по имени.">
      <div className="ev-stack">
        <Subhead>Badge</Subhead>
        <div className={s.row}>
          {tones.map((t) => (
            <Badge key={t.tone} tone={t.tone}>
              {t.label}
            </Badge>
          ))}
        </div>
        <div className={s.row}>
          <Badge tone="success" solid>
            OK
          </Badge>
          <Badge tone="danger" solid size="sm">
            FAIL
          </Badge>
          <Badge tone="info" dot>
            С точкой
          </Badge>
          <Badge tone="accent" icon={<Boxes size={12} />}>
            С иконкой
          </Badge>
          <Badge size="sm">sm</Badge>
        </div>
        <Subhead>StatusPill</Subhead>
        <div className={s.row}>
          {(Object.keys(STOCK_STATUS) as StockStatus[]).map((k) => (
            <StatusPill key={k} tone={STOCK_STATUS[k].tone}>
              {STOCK_STATUS[k].label}
            </StatusPill>
          ))}
          <StatusPill>Архив</StatusPill>
        </div>
        <Subhead>Avatar</Subhead>
        <div className={s.row}>
          {KEEPERS.map((k, i) => (
            <Avatar key={k} name={k} size={24 + i * 6} />
          ))}
          <Avatar name="admin" tone="neutral" />
        </div>
        <div className={s.row}>
          <Avatar name="Ирина Лебедева" src={PHOTO} alt="Ирина Лебедева" size={40} />
          <Avatar name="Тимур Рахимов" src={BROKEN_PHOTO} size={40} />
          <span className="ev-muted">src - фото; не загрузилось - инициалы. alt - подпись для скринридера, без неё аватар декоративный.</span>
        </div>
      </div>
    </Card>
  )
}

function CopyCard() {
  return (
    <Card title="CopyButton и CopyValue" description="Копирование кодов, ссылок и идентификаторов: галочка после копирования и тост «Скопировано». CopyValue - плашка-значение целиком кликабельна.">
      <div className="ev-stack">
        <div className={s.row}>
          <span className="ev-mono">SHP-20418</span>
          <CopyButton text="SHP-20418" tooltip="Скопировать номер отгрузки" />
          <CopyButton text="https://endfield.local/shipments/SHP-20418" label="Ссылка на отгрузку" />
        </div>
        <div className={s.row}>
          <CopyValue value="VAL-01" label="Скопировать код объекта" />
          <CopyValue value="ops@endfield.local" label="Скопировать почту" mono={false} />
          <CopyValue value="https://endfield.local/facilities/val-01" label="Скопировать ссылку" href="/facilities" hrefLabel="Открыть объект" size="sm">
            /facilities/val-01
          </CopyValue>
        </div>
        <CopyValue value="b6f1c0e2-4a7d-4f3e-9c21-7d0a5e9b3f18" label="Скопировать идентификатор" block />
      </div>
    </Card>
  )
}

function ProgressCard() {
  return (
    <Card title="Progress" description="Заполненность, выполнение плана, ход загрузки. value=null - неопределённый прогресс, когда объём заранее неизвестен. value больше max - перерасход: полоса во всю ширину тоном overTone, значение - реальное.">
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Progress value={68} label="План смены" showValue />
        <Progress value={92} tone="warning" label="Заполненность склада Хребет" showValue />
        <Progress value={3} max={4} tone="success" label="Чек-лист допуска" showValue={(v, max) => `${v} из ${max}`} />
        <Progress value={null} label="Синхронизация остатков" />
        <Progress value={40} size="sm" tone="danger" aria-label="Износ фильтра" />
        <Progress value={118} label="Расход реагента к лимиту месяца" showValue />
        <Progress value={13} max={12} tone="success" overTone="warning" label="Смен за месяц" showValue={(v, max) => `${v} из ${max}`} />
      </div>
    </Card>
  )
}

export function DataSection() {
  return (
    <div className={s.section}>
      <div className="ev-grid" style={{ '--ev-grid-min': '220px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile
          label="Позиций на складах"
          value={formatNum(4_318)}
          icon={<Boxes size={16} />}
          delta={4.2}
          deltaLabel="к прошлому месяцу"
          trend={<Sparkline width="auto" values={[3920, 3985, 4010, 4102, 4150, 4233, 4318]} aria-label="Позиции за 7 недель" />}
        />
        <StatTile label="Отгрузок в срок" value="96,4%" icon={<CircleCheck size={16} />} tone="success" delta={-1.1} deltaLabel="за неделю" />
        <StatTile label="Стоимость запасов" value={formatRub(1_284_500_000)} icon={<Wallet size={16} />} tone="violet" hint="По ценам последней закупки" />
        <StatTile label="Дефицитных позиций" value="37" icon={<PackageX size={16} />} tone="warning" delta={12} positiveIsGood={false} deltaLabel="за неделю" />
        <StatTile label="Пока загружается" value={null} loading tone="info" />
      </div>

      <TableCard />

      <div className={`${s.grid} ${s.gridWide}`}>
        <TimelineCard />
        <UptimeCard />
      </div>

      <div className={s.grid}>
        <Card title="KeyValueList" description="Карточка сущности: подпись слева, значение справа, подсказка под значением. Пустое значение - приглушённый дефис.">
          <KeyValueList
            items={[
              { key: 'n', label: 'Позиция', value: 'Фильтр гидравлический' },
              { key: 'sku', label: 'Артикул', value: 'SKU-40200', mono: true },
              { key: 'w', label: 'Склад', value: 'Долина-1', hint: 'Стеллаж B-14, ярус 3' },
              { key: 'p', label: 'Цена', value: formatRub(1_250_050) },
              { key: 's', label: 'Поставщик', value: null },
            ]}
          />
        </Card>
        <Card title="KeyValueList в колонках" description="columns={2} - для длинных карточек; labelWidth - ширина подписей.">
          <KeyValueList
            columns={2}
            labelWidth={110}
            items={[
              { key: 'id', label: 'Отгрузка', value: 'SHP-20418', mono: true },
              { key: 'st', label: 'Статус', value: <StatusPill tone="info">В пути</StatusPill> },
              { key: 'from', label: 'Откуда', value: 'Долина-1' },
              { key: 'to', label: 'Куда', value: 'Застава' },
              { key: 'eta', label: 'Прибытие', value: '09.10.2026', hint: 'Окно 10:00 - 14:00' },
              { key: 'w', label: 'Вес', value: '2 340 кг' },
            ]}
          />
        </Card>
        <Card title="Вложенные поверхности" description="Плитка, панель и таблица внутри карточки, окна или шторки - на --ev-surface-nested, без тени.">
          <div className="ev-stack">
            <StatTile label="Отгрузок за смену" value="42" icon={<Truck size={16} />} tone="info" />
            <Panel>
              <span className="ev-secondary">Panel внутри карточки</span>
            </Panel>
          </div>
        </Card>
      </div>

      <div className={s.grid}>
        <BadgesCard />
        <CopyCard />
        <ProgressCard />
      </div>

      <HelpersCard />
    </div>
  )
}
