'use client'

import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  FormSection,
  Input,
  isCompletePhone,
  KeyValueList,
  PhoneInput,
  Select,
  toast,
} from 'endfield-vision'
import { Camera, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { LANGUAGES, PROFILE, PROFILE_PHOTO, TIMEZONES, WORKSPACE_NAME, type Profile } from '@/lib/demo/settings'
import s from './settings.module.css'

type Errors = Partial<Record<keyof Profile, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

function validate(p: Profile): Errors {
  const e: Errors = {}
  if (p.name.trim().length < 2) e.name = 'Укажите имя и фамилию'
  if (!EMAIL_RE.test(p.email.trim())) e.email = 'Некорректный адрес почты'
  if (p.phone && !isCompletePhone(p.phone)) e.phone = 'Номер введён не полностью'
  return e
}

export function ProfileTab() {
  const [saved, setSaved] = useState<Profile>(PROFILE)
  const [form, setForm] = useState<Profile>(PROFILE)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const dirty = (Object.keys(form) as Array<keyof Profile>).some((k) => form[k] !== saved[k])
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const save = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.warning('Проверьте поля профиля')
      return
    }
    setSaving(true)
    await wait(900)
    const next = { ...form, name: form.name.trim(), email: form.email.trim() }
    setSaved(next)
    setForm(next)
    setSaving(false)
    toast.success('Профиль сохранён', { description: form.email !== saved.email ? `Письмо для подтверждения отправлено на ${next.email}` : undefined })
  }

  const tz = TIMEZONES.find((t) => t.value === saved.timezone)

  return (
    <div className="pg-split">
      <Card
        title="Личные данные"
        description="Имя и контакты видят коллеги в задачах и журнале."
        footer={
          <div className={s.formFoot}>
            <span className="ev-muted">{dirty ? 'Есть несохранённые изменения' : 'Изменений нет'}</span>
            <div className="ev-row">
              <Button
                variant="ghost"
                icon={<RotateCcw size={15} />}
                disabled={!dirty || saving}
                onClick={() => {
                  setForm(saved)
                  setErrors({})
                }}
              >
                Отменить
              </Button>
              <Button variant="primary" icon={<Save size={15} />} loading={saving} disabled={!dirty} onClick={() => void save()}>
                Сохранить
              </Button>
            </div>
          </div>
        }
      >
        <form
          className="ev-stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (dirty) void save()
          }}
          noValidate
        >
          <FormSection title="Контакты">
            <Field label="Имя и фамилия" required error={errors.name}>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Должность">
              <Input value={form.position} onChange={(e) => set('position', e.target.value)} autoComplete="organization-title" />
            </Field>
            <Field label="Почта" required error={errors.email} hint="На неё приходят уведомления и коды входа.">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" spellCheck={false} />
            </Field>
            <Field label="Телефон" error={errors.phone} hint="Для SMS о критических инцидентах.">
              <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </Field>
          </FormSection>
          <FormSection title="Регион">
            <Field label="Часовой пояс" hint="Время в журнале и отчётах.">
              <Select
                value={form.timezone}
                onChange={(v) => v && set('timezone', v)}
                options={TIMEZONES}
                searchPlaceholder="Город"
              />
            </Field>
            <Field label="Язык интерфейса">
              <Select value={form.language} onChange={(v) => v && set('language', v)} options={LANGUAGES} />
            </Field>
          </FormSection>
        </form>
      </Card>

      <Card title="Учётная запись">
        <div className="ev-stack">
          <div className={s.identity}>
            <Avatar name={saved.name} size={64} src={PROFILE_PHOTO} />
            <div className={s.identityText}>
              <span className={s.identityName}>{saved.name}</span>
              <span className="ev-muted">{saved.position || 'Должность не указана'}</span>
              <span>
                <Badge tone="accent" size="sm">
                  Администратор
                </Badge>
              </span>
            </div>
          </div>
          <Button
            icon={<Camera size={15} />}
            onClick={() => toast.info('Фото обновится после модерации', { description: 'Требования: JPG или PNG, не больше 2 МБ.' })}
          >
            Загрузить фото
          </Button>
          <KeyValueList
            items={[
              { key: 'ws', label: 'Пространство', value: WORKSPACE_NAME, mono: true },
              { key: 'id', label: 'ID пользователя', value: 'usr_01J9X4K2', mono: true },
              { key: 'since', label: 'В компании с', value: '14.03.2023' },
              { key: 'tz', label: 'Часовой пояс', value: tz ? `${tz.label}, ${tz.hint}` : null },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
