'use client'

import {
  addDaysIso,
  Badge,
  Button,
  Callout,
  Card,
  CopyValue,
  DataTable,
  Field,
  IconButton,
  Input,
  KeyValueList,
  Modal,
  RadioGroup,
  Select,
  toast,
  useModals,
  type Column,
} from 'endfield-vision'
import { Ban, KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { daysBetween } from '@/lib/demo/finance'
import { API_KEYS, KEY_SCOPE, type ApiKey, type KeyScope } from '@/lib/demo/settings'
import { formatDate } from '@/lib/format'
import { bi, useT, type Bi } from '@/lib/i18n'
import s from './settings.module.css'

/** «Сегодня» демо - для сроков действия ключей. */
const TODAY = '2026-10-08'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Секрет генерируется при создании (в обработчике, не при рендере). */
function generateSecret(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

const EXPIRY_OPTIONS: Array<{ value: string; label: Bi; hint?: Bi }> = [
  { value: '30', label: bi('30 дней', '30 days') },
  { value: '90', label: bi('90 дней', '90 days') },
  { value: '365', label: bi('1 год', '1 year') },
  { value: 'never', label: bi('Без срока', 'No expiry'), hint: bi('Не рекомендуется', 'Not recommended') },
]

export function ApiKeysTab() {
  const { t, tx, plural } = useT()
  const modals = useModals()
  const [keys, setKeys] = useState<ApiKey[]>(API_KEYS)
  const [creating, setCreating] = useState(false)

  const revoke = (k: ApiKey) =>
    void modals.confirm({
      title: t('Отозвать ключ?', 'Revoke key?'),
      message: t(
        `«${tx(k.name)}» (${k.prefix}...) перестанет работать сразу. Интеграции, которые его используют, получат ошибку 401.`,
        `"${tx(k.name)}" (${k.prefix}...) will stop working immediately. Integrations that use it will get a 401 error.`,
      ),
      okLabel: t('Отозвать', 'Revoke'),
      okVariant: 'danger',
      okIcon: <Ban size={15} />,
      onOk: async () => {
        await wait(500)
        setKeys((list) => list.filter((x) => x.id !== k.id))
        toast.success(t('Ключ отозван', 'Key revoked'), { description: tx(k.name) })
      },
    })

  const columns: Column<ApiKey>[] = [
    {
      key: 'name',
      header: t('Название', 'Name'),
      primary: true,
      cell: (k) => (
        <span className={s.twoLine}>
          <span>{tx(k.name)}</span>
          <span className="ev-muted">
            {t('создан', 'created')} {formatDate(k.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'key',
      header: t('Ключ', 'Key'),
      cell: (k) => (
        <CopyValue value={k.prefix} size="sm" label={t('Скопировать идентификатор ключа', 'Copy key ID')}>
          {`${k.prefix}••••••••${k.last4}`}
        </CopyValue>
      ),
    },
    { key: 'scope', header: t('Права', 'Access'), cell: (k) => <Badge tone={KEY_SCOPE[k.scope].tone}>{tx(KEY_SCOPE[k.scope].label)}</Badge> },
    {
      key: 'used',
      header: t('Использован', 'Last used'),
      hideOnMobile: true,
      cell: (k) => (k.lastUsed ? <span className="ev-num">{k.lastUsed}</span> : t('Не использовался', 'Never used')),
    },
    {
      key: 'expires',
      header: t('Действует до', 'Expires'),
      cell: (k) => {
        if (!k.expiresAt) return <span className="ev-muted">{t('Бессрочно', 'Never')}</span>
        const left = daysBetween(TODAY, k.expiresAt)
        return left <= 45 ? (
          <Badge tone="warning" size="sm">
            {formatDate(k.expiresAt)}, {left} {plural(left, ['дн.', 'дн.', 'дн.'], ['day', 'days'])}
          </Badge>
        ) : (
          <span className="ev-num">{formatDate(k.expiresAt)}</span>
        )
      },
    },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">{t('Действия', 'Actions')}</span>,
      mobileLabel: t('Действия', 'Actions'),
      align: 'right',
      cell: (k) => (
        <IconButton label={t('Отозвать ключ', 'Revoke key')} variant="danger-ghost" size="sm" icon={<Ban size={15} />} onClick={() => revoke(k)} />
      ),
    },
  ]

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <Callout tone="info" title={t('Доступ к API от имени пространства', 'API access on behalf of the workspace')}>
        {t(
          'Ключ передаётся в заголовке Authorization. Права ключа не могут превышать права создавшего его администратора.',
          'Pass the key in the Authorization header. A key cannot have more permissions than the administrator who created it.',
        )}
      </Callout>
      <Card
        title={t('Ключи API', 'API keys')}
        icon={<KeyRound size={16} />}
        description={t(`Активных ключей: ${keys.length}`, `Active keys: ${keys.length}`)}
        flush
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
            {t('Создать ключ', 'Create key')}
          </Button>
        }
      >
        <DataTable
          aria-label={t('Ключи API', 'API keys')}
          columns={columns}
          rows={keys}
          rowKey={(k) => k.id}
          empty={t('Ключей нет', 'No keys')}
          emptyDescription={t('Создайте ключ для интеграции с внешней системой.', 'Create a key to integrate with an external system.')}
        />
      </Card>
      {creating ? (
        <CreateKeyModal
          onClose={() => setCreating(false)}
          onCreated={(k) => {
            setKeys((list) => [k, ...list])
            toast.success(t('Ключ создан', 'Key created'), { description: tx(k.name) })
          }}
        />
      ) : null}
    </div>
  )
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const { t, tx } = useT()
  const [name, setName] = useState('')
  const [scope, setScope] = useState<KeyScope>('read')
  const [expiry, setExpiry] = useState<string | null>('90')
  const [error, setError] = useState<Bi | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ key: ApiKey; secret: string } | null>(null)

  const create = async () => {
    if (name.trim().length < 3) {
      setError(bi('Не короче 3 символов', 'At least 3 characters'))
      return
    }
    setBusy(true)
    await wait(800)
    const body = generateSecret(32)
    const prefix = `evk_live_${body.slice(0, 4)}`
    const key: ApiKey = {
      id: `k-${body.slice(0, 8)}`,
      name: name.trim(),
      prefix,
      last4: body.slice(-4),
      scope,
      createdAt: TODAY,
      lastUsed: null,
      expiresAt: expiry && expiry !== 'never' ? addDaysIso(TODAY, Number(expiry)) : null,
    }
    onCreated(key)
    setCreated({ key, secret: `evk_live_${body}` })
    setBusy(false)
  }

  if (created) {
    return (
      <Modal
        open
        onClose={onClose}
        size="md"
        title={t('Ключ создан', 'Key created')}
        subtitle={tx(created.key.name)}
        footer={
          <Button variant="primary" onClick={onClose}>
            {t('Готово', 'Done')}
          </Button>
        }
      >
        <div className="ev-stack">
          <Callout tone="warning" title={t('Ключ показывается один раз', 'The key is shown only once')}>
            {t(
              'Скопируйте его и сохраните в хранилище секретов. После закрытия окна восстановить ключ нельзя - только создать новый.',
              'Copy it and store it in a secrets manager. Once this window is closed, the key cannot be recovered - only replaced with a new one.',
            )}
          </Callout>
          <CopyValue value={created.secret} label={t('Скопировать ключ', 'Copy key')} block />
          <KeyValueList
            items={[
              { key: 'scope', label: t('Права', 'Access'), value: tx(KEY_SCOPE[created.key.scope].label) },
              {
                key: 'exp',
                label: t('Действует до', 'Expires'),
                value: created.key.expiresAt ? formatDate(created.key.expiresAt) : t('Бессрочно', 'Never'),
              },
            ]}
          />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="md"
      title={t('Новый ключ API', 'New API key')}
      subtitle={t('Ключ будет показан один раз после создания.', 'The key will be shown once after it is created.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Отмена', 'Cancel')}
          </Button>
          <Button variant="primary" icon={<KeyRound size={15} />} loading={busy} onClick={() => void create()}>
            {t('Создать', 'Create')}
          </Button>
        </>
      }
    >
      <div className="ev-stack">
        <Field
          label={t('Название', 'Name')}
          required
          error={error ? tx(error) : null}
          hint={t('Например, система или команда, которая будет использовать ключ.', 'For example, the system or team that will use the key.')}
        >
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={t('Интеграция с ERP', 'ERP integration')}
            autoFocus
          />
        </Field>
        <Field label={t('Права', 'Access')}>
          <RadioGroup
            aria-label={t('Права ключа', 'Key access')}
            variant="card"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'read', label: tx(KEY_SCOPE.read.label), description: t('Объекты, задачи, склад, отчёты.', 'Facilities, tasks, warehouse, reports.') },
              {
                value: 'write',
                label: tx(KEY_SCOPE.write.label),
                description: t('Создание задач, движения склада, счета.', 'Creating tasks, stock movements, invoices.'),
              },
              {
                value: 'admin',
                label: tx(KEY_SCOPE.admin.label),
                description: t('Включая пользователей и настройки пространства.', 'Including users and workspace settings.'),
              },
            ]}
          />
        </Field>
        <Field label={t('Срок действия', 'Expiration')}>
          <Select
            value={expiry}
            onChange={setExpiry}
            options={EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: tx(o.label), hint: o.hint ? tx(o.hint) : undefined }))}
          />
        </Field>
        {scope === 'admin' ? (
          <Callout tone="warning">
            {t(
              'Полный доступ даёт ключу права администратора. Выдавайте его только сервисным учётным записям.',
              'Full access gives the key administrator rights. Issue it to service accounts only.',
            )}
          </Callout>
        ) : null}
      </div>
    </Modal>
  )
}
