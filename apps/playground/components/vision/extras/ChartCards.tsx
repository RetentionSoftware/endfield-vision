'use client'

import {
  addDaysIso,
  Card,
  DonutChart,
  Gauge,
  Heatmap,
  HeatmapMatrix,
  RingProgress,
  useNumberFormat,
  type GaugeThreshold,
  type HeatmapDay,
} from 'endfield-vision'
import type { CSSProperties, ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Детерминированные данные (без Math.random и Date.now)               */
/* ------------------------------------------------------------------ */

/** «Сегодня» витрины: календарь заканчивается этой датой. */
const HEATMAP_TO = '2026-10-08'

interface Facility {
  name: string
  /** Потребление за сентябрь, МВт·ч. */
  mwh: number
}

const ENERGY: Facility[] = [
  { name: 'Литейный цех', mwh: 4820 },
  { name: 'Механический цех', mwh: 3140 },
  { name: 'Сборочный цех', mwh: 2260 },
  { name: 'Компрессорная станция', mwh: 1380 },
  { name: 'Склад готовой продукции', mwh: 640 },
  { name: 'Административный корпус', mwh: 310 },
]

interface TaskStatus {
  status: string
  count: number
}

const TASKS: TaskStatus[] = [
  { status: 'В работе', count: 48 },
  { status: 'Новые', count: 31 },
  { status: 'На проверке', count: 22 },
  { status: 'Ждут запчастей', count: 14 },
  { status: 'Отложены', count: 7 },
  { status: 'Отклонены', count: 4 },
  { status: 'Дубли', count: 2 },
]

/** 26 недель инцидентов до HEATMAP_TO: в выходные меньше, раз в месяц - пик (плановая остановка). */
const INCIDENT_DAYS: HeatmapDay[] = Array.from({ length: 26 * 7 }, (_, i) => {
  const back = 26 * 7 - 1 - i
  // HEATMAP_TO - четверг: день недели с понедельника (Пн = 0).
  const weekday = (((3 - back) % 7) + 7) % 7
  const weekend = weekday >= 5
  const k = (i * 7919 + 13) % 23
  const peak = back % 29 === 4 ? 4 : 0
  const value = weekend ? (k % 4 === 0 ? 1 : 0) : Math.max(0, Math.round(k / 5) - 1) + peak
  return { date: addDaysIso(HEATMAP_TO, -back), value }
})

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

/** Загрузка линии, % по часам: две смены 06-22, ночью - дежурный режим, в выходные ниже. */
const LOAD: number[][] = WEEKDAYS.map((_, d) =>
  HOURS.map((__, h) => {
    const shift = h >= 6 && h < 22
    const base = shift ? 68 + ((h * 5 + d * 3) % 22) : 12 + ((h + d) % 4) * 3
    const lunch = h === 12 || h === 18 ? -18 : 0
    const factor = d === 5 ? 0.6 : d === 6 ? 0.25 : 1
    return Math.max(0, Math.round((base + lunch) * factor))
  }),
)

const PRESSURE_THRESHOLDS: GaugeThreshold[] = [
  { value: 6, tone: 'warning' },
  { value: 8.5, tone: 'danger' },
]

/* ------------------------------------------------------------------ */
/* Карточки                                                            */
/* ------------------------------------------------------------------ */

function RingTile({ ring, title, caption }: { ring: ReactNode; title: string; caption: string }) {
  return (
    <div className="ev-row" style={{ gap: 'var(--ev-space-4)', alignItems: 'center' }}>
      {ring}
      <div className="ev-stack" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 'var(--ev-fw-medium)' }}>{title}</span>
        <span className="ev-muted" style={{ fontSize: 'var(--ev-fs-xs)' }}>
          {caption}
        </span>
      </div>
    </div>
  )
}

export function ChartCards() {
  const fmt = useNumberFormat()
  const mwh = (v: number) => `${fmt(v)} МВт·ч`
  const bar = (v: number) => fmt(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <div className="ev-grid" style={{ '--ev-grid-min': '380px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
      <Card
        title="DonutChart"
        description="Доля частей в целом: на что уходит энергия по площадкам. Подходит для 2-7 частей одного целого; для сравнения во времени - BarChart. Наведение или стрелки на фокусе выделяют сектор."
      >
        <DonutChart aria-label="Потребление энергии по площадкам за сентябрь" data={ENERGY} label={(d) => d.name} value={(d) => d.mwh} format={mwh} />
      </Card>

      <Card
        title="DonutChart: maxSlices"
        description="Статусы заявок на ремонт: мелкие доли сводятся в «Прочее», чтобы не дробить кольцо. Легенда снизу - для узких колонок."
      >
        <DonutChart
          aria-label="Заявки на ремонт по статусам"
          data={TASKS}
          label={(d) => d.status}
          value={(d) => d.count}
          maxSlices={5}
          size={160}
          legend="bottom"
        />
      </Card>

      <Card
        style={{ gridColumn: '1 / -1' }}
        title="Heatmap"
        description="Календарь активности за 26 недель: инциденты по дням, недели - колонки, дни недели - строки. Видны ритм недели и пики плановых остановок. Конец периода задаётся явно (to), не вычисляется из текущей даты. На узком экране сетка прокручивается."
      >
        <Heatmap aria-label="Инциденты по дням за 26 недель" days={INCIDENT_DAYS} to={HEATMAP_TO} weeks={26} tone="danger" />
      </Card>

      <Card
        style={{ gridColumn: '1 / -1' }}
        title="HeatmapMatrix"
        description="Матрица «день недели × час»: загрузка линии розлива, %. Подходит для поиска окон под обслуживание и перегруженных смен. Стрелки перемещают фокус по клеткам, Home и End - к краям строки."
      >
        <HeatmapMatrix
          aria-label="Загрузка линии розлива по часам и дням недели"
          rows={WEEKDAYS}
          columns={HOURS}
          values={LOAD}
          columnLabelStep={3}
          max={100}
          format={(v) => `${fmt(v)}%`}
        />
      </Card>

      <Card
        title="RingProgress"
        description="Компактный прогресс для плиток показателей: выполнение плана, превышение лимита (тон превышения, как у Progress) и несколько сегментов на одном кольце."
      >
        <div className="ev-stack" style={{ gap: 'var(--ev-space-6)' }}>
          <RingTile
            ring={<RingProgress value={78} aria-label="Выполнение плана выпуска за октябрь" />}
            title="План выпуска"
            caption="4 680 из 6 000 ед. за октябрь"
          />
          <RingTile
            ring={<RingProgress value={112} max={100} overTone="danger" aria-label="Расход электроэнергии от лимита" />}
            title="Лимит электроэнергии"
            caption="11 200 из 10 000 МВт·ч - превышение"
          />
          <RingTile
            ring={
              <RingProgress
                size={72}
                aria-label="Время смены"
                sections={[
                  { value: 62, tone: 'success', label: 'Работа' },
                  { value: 14, tone: 'info', label: 'Переналадка' },
                  { value: 9, tone: 'warning', label: 'Простой' },
                ]}
              />
            }
            title="Время смены"
            caption="Работа 62%, переналадка 14%, простой 9%"
          />
        </div>
      </Card>

      <Card
        title="Gauge"
        description="Текущее значение в диапазоне с пороговыми зонами: давление в линии подачи. Цвет дуги - зона, в которую попало значение; для истории значений - LineChart."
      >
        <div className="ev-row" style={{ flexWrap: 'wrap', justifyContent: 'space-around', gap: 'var(--ev-space-6)' }}>
          <Gauge
            aria-label="Давление, линия подачи 1"
            value={7.4}
            min={0}
            max={10}
            thresholds={PRESSURE_THRESHOLDS}
            tone="success"
            format={bar}
            caption="бар, линия 1"
            size={180}
          />
          <Gauge
            aria-label="Давление, линия подачи 2"
            value={8.9}
            min={0}
            max={10}
            thresholds={PRESSURE_THRESHOLDS}
            tone="success"
            format={bar}
            caption="бар, линия 2"
            size={180}
          />
        </div>
      </Card>
    </div>
  )
}
