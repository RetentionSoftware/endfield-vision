'use client'

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  LinkButton,
  normalizeSearch,
  PageHeader,
  SearchInput,
  Tabs,
  toast,
  useMediaQuery,
  useModals,
} from 'endfield-vision'
import { Archive, BellRing, CheckCheck, Inbox, MailSearch, MousePointerClick, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isMe, ME, MESSAGE_KIND, MESSAGES, type InboxMessage } from '@/lib/demo/inbox'
import { bi, useCrumbs, useT, type Bi } from '@/lib/i18n'
import { MessageView } from './MessageView'
import s from './inbox.module.css'

type InboxTab = 'all' | 'unread' | 'mentions' | 'archive'

const TAB_LABELS: Record<InboxTab, Bi> = {
  all: bi('Все', 'All'),
  unread: bi('Непрочитанные', 'Unread'),
  mentions: bi('Упоминания', 'Mentions'),
  archive: bi('Архив', 'Archive'),
}

function inTab(m: InboxMessage, tab: InboxTab): boolean {
  if (tab === 'archive') return m.archived
  if (m.archived) return false
  if (tab === 'unread') return m.unread
  if (tab === 'mentions') return m.mention
  return true
}

function nowLabel(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function InboxScreen() {
  const narrow = useMediaQuery('(max-width: 960px)')
  const modals = useModals()
  const { t, tx, plural } = useT()
  const breadcrumbs = useCrumbs('inbox')
  const messagesWord = (n: number) => plural(n, ['сообщение', 'сообщения', 'сообщений'], ['message', 'messages'])
  const [messages, setMessages] = useState<InboxMessage[]>(MESSAGES)
  const [tab, setTab] = useState<InboxTab>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<InboxTab, number> = { all: 0, unread: 0, mentions: 0, archive: 0 }
    for (const m of messages) for (const t of Object.keys(c) as InboxTab[]) if (inTab(m, t)) c[t] += 1
    return c
  }, [messages])

  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    return messages.filter(
      (m) =>
        inTab(m, tab) &&
        (!q || [m.subject, m.from, m.fromRole, ...m.thread.map((e) => e.text)].some((v) => normalizeSearch(tx(v)).includes(q))),
    )
  }, [messages, tab, query, tx])

  const selected = messages.find((m) => m.id === selectedId) ?? null

  const patch = (id: string, p: Partial<InboxMessage>) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)))

  const open = (m: InboxMessage) => {
    setSelectedId(m.id)
    if (m.unread) patch(m.id, { unread: false })
  }

  const archive = (m: InboxMessage) => {
    const next = !m.archived
    patch(m.id, { archived: next })
    setSelectedId(null)
    toast.success(next ? t('Перенесено в архив', 'Moved to archive') : t('Возвращено во входящие', 'Moved back to inbox'), {
      description: tx(m.subject),
      action: { label: t('Отменить', 'Undo'), onClick: () => patch(m.id, { archived: m.archived }) },
    })
  }

  const toggleUnread = (m: InboxMessage) => {
    patch(m.id, { unread: !m.unread })
    toast.info(m.unread ? t('Отмечено как прочитанное', 'Marked as read') : t('Отмечено как непрочитанное', 'Marked as unread'), {
      description: tx(m.subject),
    })
  }

  const remove = async (m: InboxMessage) => {
    const ok = await modals.confirm({
      title: t('Удалить сообщение?', 'Delete message?'),
      message: t(
        `«${tx(m.subject)}» и вся переписка по нему будут удалены без возможности восстановления.`,
        `"${tx(m.subject)}" and its entire thread will be permanently deleted.`,
      ),
      okLabel: t('Удалить', 'Delete'),
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
    })
    if (!ok) return
    setMessages((list) => list.filter((x) => x.id !== m.id))
    setSelectedId(null)
    toast.success(t('Сообщение удалено', 'Message deleted'))
  }

  const reply = (m: InboxMessage, text: string) => {
    setMessages((list) =>
      list.map((x) =>
        x.id === m.id
          ? {
              ...x,
              time: nowLabel(),
              thread: [...x.thread, { id: `r${x.thread.length + 1}`, author: ME, time: bi(`сегодня, ${nowLabel()}`, `today, ${nowLabel()}`), text }],
            }
          : x,
      ),
    )
    toast.success(t('Ответ отправлен', 'Reply sent'), { description: `${tx(m.from)}: ${tx(m.subject)}` })
  }

  const markAllRead = () => {
    const n = messages.filter((m) => m.unread && !m.archived).length
    setMessages((list) => list.map((m) => (m.archived ? m : { ...m, unread: false })))
    toast.success(t('Все сообщения прочитаны', 'All messages read'), { description: `${t('Отмечено', 'Marked')}: ${n} ${messagesWord(n)}` })
  }

  const view = (m: InboxMessage, showSubject: boolean) => (
    <MessageView
      key={m.id}
      message={m}
      showSubject={showSubject}
      onArchive={() => archive(m)}
      onToggleUnread={() => toggleUnread(m)}
      onDelete={() => void remove(m)}
      onReply={(text) => reply(m, text)}
    />
  )

  const empty = query ? (
    <EmptyState
      compact
      icon={<MailSearch size={22} />}
      title={t('Ничего не найдено', 'Nothing found')}
      description={t('Попробуйте изменить запрос или вкладку.', 'Try a different search or tab.')}
      actions={
        <Button size="sm" onClick={() => setQuery('')}>
          {t('Сбросить поиск', 'Clear search')}
        </Button>
      }
    />
  ) : tab === 'archive' ? (
    <EmptyState
      compact
      icon={<Archive size={22} />}
      title={t('Архив пуст', 'Archive is empty')}
      description={t('Сюда попадают сообщения, убранные из входящих.', 'Messages removed from the inbox end up here.')}
    />
  ) : tab === 'unread' ? (
    <EmptyState
      compact
      icon={<CheckCheck size={22} />}
      title={t('Всё прочитано', 'All caught up')}
      description={t('Новые сообщения появятся здесь.', 'New messages will appear here.')}
    />
  ) : tab === 'mentions' ? (
    <EmptyState
      compact
      icon={<Inbox size={22} />}
      title={t('Упоминаний нет', 'No mentions')}
      description={t('Здесь будут сообщения, где вас отметили.', 'Messages where you are mentioned will appear here.')}
    />
  ) : (
    <EmptyState
      compact
      icon={<Inbox size={22} />}
      title={t('Входящих нет', 'Inbox is empty')}
      description={t('Инциденты, задачи и системные сообщения появятся здесь.', 'Incidents, tasks and system messages will appear here.')}
    />
  )

  return (
    <>
      <PageHeader
        title={t('Входящие', 'Inbox')}
        subtitle={t('Инциденты, задачи и системные уведомления по объектам.', 'Incidents, tasks and system notifications across facilities.')}
        breadcrumbs={breadcrumbs}
        meta={
          counts.unread > 0 ? (
            <Badge tone="accent" dot>
              {t('Непрочитанных', 'Unread')}: {counts.unread}
            </Badge>
          ) : null
        }
        actions={
          <>
            <LinkButton href="/settings?tab=notifications" variant="ghost" icon={<BellRing size={15} />}>
              {t('Уведомления', 'Notifications')}
            </LinkButton>
            <Button icon={<CheckCheck size={15} />} onClick={markAllRead} disabled={counts.unread === 0}>
              {t('Прочитать все', 'Mark all read')}
            </Button>
          </>
        }
      >
        <Tabs
          aria-label={t('Папки', 'Folders')}
          value={tab}
          onChange={(next) => {
            setTab(next)
            setSelectedId(null)
          }}
          items={(Object.keys(TAB_LABELS) as InboxTab[]).map((k) => ({ value: k, label: tx(TAB_LABELS[k]), count: counts[k] }))}
        />
      </PageHeader>

      <div className={s.layout}>
        <section className={s.listPane} aria-label={t('Список сообщений', 'Message list')}>
          <div className={s.listHead}>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t('Тема, отправитель, текст', 'Subject, sender, text')}
              aria-label={t('Поиск по сообщениям', 'Search messages')}
            />
          </div>
          {visible.length === 0 ? (
            <div className={s.listEmpty}>{empty}</div>
          ) : (
            <ul role="list" className={s.list}>
              {visible.map((m) => {
                const last = m.thread[m.thread.length - 1]
                const kind = MESSAGE_KIND[m.kind]
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={s.item}
                      data-active={m.id === selectedId || undefined}
                      data-unread={m.unread || undefined}
                      aria-current={m.id === selectedId ? 'true' : undefined}
                      onClick={() => open(m)}
                    >
                      <Avatar name={tx(m.from)} size={36} />
                      <span className={s.itemBody}>
                        <span className={s.itemTop}>
                          <span className={s.itemFrom}>{tx(m.from)}</span>
                          <span className={s.itemTime}>{tx(m.time)}</span>
                        </span>
                        <span className={s.itemSubject}>{tx(m.subject)}</span>
                        <span className={s.itemSnippet}>{last ? `${isMe(last.author) ? t('Вы: ', 'You: ') : ''}${tx(last.text)}` : ''}</span>
                        <span className={s.itemMeta}>
                          <Badge tone={kind.tone} size="sm">
                            {tx(kind.label)}
                          </Badge>
                          {m.mention ? (
                            <Badge tone="accent" size="sm">
                              @
                            </Badge>
                          ) : null}
                          {m.thread.length > 1 ? (
                            <span className="ev-muted">
                              {m.thread.length} {messagesWord(m.thread.length)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {m.unread ? (
                        <span className={s.unreadDot}>
                          <span className="ev-visually-hidden">{t('Не прочитано', 'Unread')}</span>
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {!narrow ? (
          <section className={s.readPane} aria-label={t('Сообщение', 'Message')}>
            {selected ? (
              view(selected, true)
            ) : (
              <div className={s.readEmpty}>
                <EmptyState
                  icon={<MousePointerClick size={26} />}
                  title={t('Сообщение не выбрано', 'No message selected')}
                  description={
                    (counts.unread > 0 ? `${t('Непрочитанных', 'Unread')}: ${counts.unread}. ` : '') +
                    t('Выберите сообщение в списке слева.', 'Select a message from the list on the left.')
                  }
                />
              </div>
            )}
          </section>
        ) : null}
      </div>

      <Drawer
        open={narrow && selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? tx(selected.subject) : undefined}
        subtitle={selected ? tx(selected.from) : undefined}
        width={640}
      >
        {selected ? view(selected, false) : null}
      </Drawer>
    </>
  )
}
