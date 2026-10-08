import { describe, expect, it } from 'vitest'
import { niceScale } from '../components/charts/Charts'
import { isInteractiveTarget } from '../components/DataTable'
import { normalizeSearch } from '../lib/cx'
import {
  addDaysIso,
  dateDigitsToIso,
  DEFAULT_RANGE_PRESETS,
  formatDateDigits,
  formatIsoRu,
  isoToDateDigits,
  parseIso,
} from '../lib/dates'
import {
  formatPhone,
  formatPhoneNational,
  formatSnils,
  isCompletePhone,
  joinPhone,
  normalizePlate,
  phoneFieldValue,
  PLATE_RE,
  sanitizePhonePaste,
  splitPhone,
} from '../lib/masks'

describe('маски телефона', () => {
  it('форматирует национальную часть РФ по мере ввода', () => {
    expect(formatPhoneNational('RU', '')).toBe('')
    expect(formatPhoneNational('RU', '9')).toBe('(9')
    expect(formatPhoneNational('RU', '900')).toBe('(900)')
    expect(formatPhoneNational('RU', '9001')).toBe('(900) 1')
    expect(formatPhoneNational('RU', '9001234567')).toBe('(900) 123-45-67')
  })

  it('форматирует номера Узбекистана и Таджикистана', () => {
    expect(formatPhoneNational('UZ', '901234567')).toBe('(90) 123-45-67')
    expect(formatPhoneNational('TJ', '90')).toBe('(90)')
  })

  it('разбирает и собирает E.164', () => {
    expect(splitPhone('+79001234567')).toEqual({ country: 'RU', national: '9001234567' })
    expect(splitPhone('+998901234567')).toEqual({ country: 'UZ', national: '901234567' })
    expect(splitPhone('+992901234567')).toEqual({ country: 'TJ', national: '901234567' })
    expect(splitPhone('')).toEqual({ country: 'RU', national: '' })
    expect(joinPhone('RU', '9001234567')).toBe('+79001234567')
    // Неполный номер не превращается в значение.
    expect(joinPhone('RU', '900123')).toBe('')
    expect(joinPhone('UZ', '901234567')).toBe('+998901234567')
  })

  it('распознаёт код страны при вставке', () => {
    expect(sanitizePhonePaste('8 900 123 45 67', 'UZ')).toEqual({ country: 'RU', national: '9001234567' })
    expect(sanitizePhonePaste('+7 (900) 123-45-67', 'RU')).toEqual({ country: 'RU', national: '9001234567' })
    expect(sanitizePhonePaste('+998 90 123 45 67', 'RU')).toEqual({ country: 'UZ', national: '901234567' })
    expect(sanitizePhonePaste('+992901234567', 'RU')).toEqual({ country: 'TJ', national: '901234567' })
  })

  it('выводит телефон для показа', () => {
    expect(formatPhone('+79001234567')).toBe('+7 (900) 123-45-67')
    expect(formatPhone('+998901234567')).toBe('+998 (90) 123-45-67')
    expect(formatPhone(null)).toBe('')
    // Номер, сохранённый до E.164, тоже распознаётся как российский.
    expect(formatPhone('8 (900) 123-45-67')).toBe('+7 (900) 123-45-67')
  })

  it('значение поля: неполный номер не теряется, а отклоняется формой', () => {
    expect(phoneFieldValue('RU', '')).toBe('')
    expect(phoneFieldValue('RU', '900')).toBe('+7900')
    expect(phoneFieldValue('UZ', '90')).toBe('+99890')
    expect(phoneFieldValue('RU', '9001234567')).toBe('+79001234567')
    // Поле разбирает своё же неполное значение обратно без смены страны.
    expect(splitPhone(phoneFieldValue('UZ', '9'))).toEqual({ country: 'UZ', national: '9' })
    expect(splitPhone(phoneFieldValue('TJ', '9'))).toEqual({ country: 'TJ', national: '9' })
    expect(splitPhone(phoneFieldValue('RU', '99'))).toEqual({ country: 'RU', national: '99' })
    expect(isCompletePhone('+79001234567')).toBe(true)
    expect(isCompletePhone('+998901234567')).toBe(true)
    expect(isCompletePhone('+7900')).toBe(false)
    expect(isCompletePhone('+7900123456789')).toBe(false)
    expect(isCompletePhone('')).toBe(false)
    expect(isCompletePhone(null)).toBe(false)
  })
})

describe('клик по строке таблицы', () => {
  // Минимальная модель DOM: элемент с родителем, contains и closest по тегу.
  interface FakeEl {
    tag: string
    parent: FakeEl | null
    contains: (o: FakeEl) => boolean
    closest: (sel: string) => FakeEl | null
  }
  const el = (tag: string, parent: FakeEl | null = null): FakeEl => {
    const self: FakeEl = {
      tag,
      parent,
      contains: (o) => {
        for (let n: FakeEl | null = o; n; n = n.parent) if (n === self) return true
        return false
      },
      closest: (sel) => {
        const tags = sel.split(',').map((x) => x.trim())
        for (let n: FakeEl | null = self; n; n = n.parent) if (tags.includes(n.tag)) return n
        return null
      },
    }
    return self
  }
  const hit = (target: FakeEl, row: FakeEl) => isInteractiveTarget({ target, currentTarget: row } as never)

  it('текст ячейки открывает строку, кнопка и ссылка - нет', () => {
    const row = el('tr')
    const cell = el('td', row)
    expect(hit(el('span', cell), row)).toBe(false)
    expect(hit(el('span', el('button', cell)), row)).toBe(true)
    expect(hit(el('a', cell), row)).toBe(true)
  })

  it('событие из портала (окно, открытое из ячейки) строку не открывает', () => {
    const row = el('tr')
    const modalText = el('p', el('div', el('body')))
    expect(hit(modalText, row)).toBe(true)
  })
})

describe('СНИЛС и госномер', () => {
  it('форматирует СНИЛС', () => {
    expect(formatSnils('123')).toBe('123')
    expect(formatSnils('1234')).toBe('123-4')
    expect(formatSnils('12345678901')).toBe('123-456-789 01')
  })

  it('нормализует госномер как бот', () => {
    expect(normalizePlate('a123bc77')).toBe('А123ВС77')
    expect(normalizePlate('a 123 bc 777')).toBe('А123ВС777')
    expect(PLATE_RE.test(normalizePlate('a123bc77'))).toBe(true)
    expect(PLATE_RE.test(normalizePlate('a123bc7'))).toBe(false)
    expect(PLATE_RE.test('А123ЖЖ77')).toBe(true)
  })
})

describe('даты', () => {
  it('проверяет корректность даты', () => {
    expect(parseIso('2026-02-29')).toBeNull()
    expect(parseIso('2028-02-29')).toEqual({ y: 2028, m: 1, d: 29 })
    expect(parseIso('2026-13-01')).toBeNull()
    expect(parseIso('05.10.2026')).toBeNull()
  })

  it('переводит маску ддммгггг в ISO и обратно', () => {
    expect(dateDigitsToIso('05102026')).toBe('2026-10-05')
    expect(dateDigitsToIso('31022026')).toBeNull()
    expect(dateDigitsToIso('0510202')).toBeNull()
    expect(isoToDateDigits('2026-10-05')).toBe('05102026')
    expect(formatDateDigits('0510')).toBe('05.10')
    expect(formatDateDigits('05102026')).toBe('05.10.2026')
    expect(formatIsoRu('2026-10-05')).toBe('05.10.2026')
  })

  it('сдвигает дату через границу месяца и года', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('готовые периоды - корректные границы', () => {
    for (const p of DEFAULT_RANGE_PRESETS) {
      const r = p.range()
      expect(parseIso(r.from), p.id).not.toBeNull()
      expect(parseIso(r.to), p.id).not.toBeNull()
      expect(r.from <= r.to, p.id).toBe(true)
    }
    const last = DEFAULT_RANGE_PRESETS.find((p) => p.id === 'lastMonth')!.range()
    expect(last.from.endsWith('-01')).toBe(true)
    expect(addDaysIso(last.to, 1).endsWith('-01')).toBe(true)
  })
})

describe('прочее', () => {
  it('поиск без учёта регистра и ё/е', () => {
    expect(normalizeSearch('  Пётр ')).toBe('петр')
  })

  it('шкала графика - круглые значения не меньше максимума', () => {
    expect(niceScale(0)).toEqual({ max: 1, step: 0.25 })
    expect(niceScale(37)).toEqual({ max: 40, step: 10 })
    const s = niceScale(4_320_000)
    expect(s.max).toBeGreaterThanOrEqual(4_320_000)
    expect(s.max / s.step).toBe(4)
  })
})
