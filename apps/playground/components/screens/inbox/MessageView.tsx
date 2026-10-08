'use client'

import { Avatar, Badge, Button, Field, IconButton, Kbd, LinkButton, Textarea } from 'endfield-vision'
import { Archive, ArchiveRestore, ArrowRight, Mail, MailOpen, Send, Trash2 } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { ME, MESSAGE_KIND, type InboxMessage } from '@/lib/demo/inbox'
import s from './inbox.module.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Текст сообщения: упоминание текущего пользователя выделено. */
function renderText(text: string): ReactNode {
  const tag = `@${ME}`
  const parts = text.split(tag)
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 ? <span className={s.mention}>{tag}</span> : null}
    </Fragment>
  ))
}

export interface MessageViewProps {
  message: InboxMessage
  /** Заголовок с темой: в шторке тема уже в шапке. */
  showSubject?: boolean
  onArchive: () => void
  onToggleUnread: () => void
  onDelete: () => void
  onReply: (text: string) => void
}

/** Сообщение: тема, действия, переписка и ответ. */
export function MessageView({ message: m, showSubject = true, onArchive, onToggleUnread, onDelete, onReply }: MessageViewProps) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const kind = MESSAGE_KIND[m.kind]

  const send = async () => {
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    await wait(500)
    onReply(text)
    setReply('')
    setSending(false)
  }

  return (
    <article className={s.message} aria-label={m.subject}>
      <header className={s.messageHead}>
        <div className={s.messageTitles}>
          {showSubject ? <h2 className={s.messageSubject}>{m.subject}</h2> : null}
          <div className="ev-row" style={{ ['--ev-gap' as string]: 'var(--ev-space-2)' }}>
            <Badge tone={kind.tone} size="sm">
              {kind.label}
            </Badge>
            {m.mention ? (
              <Badge tone="accent" size="sm">
                Упоминание
              </Badge>
            ) : null}
            {m.archived ? (
              <Badge tone="neutral" size="sm" icon={<Archive size={12} />}>
                В архиве
              </Badge>
            ) : null}
          </div>
        </div>
        <div className={s.messageActions}>
          <IconButton
            label={m.archived ? 'Вернуть во входящие' : 'В архив'}
            icon={m.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
            onClick={onArchive}
          />
          <IconButton
            label={m.unread ? 'Отметить прочитанным' : 'Отметить непрочитанным'}
            icon={m.unread ? <MailOpen size={17} /> : <Mail size={17} />}
            onClick={onToggleUnread}
          />
          <IconButton label="Удалить" variant="danger-ghost" icon={<Trash2 size={17} />} onClick={onDelete} />
        </div>
      </header>

      <div className={s.sender}>
        <Avatar name={m.from} size={36} />
        <div className={s.senderText}>
          <span className={s.senderName}>{m.from}</span>
          <span className="ev-muted">{m.fromRole}</span>
        </div>
        {m.link ? (
          <LinkButton href={m.link.href} size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
            {m.link.label}
          </LinkButton>
        ) : null}
      </div>

      <ol role="list" className={s.thread}>
        {m.thread.map((t) => (
          <li key={t.id} className={s.entry} data-own={t.author === ME || undefined}>
            <div className={s.entryHead}>
              <Avatar name={t.author} size={24} />
              <span className={s.entryAuthor}>{t.author === ME ? 'Вы' : t.author}</span>
              <span className="ev-muted">{t.time}</span>
            </div>
            <div className={s.entryText}>{renderText(t.text)}</div>
          </li>
        ))}
      </ol>

      <form
        className={s.reply}
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Field label="Ответ" hint={<>Отправить - <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd></>}>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void send()
              }
            }}
            rows={3}
            autoResize
            maxRows={10}
            placeholder={`Ответить: ${m.from}`}
            disabled={sending}
          />
        </Field>
        <div className={s.replyActions}>
          <Button type="submit" variant="primary" icon={<Send size={15} />} loading={sending} disabled={!reply.trim()}>
            Отправить
          </Button>
        </div>
      </form>
    </article>
  )
}
