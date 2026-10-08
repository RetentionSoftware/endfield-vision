import { renderRu as renderToString } from './render-ru'
import { describe, expect, it } from 'vitest'
import { allIntegerValues, BarChart, niceScale, scaleTicks } from '../components/charts/Charts'
import { ColorField } from '../components/ColorField'
import { Field } from '../components/Field'
import { hexInputState, isHexColor, isLightHex, normalizeHexColor } from '../lib/color'

describe('шкала графика: целые значения', () => {
  it('счётчики - только целые деления, без 0,25 и 0,5', () => {
    for (const max of [1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 17, 23, 37, 99, 101, 999, 1234]) {
      const scale = niceScale(max, 4, true)
      const ticks = scaleTicks(scale)
      expect(scale.max, `max для ${max}`).toBeGreaterThanOrEqual(max)
      expect(Number.isInteger(scale.step), `шаг для ${max}`).toBe(true)
      expect(ticks.every(Number.isInteger), `деления для ${max}: ${ticks.join(',')}`).toBe(true)
      // Не больше 5 интервалов и не меньше одного.
      expect(ticks.length - 1).toBeGreaterThanOrEqual(1)
      expect(ticks.length - 1).toBeLessThanOrEqual(5)
    }
  })

  it('малые значения: ось ровно до максимума', () => {
    expect(scaleTicks(niceScale(1, 4, true))).toEqual([0, 1])
    expect(scaleTicks(niceScale(3, 4, true))).toEqual([0, 1, 2, 3])
    expect(scaleTicks(niceScale(5, 4, true))).toEqual([0, 1, 2, 3, 4, 5])
    expect(scaleTicks(niceScale(7, 4, true))).toEqual([0, 2, 4, 6, 8])
    expect(niceScale(37, 4, true)).toEqual({ max: 40, step: 10 })
    expect(niceScale(0, 4, true)).toEqual({ max: 1, step: 1 })
  })

  it('дробные данные - прежняя шкала из четырёх делений', () => {
    // Без признака целых - прежняя шкала: у максимума 1 деления по 0,25, в целой - 0 и 1.
    expect(niceScale(1)).toEqual({ max: 1, step: 0.25 })
    expect(niceScale(1, 4, true)).toEqual({ max: 1, step: 1 })
    expect(niceScale(37)).toEqual({ max: 40, step: 10 })
  })

  it('целочисленность данных определяется по всем сериям', () => {
    const series = [{ value: (d: { a: number; b: number }) => d.a }, { value: (d: { a: number; b: number }) => d.b }]
    expect(allIntegerValues([{ a: 1, b: 2 }], series)).toBe(true)
    expect(allIntegerValues([{ a: 1, b: 2.5 }], series)).toBe(false)
    expect(allIntegerValues([], series)).toBe(true)
  })

  it('скрытая таблица графика обёрнута: таблица не выходит за страницу', () => {
    const out = renderToString(
      <BarChart aria-label="Подписки" data={[{ d: '01.10', v: 1 }]} x={(p) => p.d} series={[{ key: 'v', label: 'Подписок', value: (p) => p.v }]} />,
    )
    expect(out).toContain('<div class="ev-visually-hidden"><table>')
    expect(out).not.toContain('<table class="ev-visually-hidden"')
  })
})

describe('цвет #RRGGBB', () => {
  it('нормализация ввода', () => {
    expect(normalizeHexColor('#a1b2c3')).toBe('#A1B2C3')
    expect(normalizeHexColor('a1b2c3')).toBe('#A1B2C3')
    expect(normalizeHexColor('  #FFFFFF ')).toBe('#FFFFFF')
    expect(normalizeHexColor('#abc')).toBe('#AABBCC')
    expect(normalizeHexColor('#abc', { shorthand: false })).toBeNull()
    expect(normalizeHexColor('#12345')).toBeNull()
    expect(normalizeHexColor('#1234567')).toBeNull()
    expect(normalizeHexColor('#GGGGGG')).toBeNull()
    expect(normalizeHexColor('')).toBeNull()
    expect(normalizeHexColor(null)).toBeNull()
  })

  it('строгое значение поля', () => {
    expect(isHexColor('#536AC2')).toBe(true)
    expect(isHexColor('536AC2')).toBe(false)
    expect(isHexColor('#536AC')).toBe(false)
    expect(isHexColor(null)).toBe(false)
  })

  it('состояние текста: набор, готовый цвет, ошибка', () => {
    expect(hexInputState('', false)).toBe('empty')
    expect(hexInputState('#53', false)).toBe('partial')
    // Неполный цвет - ошибка только после ухода из поля.
    expect(hexInputState('#53', true)).toBe('invalid')
    expect(hexInputState('#536AC2', false)).toBe('valid')
    // #RGB при наборе - ещё набор, после ухода - готовый цвет.
    expect(hexInputState('#abc', false)).toBe('partial')
    expect(hexInputState('#abc', true)).toBe('valid')
    // Посторонний символ и лишняя длина - ошибка сразу.
    expect(hexInputState('#53x', false)).toBe('invalid')
    expect(hexInputState('#536AC2F', false)).toBe('invalid')
    expect(hexInputState('##536AC', false)).toBe('invalid')
  })

  it('светлые цвета получают тёмную отметку', () => {
    expect(isLightHex('#FFFFFF')).toBe(true)
    expect(isLightHex('#FFEB3B')).toBe(true)
    expect(isLightHex('#000000')).toBe(false)
    expect(isLightHex('#536AC2')).toBe(false)
    expect(isLightHex('мусор')).toBe(false)
  })
})

describe('ColorField', () => {
  it('образец с палитрой, значение и подпись из Field', () => {
    const out = renderToString(
      <Field label="Цвет рамки" hint="Формат #RRGGBB">
        <ColorField value="#536AC2" onChange={() => undefined} palette={[{ value: '#000000', label: 'Чёрный' }]} aria-label="Цвет рамки" />
      </Field>,
    )
    expect(out).toContain('value="#536AC2"')
    expect(out).toContain('aria-label="Цвет рамки: выбрать из палитры"')
    expect(out).toContain('aria-haspopup="dialog"')
    expect(out).toContain('--ev-swatch-color:#536AC2')
    // Подсказка Field связана с полем.
    expect(out).toMatch(/aria-describedby="[^"]+-hint"/)
    expect(out).not.toContain('aria-invalid')
    expect(out).not.toContain('type="color"')
  })

  it('разные значения у нескольких объектов и поле без палитры', () => {
    const out = renderToString(<ColorField value={undefined} onChange={() => undefined} aria-label="Цвет текста" disabled />)
    expect(out).toContain('placeholder="Разные"')
    expect(out).toContain('data-empty=""')
    expect(out).toContain('disabled=""')
    expect(out).not.toContain('выбрать из палитры')
  })

  it('ошибка снаружи помечает поле', () => {
    const out = renderToString(<ColorField value="#000000" onChange={() => undefined} aria-label="Цвет" invalid />)
    expect(out).toContain('aria-invalid="true"')
  })
})
