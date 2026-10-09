'use client'

import {
  addDaysIso,
  allIntegerValues,
  Card,
  cx,
  DataTable,
  dateToIso,
  EMPTY_VALUE,
  findTypeaheadMatch,
  formatIsoDate,
  formatPhone,
  formatPhoneNational,
  formatSnils,
  formatTimeDigits,
  hexInputState,
  initials,
  isCompletePhone,
  isHexColor,
  isLightHex,
  isValidTime,
  joinPhone,
  nextSort,
  niceScale,
  normalizeHexColor,
  normalizePlate,
  normalizeSearch,
  parseIso,
  parseTime,
  PHONE_COUNTRIES,
  phoneFieldValue,
  PLATE_RE,
  scaleTicks,
  splitPhone,
  timeDigitsToValue,
  timeToDigits,
  toIso,
  type Column,
} from 'endfield-vision'
import { useMemo } from 'react'
import { useT, type Translator } from '@/lib/i18n'

interface HelperRow {
  call: string
  result: string
  group: string
}

const show = (v: unknown): string => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v))

/**
 * Все вызовы - на фиксированных входах: результат одинаков на сервере и клиенте.
 * Примеры с ё/е и госномером остаются русскими на обоих языках: функции именно об этом.
 */
function helperRows({ t }: Translator): HelperRow[] {
  const CLS = t('Классы и пустые значения', 'Classes and empty values')
  const PHONE = t('Телефон', 'Phone')
  const DOCS = t('Документы и номера', 'Documents and plates')
  const DATES = t('Даты', 'Dates')
  const TIME = t('Время', 'Time')
  const TABLES = t('Таблицы и меню', 'Tables and menus')
  const COLOR = t('Цвет', 'Color')
  const CHARTS = t('Графики', 'Charts')
  const person = t('Глеб Сорокин', 'Gleb Sorokin')
  const places = [t('Долина', 'Valley'), t('Застава', 'Outpost'), t('Лаборатория', 'Lab'), t('Логистика', 'Logistics')]
  const letter = t('л', 'l')
  const list = (xs: string[]) => `[${xs.map((x) => `'${x}'`).join(', ')}]`
  return [
    { group: CLS, call: "cx('ev-btn', false, 'is-active')", result: show(cx('ev-btn', false, 'is-active')) },
    { group: CLS, call: 'EMPTY_VALUE', result: show(EMPTY_VALUE) },
    { group: CLS, call: "normalizeSearch('  Ёмкость ')", result: show(normalizeSearch('  Ёмкость ')) },
    { group: CLS, call: `initials('${person}')`, result: show(initials(person)) },
    { group: PHONE, call: "formatPhone('+79001234567')", result: show(formatPhone('+79001234567')) },
    { group: PHONE, call: "formatPhoneNational('UZ', '901234567')", result: show(formatPhoneNational('UZ', '901234567')) },
    { group: PHONE, call: "splitPhone('+992901234567')", result: show(splitPhone('+992901234567')) },
    { group: PHONE, call: "joinPhone('RU', '9001234567')", result: show(joinPhone('RU', '9001234567')) },
    { group: PHONE, call: "phoneFieldValue('RU', '900')", result: show(phoneFieldValue('RU', '900')) },
    { group: PHONE, call: "isCompletePhone('+7900')", result: show(isCompletePhone('+7900')) },
    { group: PHONE, call: 'Object.keys(PHONE_COUNTRIES)', result: show(Object.keys(PHONE_COUNTRIES)) },
    { group: DOCS, call: "formatSnils('11223344595')", result: show(formatSnils('11223344595')) },
    { group: DOCS, call: "normalizePlate('a 123 bc 77')", result: show(normalizePlate('a 123 bc 77')) },
    { group: DOCS, call: "PLATE_RE.test('А123ВС777')", result: show(PLATE_RE.test('А123ВС777')) },
    { group: DATES, call: "formatIsoDate('2026-10-08')", result: show(formatIsoDate('2026-10-08')) },
    { group: DATES, call: "addDaysIso('2026-10-08', -29)", result: show(addDaysIso('2026-10-08', -29)) },
    { group: DATES, call: "parseIso('2026-10-08')", result: show(parseIso('2026-10-08')) },
    { group: DATES, call: 'toIso(2026, 9, 8)', result: show(toIso(2026, 9, 8)) },
    { group: DATES, call: 'dateToIso(new Date(2026, 9, 8))', result: show(dateToIso(new Date(2026, 9, 8))) },
    { group: TIME, call: "parseTime('08:30')", result: show(parseTime('08:30')) },
    { group: TIME, call: "isValidTime('24:00')", result: show(isValidTime('24:00')) },
    { group: TIME, call: "formatTimeDigits('083')", result: show(formatTimeDigits('083')) },
    { group: TIME, call: "timeDigitsToValue('2215')", result: show(timeDigitsToValue('2215')) },
    { group: TIME, call: "timeToDigits('07:05')", result: show(timeToDigits('07:05')) },
    { group: TABLES, call: "nextSort(null, 'qty')", result: show(nextSort(null, 'qty')) },
    { group: TABLES, call: "nextSort({ key: 'qty', dir: 'desc' }, 'qty')", result: show(nextSort({ key: 'qty', dir: 'desc' }, 'qty')) },
    { group: TABLES, call: "nextSort({ key: 'qty', dir: 'desc' }, 'qty', false)", result: show(nextSort({ key: 'qty', dir: 'desc' }, 'qty', false)) },
    {
      group: TABLES,
      call: `findTypeaheadMatch(${list(places)}, [0, 1, 2, 3], 2, '${letter}')`,
      result: show(findTypeaheadMatch(places, [0, 1, 2, 3], 2, letter)),
    },
    { group: COLOR, call: "normalizeHexColor('1baf7a')", result: show(normalizeHexColor('1baf7a')) },
    { group: COLOR, call: "isHexColor('#1BAF7A')", result: show(isHexColor('#1BAF7A')) },
    { group: COLOR, call: "isLightHex('#EDA100')", result: show(isLightHex('#EDA100')) },
    { group: COLOR, call: "hexInputState('#1ba', false)", result: show(hexInputState('#1ba', false)) },
    { group: CHARTS, call: 'niceScale(873)', result: show(niceScale(873)) },
    { group: CHARTS, call: 'scaleTicks(niceScale(873))', result: show(scaleTicks(niceScale(873))) },
    { group: CHARTS, call: 'allIntegerValues([{ v: 1 }, { v: 2.5 }], [{ value: (d) => d.v }])', result: show(allIntegerValues([{ v: 1 }, { v: 2.5 }], [{ value: (d) => d.v }])) },
  ]
}

function helperColumns({ t }: Translator): Column<HelperRow>[] {
  return [
    { key: 'group', header: t('Группа', 'Group'), width: 200, hideOnMobile: true, cell: (r) => <span className="ev-secondary">{r.group}</span> },
    { key: 'call', header: t('Вызов', 'Call'), primary: true, wrap: true, cell: (r) => <code>{r.call}</code> },
    { key: 'result', header: t('Результат', 'Result'), wrap: true, cell: (r) => <code className="ev-secondary">{r.result}</code> },
  ]
}

/** Функции без разметки: форматирование, маски, даты, цвет и шкалы графиков. */
export function HelpersCard() {
  const tr = useT()
  const { t } = tr
  const rows = useMemo(() => helperRows(tr), [tr])
  const columns = useMemo(() => helperColumns(tr), [tr])
  return (
    <Card
      title={t('Функции форматирования', 'Formatting functions')}
      description={t(
        'Те же функции, что внутри полей и графиков: для вывода значений в таблицах, карточках и экспорте. Результаты ниже посчитаны на этой странице.',
        'The same functions that power the fields and charts, for displaying values in tables, cards and exports. The results below are computed live on this page.',
      )}
      flush
    >
      <DataTable aria-label={t('Функции библиотеки', 'Library functions')} columns={columns} rows={rows} rowKey={(r) => r.call} dense mobile="scroll" />
    </Card>
  )
}
