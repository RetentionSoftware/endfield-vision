'use client'

import { ArrowDown, Check, CircleAlert, Clock3, FileText, Paperclip, SendHorizontal, X } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx, EMPTY_VALUE } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import type { Messages } from '../lib/i18n-messages'
import { toDate, type DateInput } from '../lib/relative-time'
import { Button, IconButton } from './Button'
import { Avatar, type Tone } from './Display'
import { Textarea } from './Input'
import { Lightbox } from './Lightbox'

/*
 * Переписка: лента сообщений (ChatThread), пузырь (ChatMessage), вложения
 * (ChatAttachments) и поле ввода (Composer). Без привязки к домену: чат
 * поддержки, комментарии к заявке, личные сообщения. Данные и отправка -
 * снаружи; компоненты отвечают за разметку, группировку и клавиатуру.
 */

/* ------------------------------------------------------------------ */
/* Дни: ключ, подпись «Сегодня / Вчера / 8 октября», группировка       */
/* ------------------------------------------------------------------ */

/** Ключ календарного дня 'YYYY-MM-DD' в часовом поясе timeZone (по умолчанию - пояс среды); некорректная дата - ''. */
export function dayKey(date: DateInput, timeZone?: string): string {
  const d = toDate(date)
  if (!d) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

function shiftDayKey(key: string, days: number): string {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export interface DayLabelOptions {
  /** Опорное «сейчас»: без него нет «Сегодня» и «Вчера», только дата с годом. */
  now?: DateInput | null
  /** Локаль Intl (t.intl). */
  intl: string
  today: string
  yesterday: string
  timeZone?: string
}

/** Подпись дня: «Сегодня», «Вчера», «8 октября» (год - если не текущий). */
export function formatDayLabel(
  date: DateInput,
  { now, intl, today, yesterday, timeZone }: DayLabelOptions,
): string {
  const d = toDate(date)
  if (!d) return EMPTY_VALUE
  const key = dayKey(d, timeZone)
  const n = now === undefined || now === null ? null : toDate(now)
  const nowKey = n ? dayKey(n, timeZone) : null
  if (nowKey !== null) {
    if (key === nowKey) return today
    if (key === shiftDayKey(nowKey, -1)) return yesterday
  }
  const sameYear = nowKey !== null && nowKey.slice(0, 4) === key.slice(0, 4)
  return new Intl.DateTimeFormat(intl, {
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(d)
}

export interface DayGroup<T> {
  /** 'YYYY-MM-DD'. */
  key: string
  /** Дата первого элемента группы. */
  date: Date
  items: T[]
}

/** Группы по календарным дням в порядке первого появления; элементы с некорректной датой пропускаются. */
export function groupByDay<T>(
  items: readonly T[],
  getDate: (item: T) => DateInput,
  timeZone?: string,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  const byKey = new Map<string, DayGroup<T>>()
  for (const item of items) {
    const d = toDate(getDate(item))
    if (!d) continue
    const key = dayKey(d, timeZone)
    let g = byKey.get(key)
    if (!g) {
      g = { key, date: d, items: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    g.items.push(item)
  }
  return groups
}

/*
 * Опорное «сейчас» для подписей дней. Заданный now - всегда он (серверный и
 * клиентский рендер совпадают). Без now на сервере и при гидрации - null
 * (подписи - даты), после монтирования - часы браузера с шагом в минуту.
 */
let clientNow = 0
function readClientNow(): number {
  const n = Date.now()
  if (n - clientNow > 60_000) clientNow = n
  return clientNow
}
const noopSubscribe = () => () => undefined
const getServerNow = () => null

/** Опорное «сейчас»: now или часы браузера после монтирования (на сервере - null). */
export function useReferenceNow(now?: DateInput): Date | null {
  const client = useSyncExternalStore<number | null>(noopSubscribe, readClientNow, getServerNow)
  if (now !== undefined) return toDate(now)
  return client === null ? null : new Date(client)
}

/* ------------------------------------------------------------------ */
/* Данные                                                              */
/* ------------------------------------------------------------------ */

export interface ChatAuthor {
  id: string
  name: string
  /** Фото; без него - инициалы. */
  avatar?: string
  tone?: Tone
  /** Подпись рядом с именем: должность, роль («Оператор»). */
  role?: ReactNode
}

export interface ChatAttachment {
  id: string
  name: string
  url: string
  /** Без kind тип определяется по расширению имени и data:image. */
  kind?: 'image' | 'file'
  /** Размер в байтах - подпись у файла. */
  size?: number
  /** Превью для сетки (по умолчанию url). */
  thumbnailUrl?: string
  alt?: string
}

export type ChatMessageStatus = 'sending' | 'sent' | 'failed'

export interface ChatMessageData {
  id: string
  /** system - событие ленты («Обращение передано специалисту») по центру, без пузыря. */
  kind?: 'message' | 'system'
  author?: ChatAuthor
  text?: ReactNode
  time: DateInput
  edited?: boolean
  /** Статус своего сообщения; без него - отправлено, без значка. */
  status?: ChatMessageStatus
  attachments?: ChatAttachment[]
}

export type ChatRow =
  | { type: 'day'; key: string; date: Date }
  | { type: 'new' }
  | { type: 'system'; message: ChatMessageData }
  | { type: 'message'; message: ChatMessageData; groupStart: boolean; groupEnd: boolean }

export interface ChatRowsOptions {
  /** Окно группировки, минуты: подряд идущие сообщения одного автора в его пределах - одна группа (по умолчанию 5). */
  groupWindow?: number
  /** id первого непрочитанного: перед ним - разделитель «Новые сообщения». */
  unreadFromId?: string
  timeZone?: string
}

/**
 * Строки ленты: разделители дней, «Новые сообщения», системные события и
 * сообщения с границами групп. Группа - подряд идущие сообщения одного
 * автора в пределах groupWindow минут, без разделителей и событий между ними.
 */
export function buildChatRows(
  messages: readonly ChatMessageData[],
  { groupWindow = 5, unreadFromId, timeZone }: ChatRowsOptions = {},
): ChatRow[] {
  const rows: ChatRow[] = []
  const windowMs = groupWindow * 60_000
  let lastDay = ''
  let prev: { row: Extract<ChatRow, { type: 'message' }>; time: number } | null = null
  for (const message of messages) {
    const d = toDate(message.time)
    const time = d ? d.getTime() : Number.NaN
    if (d) {
      const key = dayKey(d, timeZone)
      if (key !== lastDay) {
        rows.push({ type: 'day', key, date: d })
        lastDay = key
        prev = null
      }
    }
    if (unreadFromId !== undefined && message.id === unreadFromId) {
      rows.push({ type: 'new' })
      prev = null
    }
    if (message.kind === 'system') {
      rows.push({ type: 'system', message })
      prev = null
      continue
    }
    const joins =
      prev !== null &&
      (prev.row.message.author?.id ?? null) === (message.author?.id ?? null) &&
      time >= prev.time &&
      time - prev.time <= windowMs
    if (joins && prev) prev.row.groupEnd = false
    const row: Extract<ChatRow, { type: 'message' }> = {
      type: 'message',
      message,
      groupStart: !joins,
      groupEnd: true,
    }
    rows.push(row)
    prev = { row, time }
  }
  return rows
}

/* ------------------------------------------------------------------ */
/* Вложения                                                            */
/* ------------------------------------------------------------------ */

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i

function isImage(a: ChatAttachment): boolean {
  if (a.kind) return a.kind === 'image'
  return IMAGE_EXT.test(a.name) || a.url.startsWith('data:image/')
}

function formatSize(bytes: number, t: Messages): string {
  const { b, kb, mb } = t.file.units
  if (bytes < 1024) return `${bytes} ${b}`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString(t.intl)} ${kb}`
  return `${(bytes / 1024 / 1024).toLocaleString(t.intl, { maximumFractionDigits: 1 })} ${mb}`
}

export interface ChatAttachmentsProps {
  attachments: ChatAttachment[]
  /** Свой просмотр изображений; без него открывается встроенный Lightbox. */
  onImageClick?: (index: number, images: ChatAttachment[]) => void
  className?: string
}

/** Вложения сообщения: сетка изображений (открываются в Lightbox) и список файлов со ссылкой на скачивание. */
export function ChatAttachments({ attachments, onImageClick, className }: ChatAttachmentsProps) {
  const t = useMessages()
  const [viewer, setViewer] = useState<number | null>(null)
  const images = attachments.filter(isImage)
  const files = attachments.filter((a) => !isImage(a))
  if (attachments.length === 0) return null
  return (
    <div className={cx('ev-chat-attachments', className)}>
      {images.length > 0 ? (
        <div className="ev-chat-images" data-count={Math.min(images.length, 4)}>
          {images.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className="ev-chat-image"
              aria-label={`${t.lightbox.label}: ${a.alt ?? a.name}`}
              onClick={() => (onImageClick ? onImageClick(i, images) : setViewer(i))}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.thumbnailUrl ?? a.url} alt="" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
      {files.length > 0 ? (
        <ul className="ev-chat-files" role="list">
          {files.map((a) => (
            <li key={a.id}>
              <a className="ev-chat-file" href={a.url} download={a.name}>
                <FileText size={16} aria-hidden="true" className="ev-chat-file-icon" />
                <span className="ev-chat-file-name ev-truncate">{a.name}</span>
                {a.size !== undefined ? (
                  <span className="ev-chat-file-size ev-num">{formatSize(a.size, t)}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {!onImageClick && images.length > 0 ? (
        <Lightbox
          images={images.map((a) => ({ src: a.url, name: a.name, alt: a.alt }))}
          open={viewer !== null}
          index={viewer ?? 0}
          onIndexChange={setViewer}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Сообщение                                                           */
/* ------------------------------------------------------------------ */

function useTimeFormat(intl: string, timeZone?: string): Intl.DateTimeFormat {
  return useMemo(
    () => new Intl.DateTimeFormat(intl, { hour: '2-digit', minute: '2-digit', timeZone }),
    [intl, timeZone],
  )
}

export interface ChatMessageProps {
  message: ChatMessageData
  /** Своё сообщение: справа, акцентный пузырь, без имени и аватара. */
  own?: boolean
  /** Имя и аватар автора - у первого сообщения группы (по умолчанию да). */
  showAuthor?: boolean
  /** Аватар у чужих сообщений (по умолчанию да); в продолжении группы - пустое место под ним. */
  showAvatar?: boolean
  /** Сообщение продолжает группу сверху и снизу: пузыри сближаются, скругления у стыка меньше. */
  groupStart?: boolean
  groupEnd?: boolean
  /** Часовой пояс времени ('Europe/Moscow'): одинаковый текст на сервере и в браузере. */
  timeZone?: string
  /** Повтор отправки: кнопка «Повторить» у сообщения со статусом failed. */
  onRetry?: () => void
  /** Своё содержимое строки ошибки вместо кнопки «Повторить». */
  retry?: ReactNode
  onImageClick?: ChatAttachmentsProps['onImageClick']
  className?: string
}

/** Пузырь сообщения или строка системного события. */
export function ChatMessage({
  message,
  own = false,
  showAuthor = true,
  showAvatar = true,
  groupStart = true,
  groupEnd = true,
  timeZone,
  onRetry,
  retry,
  onImageClick,
  className,
}: ChatMessageProps) {
  const t = useMessages()
  const timeFormat = useTimeFormat(t.intl, timeZone)
  const d = toDate(message.time)
  const time = d ? (
    <time dateTime={d.toISOString()} suppressHydrationWarning={timeZone === undefined}>
      {timeFormat.format(d)}
    </time>
  ) : null

  if (message.kind === 'system') {
    return (
      <div className={cx('ev-chat-system', className)}>
        <span className="ev-chat-system-text">{message.text}</span>
        {time ? <span className="ev-chat-system-time ev-num">{time}</span> : null}
      </div>
    )
  }

  const author = message.author
  const status = message.status
  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0)
  const failed = status === 'failed'
  return (
    <div
      className={cx('ev-chat-msg', className)}
      data-own={own || undefined}
      data-group-start={groupStart || undefined}
      data-group-end={groupEnd || undefined}
      data-status={status}
    >
      {!own && showAvatar ? (
        <span className="ev-chat-msg-avatar">
          {author && showAuthor && groupStart ? (
            <Avatar name={author.name} src={author.avatar} tone={author.tone} size={30} />
          ) : null}
        </span>
      ) : null}
      <div className="ev-chat-msg-col">
        {!own && author && showAuthor && groupStart ? (
          <div className="ev-chat-msg-author">
            <span className="ev-chat-msg-name">{author.name}</span>
            {author.role ? <span className="ev-chat-msg-role">{author.role}</span> : null}
          </div>
        ) : null}
        <div className="ev-chat-bubble">
          {message.text !== undefined && message.text !== null && message.text !== '' ? (
            <div className="ev-chat-text">{message.text}</div>
          ) : null}
          {hasAttachments ? (
            <ChatAttachments attachments={message.attachments!} onImageClick={onImageClick} />
          ) : null}
          <span className="ev-chat-meta">
            {message.edited ? <span className="ev-chat-edited">{t.chat.edited}</span> : null}
            {time ? <span className="ev-num">{time}</span> : null}
            {status === 'sending' ? (
              <span className="ev-chat-status" data-status="sending">
                <Clock3 size={12} aria-hidden="true" />
                <span className="ev-visually-hidden">{t.chat.sending}</span>
              </span>
            ) : status === 'sent' ? (
              <span className="ev-chat-status" data-status="sent" aria-hidden="true">
                <Check size={12} />
              </span>
            ) : failed ? (
              <span className="ev-chat-status" data-status="failed" aria-hidden="true">
                <CircleAlert size={12} />
              </span>
            ) : null}
          </span>
        </div>
        {failed ? (
          <div className="ev-chat-failed" role="alert">
            <span>{t.chat.failed}</span>
            {retry ??
              (onRetry ? (
                <Button variant="link" size="sm" onClick={onRetry}>
                  {t.common.retry}
                </Button>
              ) : null)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Лента                                                               */
/* ------------------------------------------------------------------ */

export interface ChatThreadProps {
  messages: ChatMessageData[]
  /** id текущего пользователя: его сообщения - справа. */
  currentUserId?: string
  /** Окно группировки, минуты (по умолчанию 5). */
  groupWindow?: number
  /** id первого непрочитанного: разделитель «Новые сообщения», при открытии лента прокручивается к нему. */
  unreadFromId?: string
  /** Опорное «сейчас» для «Сегодня» и «Вчера» (детерминированный рендер). */
  now?: DateInput
  timeZone?: string
  onRetry?: (message: ChatMessageData) => void
  /** Свой просмотр изображений вместо встроенного Lightbox. */
  onImageClick?: (images: ChatAttachment[], index: number, message: ChatMessageData) => void
  /** Содержимое при пустой ленте (например, EmptyState). */
  empty?: ReactNode
  /** Подпись ленты для скринридера («Переписка по обращению 1042»). */
  'aria-label'?: string
  className?: string
}

/** Расстояние до низа, при котором лента считается прокрученной до конца, px. */
const BOTTOM_SLACK = 48

/**
 * Лента сообщений с прокруткой. Новое сообщение прокручивает ленту вниз,
 * если пользователь у нижнего края или сообщение своё; если он читает
 * историю выше - появляется кнопка «Новые сообщения».
 */
export function ChatThread({
  messages,
  currentUserId,
  groupWindow = 5,
  unreadFromId,
  now,
  timeZone,
  onRetry,
  onImageClick,
  empty,
  'aria-label': ariaLabel,
  className,
}: ChatThreadProps) {
  const t = useMessages()
  const refNow = useReferenceNow(now)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const atBottomRef = useRef(true)
  const initialized = useRef(false)

  const rows = useMemo(
    () => buildChatRows(messages, { groupWindow, unreadFromId, timeZone }),
    [messages, groupWindow, unreadFromId, timeZone],
  )
  const last = messages[messages.length - 1]
  const lastId = last?.id
  const lastOwn = Boolean(last && currentUserId !== undefined && last.author?.id === currentUserId)

  // Новые сообщения ниже, пока пользователь читает историю: состояние меняется при смене последнего сообщения.
  const [atBottom, setAtBottom] = useState(true)
  const [pending, setPending] = useState(false)
  const [seenLastId, setSeenLastId] = useState(lastId)
  if (lastId !== seenLastId) {
    setSeenLastId(lastId)
    if (!atBottom && !lastOwn) setPending(true)
  }

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useIsoLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!initialized.current) {
      initialized.current = true
      const divider = el.querySelector<HTMLElement>('.ev-chat-new')
      el.scrollTop = divider ? Math.max(0, divider.offsetTop - 8) : el.scrollHeight
      // Положение сразу, не дожидаясь события scroll: иначе догрузка картинок утянет ленту вниз мимо разделителя.
      atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK
      return
    }
    if (atBottomRef.current || lastOwn) el.scrollTop = el.scrollHeight
  }, [lastId, lastOwn])

  // Картинки догружаются и меняют высоту: у нижнего края лента остаётся прижатой.
  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const at = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK
    atBottomRef.current = at
    if (at !== atBottom) setAtBottom(at)
    if (at && pending) setPending(false)
  }

  const dayOptions = { now: refNow, intl: t.intl, today: t.chat.today, yesterday: t.chat.yesterday, timeZone }
  return (
    <div className={cx('ev-chat-thread', className)}>
      <div
        ref={scrollRef}
        className="ev-chat-scroll"
        role="log"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={onScroll}
      >
        <div ref={contentRef} className="ev-chat-content">
          {rows.length === 0 && empty ? <div className="ev-chat-empty">{empty}</div> : null}
          {rows.map((row) => {
            if (row.type === 'day') {
              return (
                <div key={`day-${row.key}`} className="ev-chat-day">
                  <span suppressHydrationWarning={now === undefined}>
                    {formatDayLabel(row.date, dayOptions)}
                  </span>
                </div>
              )
            }
            if (row.type === 'new') {
              return (
                <div key="new" className="ev-chat-new">
                  <span>{t.chat.newMessages}</span>
                </div>
              )
            }
            const m = row.message
            if (row.type === 'system') return <ChatMessage key={m.id} message={m} timeZone={timeZone} />
            return (
              <ChatMessage
                key={m.id}
                message={m}
                own={currentUserId !== undefined && m.author?.id === currentUserId}
                groupStart={row.groupStart}
                groupEnd={row.groupEnd}
                timeZone={timeZone}
                onRetry={onRetry ? () => onRetry(m) : undefined}
                onImageClick={onImageClick ? (i, images) => onImageClick(images, i, m) : undefined}
              />
            )
          })}
        </div>
      </div>
      {pending ? (
        <button type="button" className="ev-chat-jump" onClick={() => scrollToBottom(true)}>
          <span>{t.chat.newMessages}</span>
          <ArrowDown size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Поле ввода                                                          */
/* ------------------------------------------------------------------ */

export interface ComposerPayload {
  /** Текст без пробелов по краям. */
  text: string
  files: File[]
}

export interface ComposerProps {
  /**
   * Отправка. Поле очищается после успешного завершения; если промис
   * отклонён - текст и вложения остаются для повторной попытки.
   */
  onSend: (payload: ComposerPayload) => void | Promise<void>
  /** Текст (управляемый режим): черновик снаружи. */
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  /** Вложения: кнопка, вставка из буфера и перетаскивание (по умолчанию да). */
  attachments?: boolean
  /** Допустимые файлы: 'image/*', '.pdf'. */
  accept?: string
  /** Не больше файлов в одном сообщении. */
  maxFiles?: number
  /** Файлы, не прошедшие по accept или maxFiles: здесь - сообщение пользователю. */
  onReject?: (files: File[]) => void
  /** Максимум строк до прокрутки (по умолчанию 6). */
  maxRows?: number
  autoFocus?: boolean
  className?: string
}

interface PendingFile {
  id: number
  file: File
  /** Object URL превью изображения; освобождается при удалении и размонтировании. */
  url: string | null
}

function acceptMatches(file: File, accept?: string): boolean {
  if (!accept) return true
  const rules = accept
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some((r) => {
    if (r.startsWith('.')) return name.endsWith(r)
    if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1))
    return type === r
  })
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files')
}

function revoke(items: PendingFile[]) {
  for (const it of items) if (it.url) URL.revokeObjectURL(it.url)
}

/**
 * Поле сообщения: высота растёт по тексту, Enter отправляет, Shift+Enter -
 * перенос строки. Файлы - кнопкой, вставкой из буфера (скриншоты) и
 * перетаскиванием; превью изображений - через object URL.
 */
export function Composer({
  onSend,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  maxLength,
  attachments = true,
  accept,
  maxFiles,
  onReject,
  maxRows = 6,
  autoFocus,
  className,
}: ComposerProps) {
  const t = useMessages()
  const [innerText, setInnerText] = useState('')
  const text = value ?? innerText
  const setText = (next: string) => {
    if (value === undefined) setInnerText(next)
    onValueChange?.(next)
  }
  const [files, setFiles] = useState<PendingFile[]>([])
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const seq = useRef(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const filesRef = useRef<PendingFile[]>([])

  useEffect(() => {
    filesRef.current = files
  }, [files])
  // Размонтирование: освобождаем превью, которые не успели отправить или убрать.
  useEffect(() => () => revoke(filesRef.current), [])

  const canAttach = attachments && !disabled
  const trimmed = text.trim()
  const canSend = !disabled && !sending && (trimmed.length > 0 || files.length > 0)

  const addFiles = (list: FileList | File[] | null) => {
    if (!canAttach || !list) return
    const incoming = Array.from(list)
    if (incoming.length === 0) return
    const accepted: PendingFile[] = []
    const rejected: File[] = []
    let slots = maxFiles === undefined ? Number.POSITIVE_INFINITY : maxFiles - files.length
    for (const file of incoming) {
      if (!acceptMatches(file, accept) || slots <= 0) {
        rejected.push(file)
        continue
      }
      slots -= 1
      seq.current += 1
      accepted.push({
        id: seq.current,
        file,
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })
    }
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted])
    if (rejected.length > 0) onReject?.(rejected)
  }

  const removeFile = (id: number) => {
    const target = files.find((f) => f.id === id)
    if (target) revoke([target])
    setFiles((prev) => prev.filter((f) => f.id !== id))
    textareaRef.current?.focus()
  }

  const submit = async () => {
    if (!canSend) return
    const sent = files
    const payload: ComposerPayload = { text: trimmed, files: sent.map((f) => f.file) }
    setSending(true)
    try {
      await onSend(payload)
      setText('')
      revoke(sent)
      setFiles((prev) => prev.filter((f) => !sent.includes(f)))
    } catch {
      // Отправка не удалась: текст и вложения остаются для повтора.
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canAttach) return
    const pasted = Array.from(e.clipboardData.files)
    if (pasted.length === 0) return
    e.preventDefault()
    addFiles(pasted)
  }

  const dragHandlers = canAttach
    ? {
        onDragEnter: (e: DragEvent) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        },
        onDragOver: (e: DragEvent) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (e: DragEvent) => {
          if (!hasFiles(e)) return
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        },
        onDrop: (e: DragEvent) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          addFiles(e.dataTransfer.files)
        },
      }
    : {}

  return (
    <div
      className={cx('ev-composer', className)}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      {...dragHandlers}
    >
      {files.length > 0 ? (
        <ul className="ev-composer-files" role="list">
          {files.map((f) => (
            <li key={f.id} className="ev-composer-file">
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ev-composer-thumb" src={f.url} alt="" />
              ) : (
                <FileText size={16} aria-hidden="true" className="ev-composer-file-icon" />
              )}
              <span className="ev-composer-file-name ev-truncate">{f.file.name}</span>
              <IconButton
                size="sm"
                label={t.chat.removeAttachment(f.file.name)}
                icon={<X size={14} />}
                onClick={() => removeFile(f.id)}
                disabled={sending}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="ev-composer-row">
        {attachments ? (
          <>
            <IconButton
              label={t.chat.attach}
              icon={<Paperclip size={17} />}
              disabled={!canAttach || sending}
              onClick={() => inputRef.current?.click()}
            />
            <input
              ref={inputRef}
              type="file"
              className="ev-visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
              accept={accept}
              multiple
              disabled={!canAttach}
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </>
        ) : null}
        <Textarea
          ref={textareaRef}
          className="ev-composer-input"
          rows={1}
          autoResize
          maxRows={maxRows}
          value={text}
          maxLength={maxLength}
          showCount={maxLength !== undefined}
          placeholder={placeholder ?? t.chat.placeholder}
          aria-label={placeholder ?? t.chat.placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        <IconButton
          variant="primary"
          label={t.chat.send}
          icon={<SendHorizontal size={17} />}
          disabled={!canSend}
          loading={sending}
          onClick={() => void submit()}
        />
      </div>
      {dragging ? (
        <div className="ev-composer-drop" aria-hidden="true">
          <Paperclip size={18} />
          <span>{t.chat.dropHint}</span>
        </div>
      ) : null}
    </div>
  )
}
