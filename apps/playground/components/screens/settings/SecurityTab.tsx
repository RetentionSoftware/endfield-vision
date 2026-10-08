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
import s from './settings.module.css'

type PwErrors = Partial<Record<'current' | 'next' | 'confirm', string>>

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

function strength(pw: string): number {
  let score = 0
  if (pw.length >= 10) score += 1
  if (pw.length >= 14) score += 1
  if (/[a-zа-яё]/.test(pw) && /[A-ZА-ЯЁ]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^\p{L}\d]/u.test(pw)) score += 1
  return score
}

const STRENGTH = [
  { max: 2, label: 'Слабый', tone: 'danger' },
  { max: 3, label: 'Средний', tone: 'warning' },
  { max: 5, label: 'Надёжный', tone: 'success' },
] as const

function deviceIcon(device: string) {
  if (/iPhone|Android/.test(device)) return <Smartphone size={16} />
  if (/iPad/.test(device)) return <Tablet size={16} />
  return <Monitor size={16} />
}

export function SecurityTab() {
  const modals = useModals()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<PwErrors>({})
  const [changing, setChanging] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(SESSIONS)

  const score = strength(pw.next)
  const level = STRENGTH.find((l) => score <= l.max) ?? STRENGTH[2]

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    const errs: PwErrors = {}
    if (!pw.current) errs.current = 'Введите текущий пароль'
    if (pw.next.length < 10) errs.next = 'Не короче 10 символов'
    else if (!/\d/.test(pw.next) || !/\p{L}/u.test(pw.next)) errs.next = 'Нужны буквы и хотя бы одна цифра'
    else if (pw.next === pw.current) errs.next = 'Новый пароль совпадает с текущим'
    if (!errs.next && pw.confirm !== pw.next) errs.confirm = 'Пароли не совпадают'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return
    setChanging(true)
    await wait(900)
    setChanging(false)
    setPw({ current: '', next: '', confirm: '' })
    toast.success('Пароль изменён', { description: 'Остальные сеансы потребуют повторного входа.' })
  }

  const toggleTwoFactor = async (on: boolean) => {
    if (!on) {
      const ok = await modals.confirm({
        title: 'Отключить двухфакторную аутентификацию?',
        message: 'Для входа будет достаточно пароля. Это снижает защиту учётной записи администратора.',
        okLabel: 'Отключить',
        okVariant: 'danger',
      })
      if (ok) {
        setTwoFactor(false)
        toast.warning('Двухфакторная аутентификация отключена')
      }
      return
    }
    modals.open({
      title: 'Подключение приложения-аутентификатора',
      size: 'sm',
      body: (
        <div className="ev-stack">
          <p className="ev-secondary">
            Добавьте учётную запись в приложение-аутентификатор по ключу ниже. Коды будут запрашиваться при каждом входе с нового устройства.
          </p>
          <CopyValue value="JBSW Y3DP EHPK 3PXP" label="Скопировать ключ настройки" block />
          <Callout tone="info" icon={false}>
            Резервные коды можно будет скачать после подключения.
          </Callout>
        </div>
      ),
      footer: {
        buttons: [
          { label: 'Отмена', variant: 'ghost' },
          {
            label: 'Подключить',
            variant: 'primary',
            autoFocus: true,
            onClick: async ({ setBusy, close }) => {
              setBusy(true)
              await wait(700)
              setTwoFactor(true)
              close()
              toast.success('Двухфакторная аутентификация включена')
            },
          },
        ],
      },
    })
  }

  const terminate = (session: Session) =>
    void modals.confirm({
      title: 'Завершить сеанс?',
      message: `${session.device}, ${session.client} (${session.location}). На этом устройстве потребуется войти заново.`,
      okLabel: 'Завершить',
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
      onOk: async () => {
        await wait(500)
        setSessions((list) => list.filter((x) => x.id !== session.id))
        toast.success('Сеанс завершён', { description: `${session.device}, ${session.location}` })
      },
    })

  const others = sessions.filter((x) => !x.current)

  const terminateOthers = () =>
    void modals.confirm({
      title: 'Завершить все остальные сеансы?',
      message: `Будет завершено сеансов: ${others.length}. Текущий сеанс останется активным.`,
      okLabel: 'Завершить все',
      okVariant: 'danger',
      onOk: async () => {
        await wait(700)
        setSessions((list) => list.filter((x) => x.current))
        toast.success('Остальные сеансы завершены')
      },
    })

  const columns: Column<Session>[] = [
    {
      key: 'device',
      header: 'Устройство',
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
                  Это устройство
                </Badge>
              ) : null}
            </span>
            <span className="ev-muted">{x.client}</span>
          </span>
        </span>
      ),
    },
    { key: 'location', header: 'Местоположение', cell: (x) => x.location },
    { key: 'ip', header: 'IP-адрес', hideOnMobile: true, cell: (x) => <span className="ev-mono">{x.ip}</span> },
    { key: 'last', header: 'Активность', cell: (x) => <span className="ev-num">{x.lastActive}</span> },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">Действия</span>,
      mobileLabel: 'Действия',
      align: 'right',
      cell: (x) =>
        x.current ? null : (
          <Button size="sm" variant="danger-ghost" icon={<LogOut size={14} />} onClick={() => terminate(x)}>
            Завершить
          </Button>
        ),
    },
  ]

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <div className="pg-grid-2">
        <Card title="Смена пароля" icon={<KeyRound size={16} />} description="Не короче 10 символов, буквы и цифры.">
          <form className="ev-stack" onSubmit={(e) => void changePassword(e)} noValidate>
            <Field label="Текущий пароль" error={pwErrors.current}>
              <PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </Field>
            <Field label="Новый пароль" error={pwErrors.next}>
              <PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </Field>
            {pw.next ? (
              <Progress
                size="sm"
                value={score}
                max={5}
                tone={level.tone}
                label="Надёжность"
                showValue={() => level.label}
              />
            ) : null}
            <Field label="Повторите пароль" error={pwErrors.confirm}>
              <PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            </Field>
            <div>
              <Button type="submit" variant="primary" loading={changing}>
                Изменить пароль
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Двухфакторная аутентификация" icon={<ShieldCheck size={16} />} description="Код из приложения при входе с нового устройства.">
          <div className="ev-stack">
            <Switch
              checked={twoFactor}
              onChange={(v) => void toggleTwoFactor(v)}
              label={twoFactor ? 'Включена' : 'Выключена'}
              description="Приложение-аутентификатор: Яндекс Ключ, Google Authenticator и аналоги."
            />
            {twoFactor ? (
              <Callout tone="success" title="Учётная запись защищена">
                Резервные коды: 8 из 10 не использованы.
              </Callout>
            ) : (
              <Callout tone="warning" title="Рекомендуется включить">
                Политика пространства требует второй фактор для администраторов с 1 ноября 2026.
              </Callout>
            )}
          </div>
        </Card>
      </div>

      <Card
        title="Активные сеансы"
        description="Устройства, с которых выполнен вход в учётную запись."
        flush
        actions={
          <Button size="sm" variant="danger-ghost" icon={<LogOut size={14} />} disabled={others.length === 0} onClick={terminateOthers}>
            Завершить остальные
          </Button>
        }
      >
        <DataTable aria-label="Активные сеансы" columns={columns} rows={sessions} rowKey={(x) => x.id} />
      </Card>
    </div>
  )
}
