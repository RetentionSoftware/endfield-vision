/*
 * Цвета в формате #RRGGBB (поля цвета, карта полей бланка). Значение
 * хранится в верхнем регистре с решёткой; ввод допускает нижний регистр,
 * пропущенную решётку и сокращение #RGB.
 */

const HEX6 = /^#?([0-9a-f]{6})$/i
const HEX3 = /^#?([0-9a-f]{3})$/i

/** Строгое значение поля: #RRGGBB. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/**
 * Ввод -> #RRGGBB или null, если это не цвет. shorthand: принимать #RGB
 * (при наборе - нет: «#abc» - начало «#abcdef», а не готовый цвет).
 */
export function normalizeHexColor(input: string | null | undefined, opts: { shorthand?: boolean } = {}): string | null {
  const v = (input ?? '').trim()
  const full = HEX6.exec(v)
  if (full) return `#${full[1]!.toUpperCase()}`
  if (opts.shorthand !== false) {
    const short = HEX3.exec(v)
    if (short) {
      const [r, g, b] = short[1]!.toUpperCase().split('')
      return `#${r}${r}${g}${g}${b}${b}`
    }
  }
  return null
}

/**
 * Состояние текста поля цвета: пусто, набирается (ещё может стать цветом),
 * готовый цвет или ошибка. Ошибка видна сразу, если в тексте есть
 * посторонние символы или он длиннее цвета; неполный ввод - после ухода
 * из поля.
 */
export type HexInputState = 'empty' | 'partial' | 'valid' | 'invalid'

export function hexInputState(text: string, committed: boolean): HexInputState {
  const v = text.trim()
  if (v === '') return 'empty'
  if (normalizeHexColor(v, { shorthand: committed }) !== null) return 'valid'
  const digits = v.startsWith('#') ? v.slice(1) : v
  if (!/^[0-9a-f]*$/i.test(digits) || digits.length > 6) return 'invalid'
  return committed ? 'invalid' : 'partial'
}

/** Светлый цвет (на нём нужна тёмная отметка): яркость по формуле BT.601. */
export function isLightHex(hex: string): boolean {
  const n = normalizeHexColor(hex)
  if (!n) return false
  const v = Number.parseInt(n.slice(1), 16)
  const r = (v >> 16) & 0xff
  const g = (v >> 8) & 0xff
  const b = v & 0xff
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}
