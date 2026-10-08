'use client'

import {
  addDaysIso,
  allIntegerValues,
  Card,
  cx,
  DataTable,
  dateToIso,
  EMPTY_VALUE,
  formatIsoRu,
  formatPhone,
  formatPhoneNational,
  formatSnils,
  hexInputState,
  initials,
  isCompletePhone,
  isHexColor,
  isLightHex,
  joinPhone,
  niceScale,
  normalizeHexColor,
  normalizePlate,
  normalizeSearch,
  parseIso,
  PHONE_COUNTRIES,
  phoneFieldValue,
  PLATE_RE,
  scaleTicks,
  splitPhone,
  toIso,
  type Column,
} from 'endfield-vision'

interface HelperRow {
  call: string
  result: string
  group: string
}

const show = (v: unknown): string => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v))

/** Все вызовы - на фиксированных входах: результат одинаков на сервере и клиенте. */
const ROWS: HelperRow[] = [
  { group: 'Классы и пустые значения', call: "cx('ev-btn', false, 'is-active')", result: show(cx('ev-btn', false, 'is-active')) },
  { group: 'Классы и пустые значения', call: 'EMPTY_VALUE', result: show(EMPTY_VALUE) },
  { group: 'Классы и пустые значения', call: "normalizeSearch('  Ёмкость ')", result: show(normalizeSearch('  Ёмкость ')) },
  { group: 'Классы и пустые значения', call: "initials('Глеб Сорокин')", result: show(initials('Глеб Сорокин')) },
  { group: 'Телефон', call: "formatPhone('+79001234567')", result: show(formatPhone('+79001234567')) },
  { group: 'Телефон', call: "formatPhoneNational('UZ', '901234567')", result: show(formatPhoneNational('UZ', '901234567')) },
  { group: 'Телефон', call: "splitPhone('+992901234567')", result: show(splitPhone('+992901234567')) },
  { group: 'Телефон', call: "joinPhone('RU', '9001234567')", result: show(joinPhone('RU', '9001234567')) },
  { group: 'Телефон', call: "phoneFieldValue('RU', '900')", result: show(phoneFieldValue('RU', '900')) },
  { group: 'Телефон', call: "isCompletePhone('+7900')", result: show(isCompletePhone('+7900')) },
  { group: 'Телефон', call: 'Object.keys(PHONE_COUNTRIES)', result: show(Object.keys(PHONE_COUNTRIES)) },
  { group: 'Документы и номера', call: "formatSnils('11223344595')", result: show(formatSnils('11223344595')) },
  { group: 'Документы и номера', call: "normalizePlate('a 123 bc 77')", result: show(normalizePlate('a 123 bc 77')) },
  { group: 'Документы и номера', call: "PLATE_RE.test('А123ВС777')", result: show(PLATE_RE.test('А123ВС777')) },
  { group: 'Даты', call: "formatIsoRu('2026-10-08')", result: show(formatIsoRu('2026-10-08')) },
  { group: 'Даты', call: "addDaysIso('2026-10-08', -29)", result: show(addDaysIso('2026-10-08', -29)) },
  { group: 'Даты', call: "parseIso('2026-10-08')", result: show(parseIso('2026-10-08')) },
  { group: 'Даты', call: 'toIso(2026, 9, 8)', result: show(toIso(2026, 9, 8)) },
  { group: 'Даты', call: 'dateToIso(new Date(2026, 9, 8))', result: show(dateToIso(new Date(2026, 9, 8))) },
  { group: 'Цвет', call: "normalizeHexColor('1baf7a')", result: show(normalizeHexColor('1baf7a')) },
  { group: 'Цвет', call: "isHexColor('#1BAF7A')", result: show(isHexColor('#1BAF7A')) },
  { group: 'Цвет', call: "isLightHex('#EDA100')", result: show(isLightHex('#EDA100')) },
  { group: 'Цвет', call: "hexInputState('#1ba', false)", result: show(hexInputState('#1ba', false)) },
  { group: 'Графики', call: 'niceScale(873)', result: show(niceScale(873)) },
  { group: 'Графики', call: 'scaleTicks(niceScale(873))', result: show(scaleTicks(niceScale(873))) },
  { group: 'Графики', call: 'allIntegerValues([{ v: 1 }, { v: 2.5 }], [{ value: (d) => d.v }])', result: show(allIntegerValues([{ v: 1 }, { v: 2.5 }], [{ value: (d) => d.v }])) },
]

const COLUMNS: Column<HelperRow>[] = [
  { key: 'group', header: 'Группа', width: 200, hideOnMobile: true, cell: (r) => <span className="ev-secondary">{r.group}</span> },
  { key: 'call', header: 'Вызов', primary: true, wrap: true, cell: (r) => <code>{r.call}</code> },
  { key: 'result', header: 'Результат', wrap: true, cell: (r) => <code className="ev-secondary">{r.result}</code> },
]

/** Функции без разметки: форматирование, маски, даты, цвет и шкалы графиков. */
export function HelpersCard() {
  return (
    <Card
      title="Функции форматирования"
      description="Те же функции, что внутри полей и графиков: для вывода значений в таблицах, карточках и экспорте. Результаты ниже посчитаны на этой странице."
      flush
    >
      <DataTable aria-label="Функции библиотеки" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.call} dense mobile="scroll" />
    </Card>
  )
}
