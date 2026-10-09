import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import {
  AreaChart,
  BAR_STAGGER,
  BarChart,
  HEAT_STAGGER,
  LINE_STAGGER,
  LineChart,
  motionDelayStyle,
  motionRootProps,
  Sparkline,
  staggerDelay,
  staggerItemDuration,
} from '../components/charts/Charts'
import { Heatmap, HeatmapMatrix } from '../components/charts/Heatmap'
import { MotionProvider, type EntranceMotion } from '../lib/motion'
import { renderRu } from './render-ru'

/* ------------------------------------------------------------------ */
/* Волна: задержки и длительность элемента                              */
/* ------------------------------------------------------------------ */

describe('staggerDelay', () => {
  it('от 0 у первого до duration * spread у последнего, равными шагами', () => {
    expect(staggerDelay(0, 5, 1000, 0.4)).toBe(0)
    expect(staggerDelay(1, 5, 1000, 0.4)).toBe(100)
    expect(staggerDelay(2, 5, 1000, 0.4)).toBe(200)
    expect(staggerDelay(4, 5, 1000, 0.4)).toBe(400)
  })

  it('один элемент и нулевая длительность - без задержки', () => {
    expect(staggerDelay(0, 1, 900, 0.4)).toBe(0)
    expect(staggerDelay(0, 0, 900, 0.4)).toBe(0)
    expect(staggerDelay(3, 5, 0, 0.4)).toBe(0)
  })

  it('индекс вне диапазона и spread вне 0..1 ограничиваются', () => {
    expect(staggerDelay(-2, 5, 1000, 0.4)).toBe(0)
    expect(staggerDelay(10, 5, 1000, 0.4)).toBe(400)
    expect(staggerDelay(4, 5, 1000, 3)).toBe(1000)
    expect(staggerDelay(4, 5, 1000, -1)).toBe(0)
  })

  it('задержки округлены до мс и не убывают', () => {
    const delays = Array.from({ length: 13 }, (_, i) => staggerDelay(i, 13, 900, BAR_STAGGER))
    for (const d of delays) expect(Number.isInteger(d)).toBe(true)
    for (let i = 1; i < delays.length; i++) expect(delays[i]!).toBeGreaterThanOrEqual(delays[i - 1]!)
  })
})

describe('staggerItemDuration', () => {
  it('один элемент - вся длительность, волна - остаток после последней задержки', () => {
    expect(staggerItemDuration(1, 900, BAR_STAGGER)).toBe(900)
    expect(staggerItemDuration(12, 1000, BAR_STAGGER)).toBe(600)
    expect(staggerItemDuration(2, 1000, LINE_STAGGER)).toBe(800)
    expect(staggerItemDuration(26, 1000, HEAT_STAGGER)).toBe(500)
  })

  it('вся волна укладывается в длительность', () => {
    for (const [n, spread] of [
      [12, BAR_STAGGER],
      [3, LINE_STAGGER],
      [26, HEAT_STAGGER],
    ] as const) {
      const end = staggerDelay(n - 1, n, 900, spread) + staggerItemDuration(n, 900, spread)
      expect(Math.abs(end - 900)).toBeLessThanOrEqual(1)
    }
  })

  it('отрицательная длительность - 0', () => {
    expect(staggerItemDuration(3, -100, 0.4)).toBe(0)
  })
})

describe('motionRootProps / motionDelayStyle', () => {
  const at = (phase: EntranceMotion['phase'], duration = 900): EntranceMotion => ({
    phase,
    duration,
    attr: phase === 'static' ? undefined : phase,
  })

  it("на 'static' - ни атрибута, ни стилей", () => {
    expect(motionRootProps(at('static'), 10, BAR_STAGGER)).toEqual({})
    expect(motionDelayStyle(at('static'), 3, 10, BAR_STAGGER)).toBeUndefined()
  })

  it('idle и run - атрибут фазы и длительности в CSS-переменных', () => {
    expect(motionRootProps(at('idle', 1000), 11, BAR_STAGGER)).toEqual({
      'data-ev-motion': 'idle',
      style: { '--ev-motion-dur': '1000ms', '--ev-motion-item': '600ms' },
    })
    expect(motionRootProps(at('run', 1000), 1, LINE_STAGGER).style).toEqual({ '--ev-motion-dur': '1000ms', '--ev-motion-item': '1000ms' })
    expect(motionDelayStyle(at('run', 1000), 5, 11, BAR_STAGGER)).toEqual({ '--ev-motion-delay': '200ms' })
  })
})

/* ------------------------------------------------------------------ */
/* Серверный рендер: анимация не меняет разметку                       */
/* ------------------------------------------------------------------ */

const data = [
  { x: 'Пн', a: 3, b: 5 },
  { x: 'Вт', a: 7, b: 2 },
  { x: 'Ср', a: 4, b: 6 },
]
const series = [
  { key: 'a', label: 'Серия А', value: (d: (typeof data)[number]) => d.a },
  { key: 'b', label: 'Серия Б', value: (d: (typeof data)[number]) => d.b },
]
const days = [
  { date: '2026-09-01', value: 2 },
  { date: '2026-09-15', value: 5 },
  { date: '2026-10-08', value: 1 },
]

/** Пары: без анимации и с animate - серверная разметка обязана совпасть. */
const cases: Array<[string, (animate?: boolean) => ReactElement]> = [
  ['BarChart', (animate) => <BarChart aria-label="Столбцы" data={data} x={(d) => d.x} series={series} animate={animate} />],
  ['BarChart stacked', (animate) => <BarChart aria-label="Стопки" data={data} x={(d) => d.x} series={series} stacked animate={animate} />],
  ['LineChart', (animate) => <LineChart aria-label="Линии" data={data} x={(d) => d.x} series={series} animate={animate} animationDuration={600} />],
  ['AreaChart', (animate) => <AreaChart aria-label="Области" data={data} x={(d) => d.x} series={series} animate={animate} />],
  ['Sparkline', (animate) => <Sparkline values={[1, 4, 2, 6]} aria-label="Тренд" animate={animate} />],
  ['Sparkline auto', (animate) => <Sparkline values={[1, 4, 2, 6]} width="auto" animate={animate} animationDuration={500} />],
  ['Heatmap', (animate) => <Heatmap aria-label="Активность" days={days} to="2026-10-08" weeks={8} animate={animate} />],
  [
    'HeatmapMatrix',
    (animate) => <HeatmapMatrix aria-label="Нагрузка" rows={['Пн', 'Вт']} columns={['0', '6', '12', '18']} values={[[1, 2, 3, 4], [0, 5, 1, 2]]} animate={animate} />,
  ],
]

describe('анимация появления: серверный рендер', () => {
  for (const [name, make] of cases) {
    it(`${name}: с animate разметка без data-ev-motion и как без анимации`, () => {
      const plain = renderRu(make())
      const animated = renderRu(make(true))
      expect(animated).not.toContain('data-ev-motion')
      expect(animated).not.toContain('--ev-motion')
      expect(animated).not.toContain('pathLength')
      expect(animated).toBe(plain)
    })

    it(`${name}: MotionProvider тоже не меняет серверную разметку`, () => {
      const plain = renderRu(make())
      const viaProvider = renderRu(<MotionProvider>{make()}</MotionProvider>)
      expect(viaProvider).toBe(plain)
    })
  }

  it('скрытая таблица для скринридера на месте', () => {
    const out = renderRu(<BarChart aria-label="Столбцы" data={data} x={(d) => d.x} series={series} animate />)
    expect(out).toContain('ev-visually-hidden')
    expect(out).toContain('<caption>Столбцы</caption>')
  })
})
