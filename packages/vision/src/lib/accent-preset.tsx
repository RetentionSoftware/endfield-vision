/*
 * Свой пресет акцента. Модуль без 'use client': CSS пресета собирается
 * строкой и вставляется в <head> серверным layout (ThemeScript accents или
 * AccentStyles) - акцент приложения есть с первой отрисовки, как встроенные.
 *
 * Пресет задаёт те же токены, что styles/accents.css, для тёмной и светлой
 * темы и обоих стилей (Slim - свои значения или те же). После этого имя
 * работает в data-accent, ThemeScript defaultAccent, setAccent и
 * useTheme<Accent | 'brand'>().
 *
 * Контраст - как у встроенных: text к --ev-surface-1 >= 4.5:1, onStrong к
 * strong >= 4.5:1 в каждой теме и стиле.
 */

import { normalizeHexColor } from './color'

/** Цвета акцента для одной темы. Все значения - #RRGGBB (или #RGB). */
export interface AccentColors {
  /** Основной цвет: ссылки, активные элементы, мягкие заливки и кольцо фокуса (--ev-accent-rgb). */
  accent: string
  /** Текст акцентом на поверхности (--ev-accent-text). */
  text: string
  /** Заливка основной кнопки (--ev-accent-strong). */
  strong: string
  /** Заливка основной кнопки при наведении (--ev-accent-strong-hover). */
  strongHover: string
  /** Текст на заливке (--ev-text-on-accent). */
  onStrong: string
}

export interface AccentPreset {
  /** Имя для data-accent: латиница в нижнем регистре, цифры, дефис. Не 'indigo' (это базовый акцент). */
  name: string
  /** Образец для переключателей (--ev-accent-swatch-<name>): цвет или градиент. По умолчанию - accent тёмной темы. */
  swatch?: string
  dark: AccentColors
  light: AccentColors
  /** Значения для стиля Slim; без них - те же, что в стандартном стиле. */
  slim?: { dark?: AccentColors; light?: AccentColors }
}

const LAYER_ORDER = '@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.styles, ev.utilities;'
const NAME = /^[a-z][a-z0-9-]*$/

function fail(message: string): never {
  throw new Error(`endfield-vision: ${message}`)
}

function hex(preset: string, field: string, value: string): string {
  const v = normalizeHexColor(value)
  if (!v) fail(`accent "${preset}": ${field} must be a #RRGGBB color, got "${value}"`)
  return v
}

function rgb(value: string): string {
  const n = parseInt(value.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function block(selector: string, preset: string, c: AccentColors): string {
  const at = (field: keyof AccentColors) => hex(preset, field, c[field])
  return [
    `${selector} {`,
    `  --ev-accent-rgb: ${rgb(at('accent'))};`,
    `  --ev-accent-text: ${at('text')};`,
    `  --ev-accent-strong: ${at('strong')};`,
    `  --ev-accent-strong-hover: ${at('strongHover')};`,
    `  --ev-text-on-accent: ${at('onStrong')};`,
    '}',
  ].join('\n')
}

/**
 * CSS пресетов акцента: токены в слое ev.tokens. Селекторы с удвоенным
 * :root сильнее встроенных - пресет может и переопределить встроенный
 * (например, свой emerald), и не зависит от порядка стилей в <head>.
 */
export function accentPresetCss(presets: AccentPreset | readonly AccentPreset[]): string {
  const list = Array.isArray(presets) ? presets : [presets as AccentPreset]
  const rules: string[] = []
  for (const p of list) {
    if (!NAME.test(p.name)) fail(`accent name "${p.name}" must match ${NAME}`)
    if (p.name === 'indigo') fail('accent "indigo" is the base accent; override its tokens on :root instead')
    const swatch = p.swatch ?? hex(p.name, 'dark.accent', p.dark.accent)
    if (/[<>{};]/.test(swatch)) fail(`accent "${p.name}": swatch must be a plain CSS color or gradient`)
    const at = `[data-accent='${p.name}']`
    rules.push(
      `:root:root {\n  --ev-accent-swatch-${p.name}: ${swatch};\n}`,
      block(`:root:root${at}`, p.name, p.dark),
      block(`:root:root[data-theme='light']${at}`, p.name, p.light),
      block(`:root:root[data-style='slim']${at}`, p.name, p.slim?.dark ?? p.dark),
      block(`:root:root[data-style='slim'][data-theme='light']${at}`, p.name, p.slim?.light ?? p.light),
    )
  }
  // Порядок слоёв повторяется: стиль может оказаться в <head> раньше стилей библиотеки.
  return `${LAYER_ORDER}\n@layer ev.tokens {\n${rules.join('\n')}\n}`
}

export interface AccentStylesProps {
  accents: readonly AccentPreset[]
  /** nonce для строгой CSP (style-src 'nonce-...'). */
  nonce?: string
}

/** <style> с пресетами акцента для <head>. Подходит для серверных компонентов. */
export function AccentStyles({ accents, nonce }: AccentStylesProps) {
  if (accents.length === 0) return null
  return <style nonce={nonce} data-ev-accents="" dangerouslySetInnerHTML={{ __html: accentPresetCss(accents) }} />
}
