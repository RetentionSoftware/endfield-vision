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
import s from './team.module.css'

export interface PersonActions {
  editRole: (p: Person) => void
  resetAccess: (p: Person) => void
  deactivate: (p: Person) => void
  restore: (p: Person) => void
}

const FACILITY_NAME = new Map(FACILITIES.map((f) => [f.id, f.name]))

export function facilitiesLabel(ids: string[]): string {
  if (ids.length >= FACILITIES.length) return 'Все объекты'
  return ids.map((id) => FACILITY_NAME.get(id) ?? id).join(', ')
}

function loadTone(load: number) {
  return load >= 95 ? 'danger' : load >= 85 ? 'warning' : 'accent'
}

function Presence({ p }: { p: Person }) {
  if (!p.active) return <StatusPill tone="neutral">Отключён</StatusPill>
  return <StatusPill tone={PRESENCE[p.presence].tone}>{PRESENCE[p.presence].label}</StatusPill>
}

function PersonMenu({ p, actions }: { p: Person; actions: PersonActions }) {
  const items: MenuEntry[] = p.active
    ? [
        {
          id: 'role',
          label: 'Изменить роль',
          icon: <ShieldCheck size={15} />,
          hint: ROLES[p.role].label,
          onSelect: () => actions.editRole(p),
        },
        {
          id: 'reset',
          label: 'Сбросить доступ',
          icon: <KeyRound size={15} />,
          onSelect: () => actions.resetAccess(p),
        },
        { type: 'separator', id: 'sep' },
        {
          id: 'off',
          label: 'Деактивировать',
          icon: <UserX size={15} />,
          danger: true,
          onSelect: () => actions.deactivate(p),
        },
      ]
    : [
        {
          id: 'on',
          label: 'Восстановить доступ',
          icon: <UserCheck size={15} />,
          onSelect: () => actions.restore(p),
        },
      ]
  return (
    <Menu
      label={`Действия: ${p.name}`}
      trigger={<IconButton label="Действия" size="sm" icon={<MoreHorizontal size={16} />} />}
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
  const columns: Column<Person>[] = [
    {
      key: 'name',
      header: 'Сотрудник',
      primary: true,
      sortable: true,
      minWidth: 220,
      cell: (p) => (
        <span className={s.who}>
          <Avatar name={p.name} size={32} />
          <span className={s.whoText}>
            <span className={s.whoName}>{p.name}</span>
            <span className="ev-muted">{p.position}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Роль',
      sortable: true,
      cell: (p) => <Badge tone={ROLES[p.role].tone}>{ROLES[p.role].label}</Badge>,
    },
    { key: 'presence', header: 'Статус', cell: (p) => <Presence p={p} /> },
    {
      key: 'facilities',
      header: 'Объекты',
      width: 200,
      cell: (p) => <span className={`${s.clamp} ev-secondary`}>{facilitiesLabel(p.facilityIds)}</span>,
    },
    {
      key: 'load',
      header: 'Загрузка',
      sortable: true,
      width: 140,
      cell: (p) =>
        p.active && p.presence !== 'vacation' ? (
          <span className={s.load}>
            <Progress value={p.load} size="sm" tone={loadTone(p.load)} aria-label={`Загрузка: ${p.name}`} />
            <span className="ev-num ev-muted">{p.load}%</span>
          </span>
        ) : null,
    },
    {
      key: 'email',
      header: 'Почта',
      hideOnMobile: true,
      cell: (p) => <CopyValue value={p.email} size="sm" label="Скопировать почту" />,
    },
    {
      key: 'lastSeen',
      header: 'Был в сети',
      sortable: true,
      align: 'right',
      cell: (p) => <span className="ev-num ev-muted">{formatDateTime(p.lastSeen)}</span>,
    },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">Действия</span>,
      width: 48,
      align: 'right',
      cell: (p) => <PersonMenu p={p} actions={actions} />,
    },
  ]
  return (
    <DataTable
      aria-label="Сотрудники"
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
  if (people.length === 0) return <div className={s.gridEmpty}>{empty}</div>
  return (
    <ul role="list" className={s.grid}>
      {people.map((p) => (
        <li key={p.id} className={s.personCard} data-muted={!p.active || undefined}>
          <div className={s.personHead}>
            <Avatar name={p.name} size={52} />
            <div className={s.whoText}>
              <span className={s.personName}>{p.name}</span>
              <span className="ev-muted">{p.position}</span>
            </div>
            <PersonMenu p={p} actions={actions} />
          </div>
          <div className="ev-row">
            <Badge tone={ROLES[p.role].tone}>{ROLES[p.role].label}</Badge>
            <Presence p={p} />
            <Badge size="sm">{ACCESS[p.access].label}</Badge>
          </div>
          <div className={s.contacts}>
            <CopyValue value={p.email} size="sm" block label="Скопировать почту" />
            <CopyValue value={p.phone} size="sm" block label="Скопировать телефон">
              {formatPhone(p.phone)}
            </CopyValue>
          </div>
          <div className={s.personFoot}>
            <span className={`${s.clamp} ev-secondary`}>{facilitiesLabel(p.facilityIds)}</span>
            {p.active && p.presence !== 'vacation' ? (
              <Progress value={p.load} size="sm" tone={loadTone(p.load)} label="Загрузка" showValue />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function NoPeople({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      compact
      title="Сотрудники не найдены"
      description="Измените условия поиска или сбросьте фильтры."
      actions={
        <Button size="sm" variant="ghost" onClick={onReset}>
          Сбросить фильтры
        </Button>
      }
    />
  )
}
