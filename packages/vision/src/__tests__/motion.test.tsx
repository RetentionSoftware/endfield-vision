import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AnimatedNumber, AnimatedText } from '../components/AnimatedNumber'
import { StatTile } from '../components/Display'
import { LocaleProvider } from '../lib/i18n'
import { easeOutCubic, formatNumericText, MotionProvider, parseNumericText } from '../lib/motion'

const ru = (el: React.ReactElement) => renderToString(<LocaleProvider locale="ru">{el}</LocaleProvider>).replace(/<!-- -->/g, '')

describe('замедление', () => {
  it('границы и монотонность', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('число в строке', () => {
  it('русский формат: пробелы разрядов, запятая, префикс и суффикс', () => {
    const p = parseNumericText('12 845 000 ₽', 'ru-RU')!
    expect(p).toMatchObject({ prefix: '', value: 12845000, suffix: ' ₽', decimals: 0, grouping: true })
    expect(formatNumericText(p, 6422500, 'ru-RU').replace(/\s/g, ' ')).toBe('6 422 500 ₽')

    const pct = parseNumericText('96,4%', 'ru-RU')!
    expect(pct).toMatchObject({ value: 96.4, decimals: 1, suffix: '%' })
    expect(formatNumericText(pct, 48.25, 'ru-RU')).toBe('48,3%')
  })

  it('неразрывные пробелы из Intl и знак', () => {
    const p = parseNumericText('+4 318 ед.', 'ru-RU')!
    expect(p).toMatchObject({ prefix: '+', value: 4318, suffix: ' ед.' })
    expect(parseNumericText('-12,5', 'ru-RU')!.value).toBe(-12.5)
  })

  it('английский формат: запятая разрядов, точка дроби', () => {
    const p = parseNumericText('$1,234.50 total', 'en-US')!
    expect(p).toMatchObject({ prefix: '$', value: 1234.5, suffix: ' total', decimals: 2, grouping: true })
    expect(formatNumericText(p, 617.25, 'en-US')).toBe('$617.25 total')
  })

  it('без числа - null', () => {
    expect(parseNumericText('нет данных', 'ru-RU')).toBeNull()
  })
})

describe('серверный рендер', () => {
  it('анимация на сервере не меняет разметку: итоговое значение один раз', () => {
    const plain = ru(<StatTile label="Запасы" value="12 845 000 ₽" />)
    const animated = ru(
      <MotionProvider>
        <StatTile label="Запасы" value="12 845 000 ₽" animate />
      </MotionProvider>,
    )
    expect(animated).toContain('12 845 000 ₽')
    expect(animated).not.toContain('data-ev-motion')
    expect(animated.match(/12 845 000 ₽/g)).toHaveLength(1)
    expect(plain).toContain('12 845 000 ₽')
  })

  it('AnimatedNumber: формат по языку и свой формат', () => {
    expect(ru(<AnimatedNumber value={4318} animate />)).toMatch(/4\s318/)
    expect(ru(<AnimatedNumber value={0.5} format={(v) => `${Math.round(v * 100)}%`} />)).toContain('50%')
  })

  it('AnimatedText: узел без числа выводится как есть', () => {
    expect(ru(<AnimatedText animate>{<b>готово</b>}</AnimatedText>)).toBe('<b>готово</b>')
  })
})
