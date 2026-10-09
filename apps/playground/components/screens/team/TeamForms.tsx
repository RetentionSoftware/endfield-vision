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
import { useMemo, useState } from 'react'
import { FACILITIES } from '@/lib/demo/facilities'
import { ACCESS, ROLES, type Access, type Role } from '@/lib/demo/team'
import { useT, type Translator } from '@/lib/i18n'
import s from './team.module.css'

export function roleOptions({ tx }: Translator): SelectOption<Role>[] {
  return (Object.keys(ROLES) as Role[]).map((r) => ({ value: r, label: tx(ROLES[r].label) }))
}

function accessOptions({ tx }: Translator) {
  return (Object.keys(ACCESS) as Access[]).map((a) => ({
    value: a,
    label: tx(ACCESS[a].label),
    description: tx(ACCESS[a].description),
  }))
}

function facilityOptions({ tx, intl }: Translator): SelectOption[] {
  return [...FACILITIES]
    .sort((a, b) => tx(a.region).localeCompare(tx(b.region), intl))
    .map((f) => ({ value: f.id, label: tx(f.name), hint: f.code, group: tx(f.region) }))
}

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

export function validateInvite(d: InviteDraft, takenEmails: string[], { t }: Translator): InviteErrors {
  const e: InviteErrors = {}
  if (d.name.trim().split(/\s+/).filter(Boolean).length < 2)
    e.name = t('Укажите имя и фамилию', 'Enter first and last name')
  const email = d.email.trim().toLowerCase()
  if (!email) e.email = t('Укажите почту', 'Enter an email')
  else if (!EMAIL_RE.test(email)) e.email = t('Почта указана с ошибкой', 'Email is invalid')
  else if (takenEmails.includes(email))
    e.email = t(
      'Сотрудник или приглашение с этой почтой уже есть',
      'An employee or invitation with this email already exists',
    )
  if (d.phone && !isCompletePhone(d.phone)) e.phone = t('Номер неполный', 'Phone number is incomplete')
  if (!d.role) e.role = t('Выберите роль', 'Select a role')
  if (d.access !== 'full' && d.facilityIds.length === 0)
    e.facilityIds = t('Выберите хотя бы один объект', 'Select at least one facility')
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
  const tr = useT()
  const { t } = tr
  const [v, setV] = useState<InviteDraft>(initial)
  const errors = showErrors ? validateInvite(v, takenEmails, tr) : {}
  const roles = useMemo(() => roleOptions(tr), [tr])
  const access = useMemo(() => accessOptions(tr), [tr])
  const facilities = useMemo(() => facilityOptions(tr), [tr])
  const set = (patch: Partial<InviteDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }
  return (
    <div className="ev-stack">
      <div className={s.formGrid}>
        <Field label={t('Имя и фамилия', 'Full name')} required error={errors.name}>
          <Input
            value={v.name}
            autoFocus
            autoComplete="off"
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t('Роман Щербаков', 'Roman Shcherbakov')}
          />
        </Field>
        <Field label={t('Рабочая почта', 'Work email')} required error={errors.email}>
          <Input
            type="email"
            value={v.email}
            autoComplete="off"
            onChange={(e) => set({ email: e.target.value })}
            placeholder="r.shcherbakov@endfield-ops.ru"
          />
        </Field>
        <Field
          label={t('Телефон', 'Phone')}
          error={errors.phone}
          hint={t('Для входа по коду из SMS. Необязательно.', 'For sign-in with an SMS code. Optional.')}
        >
          <PhoneInput value={v.phone} onChange={(x) => set({ phone: x })} />
        </Field>
        <Field label={t('Роль', 'Role')} required error={errors.role}>
          <Select
            value={v.role}
            onChange={(x) => set({ role: x })}
            placeholder={t('Выберите роль', 'Select a role')}
            options={roles}
            searchable={false}
          />
        </Field>
      </div>
      <Field label={t('Уровень доступа', 'Access level')}>
        <RadioGroup
          aria-label={t('Уровень доступа', 'Access level')}
          variant="card"
          value={v.access}
          onChange={(x) => set({ access: x })}
          options={access}
        />
      </Field>
      <Field
        label={t('Объекты', 'Facilities')}
        required={v.access !== 'full'}
        error={errors.facilityIds}
        hint={
          v.access === 'full'
            ? t('Полный доступ открывает все объекты.', 'Full access opens all facilities.')
            : t(
                'Сотрудник увидит только выбранные объекты.',
                'The employee will see only the selected facilities.',
              )
        }
        disabled={v.access === 'full'}
      >
        <MultiSelect
          value={v.access === 'full' ? FACILITIES.map((f) => f.id) : v.facilityIds}
          onChange={(x) => set({ facilityIds: x })}
          placeholder={t('Выберите объекты', 'Select facilities')}
          options={facilities}
          maxLabels={3}
        />
      </Field>
      <Switch
        checked={v.sendNow}
        onChange={(x) => set({ sendNow: x })}
        label={t('Отправить приглашение сразу', 'Send the invitation now')}
        description={
          v.sendNow
            ? t('Письмо со ссылкой уйдёт на указанную почту.', 'An email with the link goes to this address.')
            : t(
                'Приглашение сохранится в списке, отправить можно позже.',
                'The invitation is saved to the list, you can send it later.',
              )
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
  const tr = useT()
  const { t } = tr
  const [v, setV] = useState<RoleDraft>(initial)
  const roles = useMemo(() => roleOptions(tr), [tr])
  const access = useMemo(() => accessOptions(tr), [tr])
  const set = (patch: Partial<RoleDraft>) => {
    const next = { ...v, ...patch }
    setV(next)
    onChange(next)
  }
  return (
    <div className="ev-stack">
      <Field label={t('Роль', 'Role')}>
        <Select value={v.role} onChange={(x) => x && set({ role: x })} options={roles} searchable={false} />
      </Field>
      <Field label={t('Уровень доступа', 'Access level')}>
        <RadioGroup
          aria-label={t('Уровень доступа', 'Access level')}
          value={v.access}
          onChange={(x) => set({ access: x })}
          options={access}
        />
      </Field>
    </div>
  )
}
