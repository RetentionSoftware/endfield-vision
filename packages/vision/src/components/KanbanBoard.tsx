'use client'

import { ArrowRightLeft } from 'lucide-react'
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cx } from '../lib/cx'
import { useEventCallback } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { UiLink } from '../lib/link'
import { Button, IconButton } from './Button'
import { Skeleton, type Tone } from './Display'
import { Menu, type MenuEntry } from './Menu'

/*
 * Канбан-доска: колонки статусов с карточками. Перенос мышью - нативный
 * drag and drop, на сенсорном экране - долгое нажатие и перетаскивание.
 * Доступная альтернатива перетаскиванию - меню «Переместить в ...» у каждой
 * карточки. Доска не хранит данные: перенос сообщается через onMove, новые
 * колонки приходят от приложения.
 */

export interface KanbanColumn<T> {
  id: string
  /** Название колонки: заголовок и пункт «Переместить в ...». */
  title: string
  /** Метка-точка у названия. */
  tone?: Tone
  items: T[]
  /** Всего карточек в колонке (на сервере). По умолчанию - items.length. */
  total?: number
  /** Есть ещё карточки. По умолчанию - total больше показанных. */
  hasMore?: boolean
  /** Подгрузка следующей порции: без него кнопки «Показать ещё» нет. */
  onLoadMore?: () => void
  /** Порция грузится: кнопка «Показать ещё» занята, пустая колонка - скелетоны. */
  loading?: boolean
  /** Справа в шапке колонки: кнопка «Добавить», меню. */
  actions?: ReactNode
}

/** Перенос карточки: index - позиция в целевой колонке после переноса. */
export type KanbanMoveHandler = (itemId: string, fromColumnId: string, toColumnId: string, index: number) => void

interface KanbanBoardBaseProps<T> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T, column: KanbanColumn<T>) => ReactNode
  getId: (item: T) => string
  /** Размер порции для подписи «Показать ещё N» (когда total неизвестен или остаток больше). */
  pageSize?: number
  /** Предел высоты списка карточек: дальше колонка прокручивается. */
  columnMaxHeight?: number | string
  /** Можно ли перенести карточку в колонку (запрет - пункт меню недоступен, бросить нельзя). */
  canMove?: (itemId: string, fromColumnId: string, toColumnId: string) => boolean
  /** Подпись доски для скринридера: доска становится областью (region). */
  'aria-label'?: string
  className?: string
}

type KanbanMoveProps<T> =
  | { onMove?: undefined; moveLabel?: undefined }
  | {
      /** Перенос карточек: включает перетаскивание и меню переноса. */
      onMove: KanbanMoveHandler
      /**
       * Подпись кнопки меню переноса (по умолчанию «Переместить» из словаря);
       * функция - с названием карточки, чтобы кнопки различались для скринридера.
       */
      moveLabel?: string | ((item: T) => string)
    }

export type KanbanBoardProps<T> = KanbanBoardBaseProps<T> & KanbanMoveProps<T>

interface DragState {
  id: string
  from: string
  fromIndex: number
}

interface DropTarget {
  columnId: string
  index: number
}

interface TouchDrag extends DragState {
  x: number
  y: number
  active: boolean
  timer: number | null
  cleanup: () => void
}

/** Долгое нажатие на сенсорном экране до начала перетаскивания, мс. */
const LONG_PRESS_MS = 350
/** Сдвиг пальца до начала перетаскивания: дальше - это прокрутка, px. */
const TOUCH_SLOP = 8
/** Зона у края доски, где перетаскивание пальцем прокручивает доску, px. */
const EDGE_ZONE = 48

/** Позиция вставки по вертикали: сколько карточек колонки выше точки. */
function indexInColumn(columnEl: Element, clientY: number): number {
  const items = columnEl.querySelectorAll<HTMLElement>('[data-kanban-item]')
  let index = 0
  for (const el of items) {
    const r = el.getBoundingClientRect()
    if (clientY > r.top + r.height / 2) index += 1
    else break
  }
  return index
}

/** Позиция в целевой колонке после переноса; null - карточка остаётся на месте. */
export function resolveKanbanDrop(drag: DragState, target: DropTarget): number | null {
  let index = target.index
  if (target.columnId === drag.from) {
    if (index > drag.fromIndex) index -= 1
    if (index === drag.fromIndex) return null
  }
  return index
}

export function KanbanBoard<T>(props: KanbanBoardProps<T>) {
  const { columns, renderCard, getId, pageSize = 20, columnMaxHeight, canMove, className, onMove, moveLabel } = props
  const t = useMessages()
  const baseId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const overRef = useRef<DropTarget | null>(null)
  const touchRef = useRef<TouchDrag | null>(null)
  const focusAfterMove = useRef<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [over, setOver] = useState<DropTarget | null>(null)

  const movable = Boolean(onMove)
  const allowed = (d: DragState, columnId: string) => !canMove || columnId === d.from || canMove(d.id, d.from, columnId)

  const updateOver = (next: DropTarget | null) => {
    const prev = overRef.current
    if (prev?.columnId === next?.columnId && prev?.index === next?.index) return
    overRef.current = next
    setOver(next)
  }

  const start = (d: DragState) => {
    dragRef.current = d
    setDrag(d)
  }

  const finish = () => {
    dragRef.current = null
    overRef.current = null
    setDrag(null)
    setOver(null)
  }

  const commit = useEventCallback(() => {
    const d = dragRef.current
    const target = overRef.current
    finish()
    if (!d || !target || !onMove || !allowed(d, target.columnId)) return
    const index = resolveKanbanDrop(d, target)
    if (index !== null) onMove(d.id, d.from, target.columnId, index)
  })

  // Фокус после переноса через меню: карточка уже в другой колонке, кнопка меню - новая.
  useEffect(() => {
    const id = focusAfterMove.current
    if (!id || !rootRef.current) return
    const btn = rootRef.current.querySelector<HTMLElement>(`[data-kanban-item="${CSS.escape(id)}"] .ev-kanban-move`)
    if (btn) {
      focusAfterMove.current = null
      btn.focus({ preventScroll: false })
    }
  })

  // Снятие слушателей пальца, если доска размонтирована посреди жеста.
  useEffect(() => () => touchRef.current?.cleanup(), [])

  /* --- Мышь: нативный drag and drop --- */

  const onDragStart = (e: DragEvent<HTMLElement>, d: DragState) => {
    // Браузер начал свой перенос по долгому нажатию пальцем: перетаскивание пальцем больше не нужно.
    if (touchRef.current) {
      touchRef.current.cleanup()
      touchRef.current = null
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', d.id)
    start(d)
  }

  const onColumnDragOver = (e: DragEvent<HTMLElement>, columnId: string) => {
    const d = dragRef.current
    if (!d || !allowed(d, columnId)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    updateOver({ columnId, index: indexInColumn(e.currentTarget, e.clientY) })
  }

  const onColumnDragLeave = (e: DragEvent<HTMLElement>, columnId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    if (overRef.current?.columnId === columnId) updateOver(null)
  }

  const onColumnDrop = (e: DragEvent<HTMLElement>) => {
    if (!dragRef.current) return
    e.preventDefault()
    commit()
  }

  /* --- Палец: долгое нажатие и перетаскивание --- */

  const hitFromPoint = (x: number, y: number): DropTarget | null => {
    const el = document.elementFromPoint(x, y)
    const col = el?.closest<HTMLElement>('[data-kanban-column]')
    if (!col || !rootRef.current?.contains(col)) return null
    const columnId = col.dataset.kanbanColumn ?? ''
    const d = dragRef.current
    if (!d || !allowed(d, columnId)) return null
    return { columnId, index: indexInColumn(col, y) }
  }

  const cancelTouch = () => {
    const s = touchRef.current
    if (!s) return
    s.cleanup()
    touchRef.current = null
    if (s.active) finish()
  }

  const onTouchMove = useEventCallback((e: PointerEvent) => {
    const s = touchRef.current
    if (!s) return
    if (!s.active) {
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TOUCH_SLOP) cancelTouch()
      return
    }
    updateOver(hitFromPoint(e.clientX, e.clientY))
    const board = rootRef.current
    if (board) {
      const r = board.getBoundingClientRect()
      if (e.clientX < r.left + EDGE_ZONE) board.scrollLeft -= 12
      else if (e.clientX > r.right - EDGE_ZONE) board.scrollLeft += 12
    }
  })

  const onTouchEnd = useEventCallback(() => {
    const s = touchRef.current
    if (!s) return
    const wasActive = s.active
    s.cleanup()
    touchRef.current = null
    if (wasActive) commit()
  })

  const onItemPointerDown = (e: ReactPointerEvent<HTMLElement>, d: DragState) => {
    if (e.pointerType !== 'touch' || !movable || e.button !== 0) return
    // Кнопка меню переноса и элементы управления внутри карточки - не начало перетаскивания.
    if ((e.target as Element).closest('.ev-kanban-move')) return
    touchRef.current?.cleanup()
    const move = (ev: PointerEvent) => onTouchMove(ev)
    const end = () => onTouchEnd()
    // Пока идёт перетаскивание, палец не прокручивает страницу.
    const block = (ev: TouchEvent) => {
      if (touchRef.current?.active) ev.preventDefault()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    document.addEventListener('touchmove', block, { passive: false })
    const s: TouchDrag = {
      ...d,
      x: e.clientX,
      y: e.clientY,
      active: false,
      timer: null,
      cleanup: () => {
        if (s.timer !== null) window.clearTimeout(s.timer)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
        document.removeEventListener('touchmove', block)
      },
    }
    s.timer = window.setTimeout(() => {
      s.timer = null
      s.active = true
      start(d)
      updateOver({ columnId: d.from, index: d.fromIndex })
    }, LONG_PRESS_MS)
    touchRef.current = s
  }

  const onItemContextMenu = (e: MouseEvent<HTMLElement>) => {
    // Долгое нажатие на сенсорном экране открывает системное меню: во время переноса - нет.
    if (touchRef.current) e.preventDefault()
  }

  /* --- Меню переноса: доступная альтернатива перетаскиванию --- */

  const moveMenu = (item: T, column: KanbanColumn<T>) => {
    if (!onMove) return null
    const id = getId(item)
    const entries: MenuEntry[] = columns
      .filter((c) => c.id !== column.id)
      .map((c) => ({
        id: c.id,
        label: t.kanban.moveTo(c.title),
        disabled: canMove ? !canMove(id, column.id, c.id) : false,
        onSelect: () => {
          focusAfterMove.current = id
          onMove(id, column.id, c.id, 0)
        },
      }))
    const label = typeof moveLabel === 'function' ? moveLabel(item) : (moveLabel ?? t.kanban.move)
    return (
      <Menu
        label={label}
        items={entries}
        trigger={<IconButton className="ev-kanban-move" label={label} size="sm" icon={<ArrowRightLeft size={14} />} />}
      />
    )
  }

  const boardStyle = columnMaxHeight !== undefined ? ({ '--ev-kanban-list-max': typeof columnMaxHeight === 'number' ? `${columnMaxHeight}px` : columnMaxHeight } as CSSProperties) : undefined

  return (
    <div
      ref={rootRef}
      className={cx('ev-kanban', className)}
      role={props['aria-label'] ? 'region' : undefined}
      aria-label={props['aria-label']}
      data-dragging={drag ? '' : undefined}
      style={boardStyle}
    >
      {columns.map((col) => {
        const titleId = `${baseId}-${col.id}-title`
        const shown = col.items.length
        const total = col.total ?? shown
        const remaining = col.total !== undefined ? Math.max(col.total - shown, 0) : undefined
        const hasMore = col.hasMore ?? (remaining !== undefined && remaining > 0)
        const nextCount = remaining !== undefined && remaining > 0 ? Math.min(pageSize, remaining) : pageSize
        const isOver = over?.columnId === col.id
        const noop = (index: number) => drag !== null && drag.from === col.id && (index === drag.fromIndex || index === drag.fromIndex + 1)
        const showIndicator = (index: number) => isOver && over.index === index && !noop(index)
        const indicator = (index: number) =>
          showIndicator(index) ? <li className="ev-kanban-drop" aria-hidden="true" /> : null
        return (
          <section
            key={col.id}
            className="ev-kanban-col ev-corners"
            data-corners={isOver ? 'frame' : 'off'}
            data-kanban-column={col.id}
            data-over={isOver || undefined}
            aria-labelledby={titleId}
            onDragOver={movable ? (e) => onColumnDragOver(e, col.id) : undefined}
            onDragLeave={movable ? (e) => onColumnDragLeave(e, col.id) : undefined}
            onDrop={movable ? onColumnDrop : undefined}
          >
            <header className="ev-kanban-head">
              {col.tone ? <span className="ev-kanban-dot" data-tone={col.tone} aria-hidden="true" /> : null}
              <h3 id={titleId} className="ev-kanban-title">
                {col.title}
              </h3>
              <span className="ev-kanban-count ev-num">{t.kanban.count(shown, total)}</span>
              {col.actions ? <div className="ev-kanban-actions">{col.actions}</div> : null}
            </header>
            <ul className="ev-kanban-list" aria-labelledby={titleId} aria-busy={col.loading || undefined}>
              {col.items.map((item, index) => {
                const id = getId(item)
                const d: DragState = { id, from: col.id, fromIndex: index }
                return (
                  <Fragment key={id}>
                    {indicator(index)}
                    <li
                    className="ev-kanban-item"
                    data-kanban-item={id}
                    data-movable={movable || undefined}
                    data-dragging={drag?.id === id || undefined}
                    draggable={movable || undefined}
                    onDragStart={movable ? (e) => onDragStart(e, d) : undefined}
                    onDragEnd={movable ? finish : undefined}
                    onPointerDown={movable ? (e) => onItemPointerDown(e, d) : undefined}
                    onContextMenu={movable ? onItemContextMenu : undefined}
                  >
                    {renderCard(item, col)}
                    {moveMenu(item, col)}
                  </li>
                  </Fragment>
                )
              })}
              {indicator(shown)}
              {col.loading && shown === 0 ? (
                <li className="ev-kanban-skeleton" aria-hidden="true">
                  <Skeleton height={72} width="100%" radius="var(--ev-radius)" />
                  <Skeleton height={72} width="100%" radius="var(--ev-radius)" />
                </li>
              ) : null}
            </ul>
            {shown === 0 && !col.loading ? <div className="ev-kanban-empty">{isOver ? t.kanban.dropHere : t.kanban.empty}</div> : null}
            {hasMore && col.onLoadMore ? (
              <div className="ev-kanban-more">
                <Button variant="ghost" size="sm" block loading={col.loading} onClick={col.onLoadMore}>
                  {t.kanban.loadMore(nextCount)}
                </Button>
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

export interface KanbanCardProps {
  title: ReactNode
  /** Строка под заголовком: номер, исполнитель, дата. */
  meta?: ReactNode
  /** Нижняя строка: бейджи, таймер, аватар. Кнопки в ней остаются кликабельными. */
  footer?: ReactNode
  /** Метка тона: уголок видоискателя. */
  tone?: Tone
  /** Выбранная или открытая карточка: рамка из уголков. */
  selected?: boolean
  /** Переход по карточке: заголовок - ссылка на всю площадь карточки. */
  href?: string
  /** Действие по карточке: заголовок - кнопка на всю площадь карточки. */
  onClick?: () => void
  children?: ReactNode
  className?: string
}

/** Карточка доски: заголовок, строка метаданных, тело и подвал в одном стиле. */
export function KanbanCard({ title, meta, footer, tone, selected = false, href, onClick, children, className }: KanbanCardProps) {
  const titleId = useId()
  const corners = selected ? 'frame' : tone ? undefined : 'off'
  return (
    <article
      className={cx('ev-kanban-card ev-corners', className)}
      data-tone={tone}
      data-corners={corners}
      data-selected={selected || undefined}
      data-interactive={href || onClick ? '' : undefined}
      aria-labelledby={titleId}
    >
      <div id={titleId} className="ev-kanban-card-title">
        {href ? (
          <UiLink href={href} className="ev-kanban-card-link" draggable={false} aria-current={selected ? 'true' : undefined}>
            {title}
          </UiLink>
        ) : onClick ? (
          <button type="button" className="ev-kanban-card-link" onClick={onClick} aria-pressed={selected || undefined}>
            {title}
          </button>
        ) : (
          title
        )}
      </div>
      {meta ? <div className="ev-kanban-card-meta">{meta}</div> : null}
      {children ? <div className="ev-kanban-card-body">{children}</div> : null}
      {footer ? <div className="ev-kanban-card-foot">{footer}</div> : null}
    </article>
  )
}
