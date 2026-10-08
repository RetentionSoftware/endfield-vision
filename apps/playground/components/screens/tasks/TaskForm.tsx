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
import { useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { PRIORITY, TODAY, type Priority } from '@/lib/demo/tasks'
import { PEOPLE, ROLES } from '@/lib/demo/team'
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

export function validateDraft(d: TaskDraft): DraftErrors {
  const e: DraftErrors = {}
  const title = d.title.trim()
  if (!title) e.title = 'Укажите название задачи'
  else if (title.length < 5) e.title = 'Название слишком короткое: минимум 5 символов'
  if (!d.facilityId) e.facilityId = 'Выберите объект'
  if (!d.assigneeId) e.assigneeId = 'Назначьте исполнителя'
  if (!d.due) e.due = 'Укажите срок'
  else if (d.due < TODAY) e.due = 'Срок не может быть в прошлом'
  if (d.priority === 'critical' && d.description.trim().length < 10)
    e.description = 'Для критической задачи опишите причину срочности'
  return e
}

/** Объекты, сгруппированные по сектору: опции одной группы идут подряд. */
export const FACILITY_OPTIONS: SelectOption[] = [...FACILITIES]
  .sort((a, b) => a.region.localeCompare(b.region, 'ru'))
  .map((f) => ({ value: f.id, label: f.name, hint: f.code, group: f.region }))

/** Исполнители: аватар, должность и роль подсказкой. */
export const ASSIGNEE_OPTIONS: SelectOption[] = PEOPLE.filter((p) => p.active).map((p) => ({
  value: p.id,
  label: p.name,
  hint: `${p.position} - ${ROLES[p.role].label}`,
  icon: <Avatar name={p.name} size={22} />,
}))

const PRIORITY_OPTIONS = (Object.keys(PRIORITY) as Priority[]).map((p) => ({
  value: p,
  label: PRIORITY[p].label,
}))

export function TaskForm({
  initial,
  showErrors,
  onChange,
}: {
  initial: TaskDraft
  showErrors: boolean
  onChange: (d: TaskDraft) => void
}) {
  const [v, setV] = useState<TaskDraft>(initial)
  const errors = showErrors ? validateDraft(v) : {}
  const set = (patch: Partial<TaskDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }

  return (
    <div className="ev-stack">
      <Field
        label="Название"
        required
        error={errors.title}
        labelAside={<span className="ev-num">{v.title.length}/120</span>}
      >
        <Input
          value={v.title}
          maxLength={120}
          autoFocus
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Например: заменить фильтры линии №2"
        />
      </Field>
      <div className={s.formGrid}>
        <Field label="Объект" required error={errors.facilityId}>
          <Select
            value={v.facilityId}
            onChange={(x) => set({ facilityId: x })}
            placeholder="Выберите объект"
            options={FACILITY_OPTIONS}
          />
        </Field>
        <Field label="Исполнитель" required error={errors.assigneeId}>
          <Select
            value={v.assigneeId}
            onChange={(x) => set({ assigneeId: x })}
            placeholder="Выберите сотрудника"
            searchPlaceholder="Имя или должность"
            dropdownMinWidth={320}
            options={ASSIGNEE_OPTIONS}
          />
        </Field>
      </div>
      <div className={s.dueRow}>
        <Field label="Срок" required error={errors.due}>
          <DateField value={v.due} onChange={(x) => set({ due: x })} min={TODAY} />
        </Field>
        <Field label="Приоритет">
          <SegmentedControl
            aria-label="Приоритет"
            block
            value={v.priority}
            onChange={(x) => set({ priority: x })}
            options={PRIORITY_OPTIONS}
          />
        </Field>
      </div>
      <Field
        label="Описание"
        error={errors.description}
        hint={v.priority === 'critical' ? 'Для критической задачи описание обязательно.' : 'Необязательно.'}
      >
        <Textarea
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
          autoResize
          rows={3}
          maxLength={1000}
          showCount
          placeholder="Что сделать, допуски, ссылки на документы"
        />
      </Field>
      <Checkbox
        checked={v.notify}
        onChange={(x) => set({ notify: x })}
        label="Уведомить исполнителя"
        description="Сообщение в мобильном приложении и на почту."
      />
    </div>
  )
}

/** Окно массового назначения: один выбор исполнителя. */
export function AssigneePicker({ onChange }: { onChange: (id: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <Field label="Исполнитель" required>
      <Select
        value={value}
        onChange={(x) => {
          setValue(x)
          onChange(x)
        }}
        placeholder="Выберите сотрудника"
        dropdownMinWidth={320}
        options={ASSIGNEE_OPTIONS}
      />
    </Field>
  )
}
