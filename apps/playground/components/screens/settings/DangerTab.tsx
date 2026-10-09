'use client'

import { Button, Callout, Card, Field, Input, toast, useModals, type ModalButton, type ModalHandle } from 'endfield-vision'
import { DatabaseBackup, LogOut, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { WORKSPACE_NAME } from '@/lib/demo/settings'
import { useT } from '@/lib/i18n'
import s from './settings.module.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Поле подтверждения: имя пространства нужно ввести вручную. */
function TypeToConfirm({ expected, onValid }: { expected: string; onValid: (ok: boolean) => void }) {
  const { t, lang } = useT()
  const [value, setValue] = useState('')
  return (
    <div className="ev-stack">
      <p className="ev-secondary">
        {t(
          'Будут удалены объекты, задачи, складские остатки, счета, журнал и ключи API. Участники потеряют доступ. Восстановление возможно в течение 7 дней через поддержку, после этого данные удаляются безвозвратно.',
          'Facilities, tasks, stock, invoices, the audit log and API keys will be deleted. Members will lose access. Support can restore the workspace within 7 days; after that, the data is deleted permanently.',
        )}
      </p>
      <Field
        label={
          lang === 'en' ? (
            <>
              Type <span className="ev-mono">{expected}</span> to confirm
            </>
          ) : (
            <>
              Введите <span className="ev-mono">{expected}</span> для подтверждения
            </>
          )
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
  const { t, lang } = useT()
  const modals = useModals()
  const [scheduled, setScheduled] = useState(false)

  const deleteWorkspace = () => {
    let handle: ModalHandle | null = null
    const buttons = (ok: boolean): ModalButton[] => [
      { label: t('Отмена', 'Cancel'), variant: 'ghost' },
      {
        label: t('Удалить пространство', 'Delete workspace'),
        variant: 'danger',
        icon: <Trash2 size={15} />,
        disabled: !ok,
        onClick: async ({ setBusy, close }) => {
          setBusy(true)
          await wait(1200)
          setScheduled(true)
          close()
          toast.warning(t('Удаление запланировано', 'Deletion scheduled'), {
            description: t(
              `Пространство ${WORKSPACE_NAME} будет удалено 15.10.2026.`,
              `The ${WORKSPACE_NAME} workspace will be deleted on 15.10.2026.`,
            ),
          })
        },
      },
    ]
    handle = modals.open({
      title: t('Удалить рабочее пространство?', 'Delete the workspace?'),
      subtitle: t('Действие затронет всех участников.', 'This affects all members.'),
      size: 'sm',
      body: <TypeToConfirm expected={WORKSPACE_NAME} onValid={(ok) => handle?.update({ footer: { buttons: buttons(ok) } })} />,
      footer: { buttons: buttons(false) },
    })
  }

  const signOutEverywhere = () =>
    void modals.confirm({
      title: t('Выйти на всех устройствах?', 'Sign out on all devices?'),
      message: t(
        'Все сеансы, включая текущий, будут завершены. Ключи API продолжат работать.',
        'All sessions, including this one, will be ended. API keys will keep working.',
      ),
      okLabel: t('Выйти везде', 'Sign out everywhere'),
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
      onOk: async () => {
        await wait(700)
        toast.success(t('Сеансы завершены', 'Sessions ended'), {
          description: t('Завершено сеансов: 4. Текущий сеанс сохранён в демо.', 'Sessions ended: 4. The current session is kept in the demo.'),
        })
      },
    })

  const resetDemo = () =>
    void modals.confirm({
      title: t('Сбросить демо-данные?', 'Reset demo data?'),
      message: t(
        'Задачи, счета и сообщения вернутся к исходному набору. Настройки оформления не изменятся.',
        'Tasks, invoices and messages will return to the initial set. Appearance settings will not change.',
      ),
      okLabel: t('Сбросить', 'Reset'),
      okVariant: 'danger',
      okIcon: <RotateCcw size={15} />,
      onOk: async () => {
        await wait(800)
        toast.success(t('Демо-данные сброшены', 'Demo data reset'), {
          description: t('Обновите страницу, чтобы увидеть исходный набор.', 'Refresh the page to see the initial set.'),
        })
      },
    })

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      {scheduled ? (
        <Callout
          tone="warning"
          title={t('Пространство будет удалено 15.10.2026', 'The workspace will be deleted on 15.10.2026')}
          actions={
            <Button
              size="sm"
              icon={<Undo2 size={14} />}
              onClick={() => {
                setScheduled(false)
                toast.success(t('Удаление отменено', 'Deletion canceled'))
              }}
            >
              {t('Отменить удаление', 'Cancel deletion')}
            </Button>
          }
        >
          {t('До этой даты пространство работает в режиме чтения.', 'Until then, the workspace is read-only.')}
        </Callout>
      ) : (
        <Callout tone="danger" title={t('Необратимые действия', 'Irreversible actions')}>
          {t(
            `Действия в этом разделе затрагивают всё пространство ${WORKSPACE_NAME} и всех его участников. Перед удалением выгрузите данные.`,
            `Actions in this section affect the entire ${WORKSPACE_NAME} workspace and all its members. Export your data before deleting.`,
          )}
        </Callout>
      )}

      <Card title={t('Опасная зона', 'Danger zone')}>
        <div className={s.dangerList}>
          <DangerRow
            title={t('Выгрузить все данные', 'Export all data')}
            description={t(
              'Архив JSON и CSV по всем разделам. Ссылка придёт на почту владельца.',
              "A JSON and CSV archive of all sections. The link will be sent to the owner's email.",
            )}
            action={
              <Button
                icon={<DatabaseBackup size={15} />}
                onClick={() =>
                  toast.info(t('Архив готовится', 'Preparing the archive'), {
                    description: t(
                      'Ссылка для скачивания придёт на a.vorontsova@endfield.dev.',
                      'A download link will be sent to a.vorontsova@endfield.dev.',
                    ),
                  })
                }
              >
                {t('Выгрузить', 'Export')}
              </Button>
            }
          />
          <DangerRow
            title={t('Выйти на всех устройствах', 'Sign out on all devices')}
            description={t(
              'Завершить все сеансы учётной записи, включая мобильное приложение.',
              'End all sessions of this account, including the mobile app.',
            )}
            action={
              <Button variant="danger-ghost" icon={<LogOut size={15} />} onClick={signOutEverywhere}>
                {t('Выйти везде', 'Sign out everywhere')}
              </Button>
            }
          />
          <DangerRow
            title={t('Сбросить демо-данные', 'Reset demo data')}
            description={t('Вернуть задачи, счета и сообщения к исходному набору.', 'Return tasks, invoices and messages to the initial set.')}
            action={
              <Button variant="danger-ghost" icon={<RotateCcw size={15} />} onClick={resetDemo}>
                {t('Сбросить', 'Reset')}
              </Button>
            }
          />
          <DangerRow
            title={t('Удалить рабочее пространство', 'Delete workspace')}
            description={
              lang === 'en' ? (
                <>
                  Deletes <span className="ev-mono">{WORKSPACE_NAME}</span> with all its data. You will need to type the workspace name.
                </>
              ) : (
                <>
                  Удаление <span className="ev-mono">{WORKSPACE_NAME}</span> со всеми данными. Потребуется ввести имя пространства.
                </>
              )
            }
            action={
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={deleteWorkspace} disabled={scheduled}>
                {t('Удалить', 'Delete')}
              </Button>
            }
          />
        </div>
      </Card>
    </div>
  )
}
