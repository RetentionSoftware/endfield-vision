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
import s from './tasks.module.css'

/* Колонки таблицы задач и сортировка по ним. */

const FACILITY_BY_ID = new Map(FACILITIES.map((f) => [f.id, f]))

export function facilityName(id: string): string {
  return FACILITY_BY_ID.get(id)?.name ?? ''
}

export function compareTasks(a: Task, b: Task, key: string): number {
  switch (key) {
    case 'id':
      return a.id.localeCompare(b.id)
    case 'title':
      return a.title.localeCompare(b.title, 'ru')
    case 'facility':
      return (FACILITY_BY_ID.get(a.facilityId)?.name ?? '').localeCompare(
        FACILITY_BY_ID.get(b.facilityId)?.name ?? '',
        'ru',
      )
    case 'assignee':
      return personName(a.assigneeId).localeCompare(personName(b.assigneeId), 'ru')
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

export const TASK_COLUMNS: Column<Task>[] = [
  {
    key: 'id',
    header: 'Номер',
    sortable: true,
    width: 100,
    hideOnMobile: true,
    cell: (t) => <span className="ev-mono ev-muted">{t.id}</span>,
  },
  {
    key: 'title',
    header: 'Задача',
    primary: true,
    sortable: true,
    minWidth: 240,
    wrap: true,
    cell: (t) => <span className={s.title}>{t.title}</span>,
  },
  {
    key: 'facility',
    header: 'Объект',
    sortable: true,
    cell: (t) => {
      const f = FACILITY_BY_ID.get(t.facilityId)
      return f ? (
        <span className={s.twoLine}>
          <span>{f.name}</span>
          <span className="ev-mono ev-muted">{f.code}</span>
        </span>
      ) : null
    },
  },
  {
    key: 'assignee',
    header: 'Исполнитель',
    sortable: true,
    cell: (t) => (
      <span className={s.person}>
        <Avatar name={personName(t.assigneeId)} size={24} />
        <span className="ev-truncate">{personName(t.assigneeId)}</span>
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Приоритет',
    sortable: true,
    cell: (t) => <Badge tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>,
  },
  {
    key: 'status',
    header: 'Статус',
    sortable: true,
    cell: (t) => <StatusPill tone={TASK_STATUS[t.status].tone}>{TASK_STATUS[t.status].label}</StatusPill>,
  },
  {
    key: 'due',
    header: 'Срок',
    sortable: true,
    align: 'right',
    cell: (t) => <span className={isOverdue(t) ? `${s.overdue} ev-num` : 'ev-num'}>{formatDate(t.due)}</span>,
  },
  {
    key: 'progress',
    header: 'Прогресс',
    sortable: true,
    width: 150,
    cell: (t) => {
      const p = taskProgress(t)
      return (
        <span className={s.progress}>
          <Progress
            value={p}
            size="sm"
            tone={p === 100 ? 'success' : 'accent'}
            aria-label={`Прогресс ${t.id}`}
          />
          <span className="ev-num ev-muted">{p}%</span>
        </span>
      )
    },
  },
]
