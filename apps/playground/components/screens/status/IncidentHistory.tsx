'use client'

import { Badge, Button, Card, CopyButton, EmptyState, KeyValueList, SegmentedControl, StatusPill } from 'endfield-vision'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { INCIDENT_SEVERITY, INCIDENT_STATE, serviceName, type StatusIncident } from '@/lib/demo/status'
import s from './status.module.css'

type Filter = 'all' | 'open' | 'resolved'

/** История инцидентов: раскрываемые карточки с ходом работ. */
export function IncidentHistory({ incidents }: { incidents: StatusIncident[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string[]>(() => incidents.filter((i) => i.state !== 'resolved').slice(0, 1).map((i) => i.id))

  const open = incidents.filter((i) => i.state !== 'resolved')
  const list = filter === 'all' ? incidents : filter === 'open' ? open : incidents.filter((i) => i.state === 'resolved')
  const allExpanded = list.length > 0 && list.every((i) => expanded.includes(i.id))

  const toggle = (id: string) => setExpanded((x) => (x.includes(id) ? x.filter((k) => k !== id) : [...x, id]))

  return (
    <Card
      title="История инцидентов"
      description="За последние 90 дней."
      actions={
        <>
          <SegmentedControl
            aria-label="Фильтр инцидентов"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Все', count: incidents.length },
              { value: 'open', label: 'Открытые', count: open.length },
              { value: 'resolved', label: 'Решённые', count: incidents.length - open.length },
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={list.length === 0}
            onClick={() => setExpanded(allExpanded ? [] : list.map((i) => i.id))}
          >
            {allExpanded ? 'Свернуть все' : 'Развернуть все'}
          </Button>
        </>
      }
    >
      {list.length === 0 ? (
        <EmptyState compact title="Инцидентов нет" />
      ) : (
        <ul role="list" className={s.incidents}>
          {list.map((inc) => (
            <IncidentItem key={inc.id} incident={inc} expanded={expanded.includes(inc.id)} onToggle={() => toggle(inc.id)} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function IncidentItem({ incident: inc, expanded, onToggle }: { incident: StatusIncident; expanded: boolean; onToggle: () => void }) {
  const sev = INCIDENT_SEVERITY[inc.severity]
  const st = INCIDENT_STATE[inc.state]
  const bodyId = `incident-${inc.id}`
  return (
    <li className={s.incident} data-open={inc.state !== 'resolved' || undefined}>
      <div className={s.incidentHead}>
        <div className={s.incidentTitles}>
          <div className={s.incidentTitleRow}>
            <span className={s.incidentTitle}>{inc.title}</span>
            <span className="ev-mono ev-muted">{inc.id}</span>
          </div>
          <div className={s.incidentMeta}>
            <StatusPill tone={sev.tone}>{sev.label}</StatusPill>
            <Badge tone={st.tone}>{st.label}</Badge>
            <span className="ev-muted">
              {inc.startedAt}, {inc.endedAt ? `длительность ${inc.duration}` : `идёт ${inc.duration}`}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls={bodyId}
          iconRight={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          onClick={onToggle}
        >
          {expanded ? 'Свернуть' : 'Подробнее'}
        </Button>
      </div>
      {expanded ? (
        <div id={bodyId} className={s.incidentBody}>
          <p>{inc.summary}</p>
          <KeyValueList
            columns={2}
            labelWidth={120}
            items={[
              { key: 'start', label: 'Начало', value: inc.startedAt },
              { key: 'end', label: 'Окончание', value: inc.endedAt },
              { key: 'duration', label: 'Длительность', value: inc.duration },
              {
                key: 'services',
                label: 'Сервисы',
                value: (
                  <span className={s.badges}>
                    {inc.services.map((id) => (
                      <Badge key={id} size="sm">
                        {serviceName(id)}
                      </Badge>
                    ))}
                  </span>
                ),
              },
            ]}
          />
          <ol className={s.updates}>
            {inc.updates.map((u) => (
              <li key={u.id} className={s.update} data-state={u.state}>
                <span className={s.updateDot} aria-hidden="true" />
                <div className={s.updateBody}>
                  <div className={s.updateMeta}>
                    <span className="ev-num">{u.at}</span>
                    <span>{INCIDENT_STATE[u.state].label}</span>
                  </div>
                  <div>{u.text}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className={s.incidentFoot}>
            <CopyButton text={`https://status.endfield.example/incidents/${inc.id}`} label="Скопировать ссылку" />
          </div>
        </div>
      ) : null}
    </li>
  )
}
