'use client'

import { Card, EmptyState, SegmentedControl, StatusPill, UptimeBar, useMessages, type UptimeStatus } from 'endfield-vision'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { SERVICE_STATUS, STATUS_DAYS, type DayState, type Service } from '@/lib/demo/status'
import { useT } from '@/lib/i18n'
import s from './status.module.css'

type Filter = 'all' | 'issues'

const DAY_STATUS: Record<DayState, UptimeStatus> = { ok: 'operational', minor: 'degraded', major: 'outage', maint: 'maintenance' }
const LEGEND = ['operational', 'degraded', 'outage', 'maintenance'] as const satisfies readonly UptimeStatus[]

/** Список сервисов с полосой доступности за 90 дней. */
export function ServicesCard({ services }: { services: Service[] }) {
  const m = useMessages()
  const { t, tx } = useT()
  const [filter, setFilter] = useState<Filter>('all')
  const issues = services.filter((sv) => sv.status !== 'operational')
  const list = filter === 'all' ? services : issues
  // Группы - по русскому названию (ключ), подпись - на текущем языке.
  const groups = Array.from(new Set(list.map((sv) => sv.group.ru)))

  return (
    <Card
      title={t('Сервисы', 'Services')}
      description={t(
        `Доступность за ${STATUS_DAYS} дней. Наведите на полосу, чтобы увидеть день.`,
        `Availability over ${STATUS_DAYS} days. Hover over the bar to see a day.`,
      )}
      actions={
        <SegmentedControl
          aria-label={t('Фильтр сервисов', 'Service filter')}
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('Все', 'All'), count: services.length },
            { value: 'issues', label: t('С проблемами', 'With issues'), count: issues.length },
          ]}
        />
      }
    >
      {list.length === 0 ? (
        <EmptyState
          compact
          icon={<CircleCheck size={22} />}
          title={t('Проблем нет', 'No issues')}
          description={t('Все сервисы работают штатно.', 'All services are operating normally.')}
        />
      ) : (
        <div className={s.groups}>
          {groups.map((g) => {
            const items = list.filter((sv) => sv.group.ru === g)
            return (
              <section key={g} className={s.group}>
                <h3 className={s.groupTitle}>{items[0] ? tx(items[0].group) : g}</h3>
                <ul role="list" className={s.services}>
                  {items.map((sv) => (
                    <ServiceRow key={sv.id} service={sv} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      <ul role="list" className={s.legend} aria-label={t('Обозначения', 'Legend')}>
        {LEGEND.map((st) => (
          <li key={st} className={s.legendItem} data-state={st}>
            {m.uptime[st]}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ServiceRow({ service: sv }: { service: Service }) {
  const { t, tx, intl } = useT()
  const st = SERVICE_STATUS[sv.status]
  const badDays = sv.days.filter((d) => d.state === 'minor' || d.state === 'major').length
  const pct = (v: number) => `${v.toLocaleString(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  return (
    <li className={s.service}>
      <div className={s.serviceHead}>
        <div className={s.serviceName}>
          <span className={s.serviceTitle}>{tx(sv.name)}</span>
          <span className="ev-muted">{tx(sv.description)}</span>
        </div>
        <div className={s.serviceMeta}>
          <span className={s.badDays}>{badDays ? `${t('Дней со сбоями', 'Days with incidents')}: ${badDays}` : t('Без сбоев', 'No incidents')}</span>
          <span className={s.uptime} data-low={sv.uptime < 99.5 || undefined}>
            {pct(sv.uptime)}
          </span>
          <StatusPill tone={st.tone}>{tx(st.label)}</StatusPill>
        </div>
      </div>
      <UptimeBar
        aria-label={t(
          `${sv.name.ru}: доступность ${pct(sv.uptime)} за ${STATUS_DAYS} дней`,
          `${sv.name.en}: ${pct(sv.uptime)} availability over ${STATUS_DAYS} days`,
        )}
        height={30}
        showRange
        days={sv.days.map((d) => ({
          date: d.date,
          status: DAY_STATUS[d.state],
          note: d.minutes ? `${t('Длительность', 'Duration')}: ${d.minutes} ${t('мин', 'min')}` : undefined,
        }))}
      />
    </li>
  )
}
