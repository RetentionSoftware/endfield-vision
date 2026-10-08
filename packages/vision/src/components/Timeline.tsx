'use client'

import { useId, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Button } from './Button'
import type { Tone } from './Display'

/*
 * Лента событий: журнал объекта, этапы доставки, ход инцидента.
 * Маркер окрашен тоном события, между маркерами - вертикальная линия.
 * Будущий шаг (pending) - полый маркер, линия к нему пунктирная.
 */

export interface TimelineItem {
  id: string
  title: ReactNode
  description?: ReactNode
  /** Время события справа от заголовка. */
  time?: ReactNode
  /** Цвет маркера. По умолчанию - neutral. */
  tone?: Tone
  /** Иконка в маркере вместо точки. */
  icon?: ReactNode
  /** Строка под описанием: автор, ссылки, бейджи. */
  meta?: ReactNode
  /** Будущий шаг: полый маркер, пунктирная линия к нему. */
  pending?: boolean
}

export interface TimelineProps {
  items: TimelineItem[]
  variant?: 'default' | 'compact'
  /** Сколько событий показать до кнопки «Показать ещё». По умолчанию - все. */
  maxItems?: number
  'aria-label'?: string
  className?: string
}

export function Timeline({ items, variant = 'default', maxItems, 'aria-label': ariaLabel, className }: TimelineProps) {
  const t = useMessages()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const limit = maxItems !== undefined && maxItems >= 0 && maxItems < items.length ? maxItems : null
  const visible = limit !== null && !expanded ? items.slice(0, limit) : items
  const hiddenCount = limit === null ? 0 : items.length - limit

  return (
    <div className={cx('ev-timeline', className)} data-variant={variant}>
      <ol role="list" id={listId} className="ev-timeline-list" aria-label={ariaLabel ?? t.timeline.label}>
        {visible.map((it, i) => {
          const next = visible[i + 1]
          return (
            <li
              key={it.id}
              className="ev-timeline-item"
              data-tone={it.tone ?? 'neutral'}
              data-pending={it.pending || undefined}
              data-icon={it.icon ? '' : undefined}
              data-next-pending={next?.pending || undefined}
              data-next-icon={next?.icon ? '' : undefined}
            >
              <span className="ev-timeline-marker" aria-hidden="true">
                {it.icon ? <span className="ev-timeline-icon">{it.icon}</span> : <span className="ev-timeline-dot" />}
              </span>
              <div className="ev-timeline-content">
                <div className="ev-timeline-head">
                  <div className="ev-timeline-title">
                    {it.title}
                    {it.pending ? <span className="ev-visually-hidden"> ({t.timeline.pending})</span> : null}
                  </div>
                  {it.time ? <div className="ev-timeline-time ev-num">{it.time}</div> : null}
                </div>
                {it.description ? <div className="ev-timeline-desc">{it.description}</div> : null}
                {it.meta ? <div className="ev-timeline-meta">{it.meta}</div> : null}
              </div>
            </li>
          )
        })}
      </ol>
      {hiddenCount > 0 ? (
        <div className="ev-timeline-more">
          <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((v) => !v)}>
            {expanded ? t.timeline.showLess : t.timeline.showMore(hiddenCount)}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
