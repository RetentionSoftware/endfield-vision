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
import { Subhead } from './parts'
import s from './vision.module.css'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function CalloutsCard() {
  return (
    <Card title="Callout" description="Сообщение внутри страницы: пояснение к разделу, предупреждение, итог операции. Предупреждение и ошибка объявляются скринридером (role=alert).">
      <div className="ev-stack">
        <Callout tone="info" title="Остатки обновляются раз в 15 минут">
          Данные по складу Застава приходят с задержкой: узел связи работает в резервном режиме.
        </Callout>
        <Callout tone="success">Инвентаризация склада Долина-1 закрыта. Расхождений нет.</Callout>
        <Callout tone="warning" title="Приёмка приостановлена" actions={<Button size="sm">Подробнее</Button>}>
          На складе Хребет заполнено 92% мест хранения. Новые поставки направляются в Логистический узел.
        </Callout>
        <Callout tone="danger" title="Не удалось провести отгрузку SHP-20418">
          Позиция SKU-40217 списана другим документом. Обновите состав отгрузки.
        </Callout>
        <Callout tone="neutral" icon={false}>
          Нейтральная плашка без иконки - для справочного текста в формах.
        </Callout>
      </div>
    </Card>
  )
}

function ToastsCard() {
  const t = useToast()
  return (
    <Card title="Уведомления" description="toast - короткий итог действия, не требующий ответа. Ошибки живут дольше и могут нести действие. Toaster ставится один раз в корне (или ToastProvider вокруг приложения); useToast() - тот же API в хуке.">
      <div className="ev-stack">
        <div className={s.row}>
          <Button onClick={() => toast.success('Изменения сохранены')}>Успех</Button>
          <Button onClick={() => toast.info('Отчёт формируется', { description: 'Ссылка придёт во «Входящие»' })}>Сведения</Button>
          <Button onClick={() => toast.warning('Проверьте остатки', { description: 'Позиций ниже минимума: 37' })}>Предупреждение</Button>
          <Button
            onClick={() =>
              toast.error('Не удалось сохранить', {
                description: 'Нет связи с сервером. Проверьте подключение.',
                action: { label: 'Повторить', onClick: () => toast.success('Сохранено') },
              })
            }
          >
            Ошибка с действием
          </Button>
        </div>
        <div className={s.row}>
          <Button variant="ghost" onClick={() => t.show({ title: 'Синхронизация склада', description: 'Закроется только вручную', tone: 'info', duration: null })}>
            Без автозакрытия
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              for (let i = 1; i <= 6; i++) t.info(`Задача TSK-10${40 + i} назначена`)
            }}
          >
            Пачка из шести
          </Button>
          <Button variant="ghost" onClick={() => t.dismissAll()}>
            Убрать все
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ModalsCard() {
  const m = useModals()
  return (
    <Card title="useModals" description="Императивные окна: confirm - подтверждение с ожиданием операции, alert - сообщение, open - своё окно с кнопками. Требует ModalsProvider; modals - тот же API вне компонентов.">
      <div className={s.row}>
        <Button
          variant="danger"
          icon={<Trash2 size={15} />}
          onClick={async () => {
            const ok = await m.confirm({
              title: 'Списать позицию?',
              message: 'Фильтр гидравлический (SKU-40200), 12 шт. Списание попадёт в журнал и не отменяется.',
              okLabel: 'Списать',
              okVariant: 'danger',
              onOk: () => wait(900),
            })
            if (ok) toast.success('Позиция списана')
          }}
        >
          Подтверждение
        </Button>
        <Button onClick={() => void m.alert({ title: 'Смена закрыта', message: 'Отчёт по смене отправлен руководителю объекта.' })}>Сообщение</Button>
        <Button
          onClick={() => {
            const h = m.open<string>({
              title: 'Причина переноса',
              subtitle: 'Задача TSK-1042',
              size: 'sm',
              body: <span className="ev-secondary">Выберите причину: она попадёт в историю задачи.</span>,
              footer: {
                left: <span className="ev-muted">Шаг 1 из 1</span>,
                buttons: [
                  { label: 'Нет запчастей', result: 'parts' },
                  {
                    label: 'Нет доступа',
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
            void h.result.then((r) => r && toast.info('Причина сохранена', { description: r === 'parts' ? 'Нет запчастей' : 'Нет доступа' }))
          }}
        >
          Своё окно
        </Button>
        <Button variant="ghost" onClick={() => void modals.alert({ title: 'Глобальный API', message: 'modals.alert вызван без хука.' })}>
          modals.alert
        </Button>
      </div>
    </Card>
  )
}

function WindowsCard() {
  const [size, setSize] = useState<ModalSize | null>(null)
  const [busy, setBusy] = useState(false)
  const [assignee, setAssignee] = useState<string | null>('sorokin')
  const [due, setDue] = useState('2026-10-12')
  const [drawer, setDrawer] = useState<'right' | 'left' | null>(null)
  const close = () => setSize(null)
  return (
    <Card title="Modal и Drawer" description="Modal - короткая форма или решение поверх страницы, на узком экране - на весь экран. Drawer - детали записи или фильтры сбоку, страница остаётся в контексте.">
      <div className="ev-stack">
        <Subhead>Modal</Subhead>
        <div className={s.row}>
          {(['sm', 'md', 'lg', 'xl'] as ModalSize[]).map((sz) => (
            <Button key={sz} variant={sz === 'md' ? 'primary' : 'secondary'} icon={sz === 'md' ? <Plus size={15} /> : undefined} onClick={() => setSize(sz)}>
              {sz === 'md' ? 'Новая задача' : `size="${sz}"`}
            </Button>
          ))}
        </div>
        <Subhead>Drawer</Subhead>
        <div className={s.row}>
          <Button icon={<ClipboardList size={15} />} onClick={() => setDrawer('right')}>
            Карточка отгрузки
          </Button>
          <Button variant="ghost" onClick={() => setDrawer('left')}>
            Слева
          </Button>
        </div>
      </div>

      <Modal
        open={size !== null}
        onClose={close}
        size={size ?? 'md'}
        busy={busy}
        title="Новая задача"
        subtitle="Объект Долина-1, линия сборки №3"
        footerLeft={busy ? <span className="ev-muted">Сохранение...</span> : null}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true)
                await wait(900)
                setBusy(false)
                close()
                toast.success('Задача создана', { description: 'TSK-1043' })
              }}
            >
              Создать
            </Button>
          </>
        }
      >
        <div className="ev-stack">
          <Field label="Исполнитель" required>
            <Select
              value={assignee}
              onChange={setAssignee}
              options={[
                { value: 'sorokin', label: 'Глеб Сорокин', hint: 'Инженер' },
                { value: 'lebedeva', label: 'Ирина Лебедева', hint: 'Руководитель смены' },
                { value: 'rakhimov', label: 'Тимур Рахимов', hint: 'Оператор линии' },
              ]}
            />
          </Field>
          <Field label="Срок">
            <DateField value={due} onChange={setDue} min="2026-10-08" />
          </Field>
          <Field label="Описание">
            <Textarea autoResize rows={3} placeholder="Что сделать" />
          </Field>
          <Callout tone="info" icon={false}>
            Во время сохранения окно нельзя закрыть: крестик, Escape и подложка заблокированы.
          </Callout>
        </div>
      </Modal>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        side={drawer ?? 'right'}
        width={drawer === 'left' ? 360 : 480}
        title="Отгрузка SHP-20418"
        subtitle="Долина-1 - Застава"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawer(null)}>
              Закрыть
            </Button>
            <Button variant="primary" icon={<Download size={15} />}>
              Накладная PDF
            </Button>
          </>
        }
      >
        <KeyValueList
          items={[
            { key: 's', label: 'Статус', value: <StatusPill tone="info">В пути</StatusPill> },
            { key: 'd', label: 'Водитель', value: 'Тимур Рахимов' },
            { key: 'v', label: 'Транспорт', value: 'Тягач, О245РК77', mono: true },
            { key: 'w', label: 'Вес', value: '2 340 кг' },
            { key: 'p', label: 'Мест', value: '18' },
            { key: 'e', label: 'Прибытие', value: '09.10.2026', hint: 'Окно 10:00 - 14:00' },
            { key: 'c', label: 'Комментарий', value: null },
          ]}
        />
      </Drawer>
    </Card>
  )
}

function StatesCard() {
  const [retrying, setRetrying] = useState(false)
  return (
    <>
      <Card title="EmptyState" description="Пустой список или раздел: что здесь появится и как начать. compact - внутри таблиц и карточек.">
        <div className="ev-stack">
          <EmptyState
            icon={<PackageSearch size={26} />}
            title="Отгрузок пока нет"
            description="Отгрузки появятся после первой заявки со склада объекта."
            actions={<Button variant="primary">Создать заявку</Button>}
          />
          <EmptyState compact title="Ничего не найдено" description="Измените условия поиска." />
        </div>
      </Card>
      <Card title="ErrorState" description="Ошибка загрузки: причина, «Повторить» и выход со страницы - тупиков нет.">
        <div className="ev-stack">
          <ErrorState
            message="Сервер склада временно недоступен. Повторите попытку через минуту."
            retrying={retrying}
            onRetry={async () => {
              setRetrying(true)
              await wait(1200)
              setRetrying(false)
            }}
            actions={<Button variant="ghost">К списку складов</Button>}
          />
          <ErrorState compact title="Не удалось загрузить график" onRetry={() => toast.info('Повтор')} />
        </div>
      </Card>
      <Card title="Загрузка" description="Spinner - в кнопках и строках; Skeleton - форма будущего содержимого; LoadingBlock - вся область целиком.">
        <div className="ev-stack">
          <div className={s.row}>
            <Spinner />
            <Spinner size={22} label="Синхронизация" />
            <Skeleton width={120} height={24} radius="var(--ev-radius-sm)" />
            <Skeleton width={32} height={32} radius="var(--ev-radius-pill)" />
          </div>
          <SkeletonText lines={3} />
          <LoadingBlock minHeight={96} label="Загрузка остатков" />
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
