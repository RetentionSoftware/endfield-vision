'use client'

import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useControllable, useIsoLayoutEffect } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Button } from './Button'

export interface ExpandableTextProps {
  children: ReactNode
  /** Сколько строк видно в свёрнутом виде (по умолчанию 3). */
  lines?: number
  /** Управляемое состояние. */
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
}

/**
 * Длинный текст, обрезанный до нескольких строк, с кнопкой «Показать
 * полностью». Кнопка появляется, только если текст правда не помещается:
 * это измеряется после монтирования (ResizeObserver). До измерения место
 * под кнопку уже занято (она невидима), поэтому у длинного текста нет
 * скачка вёрстки; у короткого место освобождается после измерения.
 */
export function ExpandableText({ children, lines = 3, expanded: expandedProp, defaultExpanded = false, onExpandedChange, className }: ExpandableTextProps) {
  const t = useMessages()
  const textId = useId()
  const textRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useControllable(expandedProp, defaultExpanded, onExpandedChange)
  // null - ещё не измерено (сервер и первый клиентский рендер).
  const [overflows, setOverflows] = useState<boolean | null>(null)

  useIsoLayoutEffect(() => {
    // Развёрнутый текст не обрезан - мерить нечего, кнопка нужна, чтобы свернуть.
    if (expanded) return
    const el = textRef.current
    if (!el) return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [expanded, lines, children])

  const showToggle = expanded || overflows !== false
  const pending = !expanded && overflows === null

  return (
    <div className={cx('ev-expandable', className)} data-expanded={expanded || undefined}>
      <div ref={textRef} id={textId} className="ev-expandable-text" style={{ '--ev-expandable-lines': lines } as CSSProperties}>
        {children}
      </div>
      {showToggle ? (
        <Button
          variant="link"
          size="sm"
          className="ev-expandable-toggle"
          aria-expanded={expanded}
          aria-controls={textId}
          data-pending={pending || undefined}
          aria-hidden={pending || undefined}
          tabIndex={pending ? -1 : undefined}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t.expandableText.less : t.expandableText.more}
        </Button>
      ) : null}
    </div>
  )
}
