'use client'

import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  KeyValueList,
  Progress,
  Select,
  StatusPill,
  Textarea,
  toast,
} from 'endfield-vision'
import { CheckCheck, MessageSquare, RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import {
  isOverdue,
  PRIORITY,
  STATUS_ORDER,
  TASK_STATUS,
  taskProgress,
  TODAY,
  type Task,
  type TaskStatus,
} from '@/lib/demo/tasks'
import { CURRENT_USER_ID, personById, personName } from '@/lib/demo/team'
import { formatDate, formatDateTime } from '@/lib/format'
import { bi, useT } from '@/lib/i18n'
import s from './tasks.module.css'

function nowIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
      Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) /
      86_400_000,
  )
}

export function TaskDrawer({
  task,
  onClose,
  onUpdate,
}: {
  task: Task | null
  onClose: () => void
  onUpdate: (id: string, patch: (t: Task) => Task) => void
}) {
  const { tx } = useT()
  return (
    <Drawer
      open={task !== null}
      onClose={onClose}
      width={580}
      title={task ? tx(task.title) : undefined}
      subtitle={task ? <span className="ev-mono">{task.id}</span> : null}
      footer={task ? <DrawerFooter task={task} onClose={onClose} onUpdate={onUpdate} /> : null}
    >
      {task ? <TaskDetails key={task.id} task={task} onUpdate={onUpdate} /> : null}
    </Drawer>
  )
}

function DrawerFooter({
  task,
  onClose,
  onUpdate,
}: {
  task: Task
  onClose: () => void
  onUpdate: (id: string, patch: (t: Task) => Task) => void
}) {
  const { t, tx } = useT()
  const done = task.status === 'done'
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t('Закрыть', 'Close')}
      </Button>
      {done ? (
        <Button
          icon={<RotateCcw size={15} />}
          onClick={() => {
            onUpdate(task.id, (x) => ({ ...x, status: 'in_progress' }))
            toast.info(t('Задача возвращена в работу', 'Task reopened'), { description: task.id })
          }}
        >
          {t('Вернуть в работу', 'Reopen')}
        </Button>
      ) : (
        <Button
          variant="primary"
          icon={<CheckCheck size={15} />}
          onClick={() => {
            onUpdate(task.id, (x) => ({
              ...x,
              status: 'done',
              checklist: x.checklist.map((c) => ({ ...c, done: true })),
            }))
            toast.success(t('Задача выполнена', 'Task completed'), {
              description: `${task.id} ${tx(task.title)}`,
            })
          }}
        >
          {t('Отметить выполненной', 'Mark as done')}
        </Button>
      )}
    </>
  )
}

function TaskDetails({
  task,
  onUpdate,
}: {
  task: Task
  onUpdate: (id: string, patch: (t: Task) => Task) => void
}) {
  const { t, tx, plural } = useT()
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const facility = FACILITIES.find((f) => f.id === task.facilityId)
  const assignee = personById(task.assigneeId)
  const overdue = isOverdue(task)
  const doneSteps = task.checklist.filter((c) => c.done).length
  const progress = taskProgress(task)
  const left = daysBetween(TODAY, task.due)
  const statusOptions = STATUS_ORDER.map((v) => ({ value: v, label: tx(TASK_STATUS[v].label) }))
  const days = (n: number) => plural(n, ['день', 'дня', 'дней'], ['day', 'days'])

  const setStatus = (status: TaskStatus | null) => {
    if (!status || status === task.status) return
    onUpdate(task.id, (x) => ({ ...x, status }))
    toast.success(t('Статус изменён', 'Status changed'), {
      description: `${task.id}: ${tx(TASK_STATUS[status].label)}`,
    })
  }

  const toggleStep = (id: string, done: boolean) => {
    onUpdate(task.id, (x) => ({
      ...x,
      checklist: x.checklist.map((c) => (c.id === id ? { ...c, done } : c)),
    }))
    if (done && doneSteps + 1 === task.checklist.length && task.status !== 'done') {
      toast.info(t('Все пункты выполнены', 'All items done'), {
        description: t(
          'Задачу можно отправить на проверку или закрыть.',
          'You can send the task for review or close it.',
        ),
      })
    }
  }

  const send = () => {
    const text = comment.trim()
    if (!text) {
      setCommentError(t('Комментарий пустой', 'Comment is empty'))
      return
    }
    onUpdate(task.id, (x) => ({
      ...x,
      comments: [
        ...x.comments,
        // Текст пользователя - на том языке, на котором он написан.
        {
          id: `c-${x.id}-${x.comments.length + 1}`,
          authorId: CURRENT_USER_ID,
          text: bi(text, text),
          at: nowIso(),
        },
      ],
    }))
    setComment('')
    setCommentError(null)
    toast.success(t('Комментарий добавлен', 'Comment added'))
  }

  return (
    <div className={s.drawer}>
      <div className="ev-row">
        <StatusPill tone={TASK_STATUS[task.status].tone}>{tx(TASK_STATUS[task.status].label)}</StatusPill>
        <Badge tone={PRIORITY[task.priority].tone}>{tx(PRIORITY[task.priority].label)}</Badge>
        {overdue ? (
          <Badge tone="danger">
            {t(`Просрочена на ${-left} ${days(-left)}`, `Overdue by ${-left} ${days(-left)}`)}
          </Badge>
        ) : null}
      </div>

      <Field label={t('Статус', 'Status')}>
        <Select value={task.status} onChange={setStatus} options={statusOptions} searchable={false} />
      </Field>

      <KeyValueList
        labelWidth={130}
        items={[
          {
            key: 'facility',
            label: t('Объект', 'Facility'),
            value: facility ? tx(facility.name) : undefined,
            hint: facility ? `${facility.code}, ${tx(facility.region)}` : undefined,
          },
          {
            key: 'assignee',
            label: t('Исполнитель', 'Assignee'),
            value: assignee ? (
              <span className={s.person}>
                <Avatar name={tx(assignee.name)} size={22} />
                {tx(assignee.name)}
              </span>
            ) : null,
            hint: assignee ? tx(assignee.position) : undefined,
          },
          { key: 'author', label: t('Автор', 'Author'), value: tx(personName(task.authorId)) },
          {
            key: 'due',
            label: t('Срок', 'Due date'),
            value: <span className={overdue ? s.overdue : undefined}>{formatDate(task.due)}</span>,
            hint:
              task.status === 'done'
                ? null
                : overdue
                  ? t('Срок прошёл', 'Past due')
                  : left === 0
                    ? t('Сегодня', 'Today')
                    : t(`Осталось ${left} ${days(left)}`, `${left} ${days(left)} left`),
          },
          { key: 'created', label: t('Создана', 'Created'), value: formatDate(task.createdAt) },
        ]}
      />

      <p className={s.description}>{tx(task.description)}</p>

      <section className={s.block} aria-labelledby={`${task.id}-check`}>
        <h3 id={`${task.id}-check`} className={s.blockTitle}>
          {t('Чек-лист', 'Checklist')}
        </h3>
        {task.checklist.length > 0 ? (
          <>
            <Progress
              value={doneSteps}
              max={task.checklist.length}
              size="sm"
              tone={progress === 100 ? 'success' : 'accent'}
              label={t('Выполнено', 'Completed')}
              showValue={(v, m) => t(`${v} из ${m}`, `${v} of ${m}`)}
            />
            <div className={s.checklist}>
              {task.checklist.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={c.done}
                  onChange={(x) => toggleStep(c.id, x)}
                  label={tx(c.text)}
                  className={c.done ? s.stepDone : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <span className="ev-muted">{t('Пунктов нет.', 'No items.')}</span>
        )}
      </section>

      <section className={s.block} aria-labelledby={`${task.id}-comments`}>
        <h3 id={`${task.id}-comments`} className={s.blockTitle}>
          {t('Комментарии', 'Comments')} <span className="ev-muted ev-num">{task.comments.length}</span>
        </h3>
        {task.comments.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageSquare size={20} />}
            title={t('Комментариев нет', 'No comments')}
            description={t('Обсуждение задачи появится здесь.', 'The task discussion will appear here.')}
          />
        ) : (
          <ul role="list" className={s.comments}>
            {task.comments.map((c) => {
              const name = tx(personName(c.authorId))
              return (
                <li key={c.id} className={s.comment}>
                  <Avatar name={name} size={28} />
                  <div className={s.commentBody}>
                    <div className={s.commentHead}>
                      <span className={s.commentWho}>{name}</span>
                      <span className="ev-muted ev-num">{formatDateTime(c.at)}</span>
                    </div>
                    <div>{tx(c.text)}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Field error={commentError} label={t('Новый комментарий', 'New comment')}>
          <Textarea
            value={comment}
            rows={2}
            autoResize
            maxRows={6}
            placeholder={t('Текст комментария. Ctrl+Enter - отправить', 'Comment text. Ctrl+Enter to send')}
            onChange={(e) => {
              setComment(e.target.value)
              if (commentError) setCommentError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                send()
              }
            }}
          />
        </Field>
        <div className={s.commentActions}>
          <Button size="sm" variant="secondary" icon={<Send size={14} />} onClick={send}>
            {t('Отправить', 'Send')}
          </Button>
        </div>
      </section>
    </div>
  )
}
