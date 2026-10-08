'use client'

import {
  Avatar,
  Badge,
  Button,
  CopyValue,
  DataTable,
  Drawer,
  EmptyState,
  KeyValueList,
  toast,
  type Column,
} from 'endfield-vision'
import { FileJson, FileSearch } from 'lucide-react'
import { AUDIT_ACTIONS, SYSTEM_ACTOR, type AuditChange, type AuditEvent } from '@/lib/demo/audit'
import { personById } from '@/lib/demo/team'
import { formatDateTime } from '@/lib/format'
import s from './audit.module.css'

export function actorName(id: string): string {
  return id === SYSTEM_ACTOR ? 'Система' : (personById(id)?.name ?? 'Неизвестный')
}

export function isExternalIp(ip: string): boolean {
  return !ip.startsWith('10.')
}

const CHANGE_COLUMNS: Column<AuditChange>[] = [
  {
    key: 'field',
    header: 'Поле',
    primary: true,
    width: '28%',
    cell: (c) => <span className={s.field}>{c.field}</span>,
  },
  {
    key: 'before',
    header: 'Было',
    wrap: true,
    cell: (c) => (c.before === null ? null : <span className={s.removed}>{c.before}</span>),
  },
  {
    key: 'after',
    header: 'Стало',
    wrap: true,
    cell: (c) => (c.after === null ? null : <span className={s.added}>{c.after}</span>),
  },
]

export function AuditDrawer({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  const exportJson = () => {
    if (!event) return
    const size = new Blob([JSON.stringify(event, null, 2)]).size
    toast.success('Событие выгружено', {
      description: `${event.id}.json, ${size.toLocaleString('ru-RU')} байт`,
    })
  }
  return (
    <Drawer
      open={event !== null}
      onClose={onClose}
      width={600}
      title={event ? `${AUDIT_ACTIONS[event.action].label}: ${event.object}` : undefined}
      subtitle={event ? formatDateTime(event.at) : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
          <Button icon={<FileJson size={15} />} onClick={exportJson}>
            Экспорт JSON
          </Button>
        </>
      }
    >
      {event ? <EventDetails event={event} /> : null}
    </Drawer>
  )
}

function EventDetails({ event }: { event: AuditEvent }) {
  const person = event.actorId === SYSTEM_ACTOR ? null : personById(event.actorId)
  const name = actorName(event.actorId)
  const external = isExternalIp(event.ip)
  return (
    <div className={s.drawer}>
      <div className="ev-row">
        <Badge tone={AUDIT_ACTIONS[event.action].tone}>{AUDIT_ACTIONS[event.action].label}</Badge>
        <span className="ev-secondary">{event.summary}</span>
        {external ? (
          <Badge tone="warning" dot size="sm">
            Внешняя сеть
          </Badge>
        ) : null}
      </div>

      <div className={s.idRow}>
        <span className="ev-muted">ID события</span>
        <CopyValue value={event.id} label="Скопировать ID события" />
      </div>

      <KeyValueList
        labelWidth={140}
        items={[
          { key: 'at', label: 'Время', value: formatDateTime(event.at) },
          {
            key: 'actor',
            label: 'Пользователь',
            value: (
              <span className={s.actor}>
                <Avatar name={name} size={22} tone={person ? undefined : 'neutral'} />
                {name}
              </span>
            ),
            hint: person ? `${person.position}, ${person.email}` : 'Автоматическое действие',
          },
          { key: 'object', label: 'Объект', value: event.object, hint: event.objectType },
          {
            key: 'ip',
            label: 'IP-адрес',
            value: event.ip,
            mono: true,
            hint: external ? 'Адрес вне корпоративной сети' : 'Корпоративная сеть',
          },
          { key: 'client', label: 'Клиент', value: event.client },
          { key: 'req', label: 'ID запроса', value: event.requestId, mono: true },
        ]}
      />

      <section className={s.block} aria-labelledby={`${event.id}-diff`}>
        <h3 id={`${event.id}-diff`} className={s.blockTitle}>
          Изменения
          {event.changes.length > 0 ? <span className="ev-muted ev-num">{event.changes.length}</span> : null}
        </h3>
        {event.changes.length === 0 ? (
          <EmptyState
            compact
            icon={<FileSearch size={20} />}
            title="Данные не менялись"
            description="Событие фиксирует действие без изменения записей."
          />
        ) : (
          <DataTable
            aria-label="Изменения"
            columns={CHANGE_COLUMNS}
            rows={event.changes}
            rowKey={(c) => c.field}
            dense
            mobile="scroll"
          />
        )}
      </section>
    </div>
  )
}
