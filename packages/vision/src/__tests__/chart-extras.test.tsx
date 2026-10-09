import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { annularSectorPath, DonutChart, donutArcs, groupSlices, paddedSectorPath, polarPoint } from '../components/charts/DonutChart'
import { Gauge, gaugeBands, gaugeFraction, gaugeTone } from '../components/charts/Gauge'
import { buildCalendarGrid, Heatmap, heatLevel, HeatmapMatrix, isoWeekday, resolveCalendarRange } from '../components/charts/Heatmap'
import { RingProgress, ringSegments } from '../components/RingProgress'
import { renderRu } from './render-ru'

const count = (s: string, sub: string) => s.split(sub).length - 1

/* ------------------------------------------------------------------ */
/* DonutChart                                                          */
/* ------------------------------------------------------------------ */

describe('DonutChart: геометрия', () => {
  it('точка на окружности: 0 - вверх, четверть оборота - вправо', () => {
    expect(polarPoint(50, 50, 10, 0)).toEqual([50, 40])
    expect(polarPoint(50, 50, 10, Math.PI / 2)).toEqual([60, 50])
    expect(polarPoint(50, 50, 10, Math.PI)).toEqual([50, 60])
  })

  it('углы секторов делят оборот пропорционально, отрицательные - как 0', () => {
    const arcs = donutArcs([1, 1, 2, -5])
    expect(arcs[0]).toEqual({ start: 0, end: Math.PI / 2 })
    expect(arcs[1]!.end).toBeCloseTo(Math.PI)
    expect(arcs[2]!.end).toBeCloseTo(Math.PI * 2)
    expect(arcs[3]!.end - arcs[3]!.start).toBe(0)
    expect(donutArcs([0, 0]).every((a) => a.start === 0 && a.end === 0)).toBe(true)
  })

  it('сектор кольца: дуги внешнего и внутреннего радиуса, флаг большой дуги', () => {
    const quarter = annularSectorPath(50, 50, 40, 30, 0, Math.PI / 2)
    expect(quarter).toBe('M50,10A40,40 0 0 1 90,50L80,50A30,30 0 0 0 50,20Z')
    const big = annularSectorPath(50, 50, 40, 30, 0, Math.PI * 1.5)
    expect(big).toContain('A40,40 0 1 1')
    expect(annularSectorPath(50, 50, 40, 30, 1, 1)).toBe('')
  })

  it('полный оборот - две полуокружности на радиус (дырка evenodd)', () => {
    const full = annularSectorPath(50, 50, 40, 30, 0, Math.PI * 2)
    expect(count(full, 'A40,40')).toBe(2)
    expect(count(full, 'A30,30')).toBe(2)
  })

  it('зазор: начало сектора сдвинуто, у единственного сектора зазора нет', () => {
    const arc = { start: 0, end: Math.PI / 2 }
    const padded = paddedSectorPath(50, 50, 40, 30, arc, 2, false)
    expect(padded.startsWith('M51,')).toBe(true)
    expect(paddedSectorPath(50, 50, 40, 30, arc, 2, true)).toBe(annularSectorPath(50, 50, 40, 30, 0, Math.PI / 2))
  })

  it('группировка: крупнейшие maxSlices - 1 в исходном порядке, остальное - в «Прочее»', () => {
    const items = [5, 1, 9, 2, 7, 3]
    const { kept, rest } = groupSlices(items, (v) => v, 4)
    expect(kept).toEqual([5, 9, 7])
    expect(rest).toEqual([1, 2, 3])
    expect(groupSlices(items, (v) => v, 6).rest).toEqual([])
    expect(groupSlices(items, (v) => v).kept).toHaveLength(6)
  })
})

describe('DonutChart: разметка', () => {
  const energy = [
    { name: 'Цех 1', mwh: 500 },
    { name: 'Цех 2', mwh: 300 },
    { name: 'Склад', mwh: 200 },
  ]

  it('img с заголовком, сектора по палитре, легенда со значением и долей', () => {
    const out = renderRu(<DonutChart aria-label="Энергия" data={energy} label={(d) => d.name} value={(d) => d.mwh} />)
    expect(out).toContain('role="img"')
    expect(out).toContain('<title')
    expect(out).toContain('Энергия')
    expect(count(out, 'class="ev-donut-slice"')).toBe(3)
    expect(out).toContain('var(--ev-chart-1)')
    expect(out).toContain('var(--ev-chart-3)')
    expect(out).toContain('data-legend="right"')
    // Сумма и подпись в центре.
    expect(out).toContain('Всего')
    expect(out).toMatch(/1\s000/)
    // Значения и доли в легенде.
    expect(out).toMatch(/ev-donut-legend-share ev-num">50\s%/)
    expect(out).toMatch(/ev-donut-legend-share ev-num">30\s%/)
    expect(out).toMatch(/ev-donut-legend-share ev-num">20\s%/)
    // Скрытая таблица.
    expect(out).toContain('<div class="ev-visually-hidden"><table>')
  })

  it('maxSlices: мелкие доли - в «Прочее»', () => {
    const data = [
      { k: 'a', v: 40 },
      { k: 'b', v: 5 },
      { k: 'c', v: 30 },
      { k: 'd', v: 15 },
      { k: 'e', v: 10 },
    ]
    const out = renderRu(<DonutChart aria-label="Задачи" data={data} label={(d) => d.k} value={(d) => d.v} maxSlices={3} />)
    expect(count(out, 'class="ev-donut-legend-item"')).toBe(3)
    expect(out).toContain('Прочее')
    // Прочее = 5 + 15 + 10 = 30.
    expect(out).toMatch(/Прочее<\/span><span class="ev-donut-legend-value ev-num">30</)
  })

  it('нулевая сумма - пустое состояние без легенды и фокуса', () => {
    const out = renderRu(<DonutChart aria-label="Пусто" data={[{ v: 0 }]} label={() => 'x'} value={(d) => d.v} />)
    expect(out).toContain('Нет данных за период')
    expect(out).toContain('ev-donut-track')
    expect(out).not.toContain('ev-donut-legend')
    expect(out).not.toContain('tabindex')
  })

  it('английский словарь и свой центр, легенда снизу', () => {
    const en = renderToString(<DonutChart aria-label="E" data={energy} label={(d) => d.name} value={(d) => d.mwh} maxSlices={2} legend="bottom" center="MWh" />)
    expect(en).toContain('Other')
    expect(en).toContain('data-legend="bottom"')
    expect(en).toContain('MWh')
  })
})

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

describe('Heatmap: уровни и календарь', () => {
  it('уровни интенсивности 0..4', () => {
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(-1, 10)).toBe(0)
    expect(heatLevel(Number.NaN, 10)).toBe(0)
    expect(heatLevel(5, 0)).toBe(0)
    expect(heatLevel(0.1, 10)).toBe(1)
    expect(heatLevel(2.5, 10)).toBe(1)
    expect(heatLevel(2.6, 10)).toBe(2)
    expect(heatLevel(5, 10)).toBe(2)
    expect(heatLevel(7.5, 10)).toBe(3)
    expect(heatLevel(10, 10)).toBe(4)
    expect(heatLevel(25, 10)).toBe(4)
  })

  it('день недели с понедельника', () => {
    expect(isoWeekday('2026-10-05')).toBe(0)
    expect(isoWeekday('2026-10-08')).toBe(3)
    expect(isoWeekday('2026-10-11')).toBe(6)
    expect(isoWeekday('bad')).toBe(-1)
  })

  it('период: конец из данных, начало - понедельник за weeks недель', () => {
    expect(resolveCalendarRange({ to: '2026-10-08', weeks: 26 })).toEqual({ from: '2026-04-13', to: '2026-10-08' })
    expect(resolveCalendarRange({ weeks: 1, dates: ['2026-10-01', '2026-10-08', '2026-09-30'] })).toEqual({ from: '2026-10-05', to: '2026-10-08' })
    expect(resolveCalendarRange({ dates: [] })).toBeNull()
    expect(resolveCalendarRange({ from: '2026-10-09', to: '2026-10-08' })).toBeNull()
  })

  it('сетка: 26 колонок, понедельник первым, дни вне периода пустые', () => {
    const grid = buildCalendarGrid({ from: '2026-04-13', to: '2026-10-08' })
    expect(grid.weeks).toHaveLength(26)
    expect(grid.weeks[0]![0]).toBe('2026-04-13')
    expect(grid.weeks[0]![6]).toBe('2026-04-19')
    const last = grid.weeks[25]!
    expect(last.slice(0, 4)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'])
    expect(last.slice(4)).toEqual([null, null, null])
  })

  it('явный from в середине недели: начало колонки пустое', () => {
    const grid = buildCalendarGrid({ from: '2026-10-01', to: '2026-10-11' })
    expect(grid.weeks).toHaveLength(2)
    expect(grid.weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
  })

  it('подписи месяцев: над первой неделей нового месяца', () => {
    const grid = buildCalendarGrid({ from: '2026-04-13', to: '2026-10-08' })
    expect(grid.months.map((m) => [m.column, m.month])).toEqual([
      [0, 3],
      [3, 4],
      [7, 5],
      [12, 6],
      [16, 7],
      [21, 8],
      [25, 9],
    ])
    // Первая подпись убирается, если следующая ближе трёх колонок.
    const tight = buildCalendarGrid({ from: '2026-04-27', to: '2026-06-30' })
    expect(tight.months[0]!.month).toBe(4)
  })
})

describe('Heatmap: разметка', () => {
  const days = Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, value: i % 5 }))

  it('grid, 7 строк с подписями дней, клетки с датой и значением, одна остановка Tab', () => {
    const out = renderRu(<Heatmap aria-label="Инциденты" days={days} to="2026-10-08" weeks={26} />)
    expect(out).toContain('role="grid"')
    expect(out).toContain('aria-label="Инциденты"')
    expect(count(out, 'role="row"')).toBe(7)
    expect(count(out, 'role="rowheader"')).toBe(7)
    expect(out).toMatch(/role="rowheader" class="ev-heatmap-rowhead">Пн</)
    // 26 недель × 7 = 182 клетки, из них 3 после 08.10 - пустые.
    expect(count(out, 'role="gridcell"')).toBe(182)
    expect(count(out, 'data-void')).toBe(3)
    expect(count(out, 'tabindex="0"')).toBe(1)
    expect(out).toContain('aria-label="04.09.2026: 3"')
    // Фокус по умолчанию - на последнем дне периода.
    expect(out).toMatch(/aria-label="08\.10\.2026: 0" tabindex="0"/)
    // Подписи месяцев и легенда.
    expect(out).toContain('>Апр<')
    expect(out).toContain('>Окт<')
    expect(out).toContain('Меньше')
    expect(out).toContain('Больше')
    expect(count(out, 'class="ev-heatmap-swatch"')).toBe(5)
  })

  it('уровни клеток по максимуму данных', () => {
    const out = renderRu(<Heatmap aria-label="H" days={days} to="2026-09-30" weeks={5} />)
    // Максимум 4: значение 4 - уровень 4, 1 - уровень 1, 0 - уровень 0.
    expect(out).toMatch(/data-level="4"[^>]*aria-label="05\.09\.2026: 4"/)
    expect(out).toMatch(/data-level="1"[^>]*aria-label="02\.09\.2026: 1"/)
    expect(out).toMatch(/data-level="0"[^>]*aria-label="01\.09\.2026: 0"/)
  })

  it('без конца периода и данных - пустое состояние', () => {
    const out = renderRu(<Heatmap aria-label="H" days={[]} />)
    expect(out).toContain('Нет данных за период')
    expect(out).not.toContain('role="grid"')
  })

  it('матрица: заголовки колонок и строк, подпись клетки «строка, колонка: значение»', () => {
    const out = renderRu(
      <HeatmapMatrix
        aria-label="Нагрузка"
        rows={['Пн', 'Вт']}
        columns={['00', '01', '02']}
        values={[
          [0, 5, 10],
          [2, 4],
        ]}
        columnLabelStep={2}
      />,
    )
    expect(count(out, 'role="columnheader"')).toBe(4)
    expect(count(out, 'role="row"')).toBe(3)
    expect(count(out, 'role="gridcell"')).toBe(6)
    expect(out).toContain('aria-label="Пн, 02: 10"')
    expect(out).toContain('aria-label="Вт, 02: 0"')
    expect(count(out, 'class="ev-heatmap-colhead" data-quiet')).toBe(1)
    expect(renderRu(<HeatmapMatrix aria-label="M" rows={[]} columns={[]} values={[]} />)).toContain('Нет данных за период')
  })
})

/* ------------------------------------------------------------------ */
/* RingProgress                                                        */
/* ------------------------------------------------------------------ */

describe('RingProgress', () => {
  it('progressbar с процентом в центре', () => {
    const out = renderRu(<RingProgress value={42} aria-label="План" />)
    expect(out).toContain('role="progressbar"')
    expect(out).toContain('aria-valuenow="42"')
    expect(out).toContain('aria-valuemax="100"')
    expect(out).toContain('aria-label="План"')
    expect(out).toContain('42%')
    expect(out).toContain('data-tone="accent"')
  })

  it('превышение: тон превышения, кольцо замкнуто, реальный процент', () => {
    const out = renderRu(<RingProgress value={130} max={100} aria-label="Лимит" />)
    expect(out).toContain('data-over="true"')
    expect(out).toContain('data-tone="danger"')
    expect(out).toContain('aria-valuenow="100"')
    expect(out).toContain('aria-valuetext="130%"')
    expect(out).toContain('130%')
    expect(out).toContain('stroke-dashoffset="0"')
  })

  it('нулевое значение без дуги, свой центр', () => {
    const out = renderRu(<RingProgress value={0} label="-" aria-label="Пусто" />)
    expect(out).not.toContain('ev-ring-bar')
    expect(out).toContain('>-<')
  })

  it('сегменты: role="img" с перечислением, цвета по тонам', () => {
    const out = renderRu(
      <RingProgress
        aria-label="Смена"
        sections={[
          { value: 50, tone: 'success', label: 'Работа' },
          { value: 20, tone: 'warning', label: 'Простой' },
        ]}
      />,
    )
    expect(out).toContain('role="img"')
    expect(out).toContain('aria-label="Смена. Работа: 50%, Простой: 20%"')
    expect(out).toContain('stroke:var(--ev-success)')
    expect(out).toContain('stroke:var(--ev-warning)')
    expect(out).toContain('70%')
  })

  it('длины сегментов с зазором и обрезкой по кругу', () => {
    const segs = ringSegments([50, 30, 40], 100, 100, 2)
    expect(segs[0]).toEqual({ length: 48, offset: 0 })
    expect(segs[1]).toEqual({ length: 28, offset: 50 })
    // 80 + 40 > 100: третий сегмент - только до конца круга.
    expect(segs[2]!.offset).toBe(80)
    expect(segs[2]!.length).toBe(18)
    expect(ringSegments([60], 100, 100, 2)[0]).toEqual({ length: 60, offset: 0 })
  })
})

/* ------------------------------------------------------------------ */
/* Gauge                                                               */
/* ------------------------------------------------------------------ */

describe('Gauge', () => {
  const thresholds = [
    { value: 6, tone: 'warning' as const },
    { value: 8, tone: 'danger' as const },
  ]

  it('доля, тон и зоны по порогам', () => {
    expect(gaugeFraction(5, 0, 10)).toBe(0.5)
    expect(gaugeFraction(-1, 0, 10)).toBe(0)
    expect(gaugeFraction(12, 0, 10)).toBe(1)
    expect(gaugeFraction(5, 10, 10)).toBe(0)
    expect(gaugeTone(5, thresholds, 'success')).toBe('success')
    expect(gaugeTone(6, thresholds, 'success')).toBe('warning')
    expect(gaugeTone(9, thresholds, 'success')).toBe('danger')
    expect(gaugeBands(thresholds, 0, 10, 'success')).toEqual([
      { from: 0, to: 0.6, tone: 'success' },
      { from: 0.6, to: 0.8, tone: 'warning' },
      { from: 0.8, to: 1, tone: 'danger' },
    ])
  })

  it('meter со значениями, тон зоны значения', () => {
    const out = renderRu(<Gauge aria-label="Давление" value={7.2} min={0} max={10} thresholds={thresholds} tone="success" caption="бар" />)
    expect(out).toContain('role="meter"')
    expect(out).toContain('aria-valuenow="7.2"')
    expect(out).toContain('aria-valuemin="0"')
    expect(out).toContain('aria-valuemax="10"')
    // Содержимое meter не читается: подпись-строка - часть aria-valuetext.
    expect(out).toContain('aria-valuetext="7,2 бар"')
    expect(out).not.toContain('aria-describedby')
    expect(out).toContain('data-tone="warning"')
    expect(count(out, 'class="ev-gauge-band"')).toBe(3)
    expect(out).toContain('бар')
  })

  it('без подписи - только значение', () => {
    const out = renderRu(<Gauge aria-label="Давление" value={7.2} max={10} />)
    expect(out).toContain('aria-valuetext="7,2"')
    expect(out).not.toContain('aria-describedby')
    expect(out).not.toContain('ev-gauge-caption')
  })

  it('подпись-разметка связана через aria-describedby', () => {
    const out = renderRu(
      <Gauge aria-label="Выработка" value={78} format={(v) => `${v}%`} caption={<span>4 680 из 6 000 ед.</span>} />,
    )
    expect(out).toContain('aria-valuetext="78%"')
    const id = /aria-describedby="([^"]+)"/.exec(out)?.[1]
    expect(id).toBeTruthy()
    expect(out).toContain(`<span id="${id}" class="ev-gauge-caption">`)
  })
})
