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
import { bi, useCrumbs, useT, type Bi } from '@/lib/i18n'
import { IncidentHistory } from './IncidentHistory'
import { ServicesCard } from './ServicesCard'
import { SubscribePopover, type Subscription } from './SubscribePopover'
import s from './status.module.css'

type Period = '24h' | '7d'

const LATENCY_SERIES: Array<{ key: keyof Omit<LatencyPoint, 'label'>; label: Bi }> = [
  { key: 'api', label: bi('API шлюз', 'API gateway') },
  { key: 'telemetry', label: bi('Телеметрия', 'Telemetry') },
  { key: 'storage', label: bi('Хранилище', 'Storage') },
]

const OVERALL: Record<ServiceStatus, { tone: 'success' | 'warning' | 'danger' | 'info'; title: Bi }> = {
  operational: { tone: 'success', title: bi('Все системы работают штатно', 'All systems operational') },
  degraded: { tone: 'warning', title: bi('Снижена производительность', 'Degraded performance') },
  outage: { tone: 'danger', title: bi('Частичный сбой', 'Partial outage') },
  maintenance: { tone: 'info', title: bi('Идут плановые работы', 'Scheduled maintenance in progress') },
}

const pad = (n: number) => String(n).padStart(2, '0')

export function StatusScreen() {
  const { t, tx, plural, formatNum, intl } = useT()
  const breadcrumbs = useCrumbs('status')
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
      mttr: Math.round(resolved.reduce((a, i) => a + i.minutes, 0) / Math.max(1, resolved.length)),
      resolved: resolved.length,
    }
  }, [])

  const latency = period === '24h' ? LATENCY_24H : LATENCY_7D
  const last = latency[latency.length - 1]
  const overall = OVERALL[summary.worst]
  const ms = t('мс', 'ms')

  const refresh = async () => {
    setRefreshing(true)
    await new Promise((r) => window.setTimeout(r, 800))
    const d = new Date()
    setCheckedAt(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setRefreshing(false)
    toast.info(t('Статусы обновлены', 'Statuses refreshed'), { description: t('Новых изменений нет.', 'No new changes.') })
  }

  const toggleReminder = (id: string, title: string) => {
    const on = reminders.includes(id)
    setReminders((x) => (on ? x.filter((k) => k !== id) : [...x, id]))
    if (on) toast.info(t('Напоминание отключено', 'Reminder turned off'), { description: title })
    else toast.success(t('Напомним за сутки до начала', "We'll remind you a day before it starts"), { description: title })
  }

  const names = (list: typeof SERVICES) => list.map((sv) => tx(sv.name)).join(', ')

  return (
    <>
      <PageHeader
        title={t('Состояние систем', 'System status')}
        subtitle={t('Доступность сервисов платформы, инциденты и плановые работы.', 'Platform service availability, incidents and scheduled maintenance.')}
        breadcrumbs={breadcrumbs}
        meta={
          <Badge tone="neutral">
            {t('Проверено', 'Checked')} {checkedAt}
          </Badge>
        }
        actions={
          <SubscribePopover
            subscription={subscription}
            onSubscribe={(sub) => {
              const first = !subscription
              setSubscription(sub)
              toast.success(first ? t('Подписка оформлена', 'Subscribed') : t('Подписка обновлена', 'Subscription updated'), {
                description: `${sub.email}: ${sub.services.length} ${plural(sub.services.length, ['сервис', 'сервиса', 'сервисов'], ['service', 'services'])}`,
              })
            }}
            onUnsubscribe={() => {
              setSubscription(null)
              toast.info(t('Подписка отменена', 'Unsubscribed'))
            }}
          />
        }
      />

      <div className={s.page}>
        <Callout
          tone={overall.tone}
          title={tx(overall.title)}
          actions={
            <>
              <Button size="sm" icon={<RefreshCw size={14} />} loading={refreshing} onClick={() => void refresh()}>
                {t('Обновить', 'Refresh')}
              </Button>
              {summary.outage.length ? (
                <LinkButton href="/facilities" size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
                  {t('К объектам', 'Go to facilities')}
                </LinkButton>
              ) : null}
            </>
          }
        >
          {summary.outage.length ? `${t('Недоступно', 'Unavailable')}: ${names(summary.outage)}. ` : ''}
          {summary.degraded.length ? `${t('С ограничениями', 'Degraded')}: ${names(summary.degraded)}. ` : ''}
          {t(
            `Штатно работают ${summary.healthy} из ${SERVICES.length} сервисов.`,
            `${summary.healthy} of ${SERVICES.length} services operating normally.`,
          )}
        </Callout>

        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '220px' }}>
          <StatTile
            label={t('Доступность платформы', 'Platform availability')}
            value={`${summary.uptime.toLocaleString(intl, { maximumFractionDigits: 2 })}%`}
            icon={<Activity size={16} />}
            tone="success"
            hint={t(`Среднее по ${SERVICES.length} сервисам за 90 дней`, `Average across ${SERVICES.length} services over 90 days`)}
          />
          <StatTile
            label={t('Открытые инциденты', 'Open incidents')}
            value={summary.open}
            icon={<AlertTriangle size={16} />}
            tone="danger"
            hint={t('Критический и серьёзный', 'One critical, one major')}
          />
          <StatTile
            label={t('Время восстановления', 'Time to recover')}
            value={`${summary.mttr} ${t('мин', 'min')}`}
            icon={<Timer size={16} />}
            tone="info"
            hint={t(`Среднее по ${summary.resolved} решённым инцидентам`, `Average across ${summary.resolved} resolved incidents`)}
          />
          <StatTile
            label={t('Плановые работы', 'Scheduled maintenance')}
            value={MAINTENANCE.length}
            icon={<CalendarClock size={16} />}
            tone="violet"
            hint={MAINTENANCE[0] ? `${t('Ближайшие', 'Next')}: ${MAINTENANCE[0].date.slice(0, 5)}, ${MAINTENANCE[0].window}` : undefined}
          />
        </div>

        <ServicesCard services={SERVICES} />

        <div className="pg-split">
          <Card
            title={t('Время ответа', 'Response time')}
            description={period === '24h' ? t('Медиана за час, мс.', 'Hourly median, ms.') : t('Медиана за сутки, мс.', 'Daily median, ms.')}
            actions={
              <SegmentedControl
                aria-label={t('Период', 'Period')}
                size="sm"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: '24h', label: t('24 часа', '24 hours') },
                  { value: '7d', label: t('7 дней', '7 days') },
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
                      <span className={s.latencyLabel}>{tx(x.label)}</span>
                      <span className={s.latencyValue} data-high={now > avg * 1.5 || undefined}>
                        {formatNum(now)} {ms}
                      </span>
                      <span className="ev-muted">
                        {t('среднее', 'average')} {formatNum(avg)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <AreaChart
                aria-label={t('Время ответа сервисов', 'Service response time')}
                data={latency}
                x={(p) => p.label}
                height={240}
                series={LATENCY_SERIES.map((x) => ({ key: x.key, label: tx(x.label), value: (p: LatencyPoint) => p[x.key] }))}
                format={(v) => `${formatNum(v)} ${ms}`}
              />
            </div>
          </Card>

          <Card title={t('Плановые работы', 'Scheduled maintenance')} description={t('Время московское.', 'Moscow time.')}>
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
                      <span className={s.maintTitle}>{tx(m.title)}</span>
                      <span className="ev-muted">{m.services.map((id) => tx(serviceName(id))).join(', ')}</span>
                      <Badge size="sm" tone={m.impactTone}>
                        {tx(m.impact)}
                      </Badge>
                      <Button
                        size="sm"
                        variant={on ? 'secondary' : 'ghost'}
                        aria-pressed={on}
                        icon={on ? <BellRing size={14} /> : <BellOff size={14} />}
                        onClick={() => toggleReminder(m.id, tx(m.title))}
                      >
                        {on ? t('Напоминание включено', 'Reminder on') : t('Напомнить', 'Remind me')}
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
