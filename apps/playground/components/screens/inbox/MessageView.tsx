'use client'

import { Avatar, Badge, Button, Field, IconButton, Kbd, LinkButton, Textarea } from 'endfield-vision'
import { Archive, ArchiveRestore, ArrowRight, Mail, MailOpen, Send, Trash2 } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { isMe, ME, MESSAGE_KIND, type InboxMessage } from '@/lib/demo/inbox'
import { useT } from '@/lib/i18n'
import s from './inbox.module.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Текст сообщения: упоминание текущего пользователя (имя на языке интерфейса) выделено. */
function renderText(text: string, me: string): ReactNode {
  const tag = `@${me}`
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
  const { t, tx } = useT()
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
    <article className={s.message} aria-label={tx(m.subject)}>
      <header className={s.messageHead}>
        <div className={s.messageTitles}>
          {showSubject ? <h2 className={s.messageSubject}>{tx(m.subject)}</h2> : null}
          <div className="ev-row" style={{ ['--ev-gap' as string]: 'var(--ev-space-2)' }}>
            <Badge tone={kind.tone} size="sm">
              {tx(kind.label)}
            </Badge>
            {m.mention ? (
              <Badge tone="accent" size="sm">
                {t('Упоминание', 'Mention')}
              </Badge>
            ) : null}
            {m.archived ? (
              <Badge tone="neutral" size="sm" icon={<Archive size={12} />}>
                {t('В архиве', 'Archived')}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className={s.messageActions}>
          <IconButton
            label={m.archived ? t('Вернуть во входящие', 'Move back to inbox') : t('В архив', 'Archive')}
            icon={m.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
            onClick={onArchive}
          />
          <IconButton
            label={m.unread ? t('Отметить прочитанным', 'Mark as read') : t('Отметить непрочитанным', 'Mark as unread')}
            icon={m.unread ? <MailOpen size={17} /> : <Mail size={17} />}
            onClick={onToggleUnread}
          />
          <IconButton label={t('Удалить', 'Delete')} variant="danger-ghost" icon={<Trash2 size={17} />} onClick={onDelete} />
        </div>
      </header>

      <div className={s.sender}>
        <Avatar name={tx(m.from)} size={36} />
        <div className={s.senderText}>
          <span className={s.senderName}>{tx(m.from)}</span>
          <span className="ev-muted">{tx(m.fromRole)}</span>
        </div>
        {m.link ? (
          <LinkButton href={m.link.href} size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
            {tx(m.link.label)}
          </LinkButton>
        ) : null}
      </div>

      <ol role="list" className={s.thread}>
        {m.thread.map((e) => (
          <li key={e.id} className={s.entry} data-own={isMe(e.author) || undefined}>
            <div className={s.entryHead}>
              <Avatar name={tx(e.author)} size={24} />
              <span className={s.entryAuthor}>{isMe(e.author) ? t('Вы', 'You') : tx(e.author)}</span>
              <span className="ev-muted">{tx(e.time)}</span>
            </div>
            <div className={s.entryText}>{renderText(tx(e.text), tx(ME))}</div>
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
        <Field
          label={t('Ответ', 'Reply')}
          hint={
            <>
              {t('Отправить', 'Send')} - <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd>
            </>
          }
        >
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
            placeholder={`${t('Ответить', 'Reply to')}: ${tx(m.from)}`}
            disabled={sending}
          />
        </Field>
        <div className={s.replyActions}>
          <Button type="submit" variant="primary" icon={<Send size={15} />} loading={sending} disabled={!reply.trim()}>
            {t('Отправить', 'Send')}
          </Button>
        </div>
      </form>
    </article>
  )
}
