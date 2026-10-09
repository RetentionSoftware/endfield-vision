'use client'

import { Button, Callout, Checkbox, CopyValue, Field, Input, PasswordInput, toast } from 'endfield-vision'
import { ArrowLeft, LogIn, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Brand } from '@/components/Brand'
import { useT } from '@/lib/i18n'
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
  const { t } = useT()
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
    if (!email.trim()) errs.email = t('Введите email', 'Enter your email')
    if (!password) errs.password = t('Введите пароль', 'Enter your password')
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setBusy(true)
    await wait(800)
    if (password !== DEMO_PASSWORD) {
      setBusy(false)
      setFormError(
        t(
          'Неверный email или пароль. После 5 неудачных попыток вход блокируется на 15 минут.',
          'Incorrect email or password. After 5 failed attempts, sign-in is locked for 15 minutes.',
        ),
      )
      return
    }
    toast.success(t('Вход выполнен', 'Signed in'), { description: remember ? t('Устройство запомнено на 30 дней.', 'This device will be remembered for 30 days.') : undefined })
    router.push('/overview')
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: t('Некорректный адрес почты', 'Invalid email address') })
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
        <Brand subtitle={t('Демо-консоль', 'Demo console')} />
        <div>
          <h1 className={s.title}>{mode === 'login' ? t('Вход в консоль', 'Sign in to the console') : t('Восстановление пароля', 'Reset password')}</h1>
          <p className={s.subtitle}>
            {mode === 'login'
              ? t('Операции, объекты и финансы компании.', 'Company operations, facilities and finance.')
              : t('Пришлём ссылку для смены пароля на почту.', "We'll email you a link to reset your password.")}
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
            label={t('Пароль', 'Password')}
            error={errors.password}
            labelAside={
              <Button variant="link" onClick={() => switchMode('reset')}>
                {t('Забыли пароль?', 'Forgot password?')}
              </Button>
            }
          >
            <PasswordInput name="password" autoComplete="current-password" size="lg" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Checkbox
            checked={remember}
            onChange={setRemember}
            label={t('Запомнить устройство', 'Remember this device')}
            description={t('Не спрашивать пароль 30 дней.', "Don't ask for a password for 30 days.")}
          />
          {formError ? (
            <Callout tone="danger" icon={false}>
              {formError}
            </Callout>
          ) : null}
          <div className={s.actions}>
            <Button type="submit" variant="primary" size="lg" block loading={busy} icon={<LogIn size={16} />}>
              {t('Войти', 'Sign in')}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'reset' ? (
        <form className={s.form} onSubmit={(e) => void reset(e)} noValidate>
          <Field label="Email" error={errors.email} hint={t('Адрес, указанный в профиле.', 'The address in your profile.')}>
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
              {t('Отправить ссылку', 'Send link')}
            </Button>
            <Button variant="ghost" size="lg" block icon={<ArrowLeft size={16} />} disabled={busy} onClick={() => switchMode('login')}>
              {t('Вернуться ко входу', 'Back to sign in')}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'sent' ? (
        <div className={s.form}>
          <Callout tone="success" title={t('Ссылка отправлена', 'Link sent')}>
            {t(
              `Письмо со ссылкой для смены пароля отправлено на ${email.trim()}. Ссылка действует 30 минут.`,
              `A password reset link has been sent to ${email.trim()}. The link is valid for 30 minutes.`,
            )}
          </Callout>
          <div className={s.actions}>
            <Button variant="primary" size="lg" block icon={<ArrowLeft size={16} />} onClick={() => switchMode('login')}>
              {t('Вернуться ко входу', 'Back to sign in')}
            </Button>
            <Button variant="ghost" size="lg" block onClick={() => toast.info(t('Письмо отправлено повторно', 'Email sent again'), { description: email.trim() })}>
              {t('Отправить ещё раз', 'Resend')}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'login' ? (
        <div className={s.hint}>
          <span>{t('Демо-доступ: любой email, пароль', 'Demo access: any email, password')}</span>
          <CopyValue value={DEMO_PASSWORD} size="sm" label={t('Скопировать пароль', 'Copy password')} />
        </div>
      ) : null}
    </div>
  )
}
