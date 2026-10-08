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
import { ME, MESSAGE_KIND, MESSAGES, type InboxMessage } from '@/lib/demo/inbox'
import { plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { MessageView } from './MessageView'
import s from './inbox.module.css'

type InboxTab = 'all' | 'unread' | 'mentions' | 'archive'

const TAB_LABELS: Record<InboxTab, string> = {
  all: 'Все',
  unread: 'Непрочитанные',
  mentions: 'Упоминания',
  archive: 'Архив',
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
        (!q || [m.subject, m.from, m.fromRole, ...m.thread.map((t) => t.text)].some((v) => normalizeSearch(v).includes(q))),
    )
  }, [messages, tab, query])

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
    toast.success(next ? 'Перенесено в архив' : 'Возвращено во входящие', {
      description: m.subject,
      action: { label: 'Отменить', onClick: () => patch(m.id, { archived: m.archived }) },
    })
  }

  const toggleUnread = (m: InboxMessage) => {
    patch(m.id, { unread: !m.unread })
    toast.info(m.unread ? 'Отмечено как прочитанное' : 'Отмечено как непрочитанное', { description: m.subject })
  }

  const remove = async (m: InboxMessage) => {
    const ok = await modals.confirm({
      title: 'Удалить сообщение?',
      message: `«${m.subject}» и вся переписка по нему будут удалены без возможности восстановления.`,
      okLabel: 'Удалить',
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
    })
    if (!ok) return
    setMessages((list) => list.filter((x) => x.id !== m.id))
    setSelectedId(null)
    toast.success('Сообщение удалено')
  }

  const reply = (m: InboxMessage, text: string) => {
    setMessages((list) =>
      list.map((x) =>
        x.id === m.id ? { ...x, time: nowLabel(), thread: [...x.thread, { id: `r${x.thread.length + 1}`, author: ME, time: `сегодня, ${nowLabel()}`, text }] } : x,
      ),
    )
    toast.success('Ответ отправлен', { description: `${m.from}: ${m.subject}` })
  }

  const markAllRead = () => {
    const n = messages.filter((m) => m.unread && !m.archived).length
    setMessages((list) => list.map((m) => (m.archived ? m : { ...m, unread: false })))
    toast.success('Все сообщения прочитаны', { description: `Отмечено: ${n} ${plural(n, 'сообщение', 'сообщения', 'сообщений')}` })
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
      title="Ничего не найдено"
      description="Попробуйте изменить запрос или вкладку."
      actions={
        <Button size="sm" onClick={() => setQuery('')}>
          Сбросить поиск
        </Button>
      }
    />
  ) : tab === 'archive' ? (
    <EmptyState compact icon={<Archive size={22} />} title="Архив пуст" description="Сюда попадают сообщения, убранные из входящих." />
  ) : tab === 'unread' ? (
    <EmptyState compact icon={<CheckCheck size={22} />} title="Всё прочитано" description="Новые сообщения появятся здесь." />
  ) : tab === 'mentions' ? (
    <EmptyState compact icon={<Inbox size={22} />} title="Упоминаний нет" description="Здесь будут сообщения, где вас отметили." />
  ) : (
    <EmptyState compact icon={<Inbox size={22} />} title="Входящих нет" description="Инциденты, задачи и системные сообщения появятся здесь." />
  )

  return (
    <>
      <PageHeader
        title="Входящие"
        subtitle="Инциденты, задачи и системные уведомления по объектам."
        breadcrumbs={crumbs('inbox')}
        meta={
          counts.unread > 0 ? (
            <Badge tone="accent" dot>
              Непрочитанных: {counts.unread}
            </Badge>
          ) : null
        }
        actions={
          <>
            <LinkButton href="/settings?tab=notifications" variant="ghost" icon={<BellRing size={15} />}>
              Уведомления
            </LinkButton>
            <Button icon={<CheckCheck size={15} />} onClick={markAllRead} disabled={counts.unread === 0}>
              Прочитать все
            </Button>
          </>
        }
      >
        <Tabs
          aria-label="Папки"
          value={tab}
          onChange={(t) => {
            setTab(t)
            setSelectedId(null)
          }}
          items={(Object.keys(TAB_LABELS) as InboxTab[]).map((t) => ({ value: t, label: TAB_LABELS[t], count: counts[t] }))}
        />
      </PageHeader>

      <div className={s.layout}>
        <section className={s.listPane} aria-label="Список сообщений">
          <div className={s.listHead}>
            <SearchInput value={query} onChange={setQuery} placeholder="Тема, отправитель, текст" aria-label="Поиск по сообщениям" />
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
                      <Avatar name={m.from} size={36} />
                      <span className={s.itemBody}>
                        <span className={s.itemTop}>
                          <span className={s.itemFrom}>{m.from}</span>
                          <span className={s.itemTime}>{m.time}</span>
                        </span>
                        <span className={s.itemSubject}>{m.subject}</span>
                        <span className={s.itemSnippet}>{last ? `${last.author === ME ? 'Вы: ' : ''}${last.text}` : ''}</span>
                        <span className={s.itemMeta}>
                          <Badge tone={kind.tone} size="sm">
                            {kind.label}
                          </Badge>
                          {m.mention ? (
                            <Badge tone="accent" size="sm">
                              @
                            </Badge>
                          ) : null}
                          {m.thread.length > 1 ? (
                            <span className="ev-muted">
                              {m.thread.length} {plural(m.thread.length, 'сообщение', 'сообщения', 'сообщений')}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {m.unread ? (
                        <span className={s.unreadDot}>
                          <span className="ev-visually-hidden">Не прочитано</span>
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
          <section className={s.readPane} aria-label="Сообщение">
            {selected ? (
              view(selected, true)
            ) : (
              <div className={s.readEmpty}>
                <EmptyState
                  icon={<MousePointerClick size={26} />}
                  title="Сообщение не выбрано"
                  description={counts.unread > 0 ? `Непрочитанных: ${counts.unread}. Выберите сообщение в списке слева.` : 'Выберите сообщение в списке слева.'}
                />
              </div>
            )}
          </section>
        ) : null}
      </div>

      <Drawer open={narrow && selected !== null} onClose={() => setSelectedId(null)} title={selected?.subject} subtitle={selected?.from} width={640}>
        {selected ? view(selected, false) : null}
      </Drawer>
    </>
  )
}
