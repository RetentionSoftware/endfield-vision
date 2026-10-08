'use client'

import { Card, EmptyState, SegmentedControl, StatusPill, UptimeBar, useMessages, type UptimeStatus } from 'endfield-vision'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { SERVICE_STATUS, STATUS_DAYS, type DayState, type Service } from '@/lib/demo/status'
import s from './status.module.css'

type Filter = 'all' | 'issues'

const DAY_STATUS: Record<DayState, UptimeStatus> = { ok: 'operational', minor: 'degraded', major: 'outage', maint: 'maintenance' }
const LEGEND = ['operational', 'degraded', 'outage', 'maintenance'] as const satisfies readonly UptimeStatus[]

const pct = (v: number) => `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

/** Список сервисов с полосой доступности за 90 дней. */
export function ServicesCard({ services }: { services: Service[] }) {
  const t = useMessages()
  const [filter, setFilter] = useState<Filter>('all')
  const issues = services.filter((sv) => sv.status !== 'operational')
  const list = filter === 'all' ? services : issues
  const groups = Array.from(new Set(list.map((sv) => sv.group)))

  return (
    <Card
      title="Сервисы"
      description={`Доступность за ${STATUS_DAYS} дней. Наведите на полосу, чтобы увидеть день.`}
      actions={
        <SegmentedControl
          aria-label="Фильтр сервисов"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все', count: services.length },
            { value: 'issues', label: 'С проблемами', count: issues.length },
          ]}
        />
      }
    >
      {list.length === 0 ? (
        <EmptyState compact icon={<CircleCheck size={22} />} title="Проблем нет" description="Все сервисы работают штатно." />
      ) : (
        <div className={s.groups}>
          {groups.map((g) => (
            <section key={g} className={s.group}>
              <h3 className={s.groupTitle}>{g}</h3>
              <ul role="list" className={s.services}>
                {list
                  .filter((sv) => sv.group === g)
                  .map((sv) => (
                    <ServiceRow key={sv.id} service={sv} />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <ul role="list" className={s.legend} aria-label="Обозначения">
        {LEGEND.map((st) => (
          <li key={st} className={s.legendItem} data-state={st}>
            {t.uptime[st]}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ServiceRow({ service: sv }: { service: Service }) {
  const st = SERVICE_STATUS[sv.status]
  const badDays = sv.days.filter((d) => d.state === 'minor' || d.state === 'major').length
  return (
    <li className={s.service}>
      <div className={s.serviceHead}>
        <div className={s.serviceName}>
          <span className={s.serviceTitle}>{sv.name}</span>
          <span className="ev-muted">{sv.description}</span>
        </div>
        <div className={s.serviceMeta}>
          <span className={s.badDays}>{badDays ? `Дней со сбоями: ${badDays}` : 'Без сбоев'}</span>
          <span className={s.uptime} data-low={sv.uptime < 99.5 || undefined}>
            {pct(sv.uptime)}
          </span>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
        </div>
      </div>
      <UptimeBar
        aria-label={`${sv.name}: доступность ${pct(sv.uptime)} за ${STATUS_DAYS} дней`}
        height={30}
        showRange
        days={sv.days.map((d) => ({
          date: d.date,
          status: DAY_STATUS[d.state],
          note: d.minutes ? `Длительность: ${d.minutes} мин` : undefined,
        }))}
      />
    </li>
  )
}
