'use client'

import { Card, EmptyState, SegmentedControl, StatusPill } from 'endfield-vision'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { DAY_STATE, SERVICE_STATUS, STATUS_DAYS, type Service } from '@/lib/demo/status'
import s from './status.module.css'

type Filter = 'all' | 'issues'

const pct = (v: number) => `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

/** Список сервисов с полосой доступности за 90 дней. */
export function ServicesCard({ services }: { services: Service[] }) {
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
      <div className={s.legend} aria-hidden="true">
        <span className={s.legendItem} data-state="ok">
          Без сбоев
        </span>
        <span className={s.legendItem} data-state="minor">
          Частичный сбой
        </span>
        <span className={s.legendItem} data-state="major">
          Серьёзный сбой
        </span>
        <span className={s.legendItem} data-state="maint">
          Плановые работы
        </span>
      </div>
    </Card>
  )
}

function ServiceRow({ service: sv }: { service: Service }) {
  const [hover, setHover] = useState<number | null>(null)
  const st = SERVICE_STATUS[sv.status]
  const day = hover === null ? null : sv.days[hover]
  const badDays = sv.days.filter((d) => d.state === 'minor' || d.state === 'major').length
  return (
    <li className={s.service}>
      <div className={s.serviceHead}>
        <div className={s.serviceName}>
          <span className={s.serviceTitle}>{sv.name}</span>
          <span className="ev-muted">{sv.description}</span>
        </div>
        <div className={s.serviceMeta}>
          <span className={s.uptime} data-low={sv.uptime < 99.5 || undefined}>
            {pct(sv.uptime)}
          </span>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
        </div>
      </div>
      <div
        className={s.bars}
        role="img"
        aria-label={`${sv.name}: доступность ${pct(sv.uptime)} за ${STATUS_DAYS} дней, дней со сбоями: ${badDays}`}
        onMouseLeave={() => setHover(null)}
      >
        {sv.days.map((d, i) => (
          <span key={d.date} className={s.bar} data-state={d.state} data-active={hover === i || undefined} onMouseEnter={() => setHover(i)} />
        ))}
      </div>
      <div className={s.stripFoot} aria-hidden="true">
        <span className={s.footLong}>{STATUS_DAYS} дней назад</span>
        <span className={s.footShort}>30 дней назад</span>
        <span className={s.readout} data-state={day?.state}>
          {day ? `${day.date}: ${DAY_STATE[day.state]}${day.minutes ? `, ${day.minutes} мин` : ''}` : badDays ? `Дней со сбоями: ${badDays}` : 'Без сбоев'}
        </span>
        <span>Сегодня</span>
      </div>
    </li>
  )
}
