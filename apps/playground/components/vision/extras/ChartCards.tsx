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
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'

/* ------------------------------------------------------------------ */
/* Детерминированные данные (без Math.random и Date.now)               */
/* ------------------------------------------------------------------ */

/** «Сегодня» витрины: календарь заканчивается этой датой. */
const HEATMAP_TO = '2026-10-08'

interface Facility {
  name: Bi
  /** Потребление за сентябрь, МВт·ч. */
  mwh: number
}

const ENERGY: Facility[] = [
  { name: bi('Литейный цех', 'Foundry'), mwh: 4820 },
  { name: bi('Механический цех', 'Machine shop'), mwh: 3140 },
  { name: bi('Сборочный цех', 'Assembly shop'), mwh: 2260 },
  { name: bi('Компрессорная станция', 'Compressor station'), mwh: 1380 },
  { name: bi('Склад готовой продукции', 'Finished goods warehouse'), mwh: 640 },
  { name: bi('Административный корпус', 'Administrative building'), mwh: 310 },
]

interface TaskStatus {
  status: Bi
  count: number
}

const TASKS: TaskStatus[] = [
  { status: bi('В работе', 'In progress'), count: 48 },
  { status: bi('Новые', 'New'), count: 31 },
  { status: bi('На проверке', 'In review'), count: 22 },
  { status: bi('Ждут запчастей', 'Awaiting parts'), count: 14 },
  { status: bi('Отложены', 'Postponed'), count: 7 },
  { status: bi('Отклонены', 'Rejected'), count: 4 },
  { status: bi('Дубли', 'Duplicates'), count: 2 },
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

const WEEKDAYS: Bi[] = [
  bi('Пн', 'Mon'),
  bi('Вт', 'Tue'),
  bi('Ср', 'Wed'),
  bi('Чт', 'Thu'),
  bi('Пт', 'Fri'),
  bi('Сб', 'Sat'),
  bi('Вс', 'Sun'),
]
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
  const { t, tx } = useT()
  const fmt = useNumberFormat()
  const mwh = (v: number) => `${fmt(v)} ${t('МВт·ч', 'MWh')}`
  const bar = (v: number) => fmt(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const weekdays = useMemo(() => WEEKDAYS.map((d) => tx(d)), [tx])
  const shiftTime = t('Время смены', 'Shift time')

  return (
    <div className="ev-grid" style={{ '--ev-grid-min': '380px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
      <Card
        title="DonutChart"
        description={t(
          'Доля частей в целом: на что уходит энергия по площадкам. Подходит для 2-7 частей одного целого; для сравнения во времени - BarChart. Наведение или стрелки на фокусе выделяют сектор.',
          'Parts of a whole: where the energy goes, by site. Works best for 2-7 parts of a single whole; for comparisons over time, use BarChart. Hovering, or the arrow keys on focus, highlight a slice.',
        )}
      >
        <DonutChart
          aria-label={t('Потребление энергии по площадкам за сентябрь', 'Energy consumption by site, September')}
          data={ENERGY}
          label={(d) => tx(d.name)}
          value={(d) => d.mwh}
          format={mwh}
        />
      </Card>

      <Card
        title="DonutChart: maxSlices"
        description={t(
          'Статусы заявок на ремонт: мелкие доли сводятся в «Прочее», чтобы не дробить кольцо. Легенда снизу - для узких колонок.',
          'Repair request statuses: small shares are grouped into "Other" so the ring does not fragment. The bottom legend suits narrow columns.',
        )}
      >
        <DonutChart
          aria-label={t('Заявки на ремонт по статусам', 'Repair requests by status')}
          data={TASKS}
          label={(d) => tx(d.status)}
          value={(d) => d.count}
          maxSlices={5}
          size={160}
          legend="bottom"
        />
      </Card>

      <Card
        style={{ gridColumn: '1 / -1' }}
        title="Heatmap"
        description={t(
          'Календарь активности за 26 недель: инциденты по дням, недели - колонки, дни недели - строки. Видны ритм недели и пики плановых остановок. Конец периода задаётся явно (to), не вычисляется из текущей даты. На узком экране сетка прокручивается.',
          'A 26-week activity calendar: incidents per day, with weeks as columns and weekdays as rows. It reveals the weekly rhythm and the peaks of planned shutdowns. The end of the period is set explicitly (to) rather than derived from the current date. On narrow screens, the grid scrolls.',
        )}
      >
        <Heatmap aria-label={t('Инциденты по дням за 26 недель', 'Incidents per day over 26 weeks')} days={INCIDENT_DAYS} to={HEATMAP_TO} weeks={26} tone="danger" />
      </Card>

      <Card
        style={{ gridColumn: '1 / -1' }}
        title="HeatmapMatrix"
        description={t(
          'Матрица «день недели × час»: загрузка линии розлива, %. Подходит для поиска окон под обслуживание и перегруженных смен. Стрелки перемещают фокус по клеткам, Home и End - к краям строки.',
          'A weekday × hour matrix: bottling line utilization, %. Useful for finding maintenance windows and overloaded shifts. Arrow keys move focus between cells; Home and End jump to the ends of a row.',
        )}
      >
        <HeatmapMatrix
          aria-label={t('Загрузка линии розлива по часам и дням недели', 'Bottling line utilization by hour and weekday')}
          rows={weekdays}
          columns={HOURS}
          values={LOAD}
          columnLabelStep={3}
          max={100}
          format={(v) => `${fmt(v)}%`}
        />
      </Card>

      <Card
        title="RingProgress"
        description={t(
          'Компактный прогресс для плиток показателей: выполнение плана, превышение лимита (тон превышения, как у Progress) и несколько сегментов на одном кольце.',
          'Compact progress for metric tiles: plan completion, a limit overrun (with an overrun tone, as in Progress) and several segments on a single ring.',
        )}
      >
        <div className="ev-stack" style={{ gap: 'var(--ev-space-6)' }}>
          <RingTile
            ring={<RingProgress value={78} aria-label={t('Выполнение плана выпуска за октябрь', 'Output plan completion, October')} />}
            title={t('План выпуска', 'Output plan')}
            caption={t('4 680 из 6 000 ед. за октябрь', '4,680 of 6,000 units in October')}
          />
          <RingTile
            ring={<RingProgress value={112} max={100} overTone="danger" aria-label={t('Расход электроэнергии от лимита', 'Electricity use against the limit')} />}
            title={t('Лимит электроэнергии', 'Electricity limit')}
            caption={t('11 200 из 10 000 МВт·ч - превышение', '11,200 of 10,000 MWh, over the limit')}
          />
          <RingTile
            ring={
              <RingProgress
                size={72}
                aria-label={shiftTime}
                sections={[
                  { value: 62, tone: 'success', label: t('Работа', 'Running') },
                  { value: 14, tone: 'info', label: t('Переналадка', 'Changeover') },
                  { value: 9, tone: 'warning', label: t('Простой', 'Downtime') },
                ]}
              />
            }
            title={shiftTime}
            caption={t('Работа 62%, переналадка 14%, простой 9%', 'Running 62%, changeover 14%, downtime 9%')}
          />
        </div>
      </Card>

      <Card
        title="Gauge"
        description={t(
          'Текущее значение в диапазоне с пороговыми зонами: давление в линии подачи. Цвет дуги - зона, в которую попало значение; для истории значений - LineChart.',
          'The current value within a range with threshold zones: supply line pressure. The arc color shows the zone the value falls into; for value history, use LineChart.',
        )}
      >
        <div className="ev-row" style={{ flexWrap: 'wrap', justifyContent: 'space-around', gap: 'var(--ev-space-6)' }}>
          <Gauge
            aria-label={t('Давление, линия подачи 1', 'Pressure, supply line 1')}
            value={7.4}
            min={0}
            max={10}
            thresholds={PRESSURE_THRESHOLDS}
            tone="success"
            format={bar}
            caption={t('бар, линия 1', 'bar, line 1')}
            size={180}
          />
          <Gauge
            aria-label={t('Давление, линия подачи 2', 'Pressure, supply line 2')}
            value={8.9}
            min={0}
            max={10}
            thresholds={PRESSURE_THRESHOLDS}
            tone="success"
            format={bar}
            caption={t('бар, линия 2', 'bar, line 2')}
            size={180}
          />
        </div>
      </Card>
    </div>
  )
}
