import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { accentPresetCss, AccentStyles, type AccentColors, type AccentPreset } from '../lib/accent-preset'
import { ThemeScript } from '../lib/theme-script'

/* Свой пресет акцента: CSS токенов, проверка значений, вставка в <head>. */

const DARK: AccentColors = { accent: '#2DD4BF', text: '#5EEAD4', strong: '#0F766E', strongHover: '#118479', onStrong: '#FFFFFF' }
const LIGHT: AccentColors = { accent: '#0d9488', text: '#0f766e', strong: '#0f766e', strongHover: '#0b5f59', onStrong: '#fff' }
const BRAND: AccentPreset = { name: 'brand', dark: DARK, light: LIGHT }

describe('accentPresetCss', () => {
  const css = accentPresetCss(BRAND)

  it('токены для тёмной и светлой темы, оба стиля', () => {
    expect(css).toContain(":root:root[data-accent='brand'] {")
    expect(css).toContain(":root:root[data-theme='light'][data-accent='brand'] {")
    expect(css).toContain(":root:root[data-style='slim'][data-accent='brand'] {")
    expect(css).toContain(":root:root[data-style='slim'][data-theme='light'][data-accent='brand'] {")
    expect(css).toContain('--ev-accent-rgb: 45, 212, 191;')
    expect(css).toContain('--ev-accent-strong: #0F766E;')
    expect(css).toContain('--ev-text-on-accent: #FFFFFF;')
  })

  it('слой ev.tokens, порядок слоёв повторён в начале', () => {
    expect(css.startsWith('@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.styles, ev.utilities;')).toBe(true)
    expect(css).toContain('@layer ev.tokens {')
  })

  it('образец: по умолчанию - accent тёмной темы, свой - как задан', () => {
    expect(css).toContain('--ev-accent-swatch-brand: #2DD4BF;')
    expect(accentPresetCss({ ...BRAND, swatch: 'linear-gradient(135deg, #fff 0 50%, #000 50%)' })).toContain(
      '--ev-accent-swatch-brand: linear-gradient(135deg, #fff 0 50%, #000 50%);',
    )
  })

  it('Slim: свои значения или те же, что в стандартном стиле', () => {
    const slimDark = { ...DARK, strong: '#134E4A' }
    const out = accentPresetCss({ ...BRAND, slim: { dark: slimDark } })
    const slimBlock = out.slice(out.indexOf(":root:root[data-style='slim'][data-accent='brand']"))
    expect(slimBlock).toContain('--ev-accent-strong: #134E4A;')
    expect(slimBlock.slice(slimBlock.indexOf("[data-theme='light']"))).toContain('--ev-accent-strong: #0F766E;')
  })

  it('несколько пресетов в одном блоке', () => {
    const out = accentPresetCss([BRAND, { ...BRAND, name: 'night-2' }])
    expect(out.match(/@layer ev\.tokens \{/g)).toHaveLength(1)
    expect(out).toContain("[data-accent='night-2']")
  })

  it('отвергает неверное имя, indigo, не-hex цвет и опасный образец', () => {
    expect(() => accentPresetCss({ ...BRAND, name: 'Brand' })).toThrow(/accent name/)
    expect(() => accentPresetCss({ ...BRAND, name: "x'] {" })).toThrow(/accent name/)
    expect(() => accentPresetCss({ ...BRAND, name: 'indigo' })).toThrow(/base accent/)
    expect(() => accentPresetCss({ ...BRAND, light: { ...LIGHT, text: 'red' } })).toThrow(/text must be a #RRGGBB/)
    expect(() => accentPresetCss({ ...BRAND, swatch: 'red}</style><script>' })).toThrow(/swatch/)
  })
})

describe('вставка в <head>', () => {
  it('AccentStyles - <style> с nonce; пустой список - ничего', () => {
    const out = renderToString(<AccentStyles accents={[BRAND]} nonce="n1" />)
    expect(out).toMatch(/^<style nonce="n1" data-ev-accents="">@layer/)
    expect(renderToString(<AccentStyles accents={[]} />)).toBe('')
  })

  it('ThemeScript accents: стиль перед скриптом, свой акцент по умолчанию', () => {
    const out = renderToString(<ThemeScript accents={[BRAND]} defaultAccent="brand" nonce="n1" />)
    expect(out.indexOf('<style nonce="n1"')).toBe(0)
    expect(out).toContain('<script nonce="n1">')
    expect(out).toContain('"a":"brand"')
    expect(renderToString(<ThemeScript />)).not.toContain('<style')
  })
})
