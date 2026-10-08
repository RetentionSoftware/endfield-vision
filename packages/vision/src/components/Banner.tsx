'use client'

import { CircleCheck, Info, Megaphone, OctagonAlert, TriangleAlert, X } from 'lucide-react'
import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { IconButton } from './Button'

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral'

export interface BannerProps {
  tone?: BannerTone
  title?: ReactNode
  children?: ReactNode
  /** Своя иконка; false - без иконки. По умолчанию - иконка тона. */
  icon?: ReactNode | false
  /** Кнопки справа; на узком экране - под текстом. */
  actions?: ReactNode
  /** Кнопка «Скрыть». */
  dismissible?: boolean
  onDismiss?: () => void
  /**
   * Ключ localStorage: скрытый баннер не показывается снова. Состояние
   * читается после гидрации - сервер всегда рендерит баннер.
   */
  storageKey?: string
  /** Прилипает к верху прокручиваемой области (top - переменная --ev-banner-top). */
  sticky?: boolean
  className?: string
}

const ICONS: Record<BannerTone, ReactNode> = {
  info: <Info size={18} />,
  success: <CircleCheck size={18} />,
  warning: <TriangleAlert size={18} />,
  danger: <OctagonAlert size={18} />,
  accent: <Megaphone size={18} />,
  neutral: <Info size={18} />,
}

/* Хранилище скрытых баннеров: localStorage может быть недоступен (приватный режим, запрет cookies). */
const listeners = new Set<() => void>()

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeDismissed(key: string): void {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    // без хранилища баннер скрывается только до перезагрузки
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

const getServerDismissed = () => false

/** Скрыт ли баннер по ключу. На сервере и при гидрации - нет. */
function useStoredDismissed(key: string | undefined): boolean {
  const get = useCallback(() => (key ? readDismissed(key) : false), [key])
  return useSyncExternalStore(subscribe, get, getServerDismissed)
}

/**
 * Объявление во всю ширину: вверху страницы или над шапкой раздела.
 * Сильнее Callout: тонированная полоса с кромкой тона. Ошибка объявляется
 * скринридером сразу (role=alert), остальное - вежливо (role=status).
 */
export function Banner({
  tone = 'info',
  title,
  children,
  icon,
  actions,
  dismissible = false,
  onDismiss,
  storageKey,
  sticky = false,
  className,
}: BannerProps) {
  const t = useMessages()
  const [dismissed, setDismissed] = useState(false)
  const stored = useStoredDismissed(storageKey)
  if (dismissed || stored) return null

  const dismiss = () => {
    setDismissed(true)
    if (storageKey) writeDismissed(storageKey)
    onDismiss?.()
  }

  return (
    <div className={cx('ev-banner', className)} data-tone={tone} data-sticky={sticky || undefined} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon !== false ? (
        <span className="ev-banner-icon" aria-hidden="true">
          {icon ?? ICONS[tone]}
        </span>
      ) : null}
      <div className="ev-banner-body">
        {title ? <div className="ev-banner-title">{title}</div> : null}
        {children ? <div className="ev-banner-text">{children}</div> : null}
      </div>
      {actions ? <div className="ev-banner-actions">{actions}</div> : null}
      {dismissible ? (
        <IconButton className="ev-banner-close" size="sm" label={t.banner.dismiss} icon={<X size={15} />} onClick={dismiss} />
      ) : null}
    </div>
  )
}
