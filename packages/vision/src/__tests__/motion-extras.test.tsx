import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DonutChart, donutArcs, donutArcsAt } from '../components/charts/DonutChart'
import { Gauge } from '../components/charts/Gauge'
import { Progress } from '../components/Display'
import { revealSegments, RingProgress, ringSegments } from '../components/RingProgress'
import { UptimeBar, uptimeStagger, type UptimeDay } from '../components/UptimeBar'
import { MotionProvider } from '../lib/motion'
import { countUpText, decimalsOf, roundLike } from '../lib/motion-values'
import { renderRu } from './render-ru'

/* ------------------------------------------------------------------ */
/* Чистые помощники                                                    */
/* ------------------------------------------------------------------ */

describe('Анимация появления: помощники', () => {
  it('знаки после запятой и округление промежуточного значения', () => {
    expect(decimalsOf(12)).toBe(0)
    expect(decimalsOf(96.4)).toBe(1)
    expect(decimalsOf(0.125)).toBe(3)
    expect(decimalsOf(1e-9)).toBe(6)
    expect(decimalsOf(Number.NaN)).toBe(0)
    expect(roundLike(57.38291, 96.4)).toBe(57.4)
    expect(roundLike(1234.56, 12550)).toBe(1235)
    expect(roundLike(96.4, 96.4)).toBe(96.4)
  })

  it('countUpText: без анимации - только итог, с анимацией - видимый кадр и скрытый итог', () => {
    expect(countUpText(false, '10%', '64%')).toBe('64%')
    const html = renderToString(<p>{countUpText(true, '10%', '64%')}</p>)
    expect(html).toContain('<span aria-hidden="true">10%</span>')
    expect(html).toContain('<span class="ev-visually-hidden">64%</span>')
  })

  it('кадр кольцевой диаграммы: углы умножены на t, узкие сектора схлопнуты', () => {
    const arcs = donutArcs([1, 1, 2])
    expect(donutArcsAt(arcs, 1)).toEqual(arcs)
    const half = donutArcsAt(arcs, 0.5)
    expect(half[0]!.end).toBeCloseTo(Math.PI / 4)
    expect(half[2]!.end).toBeCloseTo(Math.PI)
    expect(donutArcsAt(arcs, 0).every((a) => a.end === a.start)).toBe(true)
    // Сектор в 0,1% оборота в первых кадрах не рисуется, крупные - рисуются.
    const tiny = donutArcsAt(donutArcs([999, 1]), 0.1)
    expect(tiny[1]!.end).toBe(tiny[1]!.start)
    expect(tiny[0]!.end).toBeGreaterThan(tiny[0]!.start)
  })

  it('кадр кольцевого прогресса: сегменты заполняются по очереди, зазоры сохраняются', () => {
    const segs = ringSegments([25, 25], 100, 100, 2)
    expect(revealSegments(segs, 1)).toEqual(segs)
    expect(revealSegments(segs, 0).every((s) => s.length === 0)).toBe(true)
    const mid = revealSegments(segs, 0.4)
    // Конец последнего сегмента - 25 + 23 = 48; 40% от него - 19,2.
    expect(mid[0]).toEqual({ offset: 0, length: 19.2 })
    expect(mid[1]).toEqual({ offset: 25, length: 0 })
    const late = revealSegments(segs, 0.75)
    expect(late[0]!.length).toBe(23)
    expect(late[1]!.length).toBe(11)
  })

  it('тайминги полосы доступности укладываются в длительность', () => {
    const { rise, step } = uptimeStagger(90, 900)
    expect(rise).toBe(405)
    expect(rise + step * 89).toBeCloseTo(900, 0)
    expect(uptimeStagger(1, 900).step).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/* Серверный рендер: итоговое состояние, без data-ev-motion            */
/* ------------------------------------------------------------------ */

const strip = (html: string) => html.replace(/_R_[a-zA-Z0-9_]+_/g, 'ID').replace(/:r[0-9a-z]+:/g, 'ID')

/** С animate и под MotionProvider серверная разметка та же, что без анимации. */
function expectSameSsr(plain: ReactElement, animated: ReactElement) {
  const base = strip(renderRu(plain))
  const withProp = strip(renderRu(animated))
  const withProvider = strip(renderRu(<MotionProvider>{plain}</MotionProvider>))
  expect(withProp).not.toContain('data-ev-motion')
  expect(withProp).not.toContain('data-ev-drawing')
  expect(withProp).toBe(base)
  expect(withProvider).toBe(base)
}

const DONUT = [
  { name: 'Север', v: 4200 },
  { name: 'Юг', v: 3100 },
  { name: 'Восток', v: 5250 },
]

describe('Анимация появления: серверный рендер', () => {
  it('DonutChart: все сектора и сумма - итоговые', () => {
    const el = (animate?: boolean) => (
      <DonutChart data={DONUT} label={(d) => d.name} value={(d) => d.v} aria-label="Выработка" animate={animate} animationDuration={600} />
    )
    expectSameSsr(el(), el(true))
    const html = renderRu(el(true))
    expect(html.split('class="ev-donut-slice"').length - 1).toBe(3)
    expect(html).toMatch(/ev-donut-center-value[^>]*>12\s550</)
  })

  it('Gauge: дуга и число - итоговые, aria-valuenow - значение', () => {
    const el = (animate?: boolean) => (
      <Gauge value={72} thresholds={[{ value: 60, tone: 'warning' }]} aria-label="Загрузка" animate={animate} />
    )
    expectSameSsr(el(), el(true))
    const html = renderRu(el(true))
    expect(html).toContain('aria-valuenow="72"')
    expect(html).toContain('stroke-dasharray="72 200"')
    expect(html).toMatch(/ev-gauge-value[^>]*>72</)
  })

  it('RingProgress: кольцо и процент - итоговые, превышение сохраняется', () => {
    const one = (animate?: boolean) => <RingProgress value={130} aria-label="План" animate={animate} />
    expectSameSsr(one(), one(true))
    const html = renderRu(one(true))
    expect(html).toContain('aria-valuenow="100"')
    expect(html).toContain('aria-valuetext="130%"')
    expect(html).toContain('data-over="true"')
    expect(html).toContain('>130%<')

    const multi = (animate?: boolean) => (
      <RingProgress
        sections={[
          { value: 30, label: 'Диск' },
          { value: 20, label: 'Почта' },
        ]}
        aria-label="Хранилище"
        animate={animate}
      />
    )
    expectSameSsr(multi(), multi(true))
    expect(renderRu(multi(true))).toContain('Хранилище. Диск: 30%, Почта: 20%')
  })

  it('RingProgress: своя подпись с числом при включённой анимации - итоговый текст', () => {
    const html = renderRu(<RingProgress value={70} label="7/10" aria-label="Шаги" animate />)
    expect(html).toContain('7/10')
    expect(html).not.toContain('data-ev-motion')
  })

  it('Progress: ширина и значение - итоговые, неопределённый не меняется', () => {
    const el = (animate?: boolean) => <Progress value={64} label="Сборка" showValue animate={animate} />
    expectSameSsr(el(), el(true))
    const html = renderRu(el(true))
    expect(html).toContain('aria-valuenow="64"')
    expect(html).toContain('width:64%')
    expect(html).toContain('>64%<')

    const fn = (animate?: boolean) => <Progress value={120} max={100} showValue={(v, m) => `${v} из ${m}`} aria-label="Квота" animate={animate} />
    expectSameSsr(fn(), fn(true))
    expect(renderRu(fn(true))).toContain('120 из 100')

    const busy = (animate?: boolean) => <Progress value={null} aria-label="Загрузка" animate={animate} />
    expectSameSsr(busy(), busy(true))
  })

  it('UptimeBar: все дни на месте, без переменных анимации', () => {
    const days: UptimeDay[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      status: i === 4 ? 'outage' : 'operational',
    }))
    const el = (animate?: boolean) => <UptimeBar days={days} showRange animate={animate} />
    expectSameSsr(el(), el(true))
    const html = renderRu(el(true))
    expect(html.split('class="ev-uptime-day"').length - 1).toBe(10)
    expect(html).not.toContain('--ev-i')
    expect(html).not.toContain('--ev-motion')
  })
})
