'use client'

import {
  Button,
  Callout,
  Card,
  DateField,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  KeyValueList,
  LoadingBlock,
  Modal,
  modals,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  StatusPill,
  Textarea,
  toast,
  useModals,
  useToast,
  type ModalSize,
} from 'endfield-vision'
import { ClipboardList, Download, PackageSearch, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { Subhead } from './parts'
import s from './vision.module.css'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function CalloutsCard() {
  const { t } = useT()
  return (
    <Card
      title="Callout"
      description={t(
        'Сообщение внутри страницы: пояснение к разделу, предупреждение, итог операции. Предупреждение и ошибка объявляются скринридером (role=alert).',
        'An in-page message: a section note, a warning, the result of an operation. Warnings and errors are announced by screen readers (role=alert).',
      )}
    >
      <div className="ev-stack">
        <Callout tone="info" title={t('Остатки обновляются раз в 15 минут', 'Stock updates every 15 minutes')}>
          {t(
            'Данные по складу Застава приходят с задержкой: узел связи работает в резервном режиме.',
            'Data from the Outpost warehouse arrives with a delay: the network node is running in backup mode.',
          )}
        </Callout>
        <Callout tone="success">{t('Инвентаризация склада Долина-1 закрыта. Расхождений нет.', 'Valley-1 warehouse stocktake closed. No discrepancies.')}</Callout>
        <Callout tone="warning" title={t('Приёмка приостановлена', 'Receiving paused')} actions={<Button size="sm">{t('Подробнее', 'Details')}</Button>}>
          {t(
            'На складе Хребет заполнено 92% мест хранения. Новые поставки направляются в Логистический узел.',
            'Ridge warehouse is at 92% of storage capacity. New deliveries are routed to the Logistics hub.',
          )}
        </Callout>
        <Callout tone="danger" title={t('Не удалось провести отгрузку SHP-20418', 'Could not post shipment SHP-20418')}>
          {t(
            'Позиция SKU-40217 списана другим документом. Обновите состав отгрузки.',
            'Item SKU-40217 was written off by another document. Update the shipment contents.',
          )}
        </Callout>
        <Callout tone="neutral" icon={false}>
          {t('Нейтральная плашка без иконки - для справочного текста в формах.', 'A neutral callout without an icon, for reference text in forms.')}
        </Callout>
      </div>
    </Card>
  )
}

function ToastsCard() {
  const { t } = useT()
  const toasts = useToast()
  return (
    <Card
      title={t('Уведомления', 'Toasts')}
      description={t(
        'toast - короткий итог действия, не требующий ответа. Ошибки живут дольше и могут нести действие. Toaster ставится один раз в корне (или ToastProvider вокруг приложения); useToast() - тот же API в хуке.',
        'toast reports the brief result of an action that needs no response. Errors stay on screen longer and can carry an action. Place Toaster once at the root (or wrap the app in ToastProvider); useToast() exposes the same API as a hook.',
      )}
    >
      <div className="ev-stack">
        <div className={s.row}>
          <Button onClick={() => toast.success(t('Изменения сохранены', 'Changes saved'))}>{t('Успех', 'Success')}</Button>
          <Button
            onClick={() =>
              toast.info(t('Отчёт формируется', 'Generating report'), { description: t('Ссылка придёт во «Входящие»', 'The link will arrive in your Inbox') })
            }
          >
            {t('Сведения', 'Info')}
          </Button>
          <Button
            onClick={() => toast.warning(t('Проверьте остатки', 'Check stock levels'), { description: t('Позиций ниже минимума: 37', 'Items below minimum: 37') })}
          >
            {t('Предупреждение', 'Warning')}
          </Button>
          <Button
            onClick={() =>
              toast.error(t('Не удалось сохранить', 'Could not save'), {
                description: t('Нет связи с сервером. Проверьте подключение.', 'Cannot reach the server. Check your connection.'),
                action: { label: t('Повторить', 'Retry'), onClick: () => toast.success(t('Сохранено', 'Saved')) },
              })
            }
          >
            {t('Ошибка с действием', 'Error with action')}
          </Button>
        </div>
        <div className={s.row}>
          <Button
            variant="ghost"
            onClick={() =>
              toasts.show({
                title: t('Синхронизация склада', 'Syncing warehouse'),
                description: t('Закроется только вручную', 'Closes only manually'),
                tone: 'info',
                duration: null,
              })
            }
          >
            {t('Без автозакрытия', 'No auto-dismiss')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              for (let i = 1; i <= 6; i++) toasts.info(t(`Задача TSK-10${40 + i} назначена`, `Task TSK-10${40 + i} assigned`))
            }}
          >
            {t('Пачка из шести', 'Batch of six')}
          </Button>
          <Button variant="ghost" onClick={() => toasts.dismissAll()}>
            {t('Убрать все', 'Dismiss all')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ModalsCard() {
  const { t } = useT()
  const m = useModals()
  return (
    <Card
      title="useModals"
      description={t(
        'Императивные окна: confirm - подтверждение с ожиданием операции, alert - сообщение, open - своё окно с кнопками. Требует ModalsProvider; modals - тот же API вне компонентов.',
        'Imperative dialogs: confirm asks for confirmation and waits for the operation, alert shows a message, open builds a custom dialog with buttons. Requires ModalsProvider; modals is the same API for use outside components.',
      )}
    >
      <div className={s.row}>
        <Button
          variant="danger"
          icon={<Trash2 size={15} />}
          onClick={async () => {
            const ok = await m.confirm({
              title: t('Списать позицию?', 'Write off this item?'),
              message: t(
                'Фильтр гидравлический (SKU-40200), 12 шт. Списание попадёт в журнал и не отменяется.',
                'Hydraulic filter (SKU-40200), 12 pcs. The write-off goes to the audit log and cannot be undone.',
              ),
              okLabel: t('Списать', 'Write off'),
              okVariant: 'danger',
              onOk: () => wait(900),
            })
            if (ok) toast.success(t('Позиция списана', 'Item written off'))
          }}
        >
          {t('Подтверждение', 'Confirm')}
        </Button>
        <Button
          onClick={() =>
            void m.alert({
              title: t('Смена закрыта', 'Shift closed'),
              message: t('Отчёт по смене отправлен руководителю объекта.', 'The shift report has been sent to the facility manager.'),
            })
          }
        >
          {t('Сообщение', 'Alert')}
        </Button>
        <Button
          onClick={() => {
            const parts = t('Нет запчастей', 'No spare parts')
            const access = t('Нет доступа', 'No access')
            const h = m.open<string>({
              title: t('Причина переноса', 'Reason for rescheduling'),
              subtitle: t('Задача TSK-1042', 'Task TSK-1042'),
              size: 'sm',
              body: <span className="ev-secondary">{t('Выберите причину: она попадёт в историю задачи.', 'Choose a reason. It will be added to the task history.')}</span>,
              footer: {
                left: <span className="ev-muted">{t('Шаг 1 из 1', 'Step 1 of 1')}</span>,
                buttons: [
                  { label: parts, result: 'parts' },
                  {
                    label: access,
                    variant: 'primary',
                    autoFocus: true,
                    closeOnClick: false,
                    onClick: async ({ close, setBusy }) => {
                      setBusy(true)
                      await wait(700)
                      close('access')
                    },
                  },
                ],
              },
            })
            void h.result.then((r) => r && toast.info(t('Причина сохранена', 'Reason saved'), { description: r === 'parts' ? parts : access }))
          }}
        >
          {t('Своё окно', 'Custom dialog')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void modals.alert({ title: t('Глобальный API', 'Global API'), message: t('modals.alert вызван без хука.', 'modals.alert was called without a hook.') })}
        >
          modals.alert
        </Button>
      </div>
    </Card>
  )
}

function WindowsCard() {
  const { t } = useT()
  const [size, setSize] = useState<ModalSize | null>(null)
  const [busy, setBusy] = useState(false)
  const [assignee, setAssignee] = useState<string | null>('sorokin')
  const [due, setDue] = useState('2026-10-12')
  const [drawer, setDrawer] = useState<'right' | 'left' | null>(null)
  const close = () => setSize(null)
  return (
    <Card
      title={t('Modal и Drawer', 'Modal and Drawer')}
      description={t(
        'Modal - короткая форма или решение поверх страницы, на узком экране - на весь экран. Drawer - детали записи или фильтры сбоку, страница остаётся в контексте.',
        'Modal holds a short form or decision on top of the page and goes full screen on narrow viewports. Drawer shows record details or filters from the side while the page stays in context.',
      )}
    >
      <div className="ev-stack">
        <Subhead>Modal</Subhead>
        <div className={s.row}>
          {(['sm', 'md', 'lg', 'xl'] as ModalSize[]).map((sz) => (
            <Button key={sz} variant={sz === 'md' ? 'primary' : 'secondary'} icon={sz === 'md' ? <Plus size={15} /> : undefined} onClick={() => setSize(sz)}>
              {sz === 'md' ? t('Новая задача', 'New task') : `size="${sz}"`}
            </Button>
          ))}
        </div>
        <Subhead>Drawer</Subhead>
        <div className={s.row}>
          <Button icon={<ClipboardList size={15} />} onClick={() => setDrawer('right')}>
            {t('Карточка отгрузки', 'Shipment details')}
          </Button>
          <Button variant="ghost" onClick={() => setDrawer('left')}>
            {t('Слева', 'From the left')}
          </Button>
        </div>
      </div>

      <Modal
        open={size !== null}
        onClose={close}
        size={size ?? 'md'}
        busy={busy}
        title={t('Новая задача', 'New task')}
        subtitle={t('Объект Долина-1, линия сборки №3', 'Valley-1 facility, assembly line 3')}
        footerLeft={busy ? <span className="ev-muted">{t('Сохранение...', 'Saving...')}</span> : null}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              {t('Отмена', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true)
                await wait(900)
                setBusy(false)
                close()
                toast.success(t('Задача создана', 'Task created'), { description: 'TSK-1043' })
              }}
            >
              {t('Создать', 'Create')}
            </Button>
          </>
        }
      >
        <div className="ev-stack">
          <Field label={t('Исполнитель', 'Assignee')} required>
            <Select
              value={assignee}
              onChange={setAssignee}
              options={[
                { value: 'sorokin', label: t('Глеб Сорокин', 'Gleb Sorokin'), hint: t('Инженер', 'Engineer') },
                { value: 'lebedeva', label: t('Ирина Лебедева', 'Irina Lebedeva'), hint: t('Руководитель смены', 'Shift supervisor') },
                { value: 'rakhimov', label: t('Тимур Рахимов', 'Timur Rakhimov'), hint: t('Оператор линии', 'Line operator') },
              ]}
            />
          </Field>
          <Field label={t('Срок', 'Due date')}>
            <DateField value={due} onChange={setDue} min="2026-10-08" />
          </Field>
          <Field label={t('Описание', 'Description')}>
            <Textarea autoResize rows={3} placeholder={t('Что сделать', 'What needs to be done')} />
          </Field>
          <Callout tone="info" icon={false}>
            {t(
              'Во время сохранения окно нельзя закрыть: крестик, Escape и подложка заблокированы.',
              'The dialog cannot be closed while saving: the close button, Escape and the backdrop are disabled.',
            )}
          </Callout>
        </div>
      </Modal>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        side={drawer ?? 'right'}
        width={drawer === 'left' ? 360 : 480}
        title={t('Отгрузка SHP-20418', 'Shipment SHP-20418')}
        subtitle={t('Долина-1 - Застава', 'Valley-1 - Outpost')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawer(null)}>
              {t('Закрыть', 'Close')}
            </Button>
            <Button variant="primary" icon={<Download size={15} />}>
              {t('Накладная PDF', 'Waybill PDF')}
            </Button>
          </>
        }
      >
        <KeyValueList
          items={[
            { key: 's', label: t('Статус', 'Status'), value: <StatusPill tone="info">{t('В пути', 'In transit')}</StatusPill> },
            { key: 'd', label: t('Водитель', 'Driver'), value: t('Тимур Рахимов', 'Timur Rakhimov') },
            { key: 'v', label: t('Транспорт', 'Vehicle'), value: t('Тягач, О245РК77', 'Truck, O245RK77'), mono: true },
            { key: 'w', label: t('Вес', 'Weight'), value: t('2 340 кг', '2,340 kg') },
            { key: 'p', label: t('Мест', 'Packages'), value: '18' },
            { key: 'e', label: t('Прибытие', 'Arrival'), value: '09.10.2026', hint: t('Окно 10:00 - 14:00', 'Window 10:00 - 14:00') },
            { key: 'c', label: t('Комментарий', 'Comment'), value: null },
          ]}
        />
      </Drawer>
    </Card>
  )
}

function StatesCard() {
  const { t } = useT()
  const [retrying, setRetrying] = useState(false)
  return (
    <>
      <Card
        title="EmptyState"
        description={t(
          'Пустой список или раздел: что здесь появится и как начать. compact - внутри таблиц и карточек.',
          'An empty list or section: what will appear here and how to get started. compact is for use inside tables and cards.',
        )}
      >
        <div className="ev-stack">
          <EmptyState
            icon={<PackageSearch size={26} />}
            title={t('Отгрузок пока нет', 'No shipments yet')}
            description={t('Отгрузки появятся после первой заявки со склада объекта.', 'Shipments will appear after the first request from the facility warehouse.')}
            actions={<Button variant="primary">{t('Создать заявку', 'Create request')}</Button>}
          />
          <EmptyState compact title={t('Ничего не найдено', 'Nothing found')} description={t('Измените условия поиска.', 'Try a different search.')} />
        </div>
      </Card>
      <Card
        title="ErrorState"
        description={t(
          'Ошибка загрузки: причина, «Повторить» и выход со страницы - тупиков нет.',
          'A loading error: the cause, a Retry button and a way out of the page, so there are no dead ends.',
        )}
      >
        <div className="ev-stack">
          <ErrorState
            message={t('Сервер склада временно недоступен. Повторите попытку через минуту.', 'The warehouse server is temporarily unavailable. Try again in a minute.')}
            retrying={retrying}
            onRetry={async () => {
              setRetrying(true)
              await wait(1200)
              setRetrying(false)
            }}
            actions={<Button variant="ghost">{t('К списку складов', 'Back to warehouses')}</Button>}
          />
          <ErrorState compact title={t('Не удалось загрузить график', 'Could not load the chart')} onRetry={() => toast.info(t('Повтор', 'Retrying'))} />
        </div>
      </Card>
      <Card
        title={t('Загрузка', 'Loading')}
        description={t(
          'Spinner - в кнопках и строках; Skeleton - форма будущего содержимого; LoadingBlock - вся область целиком.',
          'Spinner goes in buttons and rows, Skeleton outlines the content to come, and LoadingBlock covers a whole area.',
        )}
      >
        <div className="ev-stack">
          <div className={s.row}>
            <Spinner />
            <Spinner size={22} label={t('Синхронизация', 'Syncing')} />
            <Skeleton width={120} height={24} radius="var(--ev-radius-sm)" />
            <Skeleton width={32} height={32} radius="var(--ev-radius-pill)" />
          </div>
          <SkeletonText lines={3} />
          <LoadingBlock minHeight={96} label={t('Загрузка остатков', 'Loading stock')} />
        </div>
      </Card>
    </>
  )
}

export function FeedbackSection() {
  return (
    <div className={s.section}>
      <CalloutsCard />
      <div className={`${s.grid} ${s.gridWide}`}>
        <ToastsCard />
        <ModalsCard />
      </div>
      <WindowsCard />
      <div className={s.grid}>
        <StatesCard />
      </div>
    </div>
  )
}
