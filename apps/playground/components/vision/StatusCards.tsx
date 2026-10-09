'use client'

import {
  addDaysIso,
  Avatar,
  Badge,
  Card,
  SegmentedControl,
  Timeline,
  UptimeBar,
  useNumberFormat,
  type TimelineItem,
  type UptimeDay,
  type UptimeStatus,
} from 'endfield-vision'
import { CircleCheck, ClipboardCheck, PackageCheck, Truck, Warehouse, Wrench } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { bi, useT, type Bi, type Lang, type Translator } from '@/lib/i18n'
import { Subhead } from './parts'
import s from './vision.module.css'

/* ------------------------------------------------------------------ */
/* Доступность: детерминированные дни без Math.random                  */
/* ------------------------------------------------------------------ */

/** Последний день полосы - «сегодня» витрины. */
export const UPTIME_TODAY = '2026-10-08'

const NOTES: Partial<Record<UptimeStatus, Bi>> = {
  degraded: bi('Ответы медленнее 2 секунд, 40 минут', 'Responses slower than 2 seconds for 40 minutes'),
  outage: bi('Нет связи с узлом, 1 час 15 минут', 'Node unreachable for 1 hour 15 minutes'),
  maintenance: bi('Плановое обновление, 02:00 - 04:00', 'Scheduled update, 02:00 - 04:00'),
}

/**
 * Дни доступности одной системы. seed сдвигает узор сбоев, gap - сколько
 * первых дней без данных (система подключена позже), lang - язык примечаний.
 */
export function uptimeDays(count: number, seed = 0, gap = 0, lang: Lang = 'ru'): UptimeDay[] {
  return Array.from({ length: count }, (_, i) => {
    const k = i + seed * 13
    const status: UptimeStatus =
      i < gap ? 'none' : k % 37 === 11 ? 'outage' : k % 23 === 5 || k % 29 === 17 ? 'degraded' : k % 41 === 20 ? 'maintenance' : 'operational'
    const note = NOTES[status]?.[lang]
    return { date: addDaysIso(UPTIME_TODAY, i - count + 1), status, ...(note ? { note } : null) }
  })
}

const SYSTEMS: Array<{ id: string; name: Bi; seed: number; gap: number }> = [
  { id: 'wms', name: bi('Сервер склада', 'Warehouse server'), seed: 0, gap: 0 },
  { id: 'gate', name: bi('Пропускной пункт', 'Checkpoint'), seed: 2, gap: 0 },
  { id: 'scada', name: bi('Телеметрия линий', 'Line telemetry'), seed: 5, gap: 12 },
]

/** Доля дней без сбоя среди дней с данными, %. */
function uptimeShare(days: UptimeDay[]): number {
  const known = days.filter((d) => d.status !== 'none')
  if (known.length === 0) return 0
  const good = known.filter((d) => d.status === 'operational' || d.status === 'maintenance').length
  return (good / known.length) * 100
}

export function UptimeCard() {
  const { t, tx, lang } = useT()
  const fmt = useNumberFormat()
  const [period, setPeriod] = useState<'90' | '30'>('90')
  const n = Number(period)
  const systems = useMemo(() => SYSTEMS.map((sys) => ({ ...sys, days: uptimeDays(90, sys.seed, sys.gap, lang) })), [lang])
  return (
    <Card
      title="UptimeBar"
      description={t(
        'История доступности по дням, как на статус-страницах. Полоса - одна остановка Tab: стрелки, Home и End переходят между днями, подсказка - по наведению и фокусу. На узком экране - последние 30 дней.',
        'Daily availability history, as on status pages. The bar is a single Tab stop: arrow keys, Home and End move between days, and the tooltip appears on hover and focus. On narrow screens, only the last 30 days are shown.',
      )}
      actions={
        <SegmentedControl
          size="sm"
          aria-label={t('Период', 'Period')}
          value={period}
          onChange={setPeriod}
          options={[
            { value: '90', label: t('90 дней', '90 days') },
            { value: '30', label: t('30 дней', '30 days') },
          ]}
        />
      }
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        {systems.map((sys, i) => {
          const days = sys.days.slice(-n)
          const name = tx(sys.name)
          return (
            <div key={sys.id} className="ev-stack">
              <div className="ev-row">
                <span>{name}</span>
                <span className="ev-spacer" />
                <span className="ev-num ev-secondary">{fmt(uptimeShare(days), { maximumFractionDigits: 1 })}%</span>
              </div>
              <UptimeBar
                days={days}
                height={i === 0 ? 32 : 24}
                showRange={i === 0}
                showLegend={i === systems.length - 1}
                aria-label={t(`${name}: доступность за ${n} дней`, `${name}: uptime over ${n} days`)}
              />
            </div>
          )
        })}
        <span className="ev-muted">
          {t(
            'showRange - подписи краёв полосы, showLegend - легенда статусов (none появляется, если в данных есть дни без данных).',
            'showRange labels both ends of the bar; showLegend adds a status legend (none is listed when some days have no data).',
          )}
        </span>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Лента событий                                                       */
/* ------------------------------------------------------------------ */

function shipmentItems({ t }: Translator): TimelineItem[] {
  const irina = t('Ирина Лебедева', 'Irina Lebedeva')
  return [
    {
      id: 'created',
      title: t('Заявка создана', 'Request created'),
      time: '07.10, 09:12',
      tone: 'neutral',
      icon: <ClipboardCheck size={13} />,
      description: t('Перемещение 18 мест со склада Долина-1 на заставу.', 'Transfer of 18 packages from Valley-1 warehouse to Outpost.'),
      meta: (
        <span className="ev-row" data-nowrap="">
          <Avatar name={irina} size={18} />
          {irina}
        </span>
      ),
    },
    {
      id: 'picked',
      title: t('Собрано на складе', 'Picked at the warehouse'),
      time: '07.10, 14:40',
      tone: 'info',
      icon: <Warehouse size={13} />,
      description: t('Стеллажи B-14 и C-02, вес 2 340 кг.', 'Racks B-14 and C-02, weight 2,340 kg.'),
    },
    {
      id: 'shipped',
      title: t('Отгружено', 'Shipped'),
      time: '08.10, 06:05',
      tone: 'accent',
      icon: <Truck size={13} />,
      description: t('Тягач О245РК77, водитель Тимур Рахимов.', 'Truck O245RK77, driver Timur Rakhimov.'),
      meta: <Badge tone="info">{t('В пути', 'In transit')}</Badge>,
    },
    { id: 'arrive', title: t('Прибытие на заставу', 'Arrival at Outpost'), time: '09.10, 10:00 - 14:00', pending: true, icon: <PackageCheck size={13} /> },
    { id: 'accept', title: t('Приёмка и сверка', 'Receiving and reconciliation'), pending: true },
  ]
}

function journalItems({ t }: Translator): TimelineItem[] {
  return [
    { id: 'j1', title: t('Смена открыта', 'Shift opened'), time: '08:00', tone: 'success', description: t('Руководитель смены - Глеб Сорокин', 'Shift supervisor: Gleb Sorokin') },
    { id: 'j2', title: t('Давление в контуре ниже нормы', 'Circuit pressure below normal'), time: '09:47', tone: 'warning', description: t('Линия сборки №3, датчик P-12', 'Assembly line 3, sensor P-12') },
    { id: 'j3', title: t('Создана задача TSK-1042', 'Task TSK-1042 created'), time: '09:52', tone: 'accent' },
    { id: 'j4', title: t('Линия остановлена', 'Line stopped'), time: '10:15', tone: 'danger', description: t('Замена фильтра гидравлического', 'Hydraulic filter replacement') },
    { id: 'j5', title: t('Фильтр заменён', 'Filter replaced'), time: '11:02', tone: 'info', icon: <Wrench size={12} /> },
    { id: 'j6', title: t('Линия запущена', 'Line restarted'), time: '11:10', tone: 'success', icon: <CircleCheck size={12} /> },
    { id: 'j7', title: t('Отчёт по инциденту отправлен', 'Incident report sent'), time: '12:30', tone: 'neutral' },
  ]
}

export function TimelineCard() {
  const tr = useT()
  const { t } = tr
  const shipment = useMemo(() => shipmentItems(tr), [tr])
  const journal = useMemo(() => journalItems(tr), [tr])
  const stages = t('Этапы отгрузки SHP-20418', 'Shipment SHP-20418 stages')
  return (
    <Card
      title="Timeline"
      description={t(
        'Лента событий: этапы доставки, журнал объекта, ход инцидента. Маркер окрашен тоном события; будущий шаг (pending) - полый маркер и пунктир к нему.',
        'An event feed for delivery stages, a facility log or incident progress. The marker takes the event tone; a future step (pending) gets a hollow marker and a dashed line leading to it.',
      )}
    >
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>{stages}</Subhead>
          <Timeline items={shipment} aria-label={stages} />
        </div>
        <div className="ev-stack">
          <Subhead>variant=&quot;compact&quot;, maxItems=4</Subhead>
          <Timeline items={journal} variant="compact" maxItems={4} aria-label={t('Журнал смены', 'Shift log')} />
        </div>
      </div>
    </Card>
  )
}
