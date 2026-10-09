'use client'

import { AreaChart, BarChart, Card, LineChart, Sparkline, StatTile } from 'endfield-vision'
import { Factory, Truck, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useT } from '@/lib/i18n'
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
  const { t, formatNum, formatRub, formatRubShort } = useT()
  const shippedLabel = t('Отгрузок', 'Shipments')
  const onTimeLabel = t('В срок', 'On time')
  return (
    <div className={s.section}>
      <p className={s.text}>
        {t(
          'Графики на SVG без сторонних библиотек: цвета серий - токены ',
          'SVG charts with no third-party dependencies. Series colors come from the ',
        )}
        <code>--ev-chart-1..8</code>
        {t(
          ', подсказка по наведению и с клавиатуры (фокус на графике, стрелки), ширина подстраивается под контейнер. Деньги - в копейках, форматирование - через',
          ' tokens, tooltips work on hover and from the keyboard (focus the chart, then use the arrow keys), and the width adapts to the container. Money is passed in kopecks and formatted with',
        )}{' '}
        <code>format</code> {t('и', 'and')} <code>formatAxis</code>. <code>Sparkline</code>{' '}
        {t('- ширина в px или', 'takes a width in px or')} <code>width=&quot;auto&quot;</code>{' '}
        {t('по контейнеру (плитка «Отгрузок»).', 'to fill its container (see the Shipments tile).')}
      </p>
      <div className="ev-grid" style={{ '--ev-grid-min': '220px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile
          label={t('Выпуск за сентябрь', 'September output')}
          value={formatNum(DAYS.reduce((a, d) => a + d.output, 0))}
          icon={<Factory size={16} />}
          delta={3.8}
          deltaLabel={t('к августу', 'vs August')}
          trend={<Sparkline values={DAYS.slice(-14).map((d) => d.output)} aria-label={t('Выпуск за 14 дней', 'Output over 14 days')} />}
        />
        <StatTile
          label={shippedLabel}
          value={formatNum(DAYS.reduce((a, d) => a + d.shipped, 0))}
          icon={<Truck size={16} />}
          tone="info"
          trend={
            <Sparkline
              width="auto"
              values={DAYS.slice(-14).map((d) => d.shipped)}
              color="var(--ev-chart-3)"
              aria-label={t('Отгрузки за 14 дней', 'Shipments over 14 days')}
            />
          }
        />
        <StatTile
          label={t('Потребление, МВт·ч', 'Consumption, MWh')}
          value={formatNum(12_480)}
          icon={<Zap size={16} />}
          tone="warning"
          delta={6.1}
          positiveIsGood={false}
          trend={<Sparkline values={[410, 418, 402, 431, 440, 437, 452]} color="var(--ev-chart-4)" width={160} height={36} />}
        />
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="BarChart" description={t('Одна серия по дням: сравнение величин в дискретных периодах.', 'A single series by day: compares values across discrete periods.')}>
          <BarChart
            aria-label={t('Отгрузки по дням', 'Shipments by day')}
            data={DAYS}
            x={(d) => d.label}
            series={[{ key: 'shipped', label: shippedLabel, value: (d) => d.shipped }]}
          />
        </Card>
        <Card
          title={t('Две серии рядом', 'Two series side by side')}
          description={t('Сравнение двух показателей одной даты, легенда под графиком.', 'Compares two metrics for the same date, with the legend below the chart.')}
        >
          <BarChart
            aria-label={t('Отгрузки и отгрузки в срок', 'Total and on-time shipments')}
            data={DAYS.slice(-14)}
            x={(d) => d.label}
            series={[
              { key: 'shipped', label: t('Всего', 'Total'), value: (d) => d.shipped },
              { key: 'onTime', label: onTimeLabel, value: (d) => d.onTime },
            ]}
          />
        </Card>
        <Card
          title={t('Стопка', 'Stacked')}
          description={t(
            'stacked - части одного целого: сегменты даты друг на друге с зазором.',
            'stacked shows parts of a whole: the segments of each date sit on top of each other with a gap.',
          )}
        >
          <BarChart
            aria-label={t('Структура отгрузок', 'Shipment breakdown')}
            stacked
            data={DAYS.slice(-10)}
            x={(d) => d.label}
            series={[
              { key: 'onTime', label: onTimeLabel, value: (d) => d.onTime },
              { key: 'late', label: t('С опозданием', 'Late'), value: (d) => d.shipped - d.onTime, color: 'var(--ev-chart-8)' },
            ]}
          />
        </Card>
        <Card
          title="LineChart"
          description={t(
            'Динамика и сравнение с планом: перекрестие и общая подсказка по всем сериям.',
            'Trends and plan comparison: a crosshair and a shared tooltip across all series.',
          )}
        >
          <LineChart
            aria-label={t('Выпуск и план', 'Output vs plan')}
            data={DAYS}
            x={(d) => d.label}
            tooltipTitle={(d) => `${t('Выпуск', 'Output')} ${d.day.split('-').reverse().join('.')}`}
            series={[
              { key: 'output', label: t('Факт', 'Actual'), value: (d) => d.output },
              { key: 'plan', label: t('План', 'Plan'), value: (d) => d.plan, color: 'var(--ev-chart-crosshair)' },
            ]}
            format={(v) => `${formatNum(v)} ${t('ед.', 'units')}`}
          />
        </Card>
        <Card
          title="AreaChart"
          description={t(
            'Накопленная величина или объём: деньги в копейках, ось - в коротком виде.',
            'Cumulative values or volumes: money in kopecks, with a compact axis format.',
          )}
        >
          <AreaChart
            aria-label={t('Выручка по дням', 'Revenue by day')}
            data={DAYS}
            x={(d) => d.label}
            series={[{ key: 'revenue', label: t('Выручка', 'Revenue'), value: (d) => d.revenue }]}
            format={(v) => formatRub(v)}
            formatAxis={(v) => formatRubShort(v)}
          />
        </Card>
        <Card
          title={t('Малые счётчики', 'Small counts')}
          description={t(
            'Все значения целые - деления оси тоже целые, без 0,5. integer задаёт это явно.',
            'When all values are integers, the axis ticks are integers too, with no 0.5 steps. integer enforces this explicitly.',
          )}
        >
          <BarChart
            aria-label={t('Инциденты за неделю', 'Incidents this week')}
            data={SMALL}
            x={(d) => d.label}
            integer
            height={200}
            series={[{ key: 'incidents', label: t('Инцидентов', 'Incidents'), value: (d) => d.incidents, color: 'var(--ev-chart-5)' }]}
          />
        </Card>
        <Card
          title={t('Нет данных', 'No data')}
          description={t('Пустой период: текст вместо осей, высота сохраняется.', 'An empty period: text replaces the axes and the height is preserved.')}
          className={s.span}
        >
          <BarChart
            aria-label={t('Пустой график', 'Empty chart')}
            data={[] as DayPoint[]}
            x={(d) => d.label}
            series={[{ key: 'shipped', label: shippedLabel, value: (d) => d.shipped }]}
            height={160}
            emptyText={t('За выбранный период отгрузок не было', 'No shipments in the selected period')}
          />
        </Card>
      </div>
    </div>
  )
}
