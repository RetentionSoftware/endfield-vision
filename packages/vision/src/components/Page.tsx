'use client'

import { ChevronRight, CircleAlert, Inbox, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { UiLink } from '../lib/link'
import { Button } from './Button'

export interface Crumb {
  label: ReactNode
  href?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Навигационная цепочка" className={cx('ev-crumbs', className)}>
      <ol role="list">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <li key={i}>
              {c.href && !last ? (
                <UiLink href={c.href} className="ev-crumb-link">
                  {c.label}
                </UiLink>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'ev-crumb-here' : undefined}>
                  {c.label}
                </span>
              )}
              {!last ? <ChevronRight size={13} aria-hidden="true" className="ev-crumb-sep" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  breadcrumbs?: Crumb[]
  /** Кнопки действий справа. */
  actions?: ReactNode
  /** Бейджи рядом с заголовком (статус сущности). */
  meta?: ReactNode
  /** Вкладки или фильтры под заголовком. */
  children?: ReactNode
  className?: string
}

/** Шапка страницы: цепочка, заголовок с бейджами, описание, действия. */
export function PageHeader({ title, subtitle, breadcrumbs, actions, meta, children, className }: PageHeaderProps) {
  return (
    <header className={cx('ev-page-head', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="ev-page-head-row">
        <div className="ev-page-head-titles">
          <div className="ev-page-head-title-row">
            <h1 className="ev-page-title">{title}</h1>
            {meta ? <div className="ev-page-meta">{meta}</div> : null}
          </div>
          {subtitle ? <p className="ev-page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ev-page-actions">{actions}</div> : null}
      </div>
      {children ? <div className="ev-page-head-extra">{children}</div> : null}
    </header>
  )
}

/** Заголовок раздела внутри страницы. */
export function SectionTitle({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx('ev-section-title', className)}>
      <h2>{children}</h2>
      {actions ? <div className="ev-section-title-actions">{actions}</div> : null}
    </div>
  )
}

export interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  /** Компактный вариант внутри таблиц и карточек. */
  compact?: boolean
  className?: string
}

export function EmptyState({ title, description, icon, actions, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cx('ev-empty', className)} data-compact={compact || undefined}>
      <span className="ev-empty-icon" aria-hidden="true">
        {icon ?? <Inbox size={compact ? 20 : 26} />}
      </span>
      <div className="ev-empty-title">{title}</div>
      {description ? <div className="ev-empty-desc">{description}</div> : null}
      {actions ? <div className="ev-empty-actions">{actions}</div> : null}
    </div>
  )
}

export interface ErrorStateProps {
  title?: ReactNode
  /** Текст ошибки от сервера. */
  message?: ReactNode
  onRetry?: () => void
  retrying?: boolean
  /** Дополнительные действия (например, «К списку»). */
  actions?: ReactNode
  compact?: boolean
  className?: string
}

/** Ошибка загрузки: причина, «Повторить» и выход - со страницы всегда есть путь. */
export function ErrorState({
  title = 'Не удалось загрузить данные',
  message,
  onRetry,
  retrying = false,
  actions,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx('ev-empty ev-error-state', className)} data-compact={compact || undefined} role="alert">
      <span className="ev-empty-icon" aria-hidden="true">
        <CircleAlert size={compact ? 20 : 26} />
      </span>
      <div className="ev-empty-title">{title}</div>
      {message ? <div className="ev-empty-desc">{message}</div> : null}
      {onRetry || actions ? (
        <div className="ev-empty-actions">
          {onRetry ? (
            <Button size={compact ? 'sm' : 'md'} icon={<RotateCw size={14} />} loading={retrying} onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
