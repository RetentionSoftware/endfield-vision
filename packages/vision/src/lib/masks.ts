/**
 * Маски и нормализация значений, которые пользователи вводят руками.
 * Телефон РФ, Узбекистана и Таджикистана в E.164,
 * СНИЛС - 11 цифр, госномер - кириллица в верхнем регистре без пробелов.
 */

export type PhoneCountry = 'RU' | 'UZ' | 'TJ'

export interface PhoneCountryInfo {
  code: PhoneCountry
  /** Код страны без «+». */
  dial: string
  /** Длина национальной части. */
  length: number
  label: string
  placeholder: string
}

export const PHONE_COUNTRIES: Record<PhoneCountry, PhoneCountryInfo> = {
  RU: { code: 'RU', dial: '7', length: 10, label: 'Россия', placeholder: '(900) 123-45-67' },
  UZ: { code: 'UZ', dial: '998', length: 9, label: 'Узбекистан', placeholder: '(90) 123-45-67' },
  TJ: { code: 'TJ', dial: '992', length: 9, label: 'Таджикистан', placeholder: '(90) 123-45-67' },
}

/** Национальная часть с маской по мере ввода. */
export function formatPhoneNational(country: PhoneCountry, digits: string): string {
  if (!digits) return ''
  if (country === 'RU') {
    // (XXX) XXX-XX-XX
    let out = `(${digits.slice(0, 3)}`
    if (digits.length >= 3) out += ')'
    if (digits.length > 3) out += ` ${digits.slice(3, 6)}`
    if (digits.length > 6) out += `-${digits.slice(6, 8)}`
    if (digits.length > 8) out += `-${digits.slice(8, 10)}`
    return out
  }
  // (XX) XXX-XX-XX
  let out = `(${digits.slice(0, 2)}`
  if (digits.length >= 2) out += ')'
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`
  if (digits.length > 7) out += `-${digits.slice(7, 9)}`
  return out
}

/** E.164 -> страна и национальная часть. Неизвестный код - РФ с пустой частью. */
export function splitPhone(e164: string | null | undefined): { country: PhoneCountry; national: string } {
  const d = (e164 ?? '').replace(/\D/g, '')
  if (d.startsWith('998')) return { country: 'UZ', national: d.slice(3, 12) }
  if (d.startsWith('992')) return { country: 'TJ', national: d.slice(3, 12) }
  if (d.startsWith('7')) return { country: 'RU', national: d.slice(1, 11) }
  // Номер, сохранённый до E.164 («8 900 123-45-67»), - тоже РФ.
  if (d.length === 11 && d.startsWith('8')) return { country: 'RU', national: d.slice(1) }
  return { country: 'RU', national: '' }
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

/** Полный номер одной из стран поля в E.164. */
export function isCompletePhone(value: string | null | undefined): boolean {
  return Boolean(value) && /^\+(?:7\d{10}|998\d{9}|992\d{9})$/.test(value as string)
}

/**
 * Вставка полного номера в поле национальной части: распознаём код страны.
 * Возвращает страну, если её удалось определить, и цифры национальной части.
 */
export function sanitizePhonePaste(raw: string, current: PhoneCountry): { country: PhoneCountry; national: string } {
  const d = raw.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('998')) return { country: 'UZ', national: d.slice(3) }
  if (d.length === 12 && d.startsWith('992')) return { country: 'TJ', national: d.slice(3) }
  if (d.length === 11 && (d.startsWith('7') || d.startsWith('8'))) return { country: 'RU', national: d.slice(1) }
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
