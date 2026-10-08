'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useControllable } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Button } from './Button'

/*
 * Аккордеон и одиночный раскрывающийся блок. Заголовок - кнопка внутри
 * заголовка документа (h3 по умолчанию) с aria-expanded / aria-controls,
 * панель - role="region". Высота анимируется через grid-template-rows
 * 0fr -> 1fr; свёрнутая панель скрыта visibility (недоступна фокусу и скринридеру).
 */

export interface AccordionItem {
  id: string
  title: ReactNode
  content: ReactNode
  icon?: ReactNode
  /** Справа в заголовке: счётчик, статус, дата. */
  meta?: ReactNode
  disabled?: boolean
}

type HeadingLevel = 2 | 3 | 4 | 5 | 6

export interface AccordionProps {
  items: AccordionItem[]
  /** Несколько открытых секций одновременно. По умолчанию открыта не больше одной. */
  multiple?: boolean
  /** Открытые секции (id), контролируемый режим. */
  value?: string[]
  /** Открытые секции при первом рендере. */
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** separated - отдельные карточки на поверхности, flush - список с разделителями. */
  variant?: 'separated' | 'flush'
  /** Кнопка «Развернуть все / Свернуть все» над списком (только при multiple). */
  showExpandAll?: boolean
  /** Уровень заголовков секций в структуре страницы. По умолчанию - 3. */
  headingLevel?: HeadingLevel
  className?: string
}

/** Новое множество открытых секций после щелчка по секции id. */
export function toggleAccordionValue(value: string[], id: string, multiple: boolean): string[] {
  const open = value.includes(id)
  if (multiple) return open ? value.filter((v) => v !== id) : [...value, id]
  return open ? [] : [id]
}

/** id секций, которые можно открыть (без отключённых). */
export function expandableIds(items: Pick<AccordionItem, 'id' | 'disabled'>[]): string[] {
  return items.filter((it) => !it.disabled).map((it) => it.id)
}

/** Перевод фокуса между заголовками стрелками, Home и End. */
function onHeadersKey(e: KeyboardEvent<HTMLElement>, root: HTMLElement | null) {
  if (!root || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
  const target = e.target as HTMLElement
  if (!target.hasAttribute('data-ev-accordion-trigger')) return
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ev-accordion-trigger]')).filter(
    (b) => !b.disabled && b.closest('.ev-accordion') === root,
  )
  const i = triggers.indexOf(target as HTMLButtonElement)
  if (i < 0) return
  const n = triggers.length
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n
  e.preventDefault()
  triggers[next]?.focus()
}

/** Панель с анимацией высоты. */
function Collapse({ open, id, children, ...rest }: { open: boolean; id: string; children: ReactNode; role?: string; 'aria-labelledby'?: string; className?: string }) {
  return (
    <div {...rest} id={id} className={cx('ev-collapse', rest.className)} data-open={open || undefined}>
      <div className="ev-collapse-inner">{children}</div>
    </div>
  )
}

export function Accordion({
  items,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
  variant = 'separated',
  showExpandAll = false,
  headingLevel = 3,
  className,
}: AccordionProps) {
  const t = useMessages()
  const base = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [openIds, setOpenIds] = useControllable(value, defaultValue ?? [], onValueChange)
  const Heading = `h${headingLevel}` as const
  const enabled = expandableIds(items)
  const allOpen = enabled.length > 0 && enabled.every((id) => openIds.includes(id))

  return (
    <div className={cx('ev-accordion-wrap', className)}>
      {multiple && showExpandAll && enabled.length > 0 ? (
        <div className="ev-accordion-toolbar">
          <Button variant="ghost" size="sm" onClick={() => setOpenIds(allOpen ? [] : enabled)}>
            {allOpen ? t.accordion.collapseAll : t.accordion.expandAll}
          </Button>
        </div>
      ) : null}
      <div ref={rootRef} className="ev-accordion" data-variant={variant} onKeyDown={(e) => onHeadersKey(e, rootRef.current)}>
        {items.map((it, i) => {
          const open = openIds.includes(it.id) && !it.disabled
          // id в DOM - по индексу: id секции может содержать пробелы, а aria-controls - список через пробел.
          const triggerId = `${base}-t${i}`
          const panelId = `${base}-p${i}`
          return (
            <div key={it.id} className="ev-accordion-item" data-open={open || undefined} data-disabled={it.disabled || undefined}>
              <Heading className="ev-accordion-heading">
                <button
                  type="button"
                  id={triggerId}
                  className="ev-accordion-trigger"
                  aria-expanded={open}
                  aria-controls={panelId}
                  disabled={it.disabled}
                  data-ev-accordion-trigger=""
                  onClick={() => setOpenIds(toggleAccordionValue(openIds, it.id, multiple))}
                >
                  {it.icon ? (
                    <span className="ev-accordion-icon" aria-hidden="true">
                      {it.icon}
                    </span>
                  ) : null}
                  <span className="ev-accordion-title">{it.title}</span>
                  {it.meta ? <span className="ev-accordion-meta">{it.meta}</span> : null}
                  <ChevronDown size={16} className="ev-accordion-chevron" aria-hidden="true" />
                </button>
              </Heading>
              <Collapse open={open} id={panelId} role="region" aria-labelledby={triggerId}>
                <div className="ev-accordion-content">{it.content}</div>
              </Collapse>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface DisclosureProps {
  /** Подпись кнопки-переключателя. */
  title: ReactNode
  children: ReactNode
  /** Открыт (контролируемый режим). */
  open?: boolean
  /** Открыт при первом рендере. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  className?: string
}

/** Одиночный раскрывающийся блок: подробности, дополнительные параметры формы. */
export function Disclosure({ title, children, open, defaultOpen = false, onOpenChange, disabled = false, className }: DisclosureProps) {
  const panelId = useId()
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange)
  const shown = isOpen && !disabled
  return (
    <div className={cx('ev-disclosure', className)} data-open={shown || undefined}>
      <button
        type="button"
        className="ev-disclosure-trigger"
        aria-expanded={shown}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
      >
        <ChevronDown size={16} className="ev-disclosure-chevron" aria-hidden="true" />
        <span>{title}</span>
      </button>
      <Collapse open={shown} id={panelId}>
        <div className="ev-disclosure-content">{children}</div>
      </Collapse>
    </div>
  )
}
