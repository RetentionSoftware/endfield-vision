'use client'

import {
  Badge,
  Button,
  Callout,
  Card,
  CopyValue,
  DataTable,
  Field,
  PasswordInput,
  Progress,
  Switch,
  toast,
  useModals,
  type Column,
} from 'endfield-vision'
import { KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SESSIONS, type Session } from '@/lib/demo/settings'
import { bi, useT, type Bi } from '@/lib/i18n'
import s from './settings.module.css'

type PwErrors = Partial<Record<'current' | 'next' | 'confirm', Bi>>

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

function strength(pw: string): number {
  let score = 0
  if (pw.length >= 10) score += 1
  if (pw.length >= 14) score += 1
  // Регистр букв - для латиницы и кириллицы.
  if (/[a-zа-яё]/.test(pw) && /[A-ZА-ЯЁ]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^\p{L}\d]/u.test(pw)) score += 1
  return score
}

const STRENGTH = [
  { max: 2, label: bi('Слабый', 'Weak'), tone: 'danger' },
  { max: 3, label: bi('Средний', 'Fair'), tone: 'warning' },
  { max: 5, label: bi('Надёжный', 'Strong'), tone: 'success' },
] as const

function deviceIcon(device: string) {
  if (/iPhone|Android/.test(device)) return <Smartphone size={16} />
  if (/iPad/.test(device)) return <Tablet size={16} />
  return <Monitor size={16} />
}

export function SecurityTab() {
  const { t, tx } = useT()
  const modals = useModals()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<PwErrors>({})
  const [changing, setChanging] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(SESSIONS)

  const score = strength(pw.next)
  const level = STRENGTH.find((l) => score <= l.max) ?? STRENGTH[2]
  const pwError = (key: keyof PwErrors) => (pwErrors[key] ? tx(pwErrors[key]) : undefined)

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    const errs: PwErrors = {}
    if (!pw.current) errs.current = bi('Введите текущий пароль', 'Enter your current password')
    if (pw.next.length < 10) errs.next = bi('Не короче 10 символов', 'At least 10 characters')
    else if (!/\d/.test(pw.next) || !/\p{L}/u.test(pw.next)) errs.next = bi('Нужны буквы и хотя бы одна цифра', 'Use letters and at least one digit')
    else if (pw.next === pw.current) errs.next = bi('Новый пароль совпадает с текущим', 'The new password matches the current one')
    if (!errs.next && pw.confirm !== pw.next) errs.confirm = bi('Пароли не совпадают', 'Passwords do not match')
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return
    setChanging(true)
    await wait(900)
    setChanging(false)
    setPw({ current: '', next: '', confirm: '' })
    toast.success(t('Пароль изменён', 'Password changed'), {
      description: t('Остальные сеансы потребуют повторного входа.', 'Other sessions will need to sign in again.'),
    })
  }

  const toggleTwoFactor = async (on: boolean) => {
    if (!on) {
      const ok = await modals.confirm({
        title: t('Отключить двухфакторную аутентификацию?', 'Turn off two-factor authentication?'),
        message: t(
          'Для входа будет достаточно пароля. Это снижает защиту учётной записи администратора.',
          'A password alone will be enough to sign in. This weakens protection of an administrator account.',
        ),
        okLabel: t('Отключить', 'Turn off'),
        okVariant: 'danger',
      })
      if (ok) {
        setTwoFactor(false)
        toast.warning(t('Двухфакторная аутентификация отключена', 'Two-factor authentication turned off'))
      }
      return
    }
    modals.open({
      title: t('Подключение приложения-аутентификатора', 'Set up an authenticator app'),
      size: 'sm',
      body: (
        <div className="ev-stack">
          <p className="ev-secondary">
            {t(
              'Добавьте учётную запись в приложение-аутентификатор по ключу ниже. Коды будут запрашиваться при каждом входе с нового устройства.',
              'Add the account to your authenticator app using the key below. A code will be required every time you sign in from a new device.',
            )}
          </p>
          <CopyValue value="JBSW Y3DP EHPK 3PXP" label={t('Скопировать ключ настройки', 'Copy setup key')} block />
          <Callout tone="info" icon={false}>
            {t('Резервные коды можно будет скачать после подключения.', 'Backup codes will be available to download after setup.')}
          </Callout>
        </div>
      ),
      footer: {
        buttons: [
          { label: t('Отмена', 'Cancel'), variant: 'ghost' },
          {
            label: t('Подключить', 'Connect'),
            variant: 'primary',
            onClick: async ({ setBusy, close }) => {
              setBusy(true)
              await wait(700)
              setTwoFactor(true)
              close()
              toast.success(t('Двухфакторная аутентификация включена', 'Two-factor authentication turned on'))
            },
          },
        ],
      },
    })
  }

  const terminate = (session: Session) =>
    void modals.confirm({
      title: t('Завершить сеанс?', 'End session?'),
      message: t(
        `${session.device}, ${tx(session.client)} (${tx(session.location)}). На этом устройстве потребуется войти заново.`,
        `${session.device}, ${tx(session.client)} (${tx(session.location)}). You will need to sign in again on this device.`,
      ),
      okLabel: t('Завершить', 'End session'),
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
      onOk: async () => {
        await wait(500)
        setSessions((list) => list.filter((x) => x.id !== session.id))
        toast.success(t('Сеанс завершён', 'Session ended'), { description: `${session.device}, ${tx(session.location)}` })
      },
    })

  const others = sessions.filter((x) => !x.current)

  const terminateOthers = () =>
    void modals.confirm({
      title: t('Завершить все остальные сеансы?', 'End all other sessions?'),
      message: t(
        `Будет завершено сеансов: ${others.length}. Текущий сеанс останется активным.`,
        `Sessions to end: ${others.length}. The current session will stay active.`,
      ),
      okLabel: t('Завершить все', 'End all'),
      okVariant: 'danger',
      onOk: async () => {
        await wait(700)
        setSessions((list) => list.filter((x) => x.current))
        toast.success(t('Остальные сеансы завершены', 'Other sessions ended'))
      },
    })

  const columns: Column<Session>[] = [
    {
      key: 'device',
      header: t('Устройство', 'Device'),
      primary: true,
      cell: (x) => (
        <span className={s.device}>
          <span className={s.deviceIcon} aria-hidden="true">
            {deviceIcon(x.device)}
          </span>
          <span className={s.deviceText}>
            <span>
              {x.device}
              {x.current ? (
                <Badge tone="success" size="sm" className={s.inlineBadge}>
                  {t('Это устройство', 'This device')}
                </Badge>
              ) : null}
            </span>
            <span className="ev-muted">{tx(x.client)}</span>
          </span>
        </span>
      ),
    },
    { key: 'location', header: t('Местоположение', 'Location'), cell: (x) => tx(x.location) },
    { key: 'ip', header: t('IP-адрес', 'IP address'), hideOnMobile: true, cell: (x) => <span className="ev-mono">{x.ip}</span> },
    { key: 'last', header: t('Активность', 'Last active'), cell: (x) => <span className="ev-num">{tx(x.lastActive)}</span> },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      mobileLabel: t('Действия', 'Actions'),
      align: 'right',
      cell: (x) =>
        x.current ? null : (
          <Button size="sm" variant="danger-ghost" icon={<LogOut size={14} />} onClick={() => terminate(x)}>
            {t('Завершить', 'End')}
          </Button>
        ),
    },
  ]

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <div className="pg-grid-2">
        <Card
          title={t('Смена пароля', 'Change password')}
          icon={<KeyRound size={16} />}
          description={t('Не короче 10 символов, буквы и цифры.', 'At least 10 characters, with letters and digits.')}
        >
          <form className="ev-stack" onSubmit={(e) => void changePassword(e)} noValidate>
            <Field label={t('Текущий пароль', 'Current password')} error={pwError('current')}>
              <PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </Field>
            <Field label={t('Новый пароль', 'New password')} error={pwError('next')}>
              <PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </Field>
            {pw.next ? (
              <Progress
                size="sm"
                value={score}
                max={5}
                tone={level.tone}
                label={t('Надёжность', 'Strength')}
                showValue={() => tx(level.label)}
              />
            ) : null}
            <Field label={t('Повторите пароль', 'Confirm password')} error={pwError('confirm')}>
              <PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            </Field>
            <div>
              <Button type="submit" variant="primary" loading={changing}>
                {t('Изменить пароль', 'Change password')}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title={t('Двухфакторная аутентификация', 'Two-factor authentication')}
          icon={<ShieldCheck size={16} />}
          description={t('Код из приложения при входе с нового устройства.', 'An app code when you sign in from a new device.')}
        >
          <div className="ev-stack">
            <Switch
              checked={twoFactor}
              onChange={(v) => void toggleTwoFactor(v)}
              label={twoFactor ? t('Включена', 'On') : t('Выключена', 'Off')}
              description={t(
                'Приложение-аутентификатор: Яндекс Ключ, Google Authenticator и аналоги.',
                'Authenticator app: Yandex Key, Google Authenticator and similar.',
              )}
            />
            {twoFactor ? (
              <Callout tone="success" title={t('Учётная запись защищена', 'Account protected')}>
                {t('Резервные коды: 8 из 10 не использованы.', 'Backup codes: 8 of 10 unused.')}
              </Callout>
            ) : (
              <Callout tone="warning" title={t('Рекомендуется включить', 'Recommended')}>
                {t(
                  'Политика пространства требует второй фактор для администраторов с 1 ноября 2026.',
                  'Workspace policy requires a second factor for administrators starting November 1, 2026.',
                )}
              </Callout>
            )}
          </div>
        </Card>
      </div>

      <Card
        title={t('Активные сеансы', 'Active sessions')}
        description={t('Устройства, с которых выполнен вход в учётную запись.', 'Devices signed in to this account.')}
        flush
        actions={
          <Button size="sm" variant="danger-ghost" icon={<LogOut size={14} />} disabled={others.length === 0} onClick={terminateOthers}>
            {t('Завершить остальные', 'End other sessions')}
          </Button>
        }
      >
        <DataTable aria-label={t('Активные сеансы', 'Active sessions')} columns={columns} rows={sessions} rowKey={(x) => x.id} />
      </Card>
    </div>
  )
}
