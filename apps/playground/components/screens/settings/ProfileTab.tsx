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
import { LANGUAGES, PROFILE_PHOTO, profileFor, TIMEZONES, WORKSPACE_NAME, type Profile } from '@/lib/demo/settings'
import { bi, useLang, useT, type Bi, type Lang } from '@/lib/i18n'
import s from './settings.module.css'

type Errors = Partial<Record<keyof Profile, Bi>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

function validate(p: Profile): Errors {
  const e: Errors = {}
  if (p.name.trim().length < 2) e.name = bi('Укажите имя и фамилию', 'Enter your first and last name')
  if (!EMAIL_RE.test(p.email.trim())) e.email = bi('Некорректный адрес почты', 'Invalid email address')
  if (p.phone && !isCompletePhone(p.phone)) e.phone = bi('Номер введён не полностью', 'Incomplete phone number')
  return e
}

/** Поля, не тронутые пользователем (совпадают с исходными), переводятся вместе с интерфейсом. */
function relocalize(p: Profile, from: Lang, to: Lang): Profile {
  const a = profileFor(from)
  const b = profileFor(to)
  return {
    ...p,
    name: p.name === a.name ? b.name : p.name,
    position: p.position === a.position ? b.position : p.position,
    language: to,
  }
}

export function ProfileTab() {
  const { lang, setLang } = useLang()
  const { t, tx } = useT()
  const [saved, setSaved] = useState<Profile>(() => profileFor(lang))
  const [form, setForm] = useState<Profile>(() => profileFor(lang))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  // Смена языка: исходные имя и должность показываются на новом языке, правки пользователя - как есть.
  const [shownLang, setShownLang] = useState<Lang>(lang)
  if (shownLang !== lang) {
    setShownLang(lang)
    setSaved(relocalize(saved, shownLang, lang))
    setForm(relocalize(form, shownLang, lang))
  }

  const dirty = (Object.keys(form) as Array<keyof Profile>).some((k) => form[k] !== saved[k])
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const save = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.warning(t('Проверьте поля профиля', 'Check the profile fields'))
      return
    }
    setSaving(true)
    await wait(900)
    const next = { ...form, name: form.name.trim(), email: form.email.trim() }
    setSaved(next)
    setForm(next)
    setSaving(false)
    toast.success(t('Профиль сохранён', 'Profile saved'), {
      description:
        form.email !== saved.email
          ? t(`Письмо для подтверждения отправлено на ${next.email}`, `A confirmation email has been sent to ${next.email}`)
          : undefined,
    })
  }

  const tz = TIMEZONES.find((z) => z.value === saved.timezone)
  const err = (key: keyof Profile) => (errors[key] ? tx(errors[key]) : undefined)

  return (
    <div className="pg-split">
      <Card
        title={t('Личные данные', 'Personal details')}
        description={t('Имя и контакты видят коллеги в задачах и журнале.', 'Colleagues see your name and contacts in tasks and the audit log.')}
        footer={
          <div className={s.formFoot}>
            <span className="ev-muted">{dirty ? t('Есть несохранённые изменения', 'You have unsaved changes') : t('Изменений нет', 'No changes')}</span>
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
                {t('Отменить', 'Discard')}
              </Button>
              <Button variant="primary" icon={<Save size={15} />} loading={saving} disabled={!dirty} onClick={() => void save()}>
                {t('Сохранить', 'Save')}
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
          <FormSection title={t('Контакты', 'Contacts')}>
            <Field label={t('Имя и фамилия', 'Full name')} required error={err('name')}>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t('Должность', 'Job title')}>
              <Input value={form.position} onChange={(e) => set('position', e.target.value)} autoComplete="organization-title" />
            </Field>
            <Field
              label={t('Почта', 'Email')}
              required
              error={err('email')}
              hint={t('На неё приходят уведомления и коды входа.', 'Notifications and sign-in codes are sent here.')}
            >
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" spellCheck={false} />
            </Field>
            <Field label={t('Телефон', 'Phone')} error={err('phone')} hint={t('Для SMS о критических инцидентах.', 'For SMS about critical incidents.')}>
              <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </Field>
          </FormSection>
          <FormSection title={t('Регион', 'Region')}>
            <Field label={t('Часовой пояс', 'Time zone')} hint={t('Время в журнале и отчётах.', 'Used for times in the audit log and reports.')}>
              <Select
                value={form.timezone}
                onChange={(v) => v && set('timezone', v)}
                options={TIMEZONES.map((z) => ({ value: z.value, label: tx(z.label), hint: z.hint }))}
                searchPlaceholder={t('Город', 'City')}
              />
            </Field>
            <Field
              label={t('Язык интерфейса', 'Interface language')}
              hint={t(
                'Применяется сразу, без сохранения. Также - палитра команд (Ctrl+K).',
                'Applies immediately, no need to save. Also available in the command palette (Ctrl+K).',
              )}
            >
              <Select
                value={lang}
                onChange={(v) => {
                  if (!v || v === lang) return
                  const next = v as Lang
                  setLang(next)
                  toast.success(next === 'en' ? 'Interface language: English' : 'Язык интерфейса: русский')
                }}
                options={LANGUAGES}
              />
            </Field>
          </FormSection>
        </form>
      </Card>

      <Card title={t('Учётная запись', 'Account')}>
        <div className="ev-stack">
          <div className={s.identity}>
            <Avatar name={saved.name} size={64} src={PROFILE_PHOTO} />
            <div className={s.identityText}>
              <span className={s.identityName}>{saved.name}</span>
              <span className="ev-muted">{saved.position || t('Должность не указана', 'No job title')}</span>
              <span>
                <Badge tone="accent" size="sm">
                  {t('Администратор', 'Administrator')}
                </Badge>
              </span>
            </div>
          </div>
          <Button
            icon={<Camera size={15} />}
            onClick={() =>
              toast.info(t('Фото обновится после модерации', 'Your photo will update after moderation'), {
                description: t('Требования: JPG или PNG, не больше 2 МБ.', 'Requirements: JPG or PNG, up to 2 MB.'),
              })
            }
          >
            {t('Загрузить фото', 'Upload photo')}
          </Button>
          <KeyValueList
            items={[
              { key: 'ws', label: t('Пространство', 'Workspace'), value: WORKSPACE_NAME, mono: true },
              { key: 'id', label: t('ID пользователя', 'User ID'), value: 'usr_01J9X4K2', mono: true },
              { key: 'since', label: t('В компании с', 'Joined'), value: '14.03.2023' },
              { key: 'tz', label: t('Часовой пояс', 'Time zone'), value: tz ? `${tx(tz.label)}, ${tz.hint}` : null },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
