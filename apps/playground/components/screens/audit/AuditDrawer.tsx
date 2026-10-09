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
import { personById, personName } from '@/lib/demo/team'
import { formatDateTime } from '@/lib/format'
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'
import s from './audit.module.css'

const SYSTEM_NAME = bi('Система', 'System')

/** Автор события на двух языках; в компоненте - tx(actorName(id)). */
export function actorName(id: string): Bi {
  return id === SYSTEM_ACTOR ? SYSTEM_NAME : personName(id)
}

export function isExternalIp(ip: string): boolean {
  return !ip.startsWith('10.')
}

function changeColumns({ t, tx }: Translator): Column<AuditChange>[] {
  return [
    {
      key: 'field',
      header: t('Поле', 'Field'),
      primary: true,
      width: '28%',
      cell: (c) => <span className={s.field}>{tx(c.field)}</span>,
    },
    {
      key: 'before',
      header: t('Было', 'Before'),
      wrap: true,
      cell: (c) => (c.before === null ? null : <span className={s.removed}>{tx(c.before)}</span>),
    },
    {
      key: 'after',
      header: t('Стало', 'After'),
      wrap: true,
      cell: (c) => (c.after === null ? null : <span className={s.added}>{tx(c.after)}</span>),
    },
  ]
}

export function AuditDrawer({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  const { t, tx, intl } = useT()
  const exportJson = () => {
    if (!event) return
    const size = new Blob([JSON.stringify(event, null, 2)]).size
    toast.success(t('Событие выгружено', 'Event exported'), {
      description: t(
        `${event.id}.json, ${size.toLocaleString(intl)} байт`,
        `${event.id}.json, ${size.toLocaleString(intl)} bytes`,
      ),
    })
  }
  return (
    <Drawer
      open={event !== null}
      onClose={onClose}
      width={600}
      title={event ? `${tx(AUDIT_ACTIONS[event.action].label)}: ${tx(event.object)}` : undefined}
      subtitle={event ? formatDateTime(event.at) : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('Закрыть', 'Close')}
          </Button>
          <Button icon={<FileJson size={15} />} onClick={exportJson}>
            {t('Экспорт JSON', 'Export JSON')}
          </Button>
        </>
      }
    >
      {event ? <EventDetails event={event} /> : null}
    </Drawer>
  )
}

function EventDetails({ event }: { event: AuditEvent }) {
  const tr = useT()
  const { t, tx } = tr
  const person = event.actorId === SYSTEM_ACTOR ? null : personById(event.actorId)
  const name = tx(actorName(event.actorId))
  const external = isExternalIp(event.ip)
  return (
    <div className={s.drawer}>
      <div className="ev-row">
        <Badge tone={AUDIT_ACTIONS[event.action].tone}>{tx(AUDIT_ACTIONS[event.action].label)}</Badge>
        <span className="ev-secondary">{tx(event.summary)}</span>
        {external ? (
          <Badge tone="warning" dot size="sm">
            {t('Внешняя сеть', 'External network')}
          </Badge>
        ) : null}
      </div>

      <div className={s.idRow}>
        <span className="ev-muted">{t('ID события', 'Event ID')}</span>
        <CopyValue value={event.id} label={t('Скопировать ID события', 'Copy event ID')} />
      </div>

      <KeyValueList
        labelWidth={140}
        items={[
          { key: 'at', label: t('Время', 'Time'), value: formatDateTime(event.at) },
          {
            key: 'actor',
            label: t('Пользователь', 'User'),
            value: (
              <span className={s.actor}>
                <Avatar name={name} size={22} tone={person ? undefined : 'neutral'} />
                {name}
              </span>
            ),
            hint: person
              ? `${tx(person.position)}, ${person.email}`
              : t('Автоматическое действие', 'Automated action'),
          },
          {
            key: 'object',
            label: t('Объект', 'Object'),
            value: tx(event.object),
            hint: tx(event.objectType),
          },
          {
            key: 'ip',
            label: t('IP-адрес', 'IP address'),
            value: event.ip,
            mono: true,
            hint: external
              ? t('Адрес вне корпоративной сети', 'Address outside the corporate network')
              : t('Корпоративная сеть', 'Corporate network'),
          },
          { key: 'client', label: t('Клиент', 'Client'), value: tx(event.client) },
          { key: 'req', label: t('ID запроса', 'Request ID'), value: event.requestId, mono: true },
        ]}
      />

      <section className={s.block} aria-labelledby={`${event.id}-diff`}>
        <h3 id={`${event.id}-diff`} className={s.blockTitle}>
          {t('Изменения', 'Changes')}
          {event.changes.length > 0 ? <span className="ev-muted ev-num">{event.changes.length}</span> : null}
        </h3>
        {event.changes.length === 0 ? (
          <EmptyState
            compact
            icon={<FileSearch size={20} />}
            title={t('Данные не менялись', 'No data changed')}
            description={t(
              'Событие фиксирует действие без изменения записей.',
              'The event records an action without changing any records.',
            )}
          />
        ) : (
          <DataTable
            aria-label={t('Изменения', 'Changes')}
            columns={changeColumns(tr)}
            rows={event.changes}
            rowKey={(c) => c.field.ru}
            dense
            mobile="scroll"
          />
        )}
      </section>
    </div>
  )
}
