import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../lib/cx'

/*
 * Раскладка карточки сущности: основная колонка (блоки данных) и боковая
 * (статус, команда, теги, история). На ширине до 1100px колонки встают
 * друг под другом; боковая - снизу или сверху (sideFirstOnMobile).
 * Без хуков и текста - годится для серверных компонентов.
 */

export interface RecordLayoutProps {
  main: ReactNode
  side?: ReactNode
  /** Ширина боковой колонки: число в px или CSS-длина (по умолчанию 340px). */
  sideWidth?: number | string
  /** Боковая колонка прилипает при прокрутке (на широком экране). Для коротких колонок. */
  sticky?: boolean
  /** На узком экране боковая колонка - над основной. */
  sideFirstOnMobile?: boolean
  /** Подпись боковой колонки для скринридера. */
  sideLabel?: string
  className?: string
}

export function RecordLayout({
  main,
  side,
  sideWidth,
  sticky = false,
  sideFirstOnMobile = false,
  sideLabel,
  className,
}: RecordLayoutProps) {
  const hasSide = side !== undefined && side !== null && side !== false
  const style =
    sideWidth !== undefined
      ? ({ '--ev-record-side-w': typeof sideWidth === 'number' ? `${sideWidth}px` : sideWidth } as CSSProperties)
      : undefined
  return (
    <div
      className={cx('ev-record-layout', className)}
      data-side={hasSide || undefined}
      data-sticky={(hasSide && sticky) || undefined}
      data-side-first={(hasSide && sideFirstOnMobile) || undefined}
      style={style}
    >
      <div className="ev-record-main">{main}</div>
      {hasSide ? (
        <aside className="ev-record-side" aria-label={sideLabel}>
          {side}
        </aside>
      ) : null}
    </div>
  )
}
