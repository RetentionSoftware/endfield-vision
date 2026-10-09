'use client'

import {
  Avatar,
  Badge,
  Button,
  CopyValue,
  DataTable,
  EmptyState,
  formatPhone,
  IconButton,
  Menu,
  Progress,
  StatusPill,
  type Column,
  type MenuEntry,
  type SortState,
} from 'endfield-vision'
import { KeyRound, MoreHorizontal, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import type { ReactNode } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { ACCESS, PRESENCE, ROLES, type Person } from '@/lib/demo/team'
import { formatDateTime } from '@/lib/format'
import { useT, type Translator } from '@/lib/i18n'
import s from './team.module.css'

export interface PersonActions {
  editRole: (p: Person) => void
  resetAccess: (p: Person) => void
  deactivate: (p: Person) => void
  restore: (p: Person) => void
}

const FACILITY_NAME = new Map(FACILITIES.map((f) => [f.id, f.name]))

export function facilitiesLabel(ids: string[], { t, tx }: Translator): string {
  if (ids.length >= FACILITIES.length) return t('Все объекты', 'All facilities')
  return ids
    .map((id) => {
      const name = FACILITY_NAME.get(id)
      return name ? tx(name) : id
    })
    .join(', ')
}

function loadTone(load: number) {
  return load >= 95 ? 'danger' : load >= 85 ? 'warning' : 'accent'
}

function Presence({ p }: { p: Person }) {
  const { t, tx } = useT()
  if (!p.active) return <StatusPill tone="neutral">{t('Отключён', 'Deactivated')}</StatusPill>
  return <StatusPill tone={PRESENCE[p.presence].tone}>{tx(PRESENCE[p.presence].label)}</StatusPill>
}

function PersonMenu({ p, actions }: { p: Person; actions: PersonActions }) {
  const { t, tx } = useT()
  const items: MenuEntry[] = p.active
    ? [
        {
          id: 'role',
          label: t('Изменить роль', 'Change role'),
          icon: <ShieldCheck size={15} />,
          hint: tx(ROLES[p.role].label),
          onSelect: () => actions.editRole(p),
        },
        {
          id: 'reset',
          label: t('Сбросить доступ', 'Reset access'),
          icon: <KeyRound size={15} />,
          onSelect: () => actions.resetAccess(p),
        },
        { type: 'separator', id: 'sep' },
        {
          id: 'off',
          label: t('Деактивировать', 'Deactivate'),
          icon: <UserX size={15} />,
          danger: true,
          onSelect: () => actions.deactivate(p),
        },
      ]
    : [
        {
          id: 'on',
          label: t('Восстановить доступ', 'Restore access'),
          icon: <UserCheck size={15} />,
          onSelect: () => actions.restore(p),
        },
      ]
  return (
    <Menu
      label={t(`Действия: ${tx(p.name)}`, `Actions: ${tx(p.name)}`)}
      trigger={<IconButton label={t('Действия', 'Actions')} size="sm" icon={<MoreHorizontal size={16} />} />}
      items={items}
    />
  )
}

export function PeopleTable({
  people,
  actions,
  sort,
  onSortChange,
  empty,
}: {
  people: Person[]
  actions: PersonActions
  sort: SortState | null
  onSortChange: (s: SortState | null) => void
  empty: ReactNode
}) {
  const tr = useT()
  const { t, tx } = tr
  const columns: Column<Person>[] = [
    {
      key: 'name',
      header: t('Сотрудник', 'Employee'),
      primary: true,
      sortable: true,
      minWidth: 220,
      cell: (p) => (
        <span className={s.who}>
          <Avatar name={tx(p.name)} size={32} />
          <span className={s.whoText}>
            <span className={s.whoName}>{tx(p.name)}</span>
            <span className="ev-muted">{tx(p.position)}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: t('Роль', 'Role'),
      sortable: true,
      cell: (p) => <Badge tone={ROLES[p.role].tone}>{tx(ROLES[p.role].label)}</Badge>,
    },
    { key: 'presence', header: t('Статус', 'Status'), cell: (p) => <Presence p={p} /> },
    {
      key: 'facilities',
      header: t('Объекты', 'Facilities'),
      width: 200,
      cell: (p) => <span className={`${s.clamp} ev-secondary`}>{facilitiesLabel(p.facilityIds, tr)}</span>,
    },
    {
      key: 'load',
      header: t('Загрузка', 'Load'),
      sortable: true,
      width: 140,
      cell: (p) =>
        p.active && p.presence !== 'vacation' ? (
          <span className={s.load}>
            <Progress
              value={p.load}
              size="sm"
              tone={loadTone(p.load)}
              aria-label={t(`Загрузка: ${tx(p.name)}`, `Load: ${tx(p.name)}`)}
            />
            <span className="ev-num ev-muted">{p.load}%</span>
          </span>
        ) : null,
    },
    {
      key: 'email',
      header: t('Почта', 'Email'),
      hideOnMobile: true,
      cell: (p) => <CopyValue value={p.email} size="sm" label={t('Скопировать почту', 'Copy email')} />,
    },
    {
      key: 'lastSeen',
      header: t('Был в сети', 'Last seen'),
      sortable: true,
      align: 'right',
      cell: (p) => <span className="ev-num ev-muted">{formatDateTime(p.lastSeen)}</span>,
    },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      width: 48,
      align: 'right',
      cell: (p) => <PersonMenu p={p} actions={actions} />,
    },
  ]
  return (
    <DataTable
      aria-label={t('Сотрудники', 'Employees')}
      columns={columns}
      rows={people}
      rowKey={(p) => p.id}
      sort={sort}
      onSortChange={onSortChange}
      rowMuted={(p) => !p.active}
      empty={empty}
    />
  )
}

export function PeopleGrid({
  people,
  actions,
  empty,
}: {
  people: Person[]
  actions: PersonActions
  empty: ReactNode
}) {
  const tr = useT()
  const { t, tx } = tr
  if (people.length === 0) return <div className={s.gridEmpty}>{empty}</div>
  return (
    <ul role="list" className={s.grid}>
      {people.map((p) => (
        <li key={p.id} className={s.personCard} data-muted={!p.active || undefined}>
          <div className={s.personHead}>
            <Avatar name={tx(p.name)} size={52} />
            <div className={s.whoText}>
              <span className={s.personName}>{tx(p.name)}</span>
              <span className="ev-muted">{tx(p.position)}</span>
            </div>
            <PersonMenu p={p} actions={actions} />
          </div>
          <div className="ev-row">
            <Badge tone={ROLES[p.role].tone}>{tx(ROLES[p.role].label)}</Badge>
            <Presence p={p} />
            <Badge size="sm">{tx(ACCESS[p.access].label)}</Badge>
          </div>
          <div className={s.contacts}>
            <CopyValue value={p.email} size="sm" block label={t('Скопировать почту', 'Copy email')} />
            <CopyValue value={p.phone} size="sm" block label={t('Скопировать телефон', 'Copy phone')}>
              {formatPhone(p.phone)}
            </CopyValue>
          </div>
          <div className={s.personFoot}>
            <span className={`${s.clamp} ev-secondary`}>{facilitiesLabel(p.facilityIds, tr)}</span>
            {p.active && p.presence !== 'vacation' ? (
              <Progress
                value={p.load}
                size="sm"
                tone={loadTone(p.load)}
                label={t('Загрузка', 'Load')}
                showValue
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function NoPeople({ onReset }: { onReset: () => void }) {
  const { t } = useT()
  return (
    <EmptyState
      compact
      title={t('Сотрудники не найдены', 'No employees found')}
      description={t(
        'Измените условия поиска или сбросьте фильтры.',
        'Change the search or reset the filters.',
      )}
      actions={
        <Button size="sm" variant="ghost" onClick={onReset}>
          {t('Сбросить фильтры', 'Reset filters')}
        </Button>
      }
    />
  )
}
