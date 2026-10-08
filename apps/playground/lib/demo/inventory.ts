/*
 * Демо-данные склада: номенклатура по складам, поставки, перемещения.
 * Деньги - в копейках. Детерминированные (без Math.random): серверный и
 * клиентский рендер совпадают.
 */

export interface Warehouse {
  id: string
  code: string
  name: string
}

export const WAREHOUSES: Warehouse[] = [
  { id: 'w1', code: 'DLN', name: 'Склад Долина' },
  { id: 'w2', code: 'PRT', name: 'Терминал Порт Ясный' },
  { id: 'w3', code: 'MIN', name: 'Склад Рудник' },
  { id: 'w4', code: 'CNT', name: 'Центральный склад' },
]

export function warehouseName(id: string): string {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? id
}

export type Category = 'raw' | 'parts' | 'consumables' | 'fuel' | 'reagents' | 'ppe'

export const CATEGORIES: Record<Category, string> = {
  raw: 'Сырьё',
  parts: 'Комплектующие',
  consumables: 'Расходники',
  fuel: 'Топливо и масла',
  reagents: 'Реагенты',
  ppe: 'СИЗ',
}

export type StockState = 'ok' | 'low' | 'out'

export const STOCK_STATE: Record<StockState, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ok: { label: 'В норме', tone: 'success' },
  low: { label: 'Мало', tone: 'warning' },
  out: { label: 'Нет', tone: 'danger' },
}

export interface StockItem {
  id: string
  sku: string
  name: string
  category: Category
  warehouse: string
  unit: string
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

type CatalogRow = [name: string, category: Category, unit: string, price: number, max: number]

const CATALOG: CatalogRow[] = [
  ['Сталь листовая 4 мм', 'raw', 'т', 8_450_000, 120],
  ['Медь катодная', 'raw', 'т', 89_000_000, 20],
  ['Гранулят полипропилена', 'raw', 'т', 12_800_000, 60],
  ['Подшипник 6205-2RS', 'parts', 'шт.', 42_000, 800],
  ['Лента конвейерная ЕР-400', 'parts', 'м', 315_000, 400],
  ['Датчик давления ДД-16', 'parts', 'шт.', 1_870_000, 60],
  ['Электродвигатель 7,5 кВт', 'parts', 'шт.', 6_450_000, 24],
  ['Фильтр воздушный ФВ-12', 'consumables', 'шт.', 128_000, 300],
  ['Электроды сварочные 3 мм', 'consumables', 'кг', 34_000, 500],
  ['Круг отрезной 230 мм', 'consumables', 'шт.', 9_500, 1200],
  ['Топливо дизельное', 'fuel', 'л', 6_400, 40_000],
  ['Масло гидравлическое HLP 46', 'fuel', 'л', 21_500, 3000],
  ['Смазка литиевая', 'fuel', 'кг', 38_000, 400],
  ['Кислота серная техническая', 'reagents', 'кг', 2_100, 8000],
  ['Флокулянт ФЛ-9', 'reagents', 'кг', 46_000, 1500],
  ['Каска защитная', 'ppe', 'шт.', 89_000, 200],
  ['Перчатки трикотажные', 'ppe', 'пар', 4_500, 3000],
  ['Респиратор ФФП2', 'ppe', 'шт.', 16_000, 1000],
  ['Кабель ВВГнг 3х2,5', 'parts', 'м', 9_800, 5000],
  ['Известь негашёная', 'reagents', 'т', 1_150_000, 80],
]

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
  return out.sort((a, b) => a.name.localeCompare(b.name, 'ru') || a.warehouse.localeCompare(b.warehouse))
}

export const STOCK: StockItem[] = buildStock()

export function stockState(it: Pick<StockItem, 'qty' | 'min'>): StockState {
  return it.qty === 0 ? 'out' : it.qty < it.min ? 'low' : 'ok'
}

export const ADJUST_REASONS = [
  { value: 'count', label: 'Инвентаризация' },
  { value: 'damage', label: 'Порча, брак' },
  { value: 'loss', label: 'Недостача' },
  { value: 'surplus', label: 'Излишек' },
  { value: 'error', label: 'Ошибка учёта' },
] as const

/* ------------------------------------------------------------------ */
/* Поставки                                                            */
/* ------------------------------------------------------------------ */

export type ShipmentStatus = 'planned' | 'transit' | 'delayed' | 'arrived' | 'accepted' | 'rejected'

export const SHIPMENT_STATUS: Record<ShipmentStatus, { label: string; tone: 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger' }> = {
  planned: { label: 'Запланирована', tone: 'neutral' },
  transit: { label: 'В пути', tone: 'info' },
  delayed: { label: 'Задерживается', tone: 'warning' },
  arrived: { label: 'Прибыла', tone: 'accent' },
  accepted: { label: 'Принята', tone: 'success' },
  rejected: { label: 'Отклонена', tone: 'danger' },
}

export interface Shipment {
  id: string
  supplier: string
  warehouse: string
  status: ShipmentStatus
  /** Дата заказа, YYYY-MM-DD. */
  orderedAt: string
  /** Ожидаемая дата прибытия, YYYY-MM-DD. */
  eta: string
  positions: number
  /** Сумма, копейки. */
  value: number
  carrier: string
  /** Масса брутто, кг. */
  weight: number
  note?: string
}

export const SHIPMENTS: Shipment[] = [
  { id: 'SH-4831', supplier: 'Северный металл', warehouse: 'w1', status: 'transit', orderedAt: '2026-09-29', eta: '2026-10-10', positions: 4, value: 186_400_000, carrier: 'ТК Магистраль', weight: 24_600 },
  { id: 'SH-4829', supplier: 'Промподшипник', warehouse: 'w4', status: 'arrived', orderedAt: '2026-09-26', eta: '2026-10-08', positions: 12, value: 14_250_000, carrier: 'Деловые линии', weight: 820 },
  { id: 'SH-4826', supplier: 'Химреагент-Восток', warehouse: 'w3', status: 'delayed', orderedAt: '2026-09-22', eta: '2026-10-06', positions: 3, value: 32_700_000, carrier: 'ТК Магистраль', weight: 9_400, note: 'Задержка на перевале: закрыт участок трассы, новое окно - 11.10.' },
  { id: 'SH-4824', supplier: 'Нефтесервис', warehouse: 'w2', status: 'accepted', orderedAt: '2026-09-20', eta: '2026-10-03', positions: 2, value: 27_840_000, carrier: 'Собственный транспорт', weight: 31_000 },
  { id: 'SH-4822', supplier: 'СИЗ-Комплект', warehouse: 'w4', status: 'accepted', orderedAt: '2026-09-18', eta: '2026-10-01', positions: 9, value: 6_120_000, carrier: 'Деловые линии', weight: 640 },
  { id: 'SH-4819', supplier: 'Электропривод', warehouse: 'w1', status: 'planned', orderedAt: '2026-10-05', eta: '2026-10-17', positions: 2, value: 51_600_000, carrier: 'ТК Магистраль', weight: 1_180 },
  { id: 'SH-4817', supplier: 'Кабельный завод', warehouse: 'w3', status: 'transit', orderedAt: '2026-09-30', eta: '2026-10-12', positions: 5, value: 19_880_000, carrier: 'ЖД-Экспедиция', weight: 6_300 },
  { id: 'SH-4815', supplier: 'Полимер-Трейд', warehouse: 'w2', status: 'rejected', orderedAt: '2026-09-15', eta: '2026-09-29', positions: 1, value: 38_400_000, carrier: 'Морская линия', weight: 30_000, note: 'Несоответствие сертификату качества: партия возвращена поставщику.' },
  { id: 'SH-4812', supplier: 'Северный металл', warehouse: 'w2', status: 'accepted', orderedAt: '2026-09-10', eta: '2026-09-24', positions: 3, value: 121_900_000, carrier: 'Морская линия', weight: 18_200 },
  { id: 'SH-4810', supplier: 'Промподшипник', warehouse: 'w3', status: 'accepted', orderedAt: '2026-09-08', eta: '2026-09-19', positions: 7, value: 8_960_000, carrier: 'Деловые линии', weight: 410 },
  { id: 'SH-4808', supplier: 'Абразив-Урал', warehouse: 'w1', status: 'planned', orderedAt: '2026-10-07', eta: '2026-10-21', positions: 6, value: 4_380_000, carrier: 'ТК Магистраль', weight: 1_250 },
  { id: 'SH-4805', supplier: 'Химреагент-Восток', warehouse: 'w4', status: 'transit', orderedAt: '2026-10-01', eta: '2026-10-09', positions: 2, value: 11_200_000, carrier: 'ЖД-Экспедиция', weight: 12_000 },
]

export interface TimelineStep {
  id: string
  label: string
  /** ДД.ММ или пусто, если шаг впереди. */
  at: string
  state: 'done' | 'current' | 'pending' | 'problem'
}

function ddmm(iso: string, shiftDays = 0): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + shiftDays))
  return `${String(dt.getUTCDate()).padStart(2, '0')}.${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
}

const STEPS = ['Заказ размещён', 'Подтверждён поставщиком', 'Отгружен', 'В пути', 'Прибыл на склад', 'Принят на учёт'] as const

/** Ход поставки по шагам - для шторки деталей. */
export function shipmentTimeline(sh: Shipment): TimelineStep[] {
  const reached: Record<ShipmentStatus, number> = { planned: 1, transit: 3, delayed: 3, arrived: 4, accepted: 5, rejected: 4 }
  const last = reached[sh.status]
  const dates = [ddmm(sh.orderedAt), ddmm(sh.orderedAt, 1), ddmm(sh.orderedAt, 3), ddmm(sh.orderedAt, 4), ddmm(sh.eta), ddmm(sh.eta)]
  return STEPS.map((label, i) => {
    let state: TimelineStep['state'] = i < last ? 'done' : i === last ? 'current' : 'pending'
    if (i === last && (sh.status === 'delayed' || sh.status === 'rejected')) state = 'problem'
    if (sh.status === 'accepted' && i === last) state = 'done'
    const text = i === 5 && sh.status === 'rejected' ? 'Отклонён при приёмке' : label
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

export const TRANSFER_STATUS: Record<TransferStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  planned: { label: 'Запланировано', tone: 'neutral' },
  transit: { label: 'В пути', tone: 'info' },
  done: { label: 'Выполнено', tone: 'success' },
  cancelled: { label: 'Отменено', tone: 'danger' },
}

export interface Transfer {
  id: string
  from: string
  to: string
  item: string
  qty: number
  unit: string
  /** YYYY-MM-DD */
  date: string
  status: TransferStatus
  author: string
}

export const TRANSFERS: Transfer[] = [
  { id: 'TR-2210', from: 'w4', to: 'w3', item: 'Флокулянт ФЛ-9', qty: 400, unit: 'кг', date: '2026-10-09', status: 'planned', author: 'Мария Котова' },
  { id: 'TR-2209', from: 'w2', to: 'w1', item: 'Топливо дизельное', qty: 6000, unit: 'л', date: '2026-10-08', status: 'transit', author: 'Глеб Сорокин' },
  { id: 'TR-2208', from: 'w4', to: 'w1', item: 'Подшипник 6205-2RS', qty: 120, unit: 'шт.', date: '2026-10-08', status: 'transit', author: 'Ирина Лебедева' },
  { id: 'TR-2207', from: 'w1', to: 'w3', item: 'Электроды сварочные 3 мм', qty: 80, unit: 'кг', date: '2026-10-07', status: 'done', author: 'Святослав Ершов' },
  { id: 'TR-2206', from: 'w2', to: 'w4', item: 'Сталь листовая 4 мм', qty: 18, unit: 'т', date: '2026-10-06', status: 'done', author: 'Мария Котова' },
  { id: 'TR-2205', from: 'w3', to: 'w2', item: 'Известь негашёная', qty: 12, unit: 'т', date: '2026-10-05', status: 'cancelled', author: 'Святослав Ершов' },
  { id: 'TR-2204', from: 'w4', to: 'w2', item: 'Респиратор ФФП2', qty: 250, unit: 'шт.', date: '2026-10-03', status: 'done', author: 'Алина Воронцова' },
  { id: 'TR-2203', from: 'w1', to: 'w4', item: 'Датчик давления ДД-16', qty: 8, unit: 'шт.', date: '2026-10-02', status: 'done', author: 'Глеб Сорокин' },
  { id: 'TR-2202', from: 'w2', to: 'w3', item: 'Масло гидравлическое HLP 46', qty: 600, unit: 'л', date: '2026-10-11', status: 'planned', author: 'Ирина Лебедева' },
]
