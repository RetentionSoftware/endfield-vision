/**
 * Маски и нормализация значений, которые пользователи вводят руками.
 * Телефон в E.164 с маской страны (22 страны, общий код +7/+1 делится по первым цифрам),
 * СНИЛС - 11 цифр, госномер - кириллица в верхнем регистре без пробелов.
 */

/** Страны поля телефона. Порядок - порядок в списке выбора кода. */
export const PHONE_COUNTRY_CODES = [
  'RU',
  'KZ',
  'BY',
  'UA',
  'UZ',
  'TJ',
  'KG',
  'AM',
  'AZ',
  'GE',
  'MD',
  'TM',
  'TR',
  'US',
  'GB',
  'FR',
  'ES',
  'PL',
  'IL',
  'AE',
  'IN',
  'CN',
] as const

export type PhoneCountry = (typeof PHONE_COUNTRY_CODES)[number]

export interface PhoneCountryInfo {
  code: PhoneCountry
  /** Код страны без «+». */
  dial: string
  /** Маска национальной части: «#» - цифра, остальное - разделители. */
  mask: string
  /** Длина национальной части (число «#» в маске). */
  length: number
  /**
   * Первые цифры национального номера - для стран с общим кодом (+7: Россия
   * и Казахстан). Страна без префиксов забирает остальные номера этого кода.
   */
  prefixes?: readonly string[]
  /** Название по-английски; в интерфейсе - из словаря (phone.countries). */
  label: string
  /** Пример номера в маске - плейсхолдер поля. */
  placeholder: string
}

function country(code: PhoneCountry, dial: string, mask: string, example: string, label: string, prefixes?: readonly string[]): PhoneCountryInfo {
  return { code, dial, mask, length: mask.split('#').length - 1, prefixes, label, placeholder: formatByMask(mask, example) }
}

/**
 * Цифры по маске по мере ввода: разделитель появляется перед следующей
 * цифрой, закрывающая скобка - сразу после заполненной группы:
 * «9» -> «(9», «900» -> «(900)», «9001» -> «(900) 1».
 */
export function formatByMask(mask: string, digits: string): string {
  if (!digits) return ''
  let out = ''
  let pending = ''
  let i = 0
  for (let m = 0; m < mask.length; m++) {
    const ch = mask[m]!
    if (ch === '#') {
      if (i >= digits.length) break
      out += pending + digits[i]
      pending = ''
      i += 1
    } else if (ch === ')' && mask[m - 1] === '#' && i > 0) {
      out += pending + ch
      pending = ''
    } else {
      pending += ch
    }
  }
  return out
}

export const PHONE_COUNTRIES: Record<PhoneCountry, PhoneCountryInfo> = {
  RU: country('RU', '7', '(###) ###-##-##', '9001234567', 'Russia'),
  KZ: country('KZ', '7', '(###) ###-##-##', '7011234567', 'Kazakhstan', ['6', '7']),
  BY: country('BY', '375', '(##) ###-##-##', '291234567', 'Belarus'),
  UA: country('UA', '380', '(##) ###-##-##', '501234567', 'Ukraine'),
  UZ: country('UZ', '998', '(##) ###-##-##', '901234567', 'Uzbekistan'),
  TJ: country('TJ', '992', '(##) ###-##-##', '901234567', 'Tajikistan'),
  KG: country('KG', '996', '(###) ###-###', '555123456', 'Kyrgyzstan'),
  AM: country('AM', '374', '(##) ###-###', '77123456', 'Armenia'),
  AZ: country('AZ', '994', '(##) ###-##-##', '501234567', 'Azerbaijan'),
  GE: country('GE', '995', '(###) ##-##-##', '555123456', 'Georgia'),
  MD: country('MD', '373', '### ## ###', '69123456', 'Moldova'),
  TM: country('TM', '993', '## ##-##-##', '65123456', 'Turkmenistan'),
  TR: country('TR', '90', '(###) ###-##-##', '5321234567', 'Turkey'),
  US: country('US', '1', '(###) ###-####', '2015550123', 'United States and Canada'),
  GB: country('GB', '44', '#### ######', '7911123456', 'United Kingdom'),
  FR: country('FR', '33', '# ## ## ## ##', '612345678', 'France'),
  ES: country('ES', '34', '### ## ## ##', '612345678', 'Spain'),
  PL: country('PL', '48', '### ### ###', '512345678', 'Poland'),
  IL: country('IL', '972', '##-###-####', '501234567', 'Israel'),
  AE: country('AE', '971', '## ### ####', '501234567', 'United Arab Emirates'),
  IN: country('IN', '91', '##### #####', '9812345678', 'India'),
  CN: country('CN', '86', '### #### ####', '13123456789', 'China'),
}

/** Национальная часть с маской страны по мере ввода. */
export function formatPhoneNational(country: PhoneCountry, digits: string): string {
  return formatByMask(PHONE_COUNTRIES[country].mask, digits)
}

/** Страны с самым длинным кодом - первыми: «998» проверяется раньше «9...». */
const BY_DIAL_DESC = [...PHONE_COUNTRY_CODES].sort((a, b) => PHONE_COUNTRIES[b].dial.length - PHONE_COUNTRIES[a].dial.length)

/** Страна по цифрам номера с кодом: самый длинный подходящий код, затем префиксы общего кода. */
function detectCountry(digits: string, allowed: readonly PhoneCountry[] = PHONE_COUNTRY_CODES): PhoneCountry | null {
  const dial = BY_DIAL_DESC.find((c) => digits.startsWith(PHONE_COUNTRIES[c].dial))
  if (!dial) return null
  const code = PHONE_COUNTRIES[dial].dial
  const national = digits.slice(code.length)
  const sameDial = PHONE_COUNTRY_CODES.filter((c) => PHONE_COUNTRIES[c].dial === code && allowed.includes(c))
  const byPrefix = sameDial.find((c) => PHONE_COUNTRIES[c].prefixes?.some((p) => national.startsWith(p)))
  return byPrefix ?? sameDial.find((c) => !PHONE_COUNTRIES[c].prefixes) ?? sameDial[0] ?? null
}

/** E.164 -> страна и национальная часть. Неизвестный код - страна по умолчанию с пустой частью. */
export function splitPhone(e164: string | null | undefined, fallback: PhoneCountry = 'RU'): { country: PhoneCountry; national: string } {
  const d = (e164 ?? '').replace(/\D/g, '')
  // Номер, сохранённый до E.164 («8 900 123-45-67»), - РФ (или Казахстан по префиксу).
  const digits = d.length === 11 && d.startsWith('8') ? `7${d.slice(1)}` : d
  const found = digits ? detectCountry(digits) : null
  if (!found) return { country: fallback, national: '' }
  const info = PHONE_COUNTRIES[found]
  return { country: found, national: digits.slice(info.dial.length, info.dial.length + info.length) }
}

/** Собрать E.164; неполный номер - пустая строка. */
export function joinPhone(country: PhoneCountry, national: string): string {
  const info = PHONE_COUNTRIES[country]
  return national.length === info.length ? `+${info.dial}${national}` : ''
}

/**
 * Значение поля телефона: полный номер - E.164, пустое поле - '', начатый
 * номер - неполный E.164 («+7900»). Неполный номер не превращается молча в
 * пустой: форма видит его и показывает ошибку (isCompletePhone), а не
 * стирает телефон при сохранении.
 */
export function phoneFieldValue(country: PhoneCountry, national: string): string {
  return national ? `+${PHONE_COUNTRIES[country].dial}${national}` : ''
}

/** Полный номер в E.164 одной из стран (по умолчанию - любой из списка). */
export function isCompletePhone(value: string | null | undefined, countries: readonly PhoneCountry[] = PHONE_COUNTRY_CODES): boolean {
  if (!value || !/^\+\d+$/.test(value)) return false
  const digits = value.slice(1)
  const found = detectCountry(digits, countries)
  if (!found) return false
  const info = PHONE_COUNTRIES[found]
  return digits.length === info.dial.length + info.length
}

/**
 * Вставка полного номера в поле национальной части: распознаём код страны.
 * Возвращает страну, если её удалось определить, и цифры национальной части.
 */
export function sanitizePhonePaste(
  raw: string,
  current: PhoneCountry,
  allowed: readonly PhoneCountry[] = PHONE_COUNTRY_CODES,
): { country: PhoneCountry; national: string } {
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`
  const found = detectCountry(d, allowed)
  if (found) {
    const info = PHONE_COUNTRIES[found]
    if (d.length === info.dial.length + info.length) return { country: found, national: d.slice(info.dial.length) }
  }
  return { country: current, national: d.slice(0, PHONE_COUNTRIES[current].length) }
}

/** E.164 -> «+7 (900) 123-45-67» для вывода. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const { country, national } = splitPhone(e164)
  if (!national) return e164
  return `+${PHONE_COUNTRIES[country].dial} ${formatPhoneNational(country, national)}`
}

/** СНИЛС: «XXX-XXX-XXX XX» по мере ввода. */
export function formatSnils(digits: string): string {
  let out = digits.slice(0, 3)
  if (digits.length > 3) out += `-${digits.slice(3, 6)}`
  if (digits.length > 6) out += `-${digits.slice(6, 9)}`
  if (digits.length > 9) out += ` ${digits.slice(9, 11)}`
  return out
}

/** Время «ЧЧ:ММ» (24 часа) -> часы и минуты; неполное или неверное - null. */
export function parseTime(value: string | null | undefined): { hours: number; minutes: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? '')
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null
}

/** Полное корректное время «ЧЧ:ММ» от 00:00 до 23:59. */
export function isValidTime(value: string | null | undefined): boolean {
  return parseTime(value) !== null
}

/** Время по мере ввода: «ЧЧ:ММ» из цифр. */
export function formatTimeDigits(digits: string): string {
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2, 4)}` : digits.slice(0, 2)
}

/** 4 цифры -> «ЧЧ:ММ»; неполное или неверное время - null. */
export function timeDigitsToValue(digits: string): string | null {
  if (digits.length !== 4) return null
  const v = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
  return isValidTime(v) ? v : null
}

/** «ЧЧ:ММ» -> цифры для поля; неверное значение - пустая строка. */
export function timeToDigits(value: string): string {
  return isValidTime(value) ? value.replace(':', '') : ''
}

const PLATE_LATIN_TO_CYR: Record<string, string> = {
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  Y: 'У',
  X: 'Х',
}

/** Госномер: верхний регистр, без пробелов, латинские буквы-двойники -> кириллица. */
export function normalizePlate(raw: string): string {
  return raw
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[ABEKMHOPCTYX]/g, (ch) => PLATE_LATIN_TO_CYR[ch] ?? ch)
}

/** Формат госномера РФ: А123ВС77 или А123ВС777. */
export const PLATE_RE = /^[А-ЯЁ]\d{3}[А-ЯЁ]{2}\d{2,3}$/

function countDigits(s: string): number {
  const m = s.match(/\d/g)
  return m ? m.length : 0
}

/** Позиция сразу после n-й цифры отформатированного значения. */
export function caretAfterNthDigit(formatted: string, n: number): number {
  if (n <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    const c = formatted.charCodeAt(i)
    if (c >= 48 && c <= 57) {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return formatted.length
}

/** Правка поля с маской: что было в поле и что в нём стало после ввода. */
export interface MaskedEdit {
  /** Значение поля до правки (отформатированное). */
  prevDisplay: string
  /** Цифры до правки. */
  prevDigits: string
  /** Значение поля после правки браузером. */
  raw: string
  /** Каретка после правки. */
  caret: number
  /** InputEvent.inputType, если браузер его передал. */
  inputType?: string
  format: (digits: string) => string
  maxDigits: number
  /** Извлечение цифр из сырого ввода (по умолчанию - все цифры). */
  sanitize?: (raw: string) => string
}

export interface MaskedEditResult {
  digits: string
  display: string
  /** Каретка в display: после того же числа цифр, что и в правке. */
  caret: number
}

/**
 * Стёрт только разделитель маски (Backspace или Delete рядом с «-»).
 * Признак - тип правки из InputEvent, а не длина текста: замена выделения
 * тем же числом цифр (вставка, быстрый ввод одним событием) тоже укорачивает
 * текст, но это не удаление. Без inputType (событие из скрипта) - строгая
 * проверка: из прежнего значения убран ровно один нецифровой символ у каретки.
 */
function separatorDeletion(e: MaskedEdit): 'backward' | 'forward' | null {
  if (e.inputType) {
    if (!e.inputType.startsWith('delete')) return null
    if (e.inputType.endsWith('Backward')) return 'backward'
    if (e.inputType.endsWith('Forward')) return 'forward'
    return null
  }
  const removed = e.prevDisplay.charAt(e.caret)
  const oneSeparatorRemoved =
    e.raw.length === e.prevDisplay.length - 1 &&
    removed !== '' &&
    !/\d/.test(removed) &&
    e.raw === e.prevDisplay.slice(0, e.caret) + e.prevDisplay.slice(e.caret + 1)
  return oneSeparatorRemoved ? 'backward' : null
}

/**
 * Новое состояние поля с маской после правки. Каретка считается по числу
 * цифр перед ней, поэтому не прыгает при правке в середине. Стирание
 * разделителя стирает соседнюю цифру (иначе Backspace на «-» ничего не делает).
 */
export function applyMaskedEdit(e: MaskedEdit): MaskedEditResult {
  let before = countDigits(e.raw.slice(0, e.caret))
  let next = (e.sanitize ? e.sanitize(e.raw) : e.raw.replace(/\D/g, '')).slice(0, e.maxDigits)
  if (next.length === e.prevDigits.length) {
    const del = separatorDeletion(e)
    if (del === 'backward' && before > 0) {
      next = next.slice(0, before - 1) + next.slice(before)
      before -= 1
    } else if (del === 'forward' && before < next.length) {
      next = next.slice(0, before) + next.slice(before + 1)
    }
  }
  const display = e.format(next)
  return { digits: next, display, caret: caretAfterNthDigit(display, before) }
}
