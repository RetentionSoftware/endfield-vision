'use client'

import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { AnimatedText } from './AnimatedNumber'
import { Avatar, type Tone } from './Display'
import { Breadcrumbs, type Crumb } from './Page'
import { CopyValue } from './Utility'

/*
 * Шапка карточки сущности (клиент, объект, подрядчик): аватар или иконка,
 * название с бейджами статуса, подзаголовок, строка идентификаторов (код,
 * ИНН, номер договора - с копированием), ключевые цифры и действия. На узком
 * контейнере действия уходят под заголовок. tone помечает шапку уголками
 * видоискателя в цвете тона - вместо цветной полосы по краю.
 */

export interface RecordIdentifier {
  /** Ключ для списка; по умолчанию - значение. */
  key?: string
  label: ReactNode
  value: string
  /** Кнопка копирования значения (CopyValue). */
  copy?: boolean
  /** Подсказка копирования для скринридера: «Скопировать ИНН». По умолчанию - из словаря. */
  copyLabel?: string
  /** Моноширинное значение (по умолчанию да). */
  mono?: boolean
}

export interface RecordStat {
  key?: string
  label: ReactNode
  value: ReactNode
  /** Строка под значением. */
  hint?: ReactNode
  /** Цвет значения (просрочено - danger). */
  tone?: Tone
}

export interface RecordHeaderProps {
  /** Узел (Avatar, иконка) или имя: из него Avatar. */
  avatar?: ReactNode
  /** Размер аватара из имени, px. */
  avatarSize?: number
  title: ReactNode
  subtitle?: ReactNode
  /** Бейджи и статусы рядом с заголовком. */
  meta?: ReactNode
  /** Идентификаторы под заголовком. */
  identifiers?: RecordIdentifier[]
  /** Ключевые цифры под шапкой. */
  stats?: RecordStat[]
  /** Кнопки действий. */
  actions?: ReactNode
  /** Метка тона: уголки видоискателя в цвете тона. */
  tone?: Tone
  breadcrumbs?: Crumb[]
  /** Набор чисел в stats при появлении (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Вкладки или фильтры под шапкой. */
  children?: ReactNode
  /** Уровень заголовка (вид тот же). */
  headingLevel?: 1 | 2 | 3
  className?: string
}

export function RecordHeader({
  avatar,
  avatarSize = 56,
  title,
  subtitle,
  meta,
  identifiers,
  stats,
  actions,
  tone,
  breadcrumbs,
  animate,
  children,
  headingLevel = 1,
  className,
}: RecordHeaderProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3'
  const avatarNode = typeof avatar === 'string' ? <Avatar name={avatar} size={avatarSize} /> : avatar
  return (
    <div className={cx('ev-record-header', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}
      <header
        className={cx('ev-panel ev-record-hero', tone && 'ev-corners')}
        data-tone={tone}
        data-corners={tone ? 'diagonal' : undefined}
      >
        <div className="ev-record-hero-row">
          {avatarNode ? <div className="ev-record-avatar">{avatarNode}</div> : null}
          <div className="ev-record-titles">
            <div className="ev-record-title-row">
              <Heading className="ev-record-title">{title}</Heading>
              {meta ? <div className="ev-record-meta">{meta}</div> : null}
            </div>
            {subtitle ? <p className="ev-record-subtitle">{subtitle}</p> : null}
            {identifiers && identifiers.length > 0 ? (
              <dl className="ev-record-ids">
                {identifiers.map((it) => (
                  <div key={it.key ?? it.value} className="ev-record-id">
                    <dt className="ev-record-id-label">{it.label}</dt>
                    <dd className="ev-record-id-value">
                      {it.copy ? (
                        <CopyValue value={it.value} label={it.copyLabel} mono={it.mono ?? true} size="sm" />
                      ) : (
                        <span className={cx(it.mono !== false && 'ev-mono')}>{it.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          {actions ? <div className="ev-record-actions">{actions}</div> : null}
        </div>
        {stats && stats.length > 0 ? (
          <dl className="ev-record-stats">
            {stats.map((s, i) => (
              <div key={s.key ?? i} className="ev-record-stat" data-tone={s.tone}>
                <dt className="ev-record-stat-label">{s.label}</dt>
                <dd className="ev-record-stat-value">
                  <span className="ev-num">
                    <AnimatedText animate={animate}>{s.value}</AnimatedText>
                  </span>
                  {s.hint ? <span className="ev-record-stat-hint">{s.hint}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children ? <div className="ev-record-extra">{children}</div> : null}
      </header>
    </div>
  )
}
