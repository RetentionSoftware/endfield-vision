import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  buildChatRows,
  ChatAttachments,
  ChatMessage,
  ChatThread,
  Composer,
  dayKey,
  formatDayLabel,
  groupByDay,
  type ChatAuthor,
  type ChatMessageData,
} from '../components/Chat'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { LightboxFrame, Lightbox } from '../components/Lightbox'
import {
  countUnread,
  groupNotificationsByDay,
  NotificationCenter,
  NotificationList,
  type NotificationItem,
} from '../components/NotificationCenter'
import { ToastCard, toast, type ToastItem } from '../components/Toast'
import { renderRu } from './render-ru'

/* Уведомления, переписка, просмотр изображений, состояние связи: чистые помощники и серверный рендер. */

const TZ = 'Europe/Moscow'
const NOW = '2026-10-09T12:00:00+03:00'

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('Дни: dayKey, formatDayLabel, groupByDay', () => {
  it('ключ дня - в заданном поясе', () => {
    expect(dayKey('2026-10-08T22:30:00Z', TZ)).toBe('2026-10-09')
    expect(dayKey('2026-10-08T22:30:00Z', 'UTC')).toBe('2026-10-08')
    expect(dayKey('не дата')).toBe('')
  })

  it('Сегодня, Вчера, дата без года и с годом', () => {
    const opts = { now: NOW, intl: 'ru-RU', today: 'Сегодня', yesterday: 'Вчера', timeZone: TZ }
    expect(formatDayLabel('2026-10-09T08:00:00+03:00', opts)).toBe('Сегодня')
    expect(formatDayLabel('2026-10-08T23:59:00+03:00', opts)).toBe('Вчера')
    expect(formatDayLabel('2026-10-01T10:00:00+03:00', opts)).toBe('1 октября')
    expect(formatDayLabel('2025-12-31T10:00:00+03:00', opts)).toMatch(/31 декабря 2025/)
  })

  it('без now - дата с годом, без «Сегодня»', () => {
    expect(
      formatDayLabel('2026-10-09T08:00:00+03:00', {
        intl: 'en-US',
        today: 'Today',
        yesterday: 'Yesterday',
        timeZone: TZ,
      }),
    ).toBe('October 9, 2026')
  })

  it('groupByDay: порядок первого появления, некорректные даты пропущены', () => {
    const groups = groupByDay(
      [
        { id: 'a', at: '2026-10-09T10:00:00+03:00' },
        { id: 'b', at: '2026-10-08T10:00:00+03:00' },
        { id: 'c', at: 'нет' },
        { id: 'd', at: '2026-10-09T09:00:00+03:00' },
      ],
      (x) => x.at,
      TZ,
    )
    expect(groups.map((g) => g.key)).toEqual(['2026-10-09', '2026-10-08'])
    expect(groups[0]!.items.map((x) => x.id)).toEqual(['a', 'd'])
  })
})

/* ------------------------------------------------------------------ */

const NOTICES: NotificationItem[] = [
  { id: 'n1', title: 'Отчёт готов', time: '2026-10-08T17:00:00+03:00', read: true },
  {
    id: 'n2',
    title: 'Новая заявка',
    description: 'Заявка 1042',
    time: '2026-10-09T11:40:00+03:00',
    tone: 'info',
  },
  {
    id: 'n3',
    title: 'Сбой синхронизации',
    time: '2026-10-09T09:15:00+03:00',
    tone: 'danger',
    actions: [{ label: 'Повторить', onClick: () => undefined }],
  },
  { id: 'n4', title: 'Плановые работы', time: '2026-10-01T09:00:00+03:00', read: true, href: '/maintenance' },
]

describe('Уведомления: помощники', () => {
  it('countUnread считает элементы без read', () => {
    expect(countUnread(NOTICES)).toBe(2)
    expect(countUnread([])).toBe(0)
  })

  it('группы по дням - новые сверху', () => {
    const groups = groupNotificationsByDay(NOTICES, TZ)
    expect(groups.map((g) => g.key)).toEqual(['2026-10-09', '2026-10-08', '2026-10-01'])
    expect(groups[0]!.items.map((x) => x.id)).toEqual(['n2', 'n3'])
  })
})

describe('NotificationList', () => {
  it('шапка, счётчик, подписи дней, относительное время, точки непрочитанных', () => {
    const out = renderRu(<NotificationList items={NOTICES} now={NOW} timeZone={TZ} />)
    expect(out).toContain('Уведомления')
    expect(out).toContain('Непрочитанных: 2')
    expect(out).toContain('Прочитать все')
    expect(out).toContain('Очистить')
    expect(out).toContain('>Сегодня<')
    expect(out).toContain('>Вчера<')
    expect(out).toContain('>1 октября<')
    expect(out).toContain('20 минут назад')
    expect(count(out, 'aria-label="Отметить прочитанным"')).toBe(2)
    expect(count(out, 'aria-label="Удалить уведомление"')).toBe(4)
    expect(count(out, 'data-unread="true"')).toBe(2)
    expect(out).toContain('href="/maintenance"')
    expect(out).toContain('>Повторить<')
  })

  it('пустой список - пустое состояние, кнопки шапки недоступны', () => {
    const out = renderRu(<NotificationList items={[]} />)
    expect(out).toContain('Новых уведомлений нет')
    expect(count(out, 'disabled=""')).toBe(2)
  })

  it('title={false} убирает заголовок, header={false} - всю шапку', () => {
    expect(renderRu(<NotificationList items={NOTICES} now={NOW} title={false} />)).not.toContain(
      'class="ev-notices-title"',
    )
    expect(renderRu(<NotificationList items={NOTICES} now={NOW} header={false} />)).not.toContain(
      'ev-notices-head',
    )
  })
})

describe('NotificationCenter', () => {
  it('колокольчик: счётчик и подпись с числом непрочитанных', () => {
    const out = renderRu(<NotificationCenter items={NOTICES} now={NOW} />)
    expect(out).toContain('aria-label="Открыть уведомления. Непрочитанных: 2"')
    expect(out).toContain('aria-haspopup="dialog"')
    expect(out).toContain('class="ev-notify-count ev-num" aria-hidden="true">2<')
  })

  it('больше 99 - «99+», без непрочитанных - без счётчика', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ id: `x${i}`, title: 't', time: NOW }))
    expect(renderRu(<NotificationCenter items={many} />)).toContain('>99+<')
    const none = renderRu(<NotificationCenter items={[]} />)
    expect(none).not.toContain('ev-notify-count')
    expect(none).toContain('aria-label="Открыть уведомления"')
  })

  it('вариант drawer: та же кнопка, шторка монтируется только в браузере', () => {
    const out = renderRu(<NotificationCenter variant="drawer" items={NOTICES} open />)
    expect(out).toContain('aria-expanded="true"')
    expect(out).not.toContain('ev-drawer')
  })
})

/* ------------------------------------------------------------------ */

const OPERATOR: ChatAuthor = { id: 'op', name: 'Ирина Лебедева', role: 'Оператор' }
const CLIENT: ChatAuthor = { id: 'me', name: 'Глеб Сорокин' }

const MESSAGES: ChatMessageData[] = [
  { id: 'm1', author: CLIENT, text: 'Здравствуйте', time: '2026-10-08T18:00:00+03:00' },
  { id: 's1', kind: 'system', text: 'Обращение принято', time: '2026-10-08T18:01:00+03:00' },
  { id: 'm2', author: OPERATOR, text: 'Добрый день', time: '2026-10-09T10:00:00+03:00' },
  { id: 'm3', author: OPERATOR, text: 'Уточните номер', time: '2026-10-09T10:03:00+03:00' },
  { id: 'm4', author: OPERATOR, text: 'Жду ответа', time: '2026-10-09T10:30:00+03:00' },
  { id: 'm5', author: CLIENT, text: 'Номер 1042', time: '2026-10-09T10:31:00+03:00', status: 'sending' },
  { id: 'm6', author: CLIENT, text: 'Скриншот', time: '2026-10-09T10:32:00+03:00', status: 'failed' },
]

describe('buildChatRows', () => {
  it('дни, системные события и группы подряд идущих сообщений одного автора', () => {
    const rows = buildChatRows(MESSAGES, { timeZone: TZ })
    const shape = rows.map((r) =>
      r.type === 'message'
        ? `${r.message.id}:${r.groupStart ? 'S' : '-'}${r.groupEnd ? 'E' : '-'}`
        : r.type === 'day'
          ? `day ${r.key}`
          : r.type,
    )
    expect(shape).toEqual([
      'day 2026-10-08',
      'm1:SE',
      'system',
      'day 2026-10-09',
      'm2:S-',
      'm3:-E',
      // 27 минут после m3 - больше окна в 5 минут: новая группа.
      'm4:SE',
      'm5:S-',
      'm6:-E',
    ])
  })

  it('окно группировки настраивается', () => {
    const rows = buildChatRows(MESSAGES, { timeZone: TZ, groupWindow: 30 })
    const m4 = rows.find((r) => r.type === 'message' && r.message.id === 'm4')
    expect(m4 && m4.type === 'message' && m4.groupStart).toBe(false)
  })

  it('разделитель «Новые сообщения» рвёт группу', () => {
    const rows = buildChatRows(MESSAGES, { timeZone: TZ, unreadFromId: 'm3' })
    const i = rows.findIndex((r) => r.type === 'new')
    expect(i).toBeGreaterThan(0)
    const next = rows[i + 1]
    expect(next?.type === 'message' && next.message.id === 'm3' && next.groupStart).toBe(true)
  })
})

describe('ChatThread и ChatMessage', () => {
  const html = renderRu(
    <ChatThread
      messages={MESSAGES}
      currentUserId="me"
      now={NOW}
      timeZone={TZ}
      unreadFromId="m2"
      aria-label="Переписка"
      onRetry={() => undefined}
    />,
  )

  it('лента - role="log" с подписью, дни и разделитель новых', () => {
    expect(html).toContain('role="log"')
    expect(html).toContain('aria-label="Переписка"')
    expect(html).toContain('>Вчера<')
    expect(html).toContain('>Сегодня<')
    expect(html).toContain('>Новые сообщения<')
    expect(html).toContain('class="ev-chat-system"')
  })

  it('свои сообщения справа, имя автора - один раз на группу', () => {
    expect(count(html, 'data-own="true"')).toBe(3)
    expect(count(html, '>Ирина Лебедева<')).toBe(2)
    expect(html).toContain('>Оператор<')
    expect(html).not.toContain('>Глеб Сорокин<')
  })

  it('время в поясе, статусы отправки и повтор', () => {
    expect(html).toContain('>10:03<')
    expect(html).toContain('>Отправка<')
    expect(html).toContain('role="alert"')
    expect(html).toContain('>Не отправлено<')
    expect(html).toContain('>Повторить<')
  })

  it('пометка «изменено» и вложения: сетка изображений и файл', () => {
    const out = renderRu(
      <ChatMessage
        message={{
          id: 'x',
          author: OPERATOR,
          text: 'Смотрите',
          time: NOW,
          edited: true,
          attachments: [
            { id: 'a1', name: 'screen.png', url: 'data:image/png;base64,AAAA' },
            { id: 'a2', name: 'photo.jpg', url: '/photo.jpg' },
            { id: 'a3', name: 'report.pdf', url: '/report.pdf', size: 245_760 },
          ],
        }}
        timeZone={TZ}
      />,
    )
    expect(out).toContain('>изменено<')
    expect(out).toContain('data-count="2"')
    expect(out).toContain('aria-label="Просмотр вложений: screen.png"')
    expect(out).toContain('download="report.pdf"')
    expect(out).toContain('240 КБ')
  })

  it('ChatAttachments без вложений ничего не рисует', () => {
    expect(renderToString(<ChatAttachments attachments={[]} />)).toBe('')
  })

  it('пустая лента - содержимое empty', () => {
    expect(renderRu(<ChatThread messages={[]} empty={<p>Сообщений пока нет</p>} />)).toContain(
      'Сообщений пока нет',
    )
  })
})

describe('Composer', () => {
  it('поле, кнопки прикрепления и отправки; отправка недоступна без текста', () => {
    const out = renderRu(<Composer onSend={() => undefined} />)
    expect(out).toContain('placeholder="Напишите сообщение"')
    expect(out).toContain('aria-label="Прикрепить файл"')
    expect(out).toContain('type="file"')
    expect(out).toContain('multiple=""')
    expect(out).toMatch(/aria-label="Отправить"[^>]*disabled=""|disabled=""[^>]*aria-label="Отправить"/)
  })

  it('без вложений - нет кнопки и файлового поля; maxLength - счётчик', () => {
    const out = renderRu(
      <Composer onSend={() => undefined} attachments={false} maxLength={500} value="Привет" />,
    )
    expect(out).not.toContain('type="file"')
    expect(out).not.toContain('Прикрепить файл')
    expect(out).toContain('6 / 500')
    expect(out).toMatch(/aria-label="Отправить"(?![^>]*disabled)/)
  })

  it('английский словарь по умолчанию', () => {
    const out = renderToString(<Composer onSend={() => undefined} />)
    expect(out).toContain('placeholder="Write a message"')
    expect(out).toContain('aria-label="Send"')
  })
})

/* ------------------------------------------------------------------ */

describe('Lightbox', () => {
  const images = [
    { src: '/a.png', name: 'a.png' },
    { src: '/b.png', name: 'b.png', alt: 'Схема узла' },
    { src: '/c.png', downloadUrl: '/c-original.png' },
  ]

  it('окно: подпись, счётчик, скачивание, стрелки', () => {
    const out = renderRu(<LightboxFrame images={images} index={1} onClose={() => undefined} />)
    expect(out).toContain('role="dialog"')
    expect(out).toContain('aria-modal="true"')
    expect(out).toContain('aria-label="Просмотр вложений"')
    expect(out).toContain('>2 из 3<')
    expect(out).toContain('aria-label="Скачать"')
    expect(out).toContain('download="b.png"')
    expect(out).toContain('alt="Схема узла"')
    expect(out).toContain('aria-label="Предыдущее"')
    expect(out).toContain('aria-label="Следующее"')
    expect(out).toContain('>Схема узла<')
  })

  it('края без loop - стрелка недоступна; индекс вне диапазона прижимается', () => {
    const out = renderRu(<LightboxFrame images={images} index={9} onClose={() => undefined} />)
    expect(out).toContain('>3 из 3<')
    expect(out).toContain('href="/c-original.png"')
    expect(out).toMatch(/aria-label="Следующее"[^>]*disabled=""/)
  })

  it('одно изображение - без счётчика и стрелок; download={false} - без ссылки', () => {
    const out = renderRu(<LightboxFrame images={[images[0]!]} onClose={() => undefined} download={false} />)
    expect(out).not.toContain('ev-lightbox-counter')
    expect(out).not.toContain('Предыдущее')
    expect(out).not.toContain('Скачать')
  })

  it('Lightbox в портале: на сервере ничего не рисует', () => {
    expect(renderRu(<Lightbox images={images} open onClose={() => undefined} />)).toBe('')
  })
})

describe('ConnectionStatus', () => {
  it('подписи всех состояний и live-регион', () => {
    const states = {
      online: 'Связь есть',
      degraded: 'Связь нестабильна',
      offline: 'Нет связи',
      reconnecting: 'Переподключение',
    } as const
    for (const [status, text] of Object.entries(states)) {
      const out = renderRu(<ConnectionStatus status={status as keyof typeof states} />)
      expect(out).toContain('role="status"')
      expect(out).toContain(`data-status="${status}"`)
      expect(out).toContain(`class="ev-conn-label">${text}<`)
    }
  })

  it('compact: точка, подпись только для скринридера, фокусируется', () => {
    const out = renderRu(<ConnectionStatus status="offline" compact />)
    expect(out).toContain('data-compact="true"')
    expect(out).toContain('class="ev-visually-hidden">Нет связи<')
    expect(out).toContain('tabindex="0"')
  })

  it('своя подпись и кнопка по onClick', () => {
    const out = renderToString(
      <ConnectionStatus status="degraded" label="High latency" onClick={() => undefined} />,
    )
    expect(out).toContain('<button type="button" class="ev-conn-inner ev-conn-button"')
    expect(out).toContain('>High latency<')
  })
})

/* ------------------------------------------------------------------ */

describe('Toast: несколько действий', () => {
  const base: ToastItem = { id: 't', tone: 'info', title: 'Файл загружен', duration: null, createdAt: 0 }

  it('actions - строка кнопок, первая secondary, остальные ghost', () => {
    const out = renderRu(
      <ToastCard
        item={{
          ...base,
          actions: [
            { label: 'Открыть', onClick: () => undefined },
            { label: 'Отменить', onClick: () => undefined },
          ],
        }}
      />,
    )
    expect(out).toContain('class="ev-toast-actions"')
    expect(count(out, 'data-size="sm"')).toBe(2)
    expect(out).toMatch(/data-variant="secondary"[^>]*>.*Открыть/)
    expect(out).toMatch(/data-variant="ghost"[^>]*>.*Отменить/)
  })

  it('action вместе с actions - первым в строке; одиночный action - прежняя текстовая кнопка', () => {
    const both = renderRu(
      <ToastCard
        item={{
          ...base,
          action: { label: 'Первое', onClick: () => undefined },
          actions: [{ label: 'Второе', onClick: () => undefined, variant: 'danger-ghost' }],
        }}
      />,
    )
    expect(both.indexOf('Первое')).toBeLessThan(both.indexOf('Второе'))
    expect(both).toContain('data-variant="danger-ghost"')
    const single = renderRu(
      <ToastCard item={{ ...base, action: { label: 'Открыть', onClick: () => undefined } }} />,
    )
    expect(single).toContain('class="ev-toast-action"')
    expect(single).not.toContain('ev-toast-actions')
  })

  it('toast.show принимает actions и возвращает id', () => {
    const id = toast.show({
      title: 'Готово',
      actions: [{ label: 'Открыть', onClick: () => undefined }],
      duration: null,
    })
    expect(typeof id).toBe('string')
    toast.dismiss(id)
  })
})
