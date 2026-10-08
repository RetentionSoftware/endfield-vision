'use client'

import {
  Button,
  Calendar,
  CopyValue,
  DataTable,
  DateField,
  DateRangePicker,
  DEFAULT_RANGE_PRESETS,
  Divider,
  Field,
  FileDrop,
  FilterBar,
  FormSection,
  KeyValueList,
  Modal,
  MultiSelect,
  normalizeSearch,
  NumberInput,
  Pagination,
  PasswordInput,
  Select,
  TimeInput,
  Timeline,
  UptimeBar,
  useLocale,
  useMessages,
  useModals,
  useNumberFormat,
  type Column,
  type DateRange,
  type Locale,
  type TimelineItem,
} from 'endfield-vision'
import { useMemo, useState, type CSSProperties } from 'react'
import { Subhead } from './parts'
import { uptimeDays } from './StatusCards'
import s from './vision.module.css'

/*
 * Тексты самого приложения (подписи полей, заголовки колонок) библиотека не
 * переводит: здесь они выбираются по useLocale(). Встроенные тексты
 * компонентов (плейсхолдеры, пагинация, пустые состояния) идут из словаря.
 */
const TEXT = {
  ru: {
    tableTitle: 'Таблица, фильтры и пагинация',
    search: 'Название позиции',
    warehouse: 'Склад',
    anyWarehouse: 'Все склады',
    colName: 'Позиция',
    colQty: 'Остаток',
    emptyTable: 'Пустая таблица',
    errorTable: 'Ошибка загрузки',
    fieldsTitle: 'Поля',
    date: 'Дата приёмки',
    period: 'Период отчёта',
    time: 'Начало смены',
    facility: 'Объект',
    facilityHint: 'Наберите «xyz» - пустой результат поиска.',
    roles: 'Роли',
    password: 'Пароль',
    qty: 'Количество',
    token: 'Ключ доступа',
    files: 'Акты приёмки',
    filesHint: 'PDF до 5 МБ',
    viewTitle: 'Календарь, лента и доступность',
    events: ['Смена открыта', 'Давление ниже нормы', 'Создана задача', 'Линия остановлена', 'Фильтр заменён', 'Линия запущена'],
    windowsTitle: 'Окна',
    confirm: 'useModals().confirm',
    confirmTitle: 'Закрыть смену?',
    confirmText: 'Кнопки окна подписаны языком корневого провайдера.',
    local: 'Свой Modal внутри',
    localTitle: 'Закрыть смену?',
    localText: 'Окно отрисовано внутри вложенного LocaleProvider: подписи кнопок взяты из useMessages().',
    pluralHint: 'Склонение по числу - внутри функции словаря',
  },
  en: {
    tableTitle: 'Table, filters and pagination',
    search: 'Item name',
    warehouse: 'Warehouse',
    anyWarehouse: 'All warehouses',
    colName: 'Item',
    colQty: 'In stock',
    emptyTable: 'Empty table',
    errorTable: 'Load error',
    fieldsTitle: 'Fields',
    date: 'Receiving date',
    period: 'Report period',
    time: 'Shift start',
    facility: 'Facility',
    facilityHint: 'Type "xyz" to see an empty search result.',
    roles: 'Roles',
    password: 'Password',
    qty: 'Quantity',
    token: 'Access key',
    files: 'Receiving reports',
    filesHint: 'PDF up to 5 MB',
    viewTitle: 'Calendar, timeline and uptime',
    events: ['Shift opened', 'Pressure below normal', 'Task created', 'Line stopped', 'Filter replaced', 'Line restarted'],
    windowsTitle: 'Dialogs',
    confirm: 'useModals().confirm',
    confirmTitle: 'Close the shift?',
    confirmText: 'Dialog buttons follow the root provider language.',
    local: 'Own Modal inside',
    localTitle: 'Close the shift?',
    localText: 'This dialog renders inside the nested LocaleProvider, so its buttons use useMessages().',
    pluralHint: 'Plural forms are handled by the dictionary function',
  },
} satisfies Record<Locale, Record<string, string | string[]>>

interface StockRow {
  id: string
  name: string
  warehouse: string
  qty: number
}

const NAMES = ['Filter H-12', 'Bearing 6205', 'Cable 3x2.5', 'Reagent R-12', 'Gloves PRO', 'Pressure sensor', 'Drive belt']
const WAREHOUSES = ['VAL-01', 'RDG-01', 'OUT-01']

const ROWS: StockRow[] = Array.from({ length: 23 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `${NAMES[i % NAMES.length]} #${i + 1}`,
  warehouse: WAREHOUSES[i % WAREHOUSES.length] ?? '',
  qty: ((i * 1373 + 211) % 9000) + 0.5 * (i % 2),
}))

const FACILITIES = [
  { value: 'val-01', label: 'VAL-01' },
  { value: 'val-02', label: 'VAL-02' },
  { value: 'rdg-01', label: 'RDG-01' },
  { value: 'out-01', label: 'OUT-01' },
]

const ROLES = [
  { value: 'op', label: 'Operator' },
  { value: 'eng', label: 'Engineer' },
  { value: 'lead', label: 'Lead' },
]

const UPTIME = uptimeDays(60, 3, 4).map(({ date, status }) => ({ date, status }))

const TONES: Array<TimelineItem['tone']> = ['success', 'warning', 'accent', 'danger', 'info', 'success']
const TIMES = ['08:00', '09:47', '09:52', '10:15', '11:02', '11:10']

function TableDemo({ L }: { L: (typeof TEXT)[Locale] }) {
  const fmt = useNumberFormat()
  const [q, setQ] = useState('')
  const [wh, setWh] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const rows = useMemo(() => {
    const needle = normalizeSearch(q)
    return ROWS.filter((r) => (!needle || normalizeSearch(r.name).includes(needle)) && (!wh || r.warehouse === wh))
  }, [q, wh])
  const columns: Column<StockRow>[] = [
    { key: 'name', header: L.colName, primary: true, cell: (r) => r.name },
    { key: 'warehouse', header: L.warehouse, cell: (r) => <span className="ev-mono">{r.warehouse}</span> },
    { key: 'qty', header: L.colQty, numeric: true, cell: (r) => fmt(r.qty, { maximumFractionDigits: 1 }) },
  ]
  const small = columns.slice(0, 2)
  return (
    <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-5)' } as CSSProperties}>
      <Subhead>{L.tableTitle}</Subhead>
      <FilterBar
        search={{
          value: q,
          onChange: (v) => {
            setQ(v)
            setPage(1)
          },
          placeholder: L.search,
        }}
        activeCount={wh ? 1 : 0}
        onReset={() => {
          setQ('')
          setWh(null)
          setPage(1)
        }}
      >
        <Select
          aria-label={L.warehouse}
          placeholder={L.anyWarehouse}
          value={wh}
          onChange={(v) => {
            setWh(v)
            setPage(1)
          }}
          clearable
          options={WAREHOUSES.map((w) => ({ value: w, label: w }))}
        />
      </FilterBar>
      <DataTable
        aria-label={L.tableTitle}
        columns={columns}
        rows={rows.slice((page - 1) * pageSize, page * pageSize)}
        rowKey={(r) => r.id}
        dense
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n)
              setPage(1)
            }}
            pageSizeOptions={[5, 10, 25]}
          />
        }
      />
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>{L.emptyTable}</Subhead>
          <DataTable aria-label={L.emptyTable} columns={small} rows={[]} rowKey={(r) => r.id} dense />
        </div>
        <div className="ev-stack">
          <Subhead>{L.errorTable}</Subhead>
          <DataTable aria-label={L.errorTable} columns={small} rows={[]} rowKey={(r) => r.id} error={{}} onRetry={() => undefined} dense />
        </div>
      </div>
    </div>
  )
}

function FieldsDemo({ L }: { L: (typeof TEXT)[Locale] }) {
  const [date, setDate] = useState('')
  const [range, setRange] = useState<DateRange | null>(null)
  const [time, setTime] = useState('')
  const [facility, setFacility] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [qty, setQty] = useState<number | null>(1250)
  const [files, setFiles] = useState<File[]>([])
  return (
    <div className="ev-stack">
      <Subhead>{L.fieldsTitle}</Subhead>
      <FormSection>
        <Field label={L.date}>
          <DateField value={date} onChange={setDate} />
        </Field>
        <Field label={L.period}>
          <DateRangePicker value={range} onChange={setRange} presets={DEFAULT_RANGE_PRESETS} clearable />
        </Field>
        <Field label={L.time}>
          <TimeInput value={time} onChange={setTime} />
        </Field>
        <Field label={L.facility} hint={L.facilityHint}>
          <Select value={facility} onChange={setFacility} options={FACILITIES} searchable clearable />
        </Field>
        <Field label={L.roles}>
          <MultiSelect value={roles} onChange={setRoles} options={ROLES} bulkActions />
        </Field>
        <Field label={L.password}>
          <PasswordInput defaultValue="shift-2026" autoComplete="off" />
        </Field>
        <Field label={L.qty}>
          <NumberInput value={qty} onChange={setQty} min={0} step={50} stepper decimals={1} />
        </Field>
        <Field label={L.token}>
          <CopyValue value="ev_demo_7d0a5e9b3f18" block />
        </Field>
      </FormSection>
      <Field label={L.files}>
        <FileDrop
          accept="application/pdf,.pdf"
          maxSize={5 * 1024 * 1024}
          hint={L.filesHint}
          files={files}
          onFiles={(list) => setFiles((prev) => [...prev, ...list])}
          onRemove={(f) => setFiles((list) => list.filter((x) => x !== f))}
        />
      </Field>
    </div>
  )
}

function ViewDemo({ L }: { L: (typeof TEXT)[Locale] }) {
  const [day, setDay] = useState('2026-10-08')
  const items: TimelineItem[] = L.events.map((title, i) => ({ id: `e${i}`, title, time: TIMES[i], tone: TONES[i] }))
  return (
    <div className="ev-stack">
      <Subhead>{L.viewTitle}</Subhead>
      <div className={s.cols}>
        <Calendar value={day} onPick={setDay} />
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
          <Timeline items={items} variant="compact" maxItems={3} />
          <UptimeBar days={UPTIME} height={24} showRange showLegend />
        </div>
      </div>
    </div>
  )
}

function WindowsDemo({ L }: { L: (typeof TEXT)[Locale] }) {
  const t = useMessages()
  const m = useModals()
  const [open, setOpen] = useState(false)
  return (
    <div className="ev-stack">
      <Subhead>{L.windowsTitle}</Subhead>
      <div className={s.row}>
        <Button onClick={() => void m.confirm({ title: L.confirmTitle, message: L.confirmText })}>{L.confirm}</Button>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {L.local}
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={L.localTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              {t.common.confirm}
            </Button>
          </>
        }
      >
        <span className="ev-secondary">{L.localText}</span>
      </Modal>
    </div>
  )
}

/** Демо-область: всё внутри читает язык из ближайшего LocaleProvider. */
export function I18nDemo() {
  const locale = useLocale()
  const t = useMessages()
  const fmt = useNumberFormat()
  const L = TEXT[locale]
  return (
    <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
      <KeyValueList
        labelWidth={260}
        items={[
          { key: 'locale', label: <code>useLocale()</code>, value: <code>{`'${locale}'`}</code> },
          { key: 'num', label: <code>useNumberFormat()(1234567.89)</code>, value: <span className="ev-num">{fmt(1234567.89)}</span>, hint: `Intl: ${t.intl}` },
          { key: 'range', label: <code>t.pagination.range(&apos;1&apos;, &apos;10&apos;, &apos;27&apos;)</code>, value: t.pagination.range('1', '10', '27') },
          { key: 'uptime', label: <code>t.uptime.label(91)</code>, value: t.uptime.label(91), hint: L.pluralHint },
        ]}
      />
      <Divider />
      <TableDemo L={L} />
      <Divider />
      <FieldsDemo L={L} />
      <Divider />
      <ViewDemo L={L} />
      <Divider />
      <WindowsDemo L={L} />
    </div>
  )
}
