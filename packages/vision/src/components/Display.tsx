'use client'

import { TriangleAlert, CircleCheck, Info, OctagonAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { cx, EMPTY_VALUE } from '../lib/cx'
import { useMessages } from '../lib/i18n'

/*
 * Простые компоненты отображения без состояния: бейджи, карточки,
 * плашки, списки «ключ - значение», скелетоны, аватар, разделитель, прогресс.
 */

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  /** Заливка вместо мягкого фона. */
  solid?: boolean
  /** Точка-индикатор слева. */
  dot?: boolean
  icon?: ReactNode
  size?: 'sm' | 'md'
}

export function Badge({ tone = 'neutral', solid = false, dot = false, icon, size = 'md', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('ev-badge', className)} data-tone={tone} data-solid={solid || undefined} data-size={size} {...rest}>
      {dot ? <span className="ev-badge-dot" aria-hidden="true" /> : null}
      {icon ? <span className="ev-badge-icon">{icon}</span> : null}
      {children}
    </span>
  )
}

/** Статус сущности: точка + подпись. Цвет никогда не единственный носитель смысла. */
export function StatusPill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge tone={tone} dot className={cx('ev-status-pill', className)}>
      {children}
    </Badge>
  )
}

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Строка под заголовком. */
  description?: ReactNode
  /** Кнопки справа в шапке. */
  actions?: ReactNode
  /** Подвал карточки. */
  footer?: ReactNode
  /** Без внутренних отступов тела (таблица во всю ширину). */
  flush?: boolean
  /** Иконка слева от заголовка. */
  icon?: ReactNode
  /** Строка между шапкой и телом: фильтры, поиск. У flush-карточки - с отступами карточки. */
  toolbar?: ReactNode
  as?: 'section' | 'div' | 'article'
}

export function Card({ title, description, actions, footer, flush = false, icon, toolbar, as = 'section', className, children, ...rest }: CardProps) {
  const Tag = as
  const hasHead = title || description || actions
  return (
    <Tag className={cx('ev-card', className)} {...rest}>
      {hasHead ? (
        <header className="ev-card-head">
          {icon ? <span className="ev-card-icon">{icon}</span> : null}
          <div className="ev-card-titles">
            {title ? <h2 className="ev-card-title">{title}</h2> : null}
            {description ? <p className="ev-card-desc">{description}</p> : null}
          </div>
          {actions ? <div className="ev-card-actions">{actions}</div> : null}
        </header>
      ) : null}
      {toolbar ? <div className="ev-card-toolbar">{toolbar}</div> : null}
      <div className={cx('ev-card-body', flush && 'ev-card-body-flush')}>{children}</div>
      {footer ? <footer className="ev-card-foot">{footer}</footer> : null}
    </Tag>
  )
}

/** Панель без шапки: плоский блок на поверхности. */
export function Panel({ className, children, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={cx('ev-panel', padded && 'ev-panel-padded', className)} {...rest}>
      {children}
    </div>
  )
}

export interface CalloutProps {
  tone?: Exclude<Tone, 'neutral' | 'violet' | 'accent'> | 'neutral'
  title?: ReactNode
  children?: ReactNode
  /** Кнопки справа или под текстом. */
  actions?: ReactNode
  icon?: ReactNode | false
  className?: string
}

const CALLOUT_ICONS = {
  info: <Info size={17} />,
  success: <CircleCheck size={17} />,
  warning: <TriangleAlert size={17} />,
  danger: <OctagonAlert size={17} />,
  neutral: <Info size={17} />,
}

/** Плашка-сообщение внутри страницы: предупреждение, пояснение, итог. */
export function Callout({ tone = 'info', title, children, actions, icon, className }: CalloutProps) {
  return (
    <div className={cx('ev-callout', className)} data-tone={tone} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'note'}>
      {icon !== false ? (
        <span className="ev-callout-icon" aria-hidden="true">
          {icon ?? CALLOUT_ICONS[tone]}
        </span>
      ) : null}
      <div className="ev-callout-body">
        {title ? <div className="ev-callout-title">{title}</div> : null}
        {children ? <div className="ev-callout-text">{children}</div> : null}
      </div>
      {actions ? <div className="ev-callout-actions">{actions}</div> : null}
    </div>
  )
}

export interface KeyValueItem {
  key: string
  label: ReactNode
  value: ReactNode
  /** Подсказка под значением. */
  hint?: ReactNode
  /** Моноширинное значение (коды, номера). */
  mono?: boolean
}

/** Список «ключ - значение» (карточка сущности). Пустое значение - приглушённый дефис. */
export function KeyValueList({
  items,
  columns = 1,
  className,
  labelWidth,
}: {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3
  className?: string
  labelWidth?: number
}) {
  return (
    <dl
      className={cx('ev-kv', className)}
      data-columns={columns}
      style={labelWidth ? ({ '--ev-kv-label-w': `${labelWidth}px` } as CSSProperties) : undefined}
    >
      {items.map((it) => {
        const empty = it.value === null || it.value === undefined || it.value === ''
        return (
          <div key={it.key} className="ev-kv-row">
            <dt className="ev-kv-label">{it.label}</dt>
            <dd className={cx('ev-kv-value', it.mono && 'ev-mono')}>
              {empty ? <span className="ev-empty-value">{EMPTY_VALUE}</span> : it.value}
              {it.hint ? <span className="ev-kv-hint">{it.hint}</span> : null}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function Skeleton({
  width,
  height = 14,
  radius,
  className,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
  style?: CSSProperties
}) {
  return <span className={cx('ev-skeleton', className)} aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
}

/** Несколько строк текста-заглушки. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('ev-skeleton-text', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  )
}

export function Divider({ label, className, vertical = false }: { label?: ReactNode; className?: string; vertical?: boolean }) {
  if (vertical) return <span className={cx('ev-divider-v', className)} role="separator" aria-orientation="vertical" />
  return label ? (
    <div className={cx('ev-divider ev-divider-labeled', className)} role="separator">
      <span>{label}</span>
    </div>
  ) : (
    <hr className={cx('ev-divider', className)} />
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx('ev-kbd', className)}>{children}</kbd>
}

/** Инициалы: «Иванов Пётр» -> «ИП», «admin» -> «AD». */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

const AVATAR_TONES: Tone[] = ['accent', 'info', 'success', 'violet', 'warning']

function hashTone(name: string): Tone {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]!
}

export interface AvatarProps {
  /** Имя: из него инициалы и цвет. */
  name: string
  size?: number
  tone?: Tone
  /** Фото. Не загрузилось - инициалы. */
  src?: string
  /** Подпись для скринридера. Без неё аватар декоративный (aria-hidden). */
  alt?: string
  className?: string
}

export function Avatar({ name, size = 32, tone, src, alt, className }: AvatarProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImg = Boolean(src) && failedSrc !== src
  const labelled = Boolean(alt)

  // Ошибка загрузки до гидрации не доходит до onError: проверяем картинку после монтирования.
  useEffect(() => {
    const img = imgRef.current
    if (src && img && img.complete && img.naturalWidth === 0) setFailedSrc(src)
  }, [src])

  return (
    <span
      className={cx('ev-avatar', className)}
      data-tone={tone ?? hashTone(name)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? alt : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {showImg ? (
        // Библиотека не завязана на next/image: обычный img.
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} className="ev-avatar-img" src={src} alt="" draggable={false} onError={() => setFailedSrc(src ?? null)} />
      ) : (
        initials(name)
      )}
    </span>
  )
}

export interface StatTileProps {
  label: ReactNode
  value: ReactNode
  /** Изменение к прошлому периоду: число со знаком (в процентах или единицах). */
  delta?: number | null
  /** Подпись к дельте: «к прошлому месяцу». */
  deltaLabel?: ReactNode
  /** Как форматировать дельту. По умолчанию «+12%». */
  formatDelta?: (delta: number) => string
  /** Рост - хорошо (по умолчанию) или плохо (долг, ошибки). */
  positiveIsGood?: boolean
  /** Строка под значением. */
  hint?: ReactNode
  icon?: ReactNode
  tone?: Tone
  /** Значение-заглушка во время загрузки. */
  loading?: boolean
  /** Мини-график под значением. */
  trend?: ReactNode
  className?: string
}

/** Плитка показателя (KPI) с изменением к прошлому периоду. */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  formatDelta: formatDeltaProp,
  positiveIsGood = true,
  hint,
  icon,
  tone = 'accent',
  loading = false,
  trend,
  className,
}: StatTileProps) {
  const { intl } = useMessages()
  const formatDelta = formatDeltaProp ?? ((d: number) => `${d > 0 ? '+' : ''}${d.toLocaleString(intl, { maximumFractionDigits: 1 })}%`)
  const dir = delta === null || delta === undefined || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  const good = dir === 'flat' ? null : (dir === 'up') === positiveIsGood
  return (
    <div className={cx('ev-stat', className)} data-tone={tone}>
      <div className="ev-stat-head">
        {icon ? (
          <span className="ev-stat-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="ev-stat-label">{label}</span>
      </div>
      <div className="ev-stat-value ev-num">{loading ? <Skeleton width={96} height={26} /> : value}</div>
      {!loading && delta !== undefined && delta !== null ? (
        <div className="ev-stat-delta" data-good={good === null ? undefined : good ? 'true' : 'false'}>
          <span className="ev-num">
            {dir === 'up' ? '↑ ' : dir === 'down' ? '↓ ' : ''}
            {formatDelta(delta)}
          </span>
          {deltaLabel ? <span className="ev-stat-delta-label">{deltaLabel}</span> : null}
        </div>
      ) : null}
      {hint ? <div className="ev-stat-hint">{hint}</div> : null}
      {trend ? <div className="ev-stat-trend">{trend}</div> : null}
    </div>
  )
}

export interface ProgressProps {
  /** Текущее значение; null - неопределённый прогресс (бегущая полоса). */
  value: number | null
  max?: number
  tone?: Tone
  /** Тон при превышении (value > max): полоса во всю ширину, значение - реальное. */
  overTone?: Tone
  size?: 'sm' | 'md'
  /** Подпись над полосой. */
  label?: ReactNode
  /** Значение справа над полосой: true - проценты, функция - свой формат (получает реальное значение, в том числе больше max). */
  showValue?: boolean | ((value: number, max: number) => ReactNode)
  /** Подпись для скринридера, если видимой подписи нет. */
  'aria-label'?: string
  className?: string
}

/** Полоса прогресса: загрузка, заполненность, выполнение плана. */
export function Progress({
  value,
  max = 100,
  tone = 'accent',
  overTone = 'danger',
  size = 'md',
  label,
  showValue = false,
  className,
  ...aria
}: ProgressProps) {
  const labelId = useId()
  const clamped = value === null ? null : Math.min(Math.max(value, 0), max)
  const pct = clamped === null || max <= 0 ? 0 : (clamped / max) * 100
  const over = value !== null && max > 0 && value > max
  const realPct = over ? (value / max) * 100 : pct
  const shown =
    value === null || !showValue
      ? null
      : typeof showValue === 'function'
        ? showValue(over ? value : (clamped ?? 0), max)
        : `${Math.round(realPct)}%`
  return (
    <div className={cx('ev-progress', className)} data-tone={over ? overTone : tone} data-size={size} data-over={over || undefined}>
      {label || shown !== null ? (
        <div className="ev-progress-head">
          {label ? (
            <span id={labelId} className="ev-progress-label">
              {label}
            </span>
          ) : (
            <span />
          )}
          {shown !== null ? <span className="ev-progress-value ev-num">{shown}</span> : null}
        </div>
      ) : null}
      <div
        className="ev-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped ?? undefined}
        aria-valuetext={over ? `${Math.round(realPct)}%` : undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : aria['aria-label']}
        data-indeterminate={clamped === null || undefined}
      >
        <div className="ev-progress-bar" style={clamped === null ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  )
}
