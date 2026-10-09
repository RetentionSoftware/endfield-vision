'use client'

import {
  Avatar,
  Checkbox,
  DateField,
  Field,
  Input,
  SegmentedControl,
  Select,
  Textarea,
  type SelectOption,
} from 'endfield-vision'
import { useMemo, useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { PRIORITY, TODAY, type Priority } from '@/lib/demo/tasks'
import { PEOPLE, ROLES } from '@/lib/demo/team'
import { useT, type Translator } from '@/lib/i18n'
import s from './tasks.module.css'

export interface TaskDraft {
  title: string
  facilityId: string | null
  assigneeId: string | null
  due: string
  priority: Priority
  description: string
  notify: boolean
}

export type DraftErrors = Partial<Record<keyof TaskDraft, string>>

export function emptyDraft(): TaskDraft {
  return {
    title: '',
    facilityId: null,
    assigneeId: null,
    due: '',
    priority: 'normal',
    description: '',
    notify: true,
  }
}

export function validateDraft(d: TaskDraft, { t }: Translator): DraftErrors {
  const e: DraftErrors = {}
  const title = d.title.trim()
  if (!title) e.title = t('Укажите название задачи', 'Enter a task title')
  else if (title.length < 5)
    e.title = t('Название слишком короткое: минимум 5 символов', 'Title is too short: at least 5 characters')
  if (!d.facilityId) e.facilityId = t('Выберите объект', 'Select a facility')
  if (!d.assigneeId) e.assigneeId = t('Назначьте исполнителя', 'Assign someone')
  if (!d.due) e.due = t('Укажите срок', 'Set a due date')
  else if (d.due < TODAY) e.due = t('Срок не может быть в прошлом', 'Due date cannot be in the past')
  if (d.priority === 'critical' && d.description.trim().length < 10)
    e.description = t(
      'Для критической задачи опишите причину срочности',
      'Explain why a critical task is urgent',
    )
  return e
}

/** Объекты, сгруппированные по сектору: опции одной группы идут подряд. */
export function facilityOptions({ tx, intl }: Translator): SelectOption[] {
  return [...FACILITIES]
    .sort((a, b) => tx(a.region).localeCompare(tx(b.region), intl))
    .map((f) => ({ value: f.id, label: tx(f.name), hint: f.code, group: tx(f.region) }))
}

/** Исполнители: аватар, должность и роль подсказкой. */
function assigneeOptions({ tx }: Translator): SelectOption[] {
  return PEOPLE.filter((p) => p.active).map((p) => ({
    value: p.id,
    label: tx(p.name),
    hint: `${tx(p.position)} - ${tx(ROLES[p.role].label)}`,
    icon: <Avatar name={tx(p.name)} size={22} />,
  }))
}

export function TaskForm({
  initial,
  showErrors,
  onChange,
}: {
  initial: TaskDraft
  showErrors: boolean
  onChange: (d: TaskDraft) => void
}) {
  const tr = useT()
  const { t, tx } = tr
  const [v, setV] = useState<TaskDraft>(initial)
  const errors = showErrors ? validateDraft(v, tr) : {}
  const facilities = useMemo(() => facilityOptions(tr), [tr])
  const assignees = useMemo(() => assigneeOptions(tr), [tr])
  const priorities = (Object.keys(PRIORITY) as Priority[]).map((p) => ({
    value: p,
    label: tx(PRIORITY[p].label),
  }))
  const set = (patch: Partial<TaskDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }

  return (
    <div className="ev-stack">
      <Field
        label={t('Название', 'Title')}
        required
        error={errors.title}
        labelAside={<span className="ev-num">{v.title.length}/120</span>}
      >
        <Input
          value={v.title}
          maxLength={120}
          autoFocus
          onChange={(e) => set({ title: e.target.value })}
          placeholder={t('Например: заменить фильтры линии №2', 'For example: replace filters on line 2')}
        />
      </Field>
      <div className={s.formGrid}>
        <Field label={t('Объект', 'Facility')} required error={errors.facilityId}>
          <Select
            value={v.facilityId}
            onChange={(x) => set({ facilityId: x })}
            placeholder={t('Выберите объект', 'Select a facility')}
            options={facilities}
          />
        </Field>
        <Field label={t('Исполнитель', 'Assignee')} required error={errors.assigneeId}>
          <Select
            value={v.assigneeId}
            onChange={(x) => set({ assigneeId: x })}
            placeholder={t('Выберите сотрудника', 'Select an employee')}
            searchPlaceholder={t('Имя или должность', 'Name or position')}
            dropdownMinWidth={320}
            options={assignees}
          />
        </Field>
      </div>
      <div className={s.dueRow}>
        <Field label={t('Срок', 'Due date')} required error={errors.due}>
          <DateField value={v.due} onChange={(x) => set({ due: x })} min={TODAY} />
        </Field>
        <Field label={t('Приоритет', 'Priority')}>
          <SegmentedControl
            aria-label={t('Приоритет', 'Priority')}
            block
            value={v.priority}
            onChange={(x) => set({ priority: x })}
            options={priorities}
          />
        </Field>
      </div>
      <Field
        label={t('Описание', 'Description')}
        error={errors.description}
        hint={
          v.priority === 'critical'
            ? t(
                'Для критической задачи описание обязательно.',
                'A description is required for critical tasks.',
              )
            : t('Необязательно.', 'Optional.')
        }
      >
        <Textarea
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
          autoResize
          rows={3}
          maxLength={1000}
          showCount
          placeholder={t(
            'Что сделать, допуски, ссылки на документы',
            'What to do, permits, links to documents',
          )}
        />
      </Field>
      <Checkbox
        checked={v.notify}
        onChange={(x) => set({ notify: x })}
        label={t('Уведомить исполнителя', 'Notify the assignee')}
        description={t('Сообщение в мобильном приложении и на почту.', 'Via the mobile app and email.')}
      />
    </div>
  )
}

/** Окно массового назначения: один выбор исполнителя. */
export function AssigneePicker({ onChange }: { onChange: (id: string | null) => void }) {
  const tr = useT()
  const [value, setValue] = useState<string | null>(null)
  const assignees = useMemo(() => assigneeOptions(tr), [tr])
  return (
    <Field label={tr.t('Исполнитель', 'Assignee')} required>
      <Select
        value={value}
        onChange={(x) => {
          setValue(x)
          onChange(x)
        }}
        placeholder={tr.t('Выберите сотрудника', 'Select an employee')}
        dropdownMinWidth={320}
        options={assignees}
      />
    </Field>
  )
}
