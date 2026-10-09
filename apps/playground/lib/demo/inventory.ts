/*
 * Демо-данные склада: номенклатура по складам, поставки, перемещения.
 * Деньги - в копейках. Детерминированные (без Math.random): серверный и
 * клиентский рендер совпадают.
 */

import { bi, type Bi } from '../lang'

export interface Warehouse {
  id: string
  code: string
  name: Bi
}

export const WAREHOUSES: Warehouse[] = [
  { id: 'w1', code: 'DLN', name: bi('Склад Долина', 'Valley warehouse') },
  { id: 'w2', code: 'PRT', name: bi('Терминал Порт Ясный', 'Clearwater Port terminal') },
  { id: 'w3', code: 'MIN', name: bi('Склад Рудник', 'Mine warehouse') },
  { id: 'w4', code: 'CNT', name: bi('Центральный склад', 'Central warehouse') },
]

export function warehouseName(id: string): Bi {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? bi(id, id)
}

export type Category = 'raw' | 'parts' | 'consumables' | 'fuel' | 'reagents' | 'ppe'

export const CATEGORIES: Record<Category, Bi> = {
  raw: bi('Сырьё', 'Raw materials'),
  parts: bi('Комплектующие', 'Components'),
  consumables: bi('Расходники', 'Consumables'),
  fuel: bi('Топливо и масла', 'Fuel and oils'),
  reagents: bi('Реагенты', 'Reagents'),
  ppe: bi('СИЗ', 'PPE'),
}

export type StockState = 'ok' | 'low' | 'out'

export const STOCK_STATE: Record<StockState, { label: Bi; tone: 'success' | 'warning' | 'danger' }> = {
  ok: { label: bi('В норме', 'OK'), tone: 'success' },
  low: { label: bi('Мало', 'Low'), tone: 'warning' },
  out: { label: bi('Нет', 'Out'), tone: 'danger' },
}

export interface StockItem {
  id: string
  sku: string
  name: Bi
  category: Category
  warehouse: string
  unit: Bi
  qty: number
  /** Ёмкость места хранения (максимальный остаток). */
  max: number
  /** Минимальный остаток: ниже - «Мало». */
  min: number
  /** Цена за единицу, копейки. */
  price: number
  /** Последнее движение, YYYY-MM-DD. */
  movedAt: string
}

/** Единицы учёта. */
const U = {
  t: bi('т', 't'),
  pcs: bi('шт.', 'pcs'),
  m: bi('м', 'm'),
  kg: bi('кг', 'kg'),
  l: bi('л', 'L'),
  pair: bi('пар', 'pairs'),
} satisfies Record<string, Bi>

type CatalogRow = [name: Bi, category: Category, unit: Bi, price: number, max: number]

const CATALOG: CatalogRow[] = [
  [bi('Сталь листовая 4 мм', 'Steel sheet 4 mm'), 'raw', U.t, 8_450_000, 120],
  [bi('Медь катодная', 'Copper cathode'), 'raw', U.t, 89_000_000, 20],
  [bi('Гранулят полипропилена', 'Polypropylene granules'), 'raw', U.t, 12_800_000, 60],
  [bi('Подшипник 6205-2RS', 'Bearing 6205-2RS'), 'parts', U.pcs, 42_000, 800],
  [bi('Лента конвейерная ЕР-400', 'Conveyor belt EP-400'), 'parts', U.m, 315_000, 400],
  [bi('Датчик давления ДД-16', 'Pressure sensor DD-16'), 'parts', U.pcs, 1_870_000, 60],
  [bi('Электродвигатель 7,5 кВт', 'Electric motor 7.5 kW'), 'parts', U.pcs, 6_450_000, 24],
  [bi('Фильтр воздушный ФВ-12', 'Air filter FV-12'), 'consumables', U.pcs, 128_000, 300],
  [bi('Электроды сварочные 3 мм', 'Welding electrodes 3 mm'), 'consumables', U.kg, 34_000, 500],
  [bi('Круг отрезной 230 мм', 'Cutting disc 230 mm'), 'consumables', U.pcs, 9_500, 1200],
  [bi('Топливо дизельное', 'Diesel fuel'), 'fuel', U.l, 6_400, 40_000],
  [bi('Масло гидравлическое HLP 46', 'Hydraulic oil HLP 46'), 'fuel', U.l, 21_500, 3000],
  [bi('Смазка литиевая', 'Lithium grease'), 'fuel', U.kg, 38_000, 400],
  [bi('Кислота серная техническая', 'Technical sulfuric acid'), 'reagents', U.kg, 2_100, 8000],
  [bi('Флокулянт ФЛ-9', 'Flocculant FL-9'), 'reagents', U.kg, 46_000, 1500],
  [bi('Каска защитная', 'Safety helmet'), 'ppe', U.pcs, 89_000, 200],
  [bi('Перчатки трикотажные', 'Knitted gloves'), 'ppe', U.pair, 4_500, 3000],
  [bi('Респиратор ФФП2', 'FFP2 respirator'), 'ppe', U.pcs, 16_000, 1000],
  [bi('Кабель ВВГнг 3х2,5', 'VVGng cable 3x2.5'), 'parts', U.m, 9_800, 5000],
  [bi('Известь негашёная', 'Quicklime'), 'reagents', U.t, 1_150_000, 80],
]

/** Название позиции каталога (поиск по английскому названию) - для перемещений. */
function catalogItem(en: string): Bi {
  return CATALOG.find((row) => row[0].en === en)?.[0] ?? bi(en, en)
}

const PREFIX: Record<Category, string> = { raw: 'RAW', parts: 'PRT', consumables: 'CNS', fuel: 'FUL', reagents: 'RGT', ppe: 'PPE' }

function buildStock(): StockItem[] {
  const out: StockItem[] = []
  CATALOG.forEach(([name, category, unit, price, max], i) => {
    const whs = [i % 4, (i + 2) % 4]
    if (i % 3 === 0) whs.push((i + 1) % 4)
    for (const w of whs) {
      const wh = WAREHOUSES[w]!
      const frac = ((i * 37 + w * 53) % 100) / 100
      const empty = (i * 7 + w * 3) % 13 === 0
      const qty = empty ? 0 : Math.max(1, Math.round(max * frac))
      out.push({
        id: `${wh.id}-${i + 1}`,
        sku: `${PREFIX[category]}-${String(1000 + i * 17).slice(-4)}-${wh.code}`,
        name,
        category,
        warehouse: wh.id,
        unit,
        qty,
        max,
        min: Math.round(max * 0.2),
        price,
        movedAt: `2026-${(i + w) % 3 === 0 ? '09' : '10'}-${String(((i * 5 + w * 7) % 27) + 1).padStart(2, '0')}`,
      })
    }
  })
  return out.sort((a, b) => a.name.ru.localeCompare(b.name.ru, 'ru') || a.warehouse.localeCompare(b.warehouse))
}

export const STOCK: StockItem[] = buildStock()

export function stockState(it: Pick<StockItem, 'qty' | 'min'>): StockState {
  return it.qty === 0 ? 'out' : it.qty < it.min ? 'low' : 'ok'
}

export const ADJUST_REASONS = [
  { value: 'count', label: bi('Инвентаризация', 'Stock count') },
  { value: 'damage', label: bi('Порча, брак', 'Damage, defects') },
  { value: 'loss', label: bi('Недостача', 'Shortage') },
  { value: 'surplus', label: bi('Излишек', 'Surplus') },
  { value: 'error', label: bi('Ошибка учёта', 'Recording error') },
] as const

/* ------------------------------------------------------------------ */
/* Поставки                                                            */
/* ------------------------------------------------------------------ */

export type ShipmentStatus = 'planned' | 'transit' | 'delayed' | 'arrived' | 'accepted' | 'rejected'

export const SHIPMENT_STATUS: Record<ShipmentStatus, { label: Bi; tone: 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger' }> = {
  planned: { label: bi('Запланирована', 'Planned'), tone: 'neutral' },
  transit: { label: bi('В пути', 'In transit'), tone: 'info' },
  delayed: { label: bi('Задерживается', 'Delayed'), tone: 'warning' },
  arrived: { label: bi('Прибыла', 'Arrived'), tone: 'accent' },
  accepted: { label: bi('Принята', 'Accepted'), tone: 'success' },
  rejected: { label: bi('Отклонена', 'Rejected'), tone: 'danger' },
}

export interface Shipment {
  id: string
  supplier: Bi
  warehouse: string
  status: ShipmentStatus
  /** Дата заказа, YYYY-MM-DD. */
  orderedAt: string
  /** Ожидаемая дата прибытия, YYYY-MM-DD. */
  eta: string
  positions: number
  /** Сумма, копейки. */
  value: number
  carrier: Bi
  /** Масса брутто, кг. */
  weight: number
  note?: Bi
}

const SUP = {
  metal: bi('Северный металл', 'Northern Metal'),
  bearings: bi('Промподшипник', 'Industrial Bearings'),
  chem: bi('Химреагент-Восток', 'ChemReagent East'),
  oil: bi('Нефтесервис', 'Oil Service'),
  ppe: bi('СИЗ-Комплект', 'PPE Supply'),
  drive: bi('Электропривод', 'Electric Drive'),
  cable: bi('Кабельный завод', 'Cable Works'),
  polymer: bi('Полимер-Трейд', 'Polymer Trade'),
  abrasive: bi('Абразив-Урал', 'Abrasive Ural'),
} satisfies Record<string, Bi>

const CAR = {
  magistral: bi('ТК Магистраль', 'Magistral Logistics'),
  delovye: bi('Деловые линии', 'Delovye Linii'),
  own: bi('Собственный транспорт', 'Own fleet'),
  rail: bi('ЖД-Экспедиция', 'Rail Expedition'),
  sea: bi('Морская линия', 'Sea Line'),
} satisfies Record<string, Bi>

export const SHIPMENTS: Shipment[] = [
  { id: 'SH-4831', supplier: SUP.metal, warehouse: 'w1', status: 'transit', orderedAt: '2026-09-29', eta: '2026-10-10', positions: 4, value: 186_400_000, carrier: CAR.magistral, weight: 24_600 },
  { id: 'SH-4829', supplier: SUP.bearings, warehouse: 'w4', status: 'arrived', orderedAt: '2026-09-26', eta: '2026-10-08', positions: 12, value: 14_250_000, carrier: CAR.delovye, weight: 820 },
  { id: 'SH-4826', supplier: SUP.chem, warehouse: 'w3', status: 'delayed', orderedAt: '2026-09-22', eta: '2026-10-06', positions: 3, value: 32_700_000, carrier: CAR.magistral, weight: 9_400, note: bi('Задержка на перевале: закрыт участок трассы, новое окно - 11.10.', 'Held up at the mountain pass: a highway section is closed, new window - 11.10.') },
  { id: 'SH-4824', supplier: SUP.oil, warehouse: 'w2', status: 'accepted', orderedAt: '2026-09-20', eta: '2026-10-03', positions: 2, value: 27_840_000, carrier: CAR.own, weight: 31_000 },
  { id: 'SH-4822', supplier: SUP.ppe, warehouse: 'w4', status: 'accepted', orderedAt: '2026-09-18', eta: '2026-10-01', positions: 9, value: 6_120_000, carrier: CAR.delovye, weight: 640 },
  { id: 'SH-4819', supplier: SUP.drive, warehouse: 'w1', status: 'planned', orderedAt: '2026-10-05', eta: '2026-10-17', positions: 2, value: 51_600_000, carrier: CAR.magistral, weight: 1_180 },
  { id: 'SH-4817', supplier: SUP.cable, warehouse: 'w3', status: 'transit', orderedAt: '2026-09-30', eta: '2026-10-12', positions: 5, value: 19_880_000, carrier: CAR.rail, weight: 6_300 },
  { id: 'SH-4815', supplier: SUP.polymer, warehouse: 'w2', status: 'rejected', orderedAt: '2026-09-15', eta: '2026-09-29', positions: 1, value: 38_400_000, carrier: CAR.sea, weight: 30_000, note: bi('Несоответствие сертификату качества: партия возвращена поставщику.', 'Does not match the quality certificate: the batch was returned to the supplier.') },
  { id: 'SH-4812', supplier: SUP.metal, warehouse: 'w2', status: 'accepted', orderedAt: '2026-09-10', eta: '2026-09-24', positions: 3, value: 121_900_000, carrier: CAR.sea, weight: 18_200 },
  { id: 'SH-4810', supplier: SUP.bearings, warehouse: 'w3', status: 'accepted', orderedAt: '2026-09-08', eta: '2026-09-19', positions: 7, value: 8_960_000, carrier: CAR.delovye, weight: 410 },
  { id: 'SH-4808', supplier: SUP.abrasive, warehouse: 'w1', status: 'planned', orderedAt: '2026-10-07', eta: '2026-10-21', positions: 6, value: 4_380_000, carrier: CAR.magistral, weight: 1_250 },
  { id: 'SH-4805', supplier: SUP.chem, warehouse: 'w4', status: 'transit', orderedAt: '2026-10-01', eta: '2026-10-09', positions: 2, value: 11_200_000, carrier: CAR.rail, weight: 12_000 },
]

export interface TimelineStep {
  id: string
  label: Bi
  /** ДД.ММ или пусто, если шаг впереди. */
  at: string
  state: 'done' | 'current' | 'pending' | 'problem'
}

function ddmm(iso: string, shiftDays = 0): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + shiftDays))
  return `${String(dt.getUTCDate()).padStart(2, '0')}.${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
}

const STEPS: Bi[] = [
  bi('Заказ размещён', 'Order placed'),
  bi('Подтверждён поставщиком', 'Confirmed by supplier'),
  bi('Отгружен', 'Shipped'),
  bi('В пути', 'In transit'),
  bi('Прибыл на склад', 'Arrived at warehouse'),
  bi('Принят на учёт', 'Received into stock'),
]

/** Ход поставки по шагам - для шторки деталей. */
export function shipmentTimeline(sh: Shipment): TimelineStep[] {
  const reached: Record<ShipmentStatus, number> = { planned: 1, transit: 3, delayed: 3, arrived: 4, accepted: 5, rejected: 4 }
  const last = reached[sh.status]
  const dates = [ddmm(sh.orderedAt), ddmm(sh.orderedAt, 1), ddmm(sh.orderedAt, 3), ddmm(sh.orderedAt, 4), ddmm(sh.eta), ddmm(sh.eta)]
  return STEPS.map((label, i) => {
    let state: TimelineStep['state'] = i < last ? 'done' : i === last ? 'current' : 'pending'
    if (i === last && (sh.status === 'delayed' || sh.status === 'rejected')) state = 'problem'
    if (sh.status === 'accepted' && i === last) state = 'done'
    const text = i === 5 && sh.status === 'rejected' ? bi('Отклонён при приёмке', 'Rejected at receiving') : label
    return { id: `s${i}`, label: text, at: state === 'pending' ? '' : (dates[i] ?? ''), state }
  })
}

/* ------------------------------------------------------------------ */
/* Перемещения                                                         */
/* ------------------------------------------------------------------ */

export const MOVE_DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 25 + i))
  const label = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
  const k = weekend ? 0.4 : 1
  return {
    label,
    w1: Math.round((42 + ((i * 13) % 17)) * k),
    w2: Math.round((58 + ((i * 7) % 23)) * k),
    w3: Math.round((24 + ((i * 11) % 15)) * k),
    w4: Math.round((36 + ((i * 5) % 19)) * k),
  }
})

export type TransferStatus = 'planned' | 'transit' | 'done' | 'cancelled'

export const TRANSFER_STATUS: Record<TransferStatus, { label: Bi; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  planned: { label: bi('Запланировано', 'Planned'), tone: 'neutral' },
  transit: { label: bi('В пути', 'In transit'), tone: 'info' },
  done: { label: bi('Выполнено', 'Completed'), tone: 'success' },
  cancelled: { label: bi('Отменено', 'Cancelled'), tone: 'danger' },
}

export interface Transfer {
  id: string
  from: string
  to: string
  item: Bi
  qty: number
  unit: Bi
  /** YYYY-MM-DD */
  date: string
  status: TransferStatus
  author: Bi
}

const PEOPLE = {
  kotova: bi('Мария Котова', 'Maria Kotova'),
  sorokin: bi('Глеб Сорокин', 'Gleb Sorokin'),
  lebedeva: bi('Ирина Лебедева', 'Irina Lebedeva'),
  ershov: bi('Святослав Ершов', 'Svyatoslav Ershov'),
  vorontsova: bi('Алина Воронцова', 'Alina Vorontsova'),
} satisfies Record<string, Bi>

export const TRANSFERS: Transfer[] = [
  { id: 'TR-2210', from: 'w4', to: 'w3', item: catalogItem('Flocculant FL-9'), qty: 400, unit: U.kg, date: '2026-10-09', status: 'planned', author: PEOPLE.kotova },
  { id: 'TR-2209', from: 'w2', to: 'w1', item: catalogItem('Diesel fuel'), qty: 6000, unit: U.l, date: '2026-10-08', status: 'transit', author: PEOPLE.sorokin },
  { id: 'TR-2208', from: 'w4', to: 'w1', item: catalogItem('Bearing 6205-2RS'), qty: 120, unit: U.pcs, date: '2026-10-08', status: 'transit', author: PEOPLE.lebedeva },
  { id: 'TR-2207', from: 'w1', to: 'w3', item: catalogItem('Welding electrodes 3 mm'), qty: 80, unit: U.kg, date: '2026-10-07', status: 'done', author: PEOPLE.ershov },
  { id: 'TR-2206', from: 'w2', to: 'w4', item: catalogItem('Steel sheet 4 mm'), qty: 18, unit: U.t, date: '2026-10-06', status: 'done', author: PEOPLE.kotova },
  { id: 'TR-2205', from: 'w3', to: 'w2', item: catalogItem('Quicklime'), qty: 12, unit: U.t, date: '2026-10-05', status: 'cancelled', author: PEOPLE.ershov },
  { id: 'TR-2204', from: 'w4', to: 'w2', item: catalogItem('FFP2 respirator'), qty: 250, unit: U.pcs, date: '2026-10-03', status: 'done', author: PEOPLE.vorontsova },
  { id: 'TR-2203', from: 'w1', to: 'w4', item: catalogItem('Pressure sensor DD-16'), qty: 8, unit: U.pcs, date: '2026-10-02', status: 'done', author: PEOPLE.sorokin },
  { id: 'TR-2202', from: 'w2', to: 'w3', item: catalogItem('Hydraulic oil HLP 46'), qty: 600, unit: U.l, date: '2026-10-11', status: 'planned', author: PEOPLE.lebedeva },
]
