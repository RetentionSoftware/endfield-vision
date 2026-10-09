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
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'
import { HelpersCard } from './HelpersCard'
import { Subhead } from './parts'
import { TimelineCard, UptimeCard } from './StatusCards'
import s from './vision.module.css'

type StockStatus = 'ok' | 'low' | 'out' | 'reserved'

interface StockItem {
  id: string
  sku: string
  name: string
  /** Ключ склада для фильтра: не зависит от языка. */
  warehouseId: string
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

const STOCK_STATUS: Record<StockStatus, { label: Bi; tone: Tone }> = {
  ok: { label: bi('В наличии', 'In stock'), tone: 'success' },
  low: { label: bi('Мало', 'Low'), tone: 'warning' },
  out: { label: bi('Нет на складе', 'Out of stock'), tone: 'danger' },
  reserved: { label: bi('В резерве', 'Reserved'), tone: 'info' },
}

const NAMES: Bi[] = [
  bi('Фильтр гидравлический', 'Hydraulic filter'),
  bi('Подшипник 6205', 'Bearing 6205'),
  bi('Кабель силовой 3x2,5', 'Power cable 3x2.5'),
  bi('Реагент Р-12', 'Reagent R-12'),
  bi('Перчатки защитные', 'Protective gloves'),
  bi('Датчик давления', 'Pressure sensor'),
  bi('Ремень приводной', 'Drive belt'),
  bi('Смазка литиевая', 'Lithium grease'),
  bi('Клапан обратный', 'Check valve'),
]
const WAREHOUSES: Array<{ id: string; name: Bi }> = [
  { id: 'val1', name: bi('Долина-1', 'Valley-1') },
  { id: 'ridge', name: bi('Хребет', 'Ridge') },
  { id: 'outpost', name: bi('Застава', 'Outpost') },
  { id: 'hub', name: bi('Логистический узел', 'Logistics hub') },
]
const PCS = bi('шт.', 'pcs')
const KG = bi('кг', 'kg')
const UNITS: Bi[] = [PCS, PCS, bi('м', 'm'), KG, bi('пар', 'pairs'), PCS, PCS, KG, PCS]
const KEEPERS: Bi[] = [
  bi('Глеб Сорокин', 'Gleb Sorokin'),
  bi('Ирина Лебедева', 'Irina Lebedeva'),
  bi('Тимур Рахимов', 'Timur Rakhimov'),
  bi('Анна Петрова', 'Anna Petrova'),
]

/** Детерминированные позиции склада: без Math.random, рендер на сервере и клиенте совпадает. */
function stockItems({ t, tx }: Translator): StockItem[] {
  return Array.from({ length: 27 }, (_, i) => {
    const qty = (i * 37 + 11) % 240
    const status: StockStatus = qty === 0 || i % 9 === 4 ? 'out' : i % 7 === 2 ? 'reserved' : qty < 40 ? 'low' : 'ok'
    const name = NAMES[i % NAMES.length]
    const wh = WAREHOUSES[i % WAREHOUSES.length]
    const keeper = KEEPERS[i % KEEPERS.length]
    const lot = Math.floor(i / NAMES.length) + 1
    return {
      id: `it${i + 1}`,
      sku: `SKU-${40200 + i * 17}`,
      name: `${name ? tx(name) : ''}${i >= NAMES.length ? ` (${t('партия', 'batch')} ${lot})` : ''}`,
      warehouseId: wh?.id ?? '',
      warehouse: wh ? tx(wh.name) : '',
      qty: status === 'out' ? 0 : qty,
      unit: tx(UNITS[i % UNITS.length] ?? PCS),
      price: 25_000 + ((i * 7919) % 900) * 1_150,
      status,
      keeper: keeper ? tx(keeper) : '',
    }
  })
}

function stockColumns({ t, tx, formatNum, formatRub }: Translator): Column<StockItem>[] {
  return [
    {
      key: 'name',
      header: t('Позиция', 'Item'),
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
    { key: 'warehouse', header: t('Склад', 'Warehouse'), sortable: true, hideOnMobile: true, cell: (r) => r.warehouse },
    {
      key: 'keeper',
      header: t('Ответственный', 'Owner'),
      hideOnMobile: true,
      cell: (r) => (
        <span className="ev-row" data-nowrap="">
          <Avatar name={r.keeper} size={24} />
          <span className="ev-truncate">{r.keeper}</span>
        </span>
      ),
    },
    { key: 'qty', header: t('Остаток', 'Stock'), numeric: true, sortable: true, cell: (r) => (r.qty ? `${formatNum(r.qty)} ${r.unit}` : null) },
    { key: 'price', header: t('Цена', 'Price'), numeric: true, sortable: true, cell: (r) => formatRub(r.price) },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      sortable: true,
      cell: (r) => <StatusPill tone={STOCK_STATUS[r.status].tone}>{tx(STOCK_STATUS[r.status].label)}</StatusPill>,
    },
  ]
}

function TableCard() {
  const tr = useT()
  const { t, tx, intl } = tr
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

  const stock = useMemo(() => stockItems(tr), [tr])
  const columns = useMemo(() => stockColumns(tr), [tr])

  const filtered = useMemo(() => {
    const needle = normalizeSearch(q)
    let rows = stock.filter(
      (r) =>
        (!needle || normalizeSearch(`${r.name} ${r.sku}`).includes(needle)) &&
        (!status || r.status === status) &&
        (!warehouse || r.warehouseId === warehouse),
    )
    if (sort) {
      const k = sort.key as keyof StockItem
      rows = [...rows].sort((a, b) => {
        const va = a[k]
        const vb = b[k]
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), intl)
        return sort.dir === 'asc' ? r : -r
      })
    }
    return rows
  }, [stock, intl, q, status, warehouse, sort])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <Card
      title={t('DataTable, FilterBar и Pagination', 'DataTable, FilterBar and Pagination')}
      description={t(
        'Список сущностей: поиск и фильтры над таблицей (слот toolbar карточки), сортировка, выбор строк, клик по строке, загрузка, ошибка и пустой результат. sortClearable={false} - третий клик по заголовку не снимает сортировку. На узком экране строки становятся карточками.',
        'An entity list: search and filters above the table (the card toolbar slot), sorting, row selection, row click, loading, error and empty states. With sortClearable={false}, a third click on a header keeps the sort instead of clearing it. On narrow screens, rows turn into cards.',
      )}
      flush
      toolbar={
        <div className="ev-stack">
          <FilterBar
            search={{ value: q, onChange: resetPage(setQ), placeholder: t('Название или артикул', 'Name or SKU') }}
            activeCount={(status ? 1 : 0) + (warehouse ? 1 : 0)}
            onReset={() => {
              setQ('')
              setStatus(null)
              setWarehouse(null)
              setPage(1)
            }}
            actions={
              <>
                <Switch size="sm" checked={loading} onChange={setLoading} label={t('Загрузка', 'Loading')} />
                <Switch size="sm" checked={failed} onChange={setFailed} label={t('Ошибка', 'Error')} />
                <Switch size="sm" checked={dense} onChange={setDense} label={t('Плотно', 'Dense')} />
                <Switch size="sm" checked={clearable} onChange={setClearable} label={t('Снимать сортировку', 'Clearable sort')} />
              </>
            }
          >
            <Select<StockStatus>
              aria-label={t('Статус', 'Status')}
              placeholder={t('Любой статус', 'Any status')}
              value={status}
              onChange={resetPage(setStatus)}
              clearable
              options={(Object.keys(STOCK_STATUS) as StockStatus[]).map((k) => ({ value: k, label: tx(STOCK_STATUS[k].label) }))}
            />
            <Select
              aria-label={t('Склад', 'Warehouse')}
              placeholder={t('Все склады', 'All warehouses')}
              value={warehouse}
              onChange={resetPage(setWarehouse)}
              clearable
              options={WAREHOUSES.map((w) => ({ value: w.id, label: tx(w.name) }))}
            />
          </FilterBar>
          {selected.length > 0 ? (
            <Callout
              tone="info"
              icon={false}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Truck size={14} />}
                    onClick={() =>
                      toast.success(t('Заявка на перемещение создана', 'Transfer request created'), {
                        description: `${t('Позиций', 'Items')}: ${selected.length}`,
                      })
                    }
                  >
                    {t('Переместить', 'Transfer')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                    {t('Снять выбор', 'Clear selection')}
                  </Button>
                </>
              }
            >
              {t('Выбрано позиций', 'Items selected')}: {selected.length}
            </Callout>
          ) : null}
        </div>
      }
    >
      <DataTable
        aria-label={t('Складские позиции', 'Stock items')}
        columns={columns}
        rows={loading ? undefined : pageRows}
        rowKey={(r) => r.id}
        loading={loading}
        error={failed ? { message: t('Сервер склада не ответил за 10 секунд.', 'The warehouse server did not respond within 10 seconds.') } : null}
        onRetry={() => setFailed(false)}
        sort={sort}
        onSortChange={setSort}
        sortClearable={clearable}
        selected={selected}
        onSelectedChange={setSelected}
        rowMuted={(r) => r.status === 'out'}
        onRowClick={(r) => toast.info(t('Открыть позицию', 'Open item'), { description: `${r.sku} - ${r.name}` })}
        empty={
          <EmptyState
            compact
            title={t('Позиции не найдены', 'No items found')}
            description={t('Измените условия поиска или сбросьте фильтры.', 'Adjust the search or reset the filters.')}
          />
        }
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
  const { t, tx } = useT()
  const tones: Array<{ tone: Tone; label: string }> = [
    { tone: 'neutral', label: t('Черновик', 'Draft') },
    { tone: 'accent', label: t('Новая', 'New') },
    { tone: 'success', label: t('Принята', 'Accepted') },
    { tone: 'warning', label: t('Ожидает', 'Pending') },
    { tone: 'danger', label: t('Брак', 'Defective') },
    { tone: 'info', label: t('В пути', 'In transit') },
    { tone: 'violet', label: t('Проект', 'Project') },
  ]
  const irina = tx(KEEPERS[1] ?? '')
  const timur = tx(KEEPERS[2] ?? '')
  return (
    <Card
      title={t('Badge, StatusPill и Avatar', 'Badge, StatusPill and Avatar')}
      description={t(
        'Badge - метка категории или счётчик; StatusPill - статус сущности: точка и подпись, цвет не единственный носитель смысла. Avatar - фото (src) или инициалы, тон по имени.',
        'Badge is a category label or a counter. StatusPill shows an entity status as a dot and a label, so color is never the only carrier of meaning. Avatar shows a photo (src) or initials, with a tone derived from the name.',
      )}
    >
      <div className="ev-stack">
        <Subhead>Badge</Subhead>
        <div className={s.row}>
          {tones.map((b) => (
            <Badge key={b.tone} tone={b.tone}>
              {b.label}
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
            {t('С точкой', 'With dot')}
          </Badge>
          <Badge tone="accent" icon={<Boxes size={12} />}>
            {t('С иконкой', 'With icon')}
          </Badge>
          <Badge size="sm">sm</Badge>
        </div>
        <Subhead>StatusPill</Subhead>
        <div className={s.row}>
          {(Object.keys(STOCK_STATUS) as StockStatus[]).map((k) => (
            <StatusPill key={k} tone={STOCK_STATUS[k].tone}>
              {tx(STOCK_STATUS[k].label)}
            </StatusPill>
          ))}
          <StatusPill>{t('Архив', 'Archived')}</StatusPill>
        </div>
        <Subhead>Avatar</Subhead>
        <div className={s.row}>
          {KEEPERS.map((k, i) => (
            <Avatar key={k.ru} name={tx(k)} size={24 + i * 6} />
          ))}
          <Avatar name="admin" tone="neutral" />
        </div>
        <div className={s.row}>
          <Avatar name={irina} src={PHOTO} alt={irina} size={40} />
          <Avatar name={timur} src={BROKEN_PHOTO} size={40} />
          <span className="ev-muted">
            {t(
              'src - фото; не загрузилось - инициалы. alt - подпись для скринридера, без неё аватар декоративный.',
              'src sets a photo; if it fails to load, initials are shown. alt is the screen reader label; without it the avatar is decorative.',
            )}
          </span>
        </div>
      </div>
    </Card>
  )
}

function CopyCard() {
  const { t } = useT()
  return (
    <Card
      title={t('CopyButton и CopyValue', 'CopyButton and CopyValue')}
      description={t(
        'Копирование кодов, ссылок и идентификаторов: галочка после копирования и тост «Скопировано». CopyValue - плашка-значение целиком кликабельна.',
        'Copy codes, links and IDs: a checkmark after copying and a "Copied" toast. CopyValue is a value chip that is clickable as a whole.',
      )}
    >
      <div className="ev-stack">
        <div className={s.row}>
          <span className="ev-mono">SHP-20418</span>
          <CopyButton text="SHP-20418" tooltip={t('Скопировать номер отгрузки', 'Copy shipment number')} />
          <CopyButton text="https://endfield.local/shipments/SHP-20418" label={t('Ссылка на отгрузку', 'Shipment link')} />
        </div>
        <div className={s.row}>
          <CopyValue value="VAL-01" label={t('Скопировать код объекта', 'Copy facility code')} />
          <CopyValue value="ops@endfield.local" label={t('Скопировать почту', 'Copy email')} mono={false} />
          <CopyValue
            value="https://endfield.local/facilities/val-01"
            label={t('Скопировать ссылку', 'Copy link')}
            href="/facilities"
            hrefLabel={t('Открыть объект', 'Open facility')}
            size="sm"
          >
            /facilities/val-01
          </CopyValue>
        </div>
        <CopyValue value="b6f1c0e2-4a7d-4f3e-9c21-7d0a5e9b3f18" label={t('Скопировать идентификатор', 'Copy ID')} block />
      </div>
    </Card>
  )
}

function ProgressCard() {
  const { t } = useT()
  const ofMax = (v: number, max: number) => `${v} ${t('из', 'of')} ${max}`
  return (
    <Card
      title="Progress"
      description={t(
        'Заполненность, выполнение плана, ход загрузки. value=null - неопределённый прогресс, когда объём заранее неизвестен. value больше max - перерасход: полоса во всю ширину тоном overTone, значение - реальное.',
        'Capacity, plan completion, upload progress. value=null renders indeterminate progress, for when the total is not known in advance. A value above max is an overrun: the bar fills the full width in the overTone color and the label shows the actual value.',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Progress value={68} label={t('План смены', 'Shift plan')} showValue />
        <Progress value={92} tone="warning" label={t('Заполненность склада Хребет', 'Ridge warehouse capacity')} showValue />
        <Progress value={3} max={4} tone="success" label={t('Чек-лист допуска', 'Clearance checklist')} showValue={ofMax} />
        <Progress value={null} label={t('Синхронизация остатков', 'Syncing stock')} />
        <Progress value={40} size="sm" tone="danger" aria-label={t('Износ фильтра', 'Filter wear')} />
        <Progress value={118} label={t('Расход реагента к лимиту месяца', 'Reagent use against the monthly limit')} showValue />
        <Progress value={13} max={12} tone="success" overTone="warning" label={t('Смен за месяц', 'Shifts this month')} showValue={ofMax} />
      </div>
    </Card>
  )
}

export function DataSection() {
  const { t, formatNum, formatRub } = useT()
  return (
    <div className={s.section}>
      <div className="ev-grid" style={{ '--ev-grid-min': '220px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile
          label={t('Позиций на складах', 'Items in stock')}
          value={formatNum(4_318)}
          icon={<Boxes size={16} />}
          delta={4.2}
          deltaLabel={t('к прошлому месяцу', 'vs last month')}
          trend={<Sparkline width="auto" values={[3920, 3985, 4010, 4102, 4150, 4233, 4318]} aria-label={t('Позиции за 7 недель', 'Items over 7 weeks')} />}
        />
        <StatTile label={t('Отгрузок в срок', 'On-time shipments')} value={t('96,4%', '96.4%')} icon={<CircleCheck size={16} />} tone="success" delta={-1.1} deltaLabel={t('за неделю', 'this week')} />
        <StatTile label={t('Стоимость запасов', 'Inventory value')} value={formatRub(1_284_500_000)} icon={<Wallet size={16} />} tone="violet" hint={t('По ценам последней закупки', 'At last purchase prices')} />
        <StatTile
          label={t('Дефицитных позиций', 'Items in shortage')}
          value="37"
          icon={<PackageX size={16} />}
          tone="warning"
          delta={12}
          positiveIsGood={false}
          deltaLabel={t('за неделю', 'this week')}
        />
        <StatTile label={t('Пока загружается', 'Still loading')} value={null} loading tone="info" />
      </div>

      <TableCard />

      <div className={`${s.grid} ${s.gridWide}`}>
        <TimelineCard />
        <UptimeCard />
      </div>

      <div className={s.grid}>
        <Card
          title="KeyValueList"
          description={t(
            'Карточка сущности: подпись слева, значение справа, подсказка под значением. Пустое значение - приглушённый дефис.',
            'Entity details: label on the left, value on the right, hint below the value. An empty value renders as a muted hyphen.',
          )}
        >
          <KeyValueList
            items={[
              { key: 'n', label: t('Позиция', 'Item'), value: t('Фильтр гидравлический', 'Hydraulic filter') },
              { key: 'sku', label: t('Артикул', 'SKU'), value: 'SKU-40200', mono: true },
              { key: 'w', label: t('Склад', 'Warehouse'), value: t('Долина-1', 'Valley-1'), hint: t('Стеллаж B-14, ярус 3', 'Rack B-14, tier 3') },
              { key: 'p', label: t('Цена', 'Price'), value: formatRub(1_250_050) },
              { key: 's', label: t('Поставщик', 'Supplier'), value: null },
            ]}
          />
        </Card>
        <Card
          title={t('KeyValueList в колонках', 'KeyValueList in columns')}
          description={t('columns={2} - для длинных карточек; labelWidth - ширина подписей.', 'columns={2} suits long detail cards; labelWidth sets the label column width.')}
        >
          <KeyValueList
            columns={2}
            labelWidth={110}
            items={[
              { key: 'id', label: t('Отгрузка', 'Shipment'), value: 'SHP-20418', mono: true },
              { key: 'st', label: t('Статус', 'Status'), value: <StatusPill tone="info">{t('В пути', 'In transit')}</StatusPill> },
              { key: 'from', label: t('Откуда', 'From'), value: t('Долина-1', 'Valley-1') },
              { key: 'to', label: t('Куда', 'To'), value: t('Застава', 'Outpost') },
              { key: 'eta', label: t('Прибытие', 'Arrival'), value: '09.10.2026', hint: t('Окно 10:00 - 14:00', 'Window 10:00 - 14:00') },
              { key: 'w', label: t('Вес', 'Weight'), value: t('2 340 кг', '2,340 kg') },
            ]}
          />
        </Card>
        <Card
          title={t('Вложенные поверхности', 'Nested surfaces')}
          description={t(
            'Плитка, панель и таблица внутри карточки, окна или шторки - на --ev-surface-nested, без тени.',
            'Tiles, panels and tables inside a card, modal or drawer sit on --ev-surface-nested, without a shadow.',
          )}
        >
          <div className="ev-stack">
            <StatTile label={t('Отгрузок за смену', 'Shipments this shift')} value="42" icon={<Truck size={16} />} tone="info" />
            <Panel>
              <span className="ev-secondary">{t('Panel внутри карточки', 'Panel inside a card')}</span>
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
