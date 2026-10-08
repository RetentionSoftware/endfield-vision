'use client'

import { Button, Callout, Checkbox, CopyValue, Field, Input, PasswordInput, toast } from 'endfield-vision'
import { ArrowLeft, LogIn, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Brand } from '@/components/Brand'
import s from './auth.module.css'

/** Пароль демо-доступа: подходит любой email. */
const DEMO_PASSWORD = 'vision'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = 'login' | 'reset' | 'sent'
type Errors = Partial<Record<'email' | 'password', string>>

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Вход в демо-консоль и восстановление пароля. */
export function LoginScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const login = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const errs: Errors = {}
    if (!email.trim()) errs.email = 'Введите email'
    if (!password) errs.password = 'Введите пароль'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setBusy(true)
    await wait(800)
    if (password !== DEMO_PASSWORD) {
      setBusy(false)
      setFormError('Неверный email или пароль. После 5 неудачных попыток вход блокируется на 15 минут.')
      return
    }
    toast.success('Вход выполнен', { description: remember ? 'Устройство запомнено на 30 дней.' : undefined })
    router.push('/overview')
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Некорректный адрес почты' })
      return
    }
    setErrors({})
    setBusy(true)
    await wait(800)
    setBusy(false)
    setMode('sent')
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setErrors({})
    setFormError(null)
  }

  return (
    <div className={s.card}>
      <div className={s.head}>
        <Brand subtitle="Демо-консоль" />
        <div>
          <h1 className={s.title}>{mode === 'login' ? 'Вход в консоль' : 'Восстановление пароля'}</h1>
          <p className={s.subtitle}>
            {mode === 'login' ? 'Операции, объекты и финансы компании.' : 'Пришлём ссылку для смены пароля на почту.'}
          </p>
        </div>
      </div>

      {mode === 'login' ? (
        <form className={s.form} onSubmit={(e) => void login(e)} noValidate>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@endfield.dev"
            />
          </Field>
          <Field
            label="Пароль"
            error={errors.password}
            labelAside={
              <button type="button" className={s.linkBtn} onClick={() => switchMode('reset')}>
                Забыли пароль?
              </button>
            }
          >
            <PasswordInput name="password" autoComplete="current-password" size="lg" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Checkbox checked={remember} onChange={setRemember} label="Запомнить устройство" description="Не спрашивать пароль 30 дней." />
          {formError ? (
            <Callout tone="danger" icon={false}>
              {formError}
            </Callout>
          ) : null}
          <div className={s.actions}>
            <Button type="submit" variant="primary" size="lg" block loading={busy} icon={<LogIn size={16} />}>
              Войти
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'reset' ? (
        <form className={s.form} onSubmit={(e) => void reset(e)} noValidate>
          <Field label="Email" error={errors.email} hint="Адрес, указанный в профиле.">
            <Input
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@endfield.dev"
            />
          </Field>
          <div className={s.actions}>
            <Button type="submit" variant="primary" size="lg" block loading={busy} icon={<Mail size={16} />}>
              Отправить ссылку
            </Button>
            <Button variant="ghost" size="lg" block icon={<ArrowLeft size={16} />} disabled={busy} onClick={() => switchMode('login')}>
              Вернуться ко входу
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'sent' ? (
        <div className={s.form}>
          <Callout tone="success" title="Ссылка отправлена">
            Письмо со ссылкой для смены пароля отправлено на {email.trim()}. Ссылка действует 30 минут.
          </Callout>
          <div className={s.actions}>
            <Button variant="primary" size="lg" block icon={<ArrowLeft size={16} />} onClick={() => switchMode('login')}>
              Вернуться ко входу
            </Button>
            <Button variant="ghost" size="lg" block onClick={() => toast.info('Письмо отправлено повторно', { description: email.trim() })}>
              Отправить ещё раз
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'login' ? (
        <div className={s.hint}>
          <span>Демо-доступ: любой email, пароль</span>
          <CopyValue value={DEMO_PASSWORD} size="sm" label="Скопировать пароль" />
        </div>
      ) : null}
    </div>
  )
}
