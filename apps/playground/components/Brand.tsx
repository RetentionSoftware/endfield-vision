import { cx } from 'endfield-vision'

/** Знак Endfield Vision: линза-апертура на плашке акцентного цвета. Цвета - токены темы. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cx('pg-brand-mark', className)}>
      <rect width="32" height="32" rx="8" fill="var(--ev-accent-strong)" />
      <path
        d="M4.5 16c2.9-4.9 6.8-7.4 11.5-7.4s8.6 2.5 11.5 7.4c-2.9 4.9-6.8 7.4-11.5 7.4S7.4 20.9 4.5 16Z"
        fill="none"
        stroke="var(--ev-text-on-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.2" fill="var(--ev-text-on-accent)" />
      <path d="M16 4.5v3.2M16 24.3v3.2" stroke="var(--ev-text-on-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function Brand({ compact = false, subtitle }: { compact?: boolean; subtitle?: string }) {
  return (
    <span className="pg-brand">
      <BrandMark />
      {!compact ? (
        <span className="pg-brand-text">
          <span className="pg-brand-name">
            ENDFIELD <span className="pg-brand-accent">Vision</span>
          </span>
          {subtitle ? <span className="pg-brand-sub">{subtitle}</span> : null}
        </span>
      ) : null}
    </span>
  )
}
