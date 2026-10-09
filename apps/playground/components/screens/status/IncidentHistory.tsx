'use client'

import { Badge, Button, Card, CopyButton, EmptyState, KeyValueList, SegmentedControl, StatusPill, Timeline } from 'endfield-vision'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, INCIDENT_SEVERITY, INCIDENT_STATE, serviceName, type StatusIncident } from '@/lib/demo/status'
import { useT } from '@/lib/i18n'
import s from './status.module.css'

type Filter = 'all' | 'open' | 'resolved'

/** История инцидентов: раскрываемые карточки с ходом работ. */
export function IncidentHistory({ incidents }: { incidents: StatusIncident[] }) {
  const { t } = useT()
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string[]>(() => incidents.filter((i) => i.state !== 'resolved').slice(0, 1).map((i) => i.id))

  const open = incidents.filter((i) => i.state !== 'resolved')
  const list = filter === 'all' ? incidents : filter === 'open' ? open : incidents.filter((i) => i.state === 'resolved')
  const allExpanded = list.length > 0 && list.every((i) => expanded.includes(i.id))

  const toggle = (id: string) => setExpanded((x) => (x.includes(id) ? x.filter((k) => k !== id) : [...x, id]))

  return (
    <Card
      title={t('История инцидентов', 'Incident history')}
      description={t('За последние 90 дней.', 'Last 90 days.')}
      actions={
        <>
          <SegmentedControl
            aria-label={t('Фильтр инцидентов', 'Incident filter')}
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('Все', 'All'), count: incidents.length },
              { value: 'open', label: t('Открытые', 'Open'), count: open.length },
              { value: 'resolved', label: t('Решённые', 'Resolved'), count: incidents.length - open.length },
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={list.length === 0}
            onClick={() => setExpanded(allExpanded ? [] : list.map((i) => i.id))}
          >
            {allExpanded ? t('Свернуть все', 'Collapse all') : t('Развернуть все', 'Expand all')}
          </Button>
        </>
      }
    >
      {list.length === 0 ? (
        <EmptyState compact title={t('Инцидентов нет', 'No incidents')} />
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
  const { t, tx, lang } = useT()
  const sev = INCIDENT_SEVERITY[inc.severity]
  const st = INCIDENT_STATE[inc.state]
  const bodyId = `incident-${inc.id}`
  const duration = formatDuration(inc.minutes, lang)
  return (
    <li
      className={`${s.incident} ev-corners`}
      data-tone={sev.tone}
      // Идущий инцидент - уголки в тоне уровня, раскрытый - рамка видоискателя, решённый - без метки.
      data-corners={inc.state === 'resolved' ? 'off' : expanded ? 'frame' : 'diagonal'}
    >
      <div className={s.incidentHead}>
        <div className={s.incidentTitles}>
          <div className={s.incidentTitleRow}>
            <span className={s.incidentTitle}>{tx(inc.title)}</span>
            <span className="ev-mono ev-muted">{inc.id}</span>
          </div>
          <div className={s.incidentMeta}>
            <StatusPill tone={sev.tone}>{tx(sev.label)}</StatusPill>
            <Badge tone={st.tone}>{tx(st.label)}</Badge>
            <span className="ev-muted">
              {inc.startedAt}, {inc.endedAt ? `${t('длительность', 'lasted')} ${duration}` : `${t('идёт', 'ongoing for')} ${duration}`}
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
          {expanded ? t('Свернуть', 'Collapse') : t('Подробнее', 'Details')}
        </Button>
      </div>
      {expanded ? (
        <div id={bodyId} className={s.incidentBody}>
          <p>{tx(inc.summary)}</p>
          <KeyValueList
            columns={2}
            labelWidth={120}
            items={[
              { key: 'start', label: t('Начало', 'Started'), value: inc.startedAt },
              { key: 'end', label: t('Окончание', 'Ended'), value: inc.endedAt },
              { key: 'duration', label: t('Длительность', 'Duration'), value: duration },
              {
                key: 'services',
                label: t('Сервисы', 'Services'),
                value: (
                  <span className={s.badges}>
                    {inc.services.map((id) => (
                      <Badge key={id} size="sm">
                        {tx(serviceName(id))}
                      </Badge>
                    ))}
                  </span>
                ),
              },
            ]}
          />
          <Timeline
            aria-label={t(`Ход инцидента ${inc.id}`, `${inc.id} timeline`)}
            items={inc.updates.map((u) => ({
              id: u.id,
              tone: INCIDENT_STATE[u.state].tone,
              title: tx(INCIDENT_STATE[u.state].label),
              time: u.at,
              description: tx(u.text),
            }))}
          />
          <div className={s.incidentFoot}>
            <CopyButton text={`https://status.endfield.example/incidents/${inc.id}`} label={t('Скопировать ссылку', 'Copy link')} />
          </div>
        </div>
      ) : null}
    </li>
  )
}
