'use client'

import { Button, Checkbox, Field, Input, MultiSelect, Popover, SegmentedControl } from 'endfield-vision'
import { Bell, BellRing } from 'lucide-react'
import { useState } from 'react'
import { SERVICES } from '@/lib/demo/status'
import { useT } from '@/lib/i18n'
import s from './status.module.css'

export interface Subscription {
  email: string
  services: string[]
  level: 'all' | 'major'
  maintenance: boolean
}

interface SubscribePopoverProps {
  subscription: Subscription | null
  onSubscribe: (sub: Subscription) => void
  onUnsubscribe: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Кнопка подписки на уведомления о сбоях: форма во всплывающем окне. */
export function SubscribePopover({ subscription, onSubscribe, onUnsubscribe }: SubscribePopoverProps) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      label={t('Подписка на уведомления', 'Notification subscription')}
      padded
      trigger={
        <Button variant={subscription ? 'secondary' : 'primary'} icon={subscription ? <BellRing size={15} /> : <Bell size={15} />}>
          {subscription ? t('Подписка оформлена', 'Subscribed') : t('Подписаться на уведомления', 'Subscribe to updates')}
        </Button>
      }
    >
      {({ close }) => (
        <SubscribeForm
          initial={subscription}
          onCancel={close}
          onSubmit={(sub) => {
            onSubscribe(sub)
            close()
          }}
          onUnsubscribe={() => {
            onUnsubscribe()
            close()
          }}
        />
      )}
    </Popover>
  )
}

function SubscribeForm({
  initial,
  onSubmit,
  onCancel,
  onUnsubscribe,
}: {
  initial: Subscription | null
  onSubmit: (sub: Subscription) => void
  onCancel: () => void
  onUnsubscribe: () => void
}) {
  const { t, tx } = useT()
  const [email, setEmail] = useState(initial?.email ?? '')
  const [services, setServices] = useState<string[]>(initial?.services ?? SERVICES.map((sv) => sv.id))
  const [level, setLevel] = useState<Subscription['level']>(initial?.level ?? 'all')
  const [maintenance, setMaintenance] = useState(initial?.maintenance ?? true)
  const [errors, setErrors] = useState<{ email?: string; services?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const e: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) e.email = t('Введите адрес почты, например ops@company.ru.', 'Enter an email address, for example ops@company.com.')
    if (services.length === 0) e.services = t('Выберите хотя бы один сервис.', 'Choose at least one service.')
    setErrors(e)
    if (e.email || e.services) return
    setBusy(true)
    await new Promise((r) => window.setTimeout(r, 600))
    setBusy(false)
    onSubmit({ email: email.trim(), services, level, maintenance })
  }

  return (
    <form
      className={s.subscribe}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className={s.subscribeHead}>
        <div className={s.subscribeTitle}>{t('Уведомления о сбоях', 'Incident notifications')}</div>
        <div className="ev-muted">{t('Письмо при открытии, обновлении и закрытии инцидента.', 'An email when an incident is opened, updated or closed.')}</div>
      </div>
      <Field label={t('Почта', 'Email')} required error={errors.email}>
        <Input
          type="email"
          autoComplete="email"
          data-autofocus=""
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }))
          }}
          placeholder={t('ops@company.ru', 'ops@company.com')}
        />
      </Field>
      <Field label={t('Сервисы', 'Services')} required error={errors.services}>
        <MultiSelect
          value={services}
          onChange={(v) => {
            setServices(v)
            if (errors.services) setErrors((x) => ({ ...x, services: undefined }))
          }}
          options={SERVICES.map((sv) => ({ value: sv.id, label: tx(sv.name), group: tx(sv.group) }))}
          placeholder={t('Не выбрано', 'None selected')}
          maxLabels={1}
        />
      </Field>
      <Field label={t('Какие инциденты', 'Which incidents')}>
        <SegmentedControl
          aria-label={t('Какие инциденты', 'Which incidents')}
          size="sm"
          block
          value={level}
          onChange={setLevel}
          options={[
            { value: 'all', label: t('Все', 'All') },
            { value: 'major', label: t('Только серьёзные', 'Major only') },
          ]}
        />
      </Field>
      <Checkbox
        checked={maintenance}
        onChange={setMaintenance}
        label={t('Плановые работы', 'Scheduled maintenance')}
        description={t('За сутки до начала окна.', 'A day before the window starts.')}
      />
      <div className={s.subscribeActions}>
        {initial ? (
          <Button size="sm" variant="danger-ghost" onClick={onUnsubscribe} disabled={busy}>
            {t('Отписаться', 'Unsubscribe')}
          </Button>
        ) : null}
        <span className="ev-spacer" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          {t('Отмена', 'Cancel')}
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={busy}>
          {initial ? t('Сохранить', 'Save') : t('Подписаться', 'Subscribe')}
        </Button>
      </div>
    </form>
  )
}
