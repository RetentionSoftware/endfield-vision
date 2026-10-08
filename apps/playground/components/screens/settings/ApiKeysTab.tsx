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

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '365', label: '1 год' },
  { value: 'never', label: 'Без срока', hint: 'Не рекомендуется' },
]

export function ApiKeysTab() {
  const modals = useModals()
  const [keys, setKeys] = useState<ApiKey[]>(API_KEYS)
  const [creating, setCreating] = useState(false)

  const revoke = (k: ApiKey) =>
    void modals.confirm({
      title: 'Отозвать ключ?',
      message: `«${k.name}» (${k.prefix}...) перестанет работать сразу. Интеграции, которые его используют, получат ошибку 401.`,
      okLabel: 'Отозвать',
      okVariant: 'danger',
      okIcon: <Ban size={15} />,
      onOk: async () => {
        await wait(500)
        setKeys((list) => list.filter((x) => x.id !== k.id))
        toast.success('Ключ отозван', { description: k.name })
      },
    })

  const columns: Column<ApiKey>[] = [
    {
      key: 'name',
      header: 'Название',
      primary: true,
      cell: (k) => (
        <span className={s.twoLine}>
          <span>{k.name}</span>
          <span className="ev-muted">создан {formatDate(k.createdAt)}</span>
        </span>
      ),
    },
    {
      key: 'key',
      header: 'Ключ',
      cell: (k) => (
        <CopyValue value={k.prefix} size="sm" label="Скопировать идентификатор ключа">
          {`${k.prefix}••••••••${k.last4}`}
        </CopyValue>
      ),
    },
    { key: 'scope', header: 'Права', cell: (k) => <Badge tone={KEY_SCOPE[k.scope].tone}>{KEY_SCOPE[k.scope].label}</Badge> },
    { key: 'used', header: 'Использован', hideOnMobile: true, cell: (k) => (k.lastUsed ? <span className="ev-num">{k.lastUsed}</span> : 'Не использовался') },
    {
      key: 'expires',
      header: 'Действует до',
      cell: (k) => {
        if (!k.expiresAt) return <span className="ev-muted">Бессрочно</span>
        const left = daysBetween(TODAY, k.expiresAt)
        return left <= 45 ? (
          <Badge tone="warning" size="sm">
            {formatDate(k.expiresAt)}, {left} дн.
          </Badge>
        ) : (
          <span className="ev-num">{formatDate(k.expiresAt)}</span>
        )
      },
    },
    {
      key: 'actions',
      header: <span className="ev-visually-hidden">Действия</span>,
      mobileLabel: 'Действия',
      align: 'right',
      cell: (k) => <IconButton label="Отозвать ключ" variant="danger-ghost" size="sm" icon={<Ban size={15} />} onClick={() => revoke(k)} />,
    },
  ]

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <Callout tone="info" title="Доступ к API от имени пространства">
        Ключ передаётся в заголовке Authorization. Права ключа не могут превышать права создавшего его администратора.
      </Callout>
      <Card
        title="Ключи API"
        icon={<KeyRound size={16} />}
        description={`Активных ключей: ${keys.length}`}
        flush
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
            Создать ключ
          </Button>
        }
      >
        <DataTable
          aria-label="Ключи API"
          columns={columns}
          rows={keys}
          rowKey={(k) => k.id}
          empty="Ключей нет"
          emptyDescription="Создайте ключ для интеграции с внешней системой."
        />
      </Card>
      {creating ? (
        <CreateKeyModal
          onClose={() => setCreating(false)}
          onCreated={(k) => {
            setKeys((list) => [k, ...list])
            toast.success('Ключ создан', { description: k.name })
          }}
        />
      ) : null}
    </div>
  )
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<KeyScope>('read')
  const [expiry, setExpiry] = useState<string | null>('90')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ key: ApiKey; secret: string } | null>(null)

  const create = async () => {
    if (name.trim().length < 3) {
      setError('Не короче 3 символов')
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
        title="Ключ создан"
        subtitle={created.key.name}
        footer={
          <Button variant="primary" onClick={onClose}>
            Готово
          </Button>
        }
      >
        <div className="ev-stack">
          <Callout tone="warning" title="Ключ показывается один раз">
            Скопируйте его и сохраните в хранилище секретов. После закрытия окна восстановить ключ нельзя - только создать новый.
          </Callout>
          <CopyValue value={created.secret} label="Скопировать ключ" block />
          <KeyValueList
            items={[
              { key: 'scope', label: 'Права', value: KEY_SCOPE[created.key.scope].label },
              { key: 'exp', label: 'Действует до', value: created.key.expiresAt ? formatDate(created.key.expiresAt) : 'Бессрочно' },
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
      title="Новый ключ API"
      subtitle="Ключ будет показан один раз после создания."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" icon={<KeyRound size={15} />} loading={busy} onClick={() => void create()}>
            Создать
          </Button>
        </>
      }
    >
      <div className="ev-stack">
        <Field label="Название" required error={error} hint="Например, система или команда, которая будет использовать ключ.">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="Интеграция с ERP"
            autoFocus
          />
        </Field>
        <Field label="Права">
          <RadioGroup
            aria-label="Права ключа"
            variant="card"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'read', label: KEY_SCOPE.read.label, description: 'Объекты, задачи, склад, отчёты.' },
              { value: 'write', label: KEY_SCOPE.write.label, description: 'Создание задач, движения склада, счета.' },
              { value: 'admin', label: KEY_SCOPE.admin.label, description: 'Включая пользователей и настройки пространства.' },
            ]}
          />
        </Field>
        <Field label="Срок действия">
          <Select value={expiry} onChange={setExpiry} options={EXPIRY_OPTIONS} />
        </Field>
        {scope === 'admin' ? (
          <Callout tone="warning">Полный доступ даёт ключу права администратора. Выдавайте его только сервисным учётным записям.</Callout>
        ) : null}
      </div>
    </Modal>
  )
}
