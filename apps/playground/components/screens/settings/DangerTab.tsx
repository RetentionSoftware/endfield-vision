'use client'

import { Button, Callout, Card, Field, Input, toast, useModals, type ModalButton, type ModalHandle } from 'endfield-vision'
import { DatabaseBackup, LogOut, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { WORKSPACE_NAME } from '@/lib/demo/settings'
import s from './settings.module.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Поле подтверждения: имя пространства нужно ввести вручную. */
function TypeToConfirm({ expected, onValid }: { expected: string; onValid: (ok: boolean) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="ev-stack">
      <p className="ev-secondary">
        Будут удалены объекты, задачи, складские остатки, счета, журнал и ключи API. Участники потеряют доступ. Восстановление возможно в
        течение 7 дней через поддержку, после этого данные удаляются безвозвратно.
      </p>
      <Field
        label={
          <>
            Введите <span className="ev-mono">{expected}</span> для подтверждения
          </>
        }
      >
        <Input
          value={value}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value)
            onValid(e.target.value.trim() === expected)
          }}
          placeholder={expected}
        />
      </Field>
    </div>
  )
}

function DangerRow({ title, description, action }: { title: string; description: ReactNode; action: ReactNode }) {
  return (
    <div className={s.dangerRow}>
      <div className={s.dangerText}>
        <span className={s.dangerTitle}>{title}</span>
        <span className="ev-muted">{description}</span>
      </div>
      <div className={s.dangerAction}>{action}</div>
    </div>
  )
}

export function DangerTab() {
  const modals = useModals()
  const [scheduled, setScheduled] = useState(false)

  const deleteWorkspace = () => {
    let handle: ModalHandle | null = null
    const buttons = (ok: boolean): ModalButton[] => [
      { label: 'Отмена', variant: 'ghost' },
      {
        label: 'Удалить пространство',
        variant: 'danger',
        icon: <Trash2 size={15} />,
        disabled: !ok,
        onClick: async ({ setBusy, close }) => {
          setBusy(true)
          await wait(1200)
          setScheduled(true)
          close()
          toast.warning('Удаление запланировано', { description: `Пространство ${WORKSPACE_NAME} будет удалено 15.10.2026.` })
        },
      },
    ]
    handle = modals.open({
      title: 'Удалить рабочее пространство?',
      subtitle: 'Действие затронет всех участников.',
      size: 'sm',
      body: <TypeToConfirm expected={WORKSPACE_NAME} onValid={(ok) => handle?.update({ footer: { buttons: buttons(ok) } })} />,
      footer: { buttons: buttons(false) },
    })
  }

  const signOutEverywhere = () =>
    void modals.confirm({
      title: 'Выйти на всех устройствах?',
      message: 'Все сеансы, включая текущий, будут завершены. Ключи API продолжат работать.',
      okLabel: 'Выйти везде',
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
      onOk: async () => {
        await wait(700)
        toast.success('Сеансы завершены', { description: 'Завершено сеансов: 4. Текущий сеанс сохранён в демо.' })
      },
    })

  const resetDemo = () =>
    void modals.confirm({
      title: 'Сбросить демо-данные?',
      message: 'Задачи, счета и сообщения вернутся к исходному набору. Настройки оформления не изменятся.',
      okLabel: 'Сбросить',
      okVariant: 'danger',
      okIcon: <RotateCcw size={15} />,
      onOk: async () => {
        await wait(800)
        toast.success('Демо-данные сброшены', { description: 'Обновите страницу, чтобы увидеть исходный набор.' })
      },
    })

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      {scheduled ? (
        <Callout
          tone="warning"
          title="Пространство будет удалено 15.10.2026"
          actions={
            <Button
              size="sm"
              icon={<Undo2 size={14} />}
              onClick={() => {
                setScheduled(false)
                toast.success('Удаление отменено')
              }}
            >
              Отменить удаление
            </Button>
          }
        >
          До этой даты пространство работает в режиме чтения.
        </Callout>
      ) : (
        <Callout tone="danger" title="Необратимые действия">
          Действия в этом разделе затрагивают всё пространство {WORKSPACE_NAME} и всех его участников. Перед удалением выгрузите данные.
        </Callout>
      )}

      <Card title="Опасная зона">
        <div className={s.dangerList}>
          <DangerRow
            title="Выгрузить все данные"
            description="Архив JSON и CSV по всем разделам. Ссылка придёт на почту владельца."
            action={
              <Button
                icon={<DatabaseBackup size={15} />}
                onClick={() => toast.info('Архив готовится', { description: 'Ссылка для скачивания придёт на a.vorontsova@endfield.dev.' })}
              >
                Выгрузить
              </Button>
            }
          />
          <DangerRow
            title="Выйти на всех устройствах"
            description="Завершить все сеансы учётной записи, включая мобильное приложение."
            action={
              <Button variant="danger-ghost" icon={<LogOut size={15} />} onClick={signOutEverywhere}>
                Выйти везде
              </Button>
            }
          />
          <DangerRow
            title="Сбросить демо-данные"
            description="Вернуть задачи, счета и сообщения к исходному набору."
            action={
              <Button variant="danger-ghost" icon={<RotateCcw size={15} />} onClick={resetDemo}>
                Сбросить
              </Button>
            }
          />
          <DangerRow
            title="Удалить рабочее пространство"
            description={
              <>
                Удаление <span className="ev-mono">{WORKSPACE_NAME}</span> со всеми данными. Потребуется ввести имя пространства.
              </>
            }
            action={
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={deleteWorkspace} disabled={scheduled}>
                Удалить
              </Button>
            }
          />
        </div>
      </Card>
    </div>
  )
}
