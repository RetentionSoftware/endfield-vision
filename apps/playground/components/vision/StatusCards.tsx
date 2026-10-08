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
import { useState, type CSSProperties } from 'react'
import { Subhead } from './parts'
import s from './vision.module.css'

/* ------------------------------------------------------------------ */
/* Доступность: детерминированные дни без Math.random                  */
/* ------------------------------------------------------------------ */

/** Последний день полосы - «сегодня» витрины. */
export const UPTIME_TODAY = '2026-10-08'

const NOTES: Partial<Record<UptimeStatus, string>> = {
  degraded: 'Ответы медленнее 2 секунд, 40 минут',
  outage: 'Нет связи с узлом, 1 час 15 минут',
  maintenance: 'Плановое обновление, 02:00 - 04:00',
}

/**
 * Дни доступности одной системы. seed сдвигает узор сбоев, gap - сколько
 * первых дней без данных (система подключена позже).
 */
export function uptimeDays(count: number, seed = 0, gap = 0): UptimeDay[] {
  return Array.from({ length: count }, (_, i) => {
    const k = i + seed * 13
    const status: UptimeStatus =
      i < gap ? 'none' : k % 37 === 11 ? 'outage' : k % 23 === 5 || k % 29 === 17 ? 'degraded' : k % 41 === 20 ? 'maintenance' : 'operational'
    const note = NOTES[status]
    return { date: addDaysIso(UPTIME_TODAY, i - count + 1), status, ...(note ? { note } : null) }
  })
}

const SYSTEMS = [
  { id: 'wms', name: 'Сервер склада', days: uptimeDays(90, 0) },
  { id: 'gate', name: 'Пропускной пункт', days: uptimeDays(90, 2) },
  { id: 'scada', name: 'Телеметрия линий', days: uptimeDays(90, 5, 12) },
]

/** Доля дней без сбоя среди дней с данными, %. */
function uptimeShare(days: UptimeDay[]): number {
  const known = days.filter((d) => d.status !== 'none')
  if (known.length === 0) return 0
  const good = known.filter((d) => d.status === 'operational' || d.status === 'maintenance').length
  return (good / known.length) * 100
}

export function UptimeCard() {
  const fmt = useNumberFormat()
  const [period, setPeriod] = useState<'90' | '30'>('90')
  const n = Number(period)
  return (
    <Card
      title="UptimeBar"
      description="История доступности по дням, как на статус-страницах. Полоса - одна остановка Tab: стрелки, Home и End переходят между днями, подсказка - по наведению и фокусу. На узком экране - последние 30 дней."
      actions={
        <SegmentedControl
          size="sm"
          aria-label="Период"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '90', label: '90 дней' },
            { value: '30', label: '30 дней' },
          ]}
        />
      }
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        {SYSTEMS.map((sys, i) => {
          const days = sys.days.slice(-n)
          return (
            <div key={sys.id} className="ev-stack">
              <div className="ev-row">
                <span>{sys.name}</span>
                <span className="ev-spacer" />
                <span className="ev-num ev-secondary">{fmt(uptimeShare(days), { maximumFractionDigits: 1 })}%</span>
              </div>
              <UptimeBar days={days} height={i === 0 ? 32 : 24} showRange={i === 0} showLegend={i === SYSTEMS.length - 1} aria-label={`${sys.name}: доступность за ${n} дней`} />
            </div>
          )
        })}
        <span className="ev-muted">
          showRange - подписи краёв полосы, showLegend - легенда статусов (none появляется, если в данных есть дни без данных).
        </span>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Лента событий                                                       */
/* ------------------------------------------------------------------ */

const SHIPMENT: TimelineItem[] = [
  {
    id: 'created',
    title: 'Заявка создана',
    time: '07.10, 09:12',
    tone: 'neutral',
    icon: <ClipboardCheck size={13} />,
    description: 'Перемещение 18 мест со склада Долина-1 на заставу.',
    meta: (
      <span className="ev-row" data-nowrap="">
        <Avatar name="Ирина Лебедева" size={18} />
        Ирина Лебедева
      </span>
    ),
  },
  { id: 'picked', title: 'Собрано на складе', time: '07.10, 14:40', tone: 'info', icon: <Warehouse size={13} />, description: 'Стеллажи B-14 и C-02, вес 2 340 кг.' },
  {
    id: 'shipped',
    title: 'Отгружено',
    time: '08.10, 06:05',
    tone: 'accent',
    icon: <Truck size={13} />,
    description: 'Тягач О245РК77, водитель Тимур Рахимов.',
    meta: <Badge tone="info">В пути</Badge>,
  },
  { id: 'arrive', title: 'Прибытие на заставу', time: '09.10, 10:00 - 14:00', pending: true, icon: <PackageCheck size={13} /> },
  { id: 'accept', title: 'Приёмка и сверка', pending: true },
]

const JOURNAL: TimelineItem[] = [
  { id: 'j1', title: 'Смена открыта', time: '08:00', tone: 'success', description: 'Руководитель смены - Глеб Сорокин' },
  { id: 'j2', title: 'Давление в контуре ниже нормы', time: '09:47', tone: 'warning', description: 'Линия сборки №3, датчик P-12' },
  { id: 'j3', title: 'Создана задача TSK-1042', time: '09:52', tone: 'accent' },
  { id: 'j4', title: 'Линия остановлена', time: '10:15', tone: 'danger', description: 'Замена фильтра гидравлического' },
  { id: 'j5', title: 'Фильтр заменён', time: '11:02', tone: 'info', icon: <Wrench size={12} /> },
  { id: 'j6', title: 'Линия запущена', time: '11:10', tone: 'success', icon: <CircleCheck size={12} /> },
  { id: 'j7', title: 'Отчёт по инциденту отправлен', time: '12:30', tone: 'neutral' },
]

export function TimelineCard() {
  return (
    <Card title="Timeline" description="Лента событий: этапы доставки, журнал объекта, ход инцидента. Маркер окрашен тоном события; будущий шаг (pending) - полый маркер и пунктир к нему.">
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>Этапы отгрузки SHP-20418</Subhead>
          <Timeline items={SHIPMENT} aria-label="Этапы отгрузки SHP-20418" />
        </div>
        <div className="ev-stack">
          <Subhead>variant=&quot;compact&quot;, maxItems=4</Subhead>
          <Timeline items={JOURNAL} variant="compact" maxItems={4} aria-label="Журнал смены" />
        </div>
      </div>
    </Card>
  )
}
