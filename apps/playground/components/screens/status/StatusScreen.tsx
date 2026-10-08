'use client'

import {
  AreaChart,
  Badge,
  Button,
  Callout,
  Card,
  LinkButton,
  PageHeader,
  SegmentedControl,
  StatTile,
  toast,
} from 'endfield-vision'
import { Activity, AlertTriangle, ArrowRight, BellOff, BellRing, CalendarClock, RefreshCw, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatNum, plural } from '@/lib/format'
import {
  LATENCY_24H,
  LATENCY_7D,
  MAINTENANCE,
  SERVICES,
  serviceName,
  STATUS_INCIDENTS,
  type LatencyPoint,
  type ServiceStatus,
} from '@/lib/demo/status'
import { crumbs } from '@/lib/nav'
import { IncidentHistory } from './IncidentHistory'
import { ServicesCard } from './ServicesCard'
import { SubscribePopover, type Subscription } from './SubscribePopover'
import s from './status.module.css'

type Period = '24h' | '7d'

const LATENCY_SERIES: Array<{ key: keyof Omit<LatencyPoint, 'label'>; label: string }> = [
  { key: 'api', label: 'API шлюз' },
  { key: 'telemetry', label: 'Телеметрия' },
  { key: 'storage', label: 'Хранилище' },
]

const OVERALL: Record<ServiceStatus, { tone: 'success' | 'warning' | 'danger' | 'info'; title: string }> = {
  operational: { tone: 'success', title: 'Все системы работают штатно' },
  degraded: { tone: 'warning', title: 'Снижена производительность' },
  outage: { tone: 'danger', title: 'Частичный сбой' },
  maintenance: { tone: 'info', title: 'Идут плановые работы' },
}

/** «1 ч 05 мин» -> 65. */
function minutesOf(duration: string): number {
  const h = /(\d+)\s*ч/.exec(duration)?.[1]
  const m = /(\d+)\s*мин/.exec(duration)?.[1]
  return Number(h ?? 0) * 60 + Number(m ?? 0)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function StatusScreen() {
  const [period, setPeriod] = useState<Period>('24h')
  const [checkedAt, setCheckedAt] = useState('08.10.2026 09:52')
  const [refreshing, setRefreshing] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [reminders, setReminders] = useState<string[]>([])

  const summary = useMemo(() => {
    const by = (st: ServiceStatus) => SERVICES.filter((sv) => sv.status === st)
    const outage = by('outage')
    const degraded = by('degraded')
    const maintenance = by('maintenance')
    const worst: ServiceStatus = outage.length ? 'outage' : degraded.length ? 'degraded' : maintenance.length ? 'maintenance' : 'operational'
    const resolved = STATUS_INCIDENTS.filter((i) => i.state === 'resolved')
    return {
      worst,
      outage,
      degraded,
      healthy: by('operational').length,
      uptime: SERVICES.reduce((a, sv) => a + sv.uptime, 0) / SERVICES.length,
      open: STATUS_INCIDENTS.length - resolved.length,
      mttr: Math.round(resolved.reduce((a, i) => a + minutesOf(i.duration), 0) / Math.max(1, resolved.length)),
      resolved: resolved.length,
    }
  }, [])

  const latency = period === '24h' ? LATENCY_24H : LATENCY_7D
  const last = latency[latency.length - 1]
  const overall = OVERALL[summary.worst]

  const refresh = async () => {
    setRefreshing(true)
    await new Promise((r) => window.setTimeout(r, 800))
    const d = new Date()
    setCheckedAt(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setRefreshing(false)
    toast.info('Статусы обновлены', { description: 'Новых изменений нет.' })
  }

  const toggleReminder = (id: string, title: string) => {
    const on = reminders.includes(id)
    setReminders((x) => (on ? x.filter((k) => k !== id) : [...x, id]))
    if (on) toast.info('Напоминание отключено', { description: title })
    else toast.success('Напомним за сутки до начала', { description: title })
  }

  return (
    <>
      <PageHeader
        title="Состояние систем"
        subtitle="Доступность сервисов платформы, инциденты и плановые работы."
        breadcrumbs={crumbs('status')}
        meta={<Badge tone="neutral">Проверено {checkedAt}</Badge>}
        actions={
          <SubscribePopover
            subscription={subscription}
            onSubscribe={(sub) => {
              const first = !subscription
              setSubscription(sub)
              toast.success(first ? 'Подписка оформлена' : 'Подписка обновлена', {
                description: `${sub.email}: ${sub.services.length} ${plural(sub.services.length, 'сервис', 'сервиса', 'сервисов')}`,
              })
            }}
            onUnsubscribe={() => {
              setSubscription(null)
              toast.info('Подписка отменена')
            }}
          />
        }
      />

      <div className={s.page}>
        <Callout
          tone={overall.tone}
          title={overall.title}
          actions={
            <>
              <Button size="sm" icon={<RefreshCw size={14} />} loading={refreshing} onClick={() => void refresh()}>
                Обновить
              </Button>
              {summary.outage.length ? (
                <LinkButton href="/facilities" size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
                  К объектам
                </LinkButton>
              ) : null}
            </>
          }
        >
          {summary.outage.length ? `Недоступно: ${summary.outage.map((sv) => sv.name).join(', ')}. ` : ''}
          {summary.degraded.length ? `С ограничениями: ${summary.degraded.map((sv) => sv.name).join(', ')}. ` : ''}
          Штатно работают {summary.healthy} из {SERVICES.length} сервисов.
        </Callout>

        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '220px' }}>
          <StatTile
            label="Доступность платформы"
            value={`${summary.uptime.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`}
            icon={<Activity size={16} />}
            tone="success"
            hint={`Среднее по ${SERVICES.length} сервисам за 90 дней`}
          />
          <StatTile
            label="Открытые инциденты"
            value={summary.open}
            icon={<AlertTriangle size={16} />}
            tone="danger"
            hint="Критический и серьёзный"
          />
          <StatTile
            label="Время восстановления"
            value={`${summary.mttr} мин`}
            icon={<Timer size={16} />}
            tone="info"
            hint={`Среднее по ${summary.resolved} решённым инцидентам`}
          />
          <StatTile
            label="Плановые работы"
            value={MAINTENANCE.length}
            icon={<CalendarClock size={16} />}
            tone="violet"
            hint={MAINTENANCE[0] ? `Ближайшие: ${MAINTENANCE[0].date.slice(0, 5)}, ${MAINTENANCE[0].window}` : undefined}
          />
        </div>

        <ServicesCard services={SERVICES} />

        <div className="pg-split">
          <Card
            title="Время ответа"
            description={period === '24h' ? 'Медиана за час, мс.' : 'Медиана за сутки, мс.'}
            actions={
              <SegmentedControl
                aria-label="Период"
                size="sm"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: '24h', label: '24 часа' },
                  { value: '7d', label: '7 дней' },
                ]}
              />
            }
          >
            <div className={s.latency}>
              <div className={s.latencyStats}>
                {LATENCY_SERIES.map((x) => {
                  const values = latency.map((p) => p[x.key])
                  const avg = Math.round(values.reduce((a, v) => a + v, 0) / values.length)
                  const now = last?.[x.key] ?? 0
                  return (
                    <div key={x.key} className={s.latencyStat}>
                      <span className={s.latencyLabel}>{x.label}</span>
                      <span className={s.latencyValue} data-high={now > avg * 1.5 || undefined}>
                        {formatNum(now)} мс
                      </span>
                      <span className="ev-muted">среднее {formatNum(avg)}</span>
                    </div>
                  )
                })}
              </div>
              <AreaChart
                aria-label="Время ответа сервисов"
                data={latency}
                x={(p) => p.label}
                height={240}
                series={LATENCY_SERIES.map((x) => ({ key: x.key, label: x.label, value: (p: LatencyPoint) => p[x.key] }))}
                format={(v) => `${formatNum(v)} мс`}
              />
            </div>
          </Card>

          <Card title="Плановые работы" description="Время московское.">
            <ul role="list" className={s.maintenance}>
              {MAINTENANCE.map((m) => {
                const on = reminders.includes(m.id)
                return (
                  <li key={m.id} className={s.maintItem}>
                    <div className={s.maintDate}>
                      <span className={s.maintDay}>{m.date.slice(0, 5)}</span>
                      <span className="ev-muted ev-num">{m.window}</span>
                    </div>
                    <div className={s.maintBody}>
                      <span className={s.maintTitle}>{m.title}</span>
                      <span className="ev-muted">{m.services.map(serviceName).join(', ')}</span>
                      <Badge size="sm" tone={m.impactTone}>
                        {m.impact}
                      </Badge>
                      <Button
                        size="sm"
                        variant={on ? 'secondary' : 'ghost'}
                        aria-pressed={on}
                        icon={on ? <BellRing size={14} /> : <BellOff size={14} />}
                        onClick={() => toggleReminder(m.id, m.title)}
                      >
                        {on ? 'Напоминание включено' : 'Напомнить'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <IncidentHistory incidents={STATUS_INCIDENTS} />
      </div>
    </>
  )
}
