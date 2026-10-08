import { cx } from '../lib/cx'

export interface SpinnerProps {
  size?: number
  className?: string
  /** Подпись для скринридера. */
  label?: string
}

export function Spinner({ size = 16, className, label = 'Загрузка' }: SpinnerProps) {
  return (
    <span
      className={cx('ev-spinner', className)}
      role="status"
      aria-label={label}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
    />
  )
}

/** Загрузка на всю область (страница, панель). */
export function LoadingBlock({ label = 'Загрузка', minHeight = 160 }: { label?: string; minHeight?: number }) {
  return (
    <div className="ev-loading-block" style={{ minHeight }}>
      <Spinner size={22} label={label} />
      <span className="ev-loading-block-label">{label}</span>
    </div>
  )
}
