'use client'

import {
  Button,
  Card,
  ChatThread,
  Composer,
  ConnectionStatus,
  Lightbox,
  NotificationCenter,
  NotificationList,
  Switch,
  toast,
  type ChatAttachment,
  type ChatAuthor,
  type ChatMessageData,
  type ChatMessageStatus,
  type ComposerPayload,
  type ConnectionState,
  type LightboxImage,
  type NotificationItem,
} from 'endfield-vision'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'
import { Subhead } from '../parts'

/*
 * Коммуникации: центр уведомлений, тост с несколькими действиями, переписка
 * в духе чата поддержки (лента, вложения, просмотр изображений, поле ввода),
 * состояние связи. Время - от фиксированного «сейчас», демо-изображения -
 * SVG, собранные в коде: серверный и клиентский рендер совпадают.
 */

/** Опорное «сейчас» витрины: 9 октября 2026, 12:00 по местному времени. */
const DEMO_NOW = new Date(2026, 9, 9, 12, 0)

/** Момент относительно DEMO_NOW: день (0 - сегодня, -1 - вчера), часы и минуты. */
function at(day: number, hours: number, minutes: number): Date {
  return new Date(2026, 9, 9 + day, hours, minutes)
}

/* ------------------------------------------------------------------ */
/* Демо-изображения: условные снимки экрана в SVG                      */
/* ------------------------------------------------------------------ */

/*
 * Цвета ниже - содержимое картинок (как пиксели фотографии), а не оформление
 * интерфейса: токены темы внутри data URI недоступны.
 */
const SHOT_PALETTE = [
  { bg: '#141a24', panel: '#1d2533', accent: '#4f8cff', soft: '#2a3446' },
  { bg: '#16201c', panel: '#1f2c27', accent: '#3fbf86', soft: '#2b3b35' },
  { bg: '#231b14', panel: '#30251b', accent: '#f0a33a', soft: '#3d3024' },
  { bg: '#1f1626', panel: '#2a1f33', accent: '#a77bf3', soft: '#372a44' },
]

/** Условный снимок экрана: шапка, боковая панель, строки и график. */
function screenshot(variant: number, caption: string): string {
  const c = SHOT_PALETTE[variant % SHOT_PALETTE.length]!
  const bars = [52, 88, 64, 120, 96, 140, 110]
    .map(
      (h, i) =>
        `<rect x="${330 + i * 38}" y="${360 - h}" width="24" height="${h}" rx="3" fill="${i === 5 ? c.accent : c.soft}"/>`,
    )
    .join('')
  const rows = [0, 1, 2, 3]
    .map(
      (i) =>
        `<rect x="330" y="${392 + i * 30}" width="${300 - i * 40}" height="12" rx="6" fill="${c.soft}"/>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
<rect width="800" height="560" fill="${c.bg}"/>
<rect width="800" height="48" fill="${c.panel}"/>
<circle cx="28" cy="24" r="8" fill="${c.accent}"/>
<rect x="48" y="18" width="140" height="12" rx="6" fill="${c.soft}"/>
<rect x="0" y="48" width="280" height="512" fill="${c.panel}"/>
${[0, 1, 2, 3, 4].map((i) => `<rect x="24" y="${84 + i * 40}" width="${200 - i * 18}" height="14" rx="7" fill="${i === 1 ? c.accent : c.soft}"/>`).join('')}
<rect x="310" y="72" width="466" height="160" rx="10" fill="${c.panel}"/>
<text x="334" y="120" font-family="sans-serif" font-size="26" font-weight="600" fill="${c.accent}">${caption}</text>
<rect x="334" y="146" width="260" height="12" rx="6" fill="${c.soft}"/>
<rect x="334" y="172" width="200" height="12" rx="6" fill="${c.soft}"/>
${bars}${rows}
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const SHOTS = [
  screenshot(0, 'ERR 504'),
  screenshot(1, 'SYNC OK'),
  screenshot(2, 'QUEUE 12'),
  screenshot(3, 'v2.14'),
]

/* ------------------------------------------------------------------ */
/* Центр уведомлений                                                   */
/* ------------------------------------------------------------------ */

interface DemoNotice {
  id: string
  title: Bi
  description?: Bi
  time: Date
  tone?: NotificationItem['tone']
  read?: boolean
  actions?: Array<{ label: Bi; message: Bi }>
}

const SEED_NOTICES: DemoNotice[] = [
  {
    id: 'n1',
    title: bi('Новое обращение 1042', 'New request 1042'),
    description: bi(
      'Глеб Сорокин: не проходит синхронизация склада Долина-1',
      'Gleb Sorokin: Valley-1 warehouse sync keeps failing',
    ),
    time: at(0, 11, 55),
    tone: 'info',
    actions: [
      {
        label: bi('Взять в работу', 'Take it'),
        message: bi('Обращение 1042 назначено вам', 'Request 1042 is assigned to you'),
      },
      { label: bi('Позже', 'Later'), message: bi('Напомним через час', 'We will remind you in an hour') },
    ],
  },
  {
    id: 'n2',
    title: bi('Сбой отгрузки на складе Застава', 'Shipment failure at Outpost warehouse'),
    description: bi('Три накладные не переданы перевозчику', 'Three waybills were not sent to the carrier'),
    time: at(0, 11, 20),
    tone: 'danger',
    actions: [
      {
        label: bi('Повторить передачу', 'Resend'),
        message: bi('Накладные отправлены повторно', 'Waybills resent'),
      },
    ],
  },
  {
    id: 'n3',
    title: bi('Отчёт за смену готов', 'Shift report is ready'),
    time: at(0, 9, 5),
    tone: 'success',
  },
  {
    id: 'n4',
    title: bi('Срок наряда Н-318 истекает завтра', 'Work order WO-318 is due tomorrow'),
    description: bi('Исполнитель - Павел Гусев', 'Assignee: Pavel Gusev'),
    time: at(-1, 17, 40),
    tone: 'warning',
    read: true,
  },
  {
    id: 'n5',
    title: bi('Плановые работы 10 октября', 'Scheduled maintenance on October 10'),
    description: bi(
      'С 02:00 до 04:00 диспетчерская недоступна',
      'The dispatch console is unavailable from 02:00 to 04:00',
    ),
    time: at(-3, 10, 0),
    read: true,
  },
]

const EXTRA_NOTICES: Array<Omit<DemoNotice, 'id' | 'time'>> = [
  {
    title: bi('Новый комментарий в обращении 1042', 'New comment on request 1042'),
    description: bi('Ирина Лебедева ответила клиенту', 'Irina Lebedeva replied to the customer'),
    tone: 'info',
  },
  {
    title: bi('Остатки ниже порога', 'Stock below threshold'),
    description: bi('Склад Хребет: 4 позиции', 'Ridge warehouse: 4 items'),
    tone: 'warning',
  },
  {
    title: bi('Связь с узлом Порт Ясный восстановлена', 'Connection to Clearwater Port restored'),
    tone: 'success',
  },
]

function NotificationsCard() {
  const { t, tx } = useT()
  const [notices, setNotices] = useState<DemoNotice[]>(SEED_NOTICES)
  const [added, setAdded] = useState(0)

  const items = useMemo<NotificationItem[]>(
    () =>
      notices.map((n) => ({
        id: n.id,
        title: tx(n.title),
        description: n.description ? tx(n.description) : undefined,
        time: n.time,
        tone: n.tone,
        read: n.read,
        actions: n.actions?.map((a) => ({ label: tx(a.label), onClick: () => toast.success(tx(a.message)) })),
      })),
    [notices, tx],
  )

  // Список от компонента -> демо-записи (двуязычные поля берутся из прежних записей по id).
  const onItemsChange = (next: NotificationItem[]) => {
    const byId = new Map(notices.map((n) => [n.id, n]))
    setNotices(
      next.flatMap((it) => {
        const n = byId.get(it.id)
        return n ? [{ ...n, read: it.read }] : []
      }),
    )
  }

  const add = () => {
    const extra = EXTRA_NOTICES[added % EXTRA_NOTICES.length]!
    setNotices((prev) => [{ ...extra, id: `x${added}`, time: DEMO_NOW }, ...prev])
    setAdded((n) => n + 1)
  }

  return (
    <Card
      title="NotificationCenter"
      description={t(
        'Колокольчик со счётчиком непрочитанных и история уведомлений: группы по дням, точка непрочитанного (клик - отметить прочитанным), удаление, свои действия, «Прочитать все» и «Очистить». Состояние хранится снаружи: items + onItemsChange или отдельные колбэки onRead, onReadAll, onRemove, onClear. Панель - поповер или шторка (variant="drawer"); NotificationList - та же панель без контейнера.',
        'A bell with an unread count and the notification history: grouped by day, an unread dot (click to mark as read), removal, custom actions, "Mark all as read" and "Clear all". State lives outside: items + onItemsChange, or separate onRead, onReadAll, onRemove, onClear callbacks. The panel is a popover or a drawer (variant="drawer"); NotificationList is the same panel without a container.',
      )}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={add}>
            {t('Новое уведомление', 'New notification')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNotices(SEED_NOTICES)}>
            {t('Сбросить', 'Reset')}
          </Button>
        </>
      }
    >
      <div
        className="ev-grid"
        style={{ '--ev-grid-min': '320px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}
      >
        <div className="ev-stack">
          <Subhead>{t('В шапке приложения', 'In the app header')}</Subhead>
          <div className="ev-row">
            <NotificationCenter
              items={items}
              onItemsChange={onItemsChange}
              now={DEMO_NOW}
              onItemClick={(it) => toast.info(String(it.title))}
            />
            <span className="ev-secondary">{t('поповер', 'popover')}</span>
            <NotificationCenter variant="drawer" items={items} onItemsChange={onItemsChange} now={DEMO_NOW} />
            <span className="ev-secondary">{t('шторка', 'drawer')}</span>
          </div>
          <span className="ev-muted">
            {t(
              'Оба колокольчика и панель справа работают с одним списком: отметка или удаление в одном месте видны везде.',
              'Both bells and the panel on the right share one list: marking or removing an item in one place shows up everywhere.',
            )}
          </span>
        </div>
        <div className="ev-stack">
          <Subhead>NotificationList</Subhead>
          <div style={{ background: 'var(--ev-surface-nested)', borderRadius: 'var(--ev-radius-md)' }}>
            <NotificationList items={items} onItemsChange={onItemsChange} now={DEMO_NOW} />
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Тост с несколькими действиями                                       */
/* ------------------------------------------------------------------ */

function ToastActionsCard() {
  const { t } = useT()
  const assigned = () =>
    toast.show({
      id: 'pg-toast-assign',
      tone: 'info',
      title: t('Вам назначено обращение 1042', 'Request 1042 is assigned to you'),
      description: t(
        'Глеб Сорокин, склад Долина-1. Ответ нужен до 14:00.',
        'Gleb Sorokin, Valley-1 warehouse. A reply is due by 14:00.',
      ),
      duration: null,
      actions: [
        {
          label: t('Открыть', 'Open'),
          onClick: () => toast.success(t('Обращение открыто', 'Request opened')),
          variant: 'primary',
        },
        {
          label: t('Передать', 'Reassign'),
          onClick: () => toast.info(t('Выберите специалиста', 'Choose a specialist')),
        },
        { label: t('Позже', 'Later'), onClick: () => undefined },
      ],
    })
  const archived = () =>
    toast.success(t('Наряд Н-318 перенесён в архив', 'Work order WO-318 moved to archive'), {
      id: 'pg-toast-archive',
      actions: [
        {
          label: t('Отменить', 'Undo'),
          onClick: () => toast.info(t('Наряд возвращён', 'Work order restored')),
        },
        { label: t('Открыть архив', 'Open archive'), onClick: () => undefined },
      ],
    })
  return (
    <Card
      title={t('toast: несколько действий', 'toast: several actions')}
      description={t(
        'actions - строка небольших кнопок под описанием: первая secondary, остальные ghost, у каждой можно задать variant. Нажатие закрывает уведомление. Одиночный action по-прежнему рисуется текстовой кнопкой.',
        'actions renders a row of small buttons under the description: the first is secondary, the rest are ghost, and each can set its own variant. Clicking closes the toast. A single action still renders as a text button.',
      )}
    >
      <div className="ev-row">
        <Button onClick={assigned}>{t('Назначение с выбором', 'Assignment with choices')}</Button>
        <Button variant="ghost" onClick={archived}>
          {t('Архив с отменой', 'Archive with undo')}
        </Button>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Переписка                                                           */
/* ------------------------------------------------------------------ */

const ME = 'op-irina'

const AUTHORS: Record<string, { name: Bi; role?: Bi; tone?: ChatAuthor['tone'] }> = {
  [ME]: { name: bi('Ирина Лебедева', 'Irina Lebedeva'), role: bi('Оператор', 'Operator') },
  'op-timur': {
    name: bi('Тимур Ахмедов', 'Timur Akhmedov'),
    role: bi('Начальник смены', 'Shift supervisor'),
    tone: 'violet',
  },
  customer: {
    name: bi('Глеб Сорокин', 'Gleb Sorokin'),
    role: bi('Склад Долина-1', 'Valley-1 warehouse'),
    tone: 'info',
  },
}

interface DemoMessage {
  id: string
  kind?: 'system'
  author?: string
  text?: Bi | string
  time: Date
  edited?: boolean
  status?: ChatMessageStatus
  attachments?: Array<Omit<ChatAttachment, 'name'> & { name: Bi | string }>
}

const LOG_TEXT =
  'data:text/plain;charset=utf-8,' + encodeURIComponent('sync 2026-10-09 09:58:12 ERR 504 upstream timeout\n')

const SEED_MESSAGES: DemoMessage[] = [
  {
    id: 's1',
    kind: 'system',
    text: bi('Создано обращение 1042', 'Request 1042 created'),
    time: at(-1, 18, 0),
  },
  {
    id: 'm1',
    author: 'customer',
    text: bi(
      'Добрый вечер. С обеда не проходит синхронизация остатков склада Долина-1, в журнале ошибка 504.',
      'Good evening. Valley-1 stock sync has been failing since lunch, the log shows error 504.',
    ),
    time: at(-1, 18, 1),
  },
  {
    id: 's2',
    kind: 'system',
    text: bi(
      'Тимур Ахмедов назначил обращение на Ирину Лебедеву',
      'Timur Akhmedov assigned the request to Irina Lebedeva',
    ),
    time: at(-1, 18, 20),
  },
  {
    id: 'm2',
    author: 'op-timur',
    text: bi(
      'Ирина, посмотри утром, ночью идут плановые работы.',
      'Irina, please take a look in the morning, there is scheduled maintenance tonight.',
    ),
    time: at(-1, 18, 21),
  },
  {
    id: 'm3',
    author: ME,
    text: bi(
      'Здравствуйте, Глеб. Пришлите, пожалуйста, снимок экрана с ошибкой.',
      'Hello Gleb. Please send a screenshot of the error.',
    ),
    time: at(0, 9, 40),
    status: 'sent',
  },
  {
    id: 'm4',
    author: 'customer',
    text: bi('Вот, два экрана: ошибка и очередь.', 'Here are two screens: the error and the queue.'),
    time: at(0, 9, 58),
    attachments: [
      { id: 'a1', name: 'error-504.svg', url: SHOTS[0]!, alt: 'ERR 504' },
      { id: 'a2', name: 'queue.svg', url: SHOTS[2]!, alt: 'QUEUE 12' },
    ],
  },
  {
    id: 'm5',
    author: 'customer',
    text: bi('И выгрузка журнала.', 'And the log export.'),
    time: at(0, 9, 59),
    attachments: [{ id: 'a3', name: 'sync-log.txt', url: LOG_TEXT, kind: 'file', size: 18_432 }],
  },
  {
    id: 'm6',
    author: ME,
    text: bi(
      'Спасибо. Перезапустила обмен, проверяю.',
      'Thanks. I restarted the exchange and I am checking now.',
    ),
    time: at(0, 10, 12),
    edited: true,
    status: 'sent',
  },
  {
    id: 's3',
    kind: 'system',
    text: bi('Приоритет повышен до «Высокий»', 'Priority raised to High'),
    time: at(0, 10, 13),
  },
  {
    id: 'm7',
    author: 'customer',
    text: bi(
      'Остатки пошли, вижу свежие данные. Спасибо!',
      'Stock is syncing again, I can see fresh data. Thank you!',
    ),
    time: at(0, 11, 48),
    attachments: [{ id: 'a4', name: 'sync-ok.svg', url: SHOTS[1]!, alt: 'SYNC OK' }],
  },
]

const INCOMING: Bi[] = [
  bi(
    'Ещё вопрос: можно ли ускорить обмен до 5 минут?',
    'One more question: can the exchange run every 5 minutes?',
  ),
  bi('И нужен доступ к журналу для Марии Котовой.', 'Also, Maria Kotova needs access to the log.'),
  bi('Если что, я на связи до 18:00.', 'I am available until 18:00 if needed.'),
]

function SupportChatCard() {
  const { t, tx } = useT()
  const [messages, setMessages] = useState<DemoMessage[]>(SEED_MESSAGES)
  const [failNext, setFailNext] = useState(false)
  const [incoming, setIncoming] = useState(0)
  const seq = useRef(0)
  const timers = useRef<number[]>([])
  const urls = useRef<string[]>([])

  // Таймеры «отправки» и object URL отправленных картинок - только до размонтирования витрины.
  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id)
      for (const url of urls.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const nextTime = (list: DemoMessage[]) => {
    const last = list[list.length - 1]
    return new Date(Math.max(last ? last.time.getTime() : 0, DEMO_NOW.getTime()) + 60_000)
  }

  const setStatus = (id: string, status: ChatMessageStatus) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))

  const deliver = (id: string, fail: boolean) => {
    timers.current.push(window.setTimeout(() => setStatus(id, fail ? 'failed' : 'sent'), 900))
  }

  const onSend = ({ text, files }: ComposerPayload) => {
    seq.current += 1
    const id = `local-${seq.current}`
    const attachments = files.map((file, i) => {
      const url = URL.createObjectURL(file)
      urls.current.push(url)
      return {
        id: `${id}-${i}`,
        name: file.name,
        url,
        size: file.size,
        kind: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
      }
    })
    setMessages((prev) => [
      ...prev,
      { id, author: ME, text, time: nextTime(prev), status: 'sending', attachments },
    ])
    deliver(id, failNext)
  }

  const receive = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `in-${incoming}`,
        author: 'customer',
        text: INCOMING[incoming % INCOMING.length],
        time: nextTime(prev),
      },
    ])
    setIncoming((n) => n + 1)
  }

  const data = useMemo<ChatMessageData[]>(
    () =>
      messages.map((m) => {
        const a = m.author ? AUTHORS[m.author] : undefined
        return {
          id: m.id,
          kind: m.kind,
          author:
            m.author && a
              ? { id: m.author, name: tx(a.name), role: a.role ? tx(a.role) : undefined, tone: a.tone }
              : undefined,
          text: m.text === undefined ? undefined : tx(m.text),
          time: m.time,
          edited: m.edited,
          status: m.status,
          attachments: m.attachments?.map((x) => ({ ...x, name: tx(x.name) })),
        }
      }),
    [messages, tx],
  )

  return (
    <Card
      title="ChatThread, ChatMessage, Composer"
      description={t(
        'Переписка по обращению: свои сообщения справа, подряд идущие сообщения автора в пределах 5 минут собираются в группу, системные события - по центру, разделители дней и «Новые сообщения». Изображения открываются в Lightbox. Поле: Enter - отправить, Shift+Enter - перенос, файлы - кнопкой, вставкой скриншота из буфера и перетаскиванием. Если прокрутить ленту вверх и получить сообщение, появится кнопка «Новые сообщения».',
        'A request conversation: your messages are on the right, consecutive messages from one author within 5 minutes form a group, system events sit in the center, with day separators and a "New messages" divider. Images open in Lightbox. The composer: Enter sends, Shift+Enter adds a line break, files come from the button, a pasted screenshot or drag and drop. Scroll the thread up and receive a message to see the "New messages" button.',
      )}
      actions={
        <Button size="sm" variant="ghost" onClick={receive}>
          {t('Входящее сообщение', 'Incoming message')}
        </Button>
      }
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-5)' } as CSSProperties}>
        <div className="ev-row" style={{ justifyContent: 'space-between' }}>
          <span className="ev-secondary">
            {t(
              'Обращение 1042 - Глеб Сорокин, склад Долина-1',
              'Request 1042 - Gleb Sorokin, Valley-1 warehouse',
            )}
          </span>
          <ConnectionStatus status="online" />
        </div>
        {/* Высоту ленты задаёт контейнер: лента растягивается и прокручивается внутри. */}
        <div style={{ height: 460, display: 'flex', flexDirection: 'column' }}>
          <ChatThread
            messages={data}
            currentUserId={ME}
            unreadFromId="m7"
            now={DEMO_NOW}
            aria-label={t('Переписка по обращению 1042', 'Conversation for request 1042')}
            onRetry={(m) => {
              setStatus(m.id, 'sending')
              deliver(m.id, false)
            }}
          />
        </div>
        <Composer onSend={onSend} maxLength={2000} />
        <Switch
          checked={failNext}
          onChange={setFailNext}
          label={t(
            'Следующая отправка не пройдёт (покажет «Не отправлено» и «Повторить»)',
            'Next send fails (shows "Not sent" and "Try again")',
          )}
        />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Lightbox отдельно                                                   */
/* ------------------------------------------------------------------ */

function LightboxCard() {
  const { t } = useT()
  const [index, setIndex] = useState<number | null>(null)
  const images: LightboxImage[] = [
    {
      src: SHOTS[0]!,
      name: 'error-504.svg',
      alt: t('Ошибка 504 при синхронизации', 'Error 504 during sync'),
    },
    { src: SHOTS[1]!, name: 'sync-ok.svg', alt: t('Синхронизация восстановлена', 'Sync restored') },
    { src: SHOTS[2]!, name: 'queue.svg', alt: t('Очередь обмена', 'Exchange queue') },
    {
      src: SHOTS[3]!,
      name: 'release.svg',
      alt: t('Новая версия диспетчерской', 'New dispatch console release'),
    },
  ]
  return (
    <Card
      title="Lightbox"
      description={t(
        'Полноэкранный просмотр изображений: стрелки и клавиши Влево / Вправо, Escape закрывает, на телефоне - свайп. Счётчик, имя файла, описание и скачивание; фокус заперт внутри и возвращается на миниатюру. loop - листать по кругу.',
        'A full-screen image viewer: arrows and the Left / Right keys, Escape closes it, swipe on phones. Counter, file name, caption and download; focus stays inside and returns to the thumbnail. loop wraps around.',
      )}
    >
      <div className="ev-row" style={{ flexWrap: 'wrap' }}>
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${t('Открыть', 'Open')} ${img.name}`}
            style={{
              width: 132,
              aspectRatio: '10 / 7',
              padding: 0,
              borderRadius: 'var(--ev-radius)',
              overflow: 'hidden',
              cursor: 'zoom-in',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>
      <Lightbox
        images={images}
        open={index !== null}
        index={index ?? 0}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
        loop
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Состояние связи                                                     */
/* ------------------------------------------------------------------ */

const STATES: ConnectionState[] = ['online', 'degraded', 'reconnecting', 'offline']

function ConnectionCard() {
  const { t } = useT()
  const [live, setLive] = useState(0)
  const status = STATES[live % STATES.length]!
  return (
    <Card
      title="ConnectionStatus"
      description={t(
        'Точка и подпись: связь есть, нестабильна, переподключение (пульсирует; при сниженной анимации - без пульса), нет связи. compact - только точка, подпись в подсказке и для скринридера. label и detail - своя подпись и подробности в подсказке, onClick делает индикатор кнопкой. Обёртка - role="status": смена состояния озвучивается.',
        'A dot and a label: connected, unstable, reconnecting (pulses; no pulse with reduced motion), offline. compact shows only the dot, with the label in a tooltip and for screen readers. label and detail set a custom label and tooltip details; onClick turns the indicator into a button. The wrapper has role="status", so state changes are announced.',
      )}
      actions={
        <Button size="sm" variant="ghost" onClick={() => setLive((n) => n + 1)}>
          {t('Сменить состояние', 'Change state')}
        </Button>
      }
    >
      <div
        className="ev-grid"
        style={{ '--ev-grid-min': '220px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}
      >
        <div className="ev-stack">
          <Subhead>{t('Состояния', 'States')}</Subhead>
          {STATES.map((s) => (
            <ConnectionStatus key={s} status={s} />
          ))}
        </div>
        <div className="ev-stack">
          <Subhead>compact</Subhead>
          <div className="ev-row">
            {STATES.map((s) => (
              <ConnectionStatus key={s} status={s} compact />
            ))}
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>{t('Живой индикатор', 'Live indicator')}</Subhead>
          <ConnectionStatus
            status={status}
            label={
              status === 'degraded' ? t('Сервер отвечает медленно', 'Server is responding slowly') : undefined
            }
            detail={
              status === 'online'
                ? t('Пинг 42 мс', 'Ping 42 ms')
                : status === 'offline'
                  ? t('Неудачных проверок подряд: 3', 'Failed checks in a row: 3')
                  : undefined
            }
            onClick={() => toast.info(t('Проверка связи запущена', 'Connection check started'))}
          />
        </div>
      </div>
    </Card>
  )
}

export function CommunicationCards() {
  return (
    <div className="ev-stack">
      <NotificationsCard />
      <ToastActionsCard />
      <SupportChatCard />
      <LightboxCard />
      <ConnectionCard />
    </div>
  )
}
