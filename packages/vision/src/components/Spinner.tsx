'use client'

import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'

export interface SpinnerProps {
  size?: number
  className?: string
  /** Подпись для скринридера. */
  label?: string
}

export function Spinner({ size = 16, className, label }: SpinnerProps) {
  const t = useMessages()
  return (
    <span
      className={cx('ev-spinner', className)}
      role="status"
      aria-label={label ?? t.common.loading}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
    />
  )
}

/** Загрузка на всю область (страница, панель). */
export function LoadingBlock({ label, minHeight = 160 }: { label?: string; minHeight?: number }) {
  const t = useMessages()
  const text = label ?? t.common.loading
  return (
    <div className="ev-loading-block" style={{ minHeight }}>
      <Spinner size={22} label={text} />
      <span className="ev-loading-block-label">{text}</span>
    </div>
  )
}
