import { Avatar, Badge, Progress, StatusPill, type Column } from 'endfield-vision'
import { FACILITIES } from '@/lib/demo/facilities'
import {
  isOverdue,
  PRIORITY,
  PRIORITY_ORDER,
  STATUS_ORDER,
  TASK_STATUS,
  taskProgress,
  type Task,
} from '@/lib/demo/tasks'
import { personName } from '@/lib/demo/team'
import { formatDate } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import s from './tasks.module.css'

/* Колонки таблицы задач и сортировка по ним. Подписи - на языке переводчика из useT(). */

const FACILITY_BY_ID = new Map(FACILITIES.map((f) => [f.id, f]))

export function facilityName(id: string, tr: Translator): string {
  const f = FACILITY_BY_ID.get(id)
  return f ? tr.tx(f.name) : ''
}

export function compareTasks(a: Task, b: Task, key: string, tr: Translator): number {
  switch (key) {
    case 'id':
      return a.id.localeCompare(b.id)
    case 'title':
      return tr.tx(a.title).localeCompare(tr.tx(b.title), tr.intl)
    case 'facility':
      return facilityName(a.facilityId, tr).localeCompare(facilityName(b.facilityId, tr), tr.intl)
    case 'assignee':
      return tr.tx(personName(a.assigneeId)).localeCompare(tr.tx(personName(b.assigneeId)), tr.intl)
    case 'priority':
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    case 'status':
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    case 'progress':
      return taskProgress(a) - taskProgress(b)
    default:
      return a.due.localeCompare(b.due)
  }
}

export function taskColumns(tr: Translator): Column<Task>[] {
  const { t, tx } = tr
  return [
    {
      key: 'id',
      header: t('Номер', 'No.'),
      sortable: true,
      width: 100,
      hideOnMobile: true,
      cell: (task) => <span className="ev-mono ev-muted">{task.id}</span>,
    },
    {
      key: 'title',
      header: t('Задача', 'Task'),
      primary: true,
      sortable: true,
      minWidth: 240,
      wrap: true,
      cell: (task) => <span className={s.title}>{tx(task.title)}</span>,
    },
    {
      key: 'facility',
      header: t('Объект', 'Facility'),
      sortable: true,
      cell: (task) => {
        const f = FACILITY_BY_ID.get(task.facilityId)
        return f ? (
          <span className={s.twoLine}>
            <span>{tx(f.name)}</span>
            <span className="ev-mono ev-muted">{f.code}</span>
          </span>
        ) : null
      },
    },
    {
      key: 'assignee',
      header: t('Исполнитель', 'Assignee'),
      sortable: true,
      cell: (task) => {
        const name = tx(personName(task.assigneeId))
        return (
          <span className={s.person}>
            <Avatar name={name} size={24} />
            <span className="ev-truncate">{name}</span>
          </span>
        )
      },
    },
    {
      key: 'priority',
      header: t('Приоритет', 'Priority'),
      sortable: true,
      cell: (task) => <Badge tone={PRIORITY[task.priority].tone}>{tx(PRIORITY[task.priority].label)}</Badge>,
    },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      sortable: true,
      cell: (task) => (
        <StatusPill tone={TASK_STATUS[task.status].tone}>{tx(TASK_STATUS[task.status].label)}</StatusPill>
      ),
    },
    {
      key: 'due',
      header: t('Срок', 'Due date'),
      sortable: true,
      align: 'right',
      cell: (task) => (
        <span className={isOverdue(task) ? `${s.overdue} ev-num` : 'ev-num'}>{formatDate(task.due)}</span>
      ),
    },
    {
      key: 'progress',
      header: t('Прогресс', 'Progress'),
      sortable: true,
      width: 150,
      cell: (task) => {
        const p = taskProgress(task)
        return (
          <span className={s.progress}>
            <Progress
              value={p}
              size="sm"
              tone={p === 100 ? 'success' : 'accent'}
              aria-label={t(`Прогресс ${task.id}`, `Progress ${task.id}`)}
            />
            <span className="ev-num ev-muted">{p}%</span>
          </span>
        )
      },
    },
  ]
}
