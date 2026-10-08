'use client'

import {
  Field,
  Input,
  isCompletePhone,
  MultiSelect,
  PhoneInput,
  RadioGroup,
  Select,
  Switch,
  type SelectOption,
} from 'endfield-vision'
import { useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { ACCESS, ROLES, type Access, type Role } from '@/lib/demo/team'
import s from './team.module.css'

export const ROLE_OPTIONS: SelectOption<Role>[] = (Object.keys(ROLES) as Role[]).map((r) => ({
  value: r,
  label: ROLES[r].label,
}))

export const ACCESS_OPTIONS = (Object.keys(ACCESS) as Access[]).map((a) => ({
  value: a,
  label: ACCESS[a].label,
  description: ACCESS[a].description,
}))

export const FACILITY_OPTIONS: SelectOption[] = [...FACILITIES]
  .sort((a, b) => a.region.localeCompare(b.region, 'ru'))
  .map((f) => ({ value: f.id, label: f.name, hint: f.code, group: f.region }))

/* ------------------------------------------------------------------ */
/* Приглашение                                                         */
/* ------------------------------------------------------------------ */

export interface InviteDraft {
  name: string
  email: string
  phone: string
  role: Role | null
  access: Access
  facilityIds: string[]
  sendNow: boolean
}

export type InviteErrors = Partial<Record<keyof InviteDraft, string>>

export function emptyInvite(): InviteDraft {
  return { name: '', email: '', phone: '', role: null, access: 'view', facilityIds: [], sendNow: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateInvite(d: InviteDraft, takenEmails: string[]): InviteErrors {
  const e: InviteErrors = {}
  if (d.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Укажите имя и фамилию'
  const email = d.email.trim().toLowerCase()
  if (!email) e.email = 'Укажите почту'
  else if (!EMAIL_RE.test(email)) e.email = 'Почта указана с ошибкой'
  else if (takenEmails.includes(email)) e.email = 'Сотрудник или приглашение с этой почтой уже есть'
  if (d.phone && !isCompletePhone(d.phone)) e.phone = 'Номер неполный'
  if (!d.role) e.role = 'Выберите роль'
  if (d.access !== 'full' && d.facilityIds.length === 0) e.facilityIds = 'Выберите хотя бы один объект'
  return e
}

export function InviteForm({
  initial,
  showErrors,
  takenEmails,
  onChange,
}: {
  initial: InviteDraft
  showErrors: boolean
  takenEmails: string[]
  onChange: (d: InviteDraft) => void
}) {
  const [v, setV] = useState<InviteDraft>(initial)
  const errors = showErrors ? validateInvite(v, takenEmails) : {}
  const set = (patch: Partial<InviteDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }
  return (
    <div className="ev-stack">
      <div className={s.formGrid}>
        <Field label="Имя и фамилия" required error={errors.name}>
          <Input
            value={v.name}
            autoFocus
            autoComplete="off"
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Роман Щербаков"
          />
        </Field>
        <Field label="Рабочая почта" required error={errors.email}>
          <Input
            type="email"
            value={v.email}
            autoComplete="off"
            onChange={(e) => set({ email: e.target.value })}
            placeholder="r.shcherbakov@endfield-ops.ru"
          />
        </Field>
        <Field label="Телефон" error={errors.phone} hint="Для входа по коду из SMS. Необязательно.">
          <PhoneInput value={v.phone} onChange={(x) => set({ phone: x })} />
        </Field>
        <Field label="Роль" required error={errors.role}>
          <Select
            value={v.role}
            onChange={(x) => set({ role: x })}
            placeholder="Выберите роль"
            options={ROLE_OPTIONS}
            searchable={false}
          />
        </Field>
      </div>
      <Field label="Уровень доступа">
        <RadioGroup
          aria-label="Уровень доступа"
          variant="card"
          value={v.access}
          onChange={(x) => set({ access: x })}
          options={ACCESS_OPTIONS}
        />
      </Field>
      <Field
        label="Объекты"
        required={v.access !== 'full'}
        error={errors.facilityIds}
        hint={
          v.access === 'full'
            ? 'Полный доступ открывает все объекты.'
            : 'Сотрудник увидит только выбранные объекты.'
        }
        disabled={v.access === 'full'}
      >
        <MultiSelect
          value={v.access === 'full' ? FACILITIES.map((f) => f.id) : v.facilityIds}
          onChange={(x) => set({ facilityIds: x })}
          placeholder="Выберите объекты"
          options={FACILITY_OPTIONS}
          maxLabels={3}
        />
      </Field>
      <Switch
        checked={v.sendNow}
        onChange={(x) => set({ sendNow: x })}
        label="Отправить приглашение сразу"
        description={
          v.sendNow
            ? 'Письмо со ссылкой уйдёт на указанную почту.'
            : 'Приглашение сохранится в списке, отправить можно позже.'
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Смена роли                                                          */
/* ------------------------------------------------------------------ */

export interface RoleDraft {
  role: Role
  access: Access
}

export function RoleForm({ initial, onChange }: { initial: RoleDraft; onChange: (d: RoleDraft) => void }) {
  const [v, setV] = useState<RoleDraft>(initial)
  const set = (patch: Partial<RoleDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }
  return (
    <div className="ev-stack">
      <Field label="Роль">
        <Select
          value={v.role}
          onChange={(x) => x && set({ role: x })}
          options={ROLE_OPTIONS}
          searchable={false}
        />
      </Field>
      <Field label="Уровень доступа">
        <RadioGroup
          aria-label="Уровень доступа"
          value={v.access}
          onChange={(x) => set({ access: x })}
          options={ACCESS_OPTIONS}
        />
      </Field>
    </div>
  )
}
