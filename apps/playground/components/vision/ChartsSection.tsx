'use client'

import { AreaChart, BarChart, Card, LineChart, Sparkline, StatTile } from 'endfield-vision'
import { Factory, Truck, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { formatNum, formatRub, formatRubShort } from '@/lib/format'
import s from './vision.module.css'

interface DayPoint {
  day: string
  label: string
  /** Отгрузок за день. */
  shipped: number
  /** Из них в срок. */
  onTime: number
  /** Выпуск, ед. */
  output: number
  /** План выпуска, ед. */
  plan: number
  /** Выручка, копейки. */
  revenue: number
}

/** 30 дней сентября 2026: детерминированные ряды без Math.random. */
const DAYS: DayPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = i + 1
  const weekend = i % 7 === 5 || i % 7 === 6
  const shipped = Math.round(26 + 8 * Math.sin(i / 3) + (weekend ? -10 : 0) + i * 0.35)
  const output = Math.round(5400 + 380 * Math.sin(i / 4.2) + (weekend ? -600 : 0) + i * 9)
  return {
    day: `2026-09-${String(d).padStart(2, '0')}`,
    label: `${String(d).padStart(2, '0')}.09`,
    shipped,
    onTime: Math.max(0, shipped - 1 - (i % 4)),
    output,
    plan: weekend ? 5000 : 5600,
    revenue: shipped * 4_850_000,
  }
})

const SMALL = DAYS.slice(-7).map((d, i) => ({ ...d, incidents: [0, 1, 0, 2, 1, 0, 3][i] ?? 0 }))

export function ChartsSection() {
  return (
    <div className={s.section}>
      <p className={s.text}>
        Графики на SVG без сторонних библиотек: цвета серий - токены <code>--ev-chart-1..8</code>, подсказка по наведению и с
        клавиатуры (фокус на графике, стрелки), ширина подстраивается под контейнер. Деньги - в копейках, форматирование - через{' '}
        <code>format</code> и <code>formatAxis</code>. <code>Sparkline</code> - ширина в px или <code>width=&quot;auto&quot;</code>{' '}
        по контейнеру (плитка «Отгрузок»).
      </p>
      <div className="ev-grid" style={{ '--ev-grid-min': '220px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile
          label="Выпуск за сентябрь"
          value={formatNum(DAYS.reduce((a, d) => a + d.output, 0))}
          icon={<Factory size={16} />}
          delta={3.8}
          deltaLabel="к августу"
          trend={<Sparkline values={DAYS.slice(-14).map((d) => d.output)} aria-label="Выпуск за 14 дней" />}
        />
        <StatTile
          label="Отгрузок"
          value={formatNum(DAYS.reduce((a, d) => a + d.shipped, 0))}
          icon={<Truck size={16} />}
          tone="info"
          trend={<Sparkline width="auto" values={DAYS.slice(-14).map((d) => d.shipped)} color="var(--ev-chart-3)" aria-label="Отгрузки за 14 дней" />}
        />
        <StatTile
          label="Потребление, МВт·ч"
          value="12 480"
          icon={<Zap size={16} />}
          tone="warning"
          delta={6.1}
          positiveIsGood={false}
          trend={<Sparkline values={[410, 418, 402, 431, 440, 437, 452]} color="var(--ev-chart-4)" width={160} height={36} />}
        />
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="BarChart" description="Одна серия по дням: сравнение величин в дискретных периодах.">
          <BarChart aria-label="Отгрузки по дням" data={DAYS} x={(d) => d.label} series={[{ key: 'shipped', label: 'Отгрузок', value: (d) => d.shipped }]} />
        </Card>
        <Card title="Две серии рядом" description="Сравнение двух показателей одной даты, легенда под графиком.">
          <BarChart
            aria-label="Отгрузки и отгрузки в срок"
            data={DAYS.slice(-14)}
            x={(d) => d.label}
            series={[
              { key: 'shipped', label: 'Всего', value: (d) => d.shipped },
              { key: 'onTime', label: 'В срок', value: (d) => d.onTime },
            ]}
          />
        </Card>
        <Card title="Стопка" description="stacked - части одного целого: сегменты даты друг на друге с зазором.">
          <BarChart
            aria-label="Структура отгрузок"
            stacked
            data={DAYS.slice(-10)}
            x={(d) => d.label}
            series={[
              { key: 'onTime', label: 'В срок', value: (d) => d.onTime },
              { key: 'late', label: 'С опозданием', value: (d) => d.shipped - d.onTime, color: 'var(--ev-chart-8)' },
            ]}
          />
        </Card>
        <Card title="LineChart" description="Динамика и сравнение с планом: перекрестие и общая подсказка по всем сериям.">
          <LineChart
            aria-label="Выпуск и план"
            data={DAYS}
            x={(d) => d.label}
            tooltipTitle={(d) => `Выпуск ${d.day.split('-').reverse().join('.')}`}
            series={[
              { key: 'output', label: 'Факт', value: (d) => d.output },
              { key: 'plan', label: 'План', value: (d) => d.plan, color: 'var(--ev-chart-crosshair)' },
            ]}
            format={(v) => `${formatNum(v)} ед.`}
          />
        </Card>
        <Card title="AreaChart" description="Накопленная величина или объём: деньги в копейках, ось - в коротком виде.">
          <AreaChart
            aria-label="Выручка по дням"
            data={DAYS}
            x={(d) => d.label}
            series={[{ key: 'revenue', label: 'Выручка', value: (d) => d.revenue }]}
            format={(v) => formatRub(v)}
            formatAxis={(v) => formatRubShort(v)}
          />
        </Card>
        <Card title="Малые счётчики" description="Все значения целые - деления оси тоже целые, без 0,5. integer задаёт это явно.">
          <BarChart
            aria-label="Инциденты за неделю"
            data={SMALL}
            x={(d) => d.label}
            integer
            height={200}
            series={[{ key: 'incidents', label: 'Инцидентов', value: (d) => d.incidents, color: 'var(--ev-chart-5)' }]}
          />
        </Card>
        <Card title="Нет данных" description="Пустой период: текст вместо осей, высота сохраняется." className={s.span}>
          <BarChart
            aria-label="Пустой график"
            data={[] as DayPoint[]}
            x={(d) => d.label}
            series={[{ key: 'shipped', label: 'Отгрузок', value: (d) => d.shipped }]}
            height={160}
            emptyText="За выбранный период отгрузок не было"
          />
        </Card>
      </div>
    </div>
  )
}
