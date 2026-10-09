'use client'

import { Bell, BellOff, CircleCheck, Info, OctagonAlert, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '../lib/cx'
import { formatDayLabel, groupByDay, type DayGroup } from '../lib/dates'
import { useReferenceNow } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { UiLink } from '../lib/link'
import type { Placement } from '../lib/overlay'
import { toDate, type DateInput } from '../lib/relative-time'
import { Button, IconButton } from './Button'
import type { Tone } from './Display'
import { Drawer } from './Modal'
import { Popover } from './Popover'
import { RelativeTime } from './RelativeTime'
import { Tooltip } from './Tooltip'

/*
 * Центр уведомлений: колокольчик со счётчиком непрочитанных и панель
 * истории (поповер или шторка). Список сгруппирован по дням, у каждого
 * уведомления - отметка «прочитано», удаление и свои действия. Состояние
 * хранится снаружи: компонент только сообщает об изменениях.
 */

export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface NotificationItem {
  id: string
  title: ReactNode
  description?: ReactNode
  time: DateInput
  tone?: Extract<Tone, 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'>
  /** Своя иконка; по умолчанию - по тону. */
  icon?: ReactNode
  read?: boolean
  actions?: NotificationAction[]
  /** Переход по клику (через LinkProvider приложения). */
  href?: string
}

/** Число непрочитанных. */
export function countUnread(items: readonly NotificationItem[]): number {
  let n = 0
  for (const it of items) if (!it.read) n += 1
  return n
}

/** Группы по дням, новые сверху: внутри дня и между днями - по убыванию времени. */
export function groupNotificationsByDay(
  items: readonly NotificationItem[],
  timeZone?: string,
): DayGroup<NotificationItem>[] {
  const time = (it: NotificationItem) => toDate(it.time)?.getTime() ?? 0
  const sorted = [...items].sort((a, b) => time(b) - time(a))
  return groupByDay(sorted, (it) => it.time, timeZone)
}

const TONE_ICONS: Record<NonNullable<NotificationItem['tone']>, ReactNode> = {
  neutral: <Bell size={16} />,
  accent: <Bell size={16} />,
  info: <Info size={16} />,
  success: <CircleCheck size={16} />,
  warning: <TriangleAlert size={16} />,
  danger: <OctagonAlert size={16} />,
}

export interface NotificationListProps {
  items: NotificationItem[]
  /** Новый список после любого действия (прочитано, удалено, очищено). */
  onItemsChange?: (items: NotificationItem[]) => void
  onRead?: (id: string) => void
  onReadAll?: () => void
  onRemove?: (id: string) => void
  onClear?: () => void
  /** Клик по уведомлению (после отметки «прочитано»). */
  onItemClick?: (item: NotificationItem) => void
  /** Опорное «сейчас» для относительного времени и подписей дней. */
  now?: DateInput
  timeZone?: string
  /** Заголовок над списком; false - без заголовка (например, он уже в шторке). */
  title?: ReactNode | false
  /** Шапка с заголовком, счётчиком и кнопками «Прочитать все» и «Очистить» (по умолчанию да). */
  header?: boolean
  /** Пустое состояние вместо стандартного. */
  empty?: ReactNode
  className?: string
}

/** Панель уведомлений без контейнера: для поповера, шторки или страницы. */
export function NotificationList({
  items,
  onItemsChange,
  onRead,
  onReadAll,
  onRemove,
  onClear,
  onItemClick,
  now,
  timeZone,
  title,
  header = true,
  empty,
  className,
}: NotificationListProps) {
  const t = useMessages()
  const refNow = useReferenceNow(now)
  const groups = useMemo(() => groupNotificationsByDay(items, timeZone), [items, timeZone])
  const unread = countUnread(items)

  const read = (id: string) => {
    const target = items.find((it) => it.id === id)
    if (!target || target.read) return
    onRead?.(id)
    onItemsChange?.(items.map((it) => (it.id === id ? { ...it, read: true } : it)))
  }
  const readAll = () => {
    onReadAll?.()
    onItemsChange?.(items.map((it) => (it.read ? it : { ...it, read: true })))
  }
  const remove = (id: string) => {
    onRemove?.(id)
    onItemsChange?.(items.filter((it) => it.id !== id))
  }
  const clear = () => {
    onClear?.()
    onItemsChange?.([])
  }

  const heading = title === false ? null : (title ?? t.notifications.title)
  return (
    <div className={cx('ev-notices', className)}>
      {header ? (
        <div className="ev-notices-head">
          <div className="ev-notices-titles">
            {heading ? <span className="ev-notices-title">{heading}</span> : null}
            {unread > 0 ? (
              <span className="ev-notices-unread ev-num">{t.notifications.unread(unread)}</span>
            ) : null}
          </div>
          <div className="ev-notices-tools">
            <Button size="sm" variant="ghost" onClick={readAll} disabled={unread === 0}>
              {t.notifications.markAllRead}
            </Button>
            <Button size="sm" variant="ghost" onClick={clear} disabled={items.length === 0}>
              {t.notifications.clearAll}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="ev-notices-scroll">
        {items.length === 0
          ? (empty ?? (
              <div className="ev-notices-empty">
                <BellOff size={20} aria-hidden="true" />
                <span>{t.notifications.empty}</span>
              </div>
            ))
          : groups.map((g) => (
              <section key={g.key} className="ev-notices-group">
                <h3 className="ev-notices-day" suppressHydrationWarning={now === undefined}>
                  {formatDayLabel(g.date, {
                    now: refNow,
                    intl: t.intl,
                    today: t.chat.today,
                    yesterday: t.chat.yesterday,
                    timeZone,
                  })}
                </h3>
                <ul className="ev-notices-list" role="list">
                  {g.items.map((it) => (
                    <NoticeRow
                      key={it.id}
                      item={it}
                      now={now}
                      timeZone={timeZone}
                      onRead={() => read(it.id)}
                      onRemove={() => remove(it.id)}
                      onClick={() => {
                        read(it.id)
                        onItemClick?.(it)
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))}
      </div>
    </div>
  )
}

function NoticeRow({
  item,
  now,
  timeZone,
  onRead,
  onRemove,
  onClick,
}: {
  item: NotificationItem
  now?: DateInput
  timeZone?: string
  onRead: () => void
  onRemove: () => void
  onClick: () => void
}) {
  const t = useMessages()
  const tone = item.tone ?? 'neutral'
  const body = (
    <>
      <span className="ev-notice-title">{item.title}</span>
      {item.description ? <span className="ev-notice-desc">{item.description}</span> : null}
      <span className="ev-notice-time">
        <RelativeTime date={item.time} now={now} timeZone={timeZone} tooltip={false} />
      </span>
    </>
  )
  return (
    <li className="ev-notice" data-tone={tone} data-unread={!item.read || undefined}>
      <span className="ev-notice-icon" aria-hidden="true">
        {item.icon ?? TONE_ICONS[tone]}
      </span>
      <div className="ev-notice-body">
        {item.href ? (
          <UiLink className="ev-notice-main" href={item.href} onClick={onClick}>
            {body}
          </UiLink>
        ) : (
          <button type="button" className="ev-notice-main" onClick={onClick}>
            {body}
          </button>
        )}
        {item.actions && item.actions.length > 0 ? (
          <div className="ev-notice-actions">
            {item.actions.map((a, i) => (
              <Button
                key={`${i}-${a.label}`}
                size="sm"
                variant={i === 0 ? 'secondary' : 'ghost'}
                onClick={() => {
                  onRead()
                  a.onClick()
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ev-notice-side">
        {!item.read ? (
          <Tooltip content={t.notifications.markRead}>
            <button
              type="button"
              className="ev-notice-dot"
              aria-label={t.notifications.markRead}
              onClick={onRead}
            >
              <span aria-hidden="true" />
            </button>
          </Tooltip>
        ) : null}
        <IconButton
          size="sm"
          className="ev-notice-remove"
          label={t.notifications.remove}
          icon={<X size={14} />}
          onClick={onRemove}
        />
      </div>
    </li>
  )
}

/** Кнопка-колокольчик: счётчик поверх иконки, подпись - в подсказке и aria-label. */
function BellButton({
  label,
  count,
  icon,
  ref,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  count: number
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}) {
  const t = useMessages()
  const aria = count > 0 ? `${label}. ${t.notifications.unread(count)}` : label
  return (
    <Tooltip content={label}>
      <button
        ref={ref}
        type="button"
        className="ev-btn ev-btn-iconic ev-notify-bell"
        data-variant="ghost"
        data-size="md"
        aria-label={aria}
        {...rest}
      >
        <span className="ev-btn-icon">{icon ?? <Bell size={18} />}</span>
        {count > 0 ? (
          <span className="ev-notify-count ev-num" aria-hidden="true">
            {count > 99 ? '99+' : count.toLocaleString(t.intl)}
          </span>
        ) : null}
      </button>
    </Tooltip>
  )
}

export interface NotificationCenterProps extends Omit<
  NotificationListProps,
  'title' | 'header' | 'className'
> {
  /** Панель у колокольчика (popover, по умолчанию) или шторка справа (drawer). */
  variant?: 'popover' | 'drawer'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Положение поповера (по умолчанию bottom-end). */
  placement?: Placement
  /** Своя иконка колокольчика. */
  icon?: ReactNode
  className?: string
  /** Класс панели (поповера или шторки). */
  panelClassName?: string
}

/** Колокольчик со счётчиком непрочитанных и панелью истории уведомлений. */
export function NotificationCenter({
  variant = 'popover',
  open: openProp,
  onOpenChange,
  placement = 'bottom-end',
  icon,
  className,
  panelClassName,
  ...list
}: NotificationCenterProps) {
  const t = useMessages()
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }
  const unread = countUnread(list.items)

  if (variant === 'drawer') {
    return (
      <>
        <BellButton
          label={t.notifications.open}
          count={unread}
          icon={icon}
          className={className}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        />
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title={t.notifications.title}
          width={420}
          className={cx('ev-notices-drawer', panelClassName)}
        >
          <NotificationList {...list} title={false} />
        </Drawer>
      </>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      label={t.notifications.title}
      className={cx('ev-notices-popover', panelClassName)}
      trigger={<BellButton label={t.notifications.open} count={unread} icon={icon} className={className} />}
    >
      <NotificationList {...list} />
    </Popover>
  )
}
