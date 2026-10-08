'use client'

import { Button, Checkbox, Field, Input, MultiSelect, Popover, SegmentedControl } from 'endfield-vision'
import { Bell, BellRing } from 'lucide-react'
import { useState } from 'react'
import { SERVICES } from '@/lib/demo/status'
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
const SERVICE_OPTIONS = SERVICES.map((sv) => ({ value: sv.id, label: sv.name, group: sv.group }))

/** Кнопка подписки на уведомления о сбоях: форма во всплывающем окне. */
export function SubscribePopover({ subscription, onSubscribe, onUnsubscribe }: SubscribePopoverProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      label="Подписка на уведомления"
      padded
      trigger={
        <Button variant={subscription ? 'secondary' : 'primary'} icon={subscription ? <BellRing size={15} /> : <Bell size={15} />}>
          {subscription ? 'Подписка оформлена' : 'Подписаться на уведомления'}
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
  const [email, setEmail] = useState(initial?.email ?? '')
  const [services, setServices] = useState<string[]>(initial?.services ?? SERVICES.map((sv) => sv.id))
  const [level, setLevel] = useState<Subscription['level']>(initial?.level ?? 'all')
  const [maintenance, setMaintenance] = useState(initial?.maintenance ?? true)
  const [errors, setErrors] = useState<{ email?: string; services?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const e: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) e.email = 'Введите адрес почты, например ops@company.ru.'
    if (services.length === 0) e.services = 'Выберите хотя бы один сервис.'
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
        <div className={s.subscribeTitle}>Уведомления о сбоях</div>
        <div className="ev-muted">Письмо при открытии, обновлении и закрытии инцидента.</div>
      </div>
      <Field label="Почта" required error={errors.email}>
        <Input
          type="email"
          autoComplete="email"
          data-autofocus=""
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }))
          }}
          placeholder="ops@company.ru"
        />
      </Field>
      <Field label="Сервисы" required error={errors.services}>
        <MultiSelect
          value={services}
          onChange={(v) => {
            setServices(v)
            if (errors.services) setErrors((x) => ({ ...x, services: undefined }))
          }}
          options={SERVICE_OPTIONS}
          placeholder="Не выбрано"
          maxLabels={1}
        />
      </Field>
      <Field label="Какие инциденты">
        <SegmentedControl
          aria-label="Какие инциденты"
          size="sm"
          block
          value={level}
          onChange={setLevel}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'major', label: 'Только серьёзные' },
          ]}
        />
      </Field>
      <Checkbox checked={maintenance} onChange={setMaintenance} label="Плановые работы" description="За сутки до начала окна." />
      <div className={s.subscribeActions}>
        {initial ? (
          <Button size="sm" variant="danger-ghost" onClick={onUnsubscribe} disabled={busy}>
            Отписаться
          </Button>
        ) : null}
        <span className="ev-spacer" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={busy}>
          {initial ? 'Сохранить' : 'Подписаться'}
        </Button>
      </div>
    </form>
  )
}
