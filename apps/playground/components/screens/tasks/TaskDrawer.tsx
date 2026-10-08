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
import { formatDate, formatDateTime, plural } from '@/lib/format'
import s from './tasks.module.css'

const STATUS_OPTIONS = STATUS_ORDER.map((v) => ({ value: v, label: TASK_STATUS[v].label }))

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
  return (
    <Drawer
      open={task !== null}
      onClose={onClose}
      width={580}
      title={task?.title}
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
  const done = task.status === 'done'
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Закрыть
      </Button>
      {done ? (
        <Button
          icon={<RotateCcw size={15} />}
          onClick={() => {
            onUpdate(task.id, (t) => ({ ...t, status: 'in_progress' }))
            toast.info('Задача возвращена в работу', { description: task.id })
          }}
        >
          Вернуть в работу
        </Button>
      ) : (
        <Button
          variant="primary"
          icon={<CheckCheck size={15} />}
          onClick={() => {
            onUpdate(task.id, (t) => ({
              ...t,
              status: 'done',
              checklist: t.checklist.map((c) => ({ ...c, done: true })),
            }))
            toast.success('Задача выполнена', { description: `${task.id} ${task.title}` })
          }}
        >
          Отметить выполненной
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
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const facility = FACILITIES.find((f) => f.id === task.facilityId)
  const assignee = personById(task.assigneeId)
  const overdue = isOverdue(task)
  const doneSteps = task.checklist.filter((c) => c.done).length
  const progress = taskProgress(task)
  const left = daysBetween(TODAY, task.due)

  const setStatus = (status: TaskStatus | null) => {
    if (!status || status === task.status) return
    onUpdate(task.id, (t) => ({ ...t, status }))
    toast.success('Статус изменён', { description: `${task.id}: ${TASK_STATUS[status].label}` })
  }

  const toggleStep = (id: string, done: boolean) => {
    onUpdate(task.id, (t) => ({
      ...t,
      checklist: t.checklist.map((c) => (c.id === id ? { ...c, done } : c)),
    }))
    if (done && doneSteps + 1 === task.checklist.length && task.status !== 'done') {
      toast.info('Все пункты выполнены', { description: 'Задачу можно отправить на проверку или закрыть.' })
    }
  }

  const send = () => {
    const text = comment.trim()
    if (!text) {
      setCommentError('Комментарий пустой')
      return
    }
    onUpdate(task.id, (t) => ({
      ...t,
      comments: [
        ...t.comments,
        { id: `c-${t.id}-${t.comments.length + 1}`, authorId: CURRENT_USER_ID, text, at: nowIso() },
      ],
    }))
    setComment('')
    setCommentError(null)
    toast.success('Комментарий добавлен')
  }

  return (
    <div className={s.drawer}>
      <div className="ev-row">
        <StatusPill tone={TASK_STATUS[task.status].tone}>{TASK_STATUS[task.status].label}</StatusPill>
        <Badge tone={PRIORITY[task.priority].tone}>{PRIORITY[task.priority].label}</Badge>
        {overdue ? (
          <Badge tone="danger">
            Просрочена на {-left} {plural(-left, 'день', 'дня', 'дней')}
          </Badge>
        ) : null}
      </div>

      <Field label="Статус">
        <Select value={task.status} onChange={setStatus} options={STATUS_OPTIONS} searchable={false} />
      </Field>

      <KeyValueList
        labelWidth={130}
        items={[
          {
            key: 'facility',
            label: 'Объект',
            value: facility?.name,
            hint: facility ? `${facility.code}, ${facility.region}` : undefined,
          },
          {
            key: 'assignee',
            label: 'Исполнитель',
            value: assignee ? (
              <span className={s.person}>
                <Avatar name={assignee.name} size={22} />
                {assignee.name}
              </span>
            ) : null,
            hint: assignee?.position,
          },
          { key: 'author', label: 'Автор', value: personName(task.authorId) },
          {
            key: 'due',
            label: 'Срок',
            value: <span className={overdue ? s.overdue : undefined}>{formatDate(task.due)}</span>,
            hint:
              task.status === 'done'
                ? null
                : overdue
                  ? 'Срок прошёл'
                  : left === 0
                    ? 'Сегодня'
                    : `Осталось ${left} ${plural(left, 'день', 'дня', 'дней')}`,
          },
          { key: 'created', label: 'Создана', value: formatDate(task.createdAt) },
        ]}
      />

      <p className={s.description}>{task.description}</p>

      <section className={s.block} aria-labelledby={`${task.id}-check`}>
        <h3 id={`${task.id}-check`} className={s.blockTitle}>
          Чек-лист
        </h3>
        {task.checklist.length > 0 ? (
          <>
            <Progress
              value={doneSteps}
              max={task.checklist.length}
              size="sm"
              tone={progress === 100 ? 'success' : 'accent'}
              label="Выполнено"
              showValue={(v, m) => `${v} из ${m}`}
            />
            <div className={s.checklist}>
              {task.checklist.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={c.done}
                  onChange={(x) => toggleStep(c.id, x)}
                  label={c.text}
                  className={c.done ? s.stepDone : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <span className="ev-muted">Пунктов нет.</span>
        )}
      </section>

      <section className={s.block} aria-labelledby={`${task.id}-comments`}>
        <h3 id={`${task.id}-comments`} className={s.blockTitle}>
          Комментарии <span className="ev-muted ev-num">{task.comments.length}</span>
        </h3>
        {task.comments.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageSquare size={20} />}
            title="Комментариев нет"
            description="Обсуждение задачи появится здесь."
          />
        ) : (
          <ul role="list" className={s.comments}>
            {task.comments.map((c) => {
              const name = personName(c.authorId)
              return (
                <li key={c.id} className={s.comment}>
                  <Avatar name={name} size={28} />
                  <div className={s.commentBody}>
                    <div className={s.commentHead}>
                      <span className={s.commentWho}>{name}</span>
                      <span className="ev-muted ev-num">{formatDateTime(c.at)}</span>
                    </div>
                    <div>{c.text}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Field error={commentError} label="Новый комментарий">
          <Textarea
            value={comment}
            rows={2}
            autoResize
            maxRows={6}
            placeholder="Текст комментария. Ctrl+Enter - отправить"
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
            Отправить
          </Button>
        </div>
      </section>
    </div>
  )
}
