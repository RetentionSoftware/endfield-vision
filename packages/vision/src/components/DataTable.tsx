'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { useMessages } from '../lib/i18n'
import { cx, EMPTY_VALUE } from '../lib/cx'
import { useMediaQuery } from '../lib/hooks'
import { Button } from './Button'
import { Checkbox } from './Choice'
import { Skeleton } from './Display'
import { SearchInput } from './Input'
import { EmptyState, ErrorState } from './Page'
import { Select } from './Select'

/*
 * Таблица данных: колонки конфигом, сортируемые заголовки (сортирует
 * вызывающий - обычно сервер), выбор строк, клик по строке, скелетон при
 * первой загрузке, приглушение при перезапросе (старые строки остаются на
 * экране), пустое состояние и ошибка. На узком экране - карточки.
 */

export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}

export interface Column<T> {
  key: string
  header: ReactNode
  /** Содержимое ячейки. Пустое значение (null, undefined, '') - приглушённый дефис. */
  cell: (row: T, index: number) => ReactNode
  /** Колонка сортируется; ключ сортировки - sortKey или key. */
  sortable?: boolean
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  width?: number | string
  minWidth?: number | string
  /** Разрешить перенос текста (по умолчанию ячейки в одну строку). */
  wrap?: boolean
  /** Числа: табличные цифры и выравнивание вправо. */
  numeric?: boolean
  /** Колонка - заголовок карточки на узком экране. */
  primary?: boolean
  /** Не показывать в карточке на узком экране. */
  hideOnMobile?: boolean
  /** Подпись в карточке (по умолчанию header). */
  mobileLabel?: ReactNode
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  /** Первая загрузка: строки-скелетоны. */
  loading?: boolean
  /** Перезапрос: старые строки приглушены. */
  fetching?: boolean
  error?: { message?: string } | null
  onRetry?: () => void
  /** Пустой результат: заголовок или готовый EmptyState. */
  empty?: ReactNode
  emptyDescription?: ReactNode
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  onRowClick?: (row: T) => void
  /** Выбор строк по ключам. */
  selected?: string[]
  onSelectedChange?: (keys: string[]) => void
  /** Приглушить строку (заблокированный, архивный). */
  rowMuted?: (row: T) => boolean
  skeletonRows?: number
  /** Высота области прокрутки: шапка липнет к её верху. */
  maxHeight?: number | string
  dense?: boolean
  /** Подвал: пагинация, итоги. */
  footer?: ReactNode
  /** Карточки на узком экране (по умолчанию) или горизонтальная прокрутка. */
  mobile?: 'cards' | 'scroll'
  'aria-label'?: string
  className?: string
}

function isEmpty(v: ReactNode): boolean {
  return v === null || v === undefined || v === '' || v === false
}

function renderCell(v: ReactNode): ReactNode {
  return isEmpty(v) ? <span className="ev-empty-value">{EMPTY_VALUE}</span> : v
}

/**
 * Клик по кнопке, ссылке или полю внутри строки не открывает строку.
 * События из порталов (окно, меню, список, открытые из ячейки) всплывают
 * по дереву React до строки, хотя в DOM лежат вне её: их тоже пропускаем,
 * иначе клик или Enter в окне открывал бы строку.
 */
export function isInteractiveTarget(e: Pick<MouseEvent | KeyboardEvent, 'target' | 'currentTarget'>): boolean {
  const t = e.target as Element | null
  const row = e.currentTarget as Element | null
  if (!t || !row || typeof t.closest !== 'function') return false
  if (!row.contains(t)) return true
  const hit = t.closest('a, button, input, select, textarea, label, [role="menuitem"], [data-row-stop]')
  return Boolean(hit && hit !== row)
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  fetching = false,
  error,
  onRetry,
  empty: emptyProp,
  emptyDescription,
  sort,
  onSortChange,
  onRowClick,
  selected,
  onSelectedChange,
  rowMuted,
  skeletonRows = 6,
  maxHeight,
  dense = false,
  footer,
  mobile = 'cards',
  className,
  ...aria
}: DataTableProps<T>) {
  const t = useMessages()
  const empty = emptyProp ?? t.table.empty
  const narrow = useMediaQuery('(max-width: 720px)')
  const asCards = narrow && mobile === 'cards'
  const selectable = Boolean(onSelectedChange)
  const selSet = new Set(selected ?? [])
  const list = rows ?? []
  const pageKeys = list.map(rowKey)
  const allOnPage = pageKeys.length > 0 && pageKeys.every((k) => selSet.has(k))
  const someOnPage = pageKeys.some((k) => selSet.has(k))

  const toggleAll = () => {
    if (!onSelectedChange) return
    if (allOnPage) onSelectedChange((selected ?? []).filter((k) => !pageKeys.includes(k)))
    else onSelectedChange(Array.from(new Set([...(selected ?? []), ...pageKeys])))
  }
  const toggleOne = (k: string) => {
    if (!onSelectedChange) return
    onSelectedChange(selSet.has(k) ? (selected ?? []).filter((x) => x !== k) : [...(selected ?? []), k])
  }

  const nextSort = (col: Column<T>) => {
    if (!onSortChange) return
    const key = col.sortKey ?? col.key
    if (!sort || sort.key !== key) onSortChange({ key, dir: 'asc' })
    else if (sort.dir === 'asc') onSortChange({ key, dir: 'desc' })
    else onSortChange(null)
  }

  const showSkeleton = loading && list.length === 0
  const showError = !showSkeleton && error && list.length === 0
  const showEmpty = !showSkeleton && !showError && list.length === 0

  const rowProps = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          'data-clickable': true,
          onClick: (e: MouseEvent) => {
            if (!isInteractiveTarget(e)) onRowClick(row)
          },
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isInteractiveTarget(e)) {
              e.preventDefault()
              onRowClick(row)
            }
          },
        }
      : {}

  const stateBlock = showError ? (
    <ErrorState compact message={error?.message} onRetry={onRetry} />
  ) : showEmpty ? (
    typeof empty === 'string' ? <EmptyState compact title={empty} description={emptyDescription} /> : empty
  ) : null

  if (asCards) {
    const primary = columns.find((c) => c.primary) ?? columns[0]
    const rest = columns.filter((c) => c !== primary && !c.hideOnMobile)
    return (
      <div className={cx('ev-table-cards', className)} data-fetching={fetching || undefined} aria-busy={loading || fetching || undefined}>
        {selectable && list.length > 0 ? (
          <div className="ev-table-cards-bar">
            <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} label={t.table.selectAllOnPage} />
          </div>
        ) : null}
        {showSkeleton
          ? Array.from({ length: Math.min(skeletonRows, 4) }, (_, i) => (
              <div key={i} className="ev-table-card">
                <Skeleton width="60%" height={16} />
                <Skeleton width="90%" />
                <Skeleton width="40%" />
              </div>
            ))
          : null}
        {stateBlock ? <div className="ev-table-state">{stateBlock}</div> : null}
        {list.map((row, i) => {
          const k = rowKey(row)
          return (
            <div key={k} className="ev-table-card" data-muted={rowMuted?.(row) || undefined} data-selected={selSet.has(k) || undefined} {...rowProps(row)}>
              <div className="ev-table-card-head">
                {selectable ? (
                  <span data-row-stop="">
                    <Checkbox checked={selSet.has(k)} onChange={() => toggleOne(k)} aria-label={t.table.selectRow} />
                  </span>
                ) : null}
                <div className="ev-table-card-title">{primary ? renderCell(primary.cell(row, i)) : null}</div>
              </div>
              {rest.length > 0 ? (
                <dl className="ev-table-card-fields">
                  {rest.map((c) => (
                    <div key={c.key} className="ev-table-card-field">
                      <dt>{c.mobileLabel ?? c.header}</dt>
                      <dd className={cx(c.numeric && 'ev-num')}>{renderCell(c.cell(row, i))}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )
        })}
        {footer ? <div className="ev-table-foot">{footer}</div> : null}
      </div>
    )
  }

  return (
    <div className={cx('ev-table-wrap', className)} data-fetching={fetching || undefined}>
      <div className="ev-table-scroll" style={maxHeight !== undefined ? { maxHeight } : undefined}>
        <table className="ev-table" data-dense={dense || undefined} aria-label={aria['aria-label']} aria-busy={loading || fetching || undefined}>
          <thead>
            <tr>
              {selectable ? (
                <th className="ev-table-select" scope="col">
                  <Checkbox
                    checked={allOnPage}
                    indeterminate={!allOnPage && someOnPage}
                    onChange={toggleAll}
                    aria-label={t.table.selectAllRows}
                    disabled={list.length === 0}
                  />
                </th>
              ) : null}
              {columns.map((c) => {
                const key = c.sortKey ?? c.key
                const sorted = sort && sort.key === key ? sort.dir : null
                const style: CSSProperties = { width: c.width, minWidth: c.minWidth }
                const align = c.align ?? (c.numeric ? 'right' : 'left')
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={style}
                    data-align={align}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : c.sortable ? 'none' : undefined}
                    className={c.className}
                  >
                    {c.sortable && onSortChange ? (
                      <button type="button" className="ev-th-sort" data-sorted={sorted ?? undefined} onClick={() => nextSort(c)}>
                        <span>{c.header}</span>
                        {sorted === 'asc' ? (
                          <ArrowUp size={13} aria-hidden="true" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown size={13} aria-hidden="true" />
                        ) : (
                          <ArrowUpDown size={13} aria-hidden="true" className="ev-th-sort-idle" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`sk${i}`} className="ev-table-skeleton-row">
                    {selectable ? (
                      <td className="ev-table-select">
                        <Skeleton width={16} height={16} />
                      </td>
                    ) : null}
                    {columns.map((c, j) => (
                      <td key={c.key} data-align={c.align ?? (c.numeric ? 'right' : 'left')}>
                        <Skeleton width={j === 0 ? '70%' : `${40 + ((i * 17 + j * 11) % 45)}%`} />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {stateBlock ? (
              <tr className="ev-table-state-row">
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{stateBlock}</td>
              </tr>
            ) : null}
            {list.map((row, i) => {
              const k = rowKey(row)
              return (
                <tr key={k} data-muted={rowMuted?.(row) || undefined} data-selected={selSet.has(k) || undefined} {...rowProps(row)}>
                  {selectable ? (
                    <td className="ev-table-select" data-row-stop="">
                      <Checkbox checked={selSet.has(k)} onChange={() => toggleOne(k)} aria-label={t.table.selectRow} />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      data-align={c.align ?? (c.numeric ? 'right' : 'left')}
                      data-wrap={c.wrap || undefined}
                      className={cx(c.numeric && 'ev-num', c.className)}
                    >
                      {renderCell(c.cell(row, i))}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer ? <div className="ev-table-foot">{footer}</div> : null}
    </div>
  )
}

export interface PaginationProps {
  /** Страница с 1. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  disabled?: boolean
  className?: string
}

function pageList(page: number, count: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const out: Array<number | 'gap'> = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(count - 1, page + 1)
  if (from > 2) out.push('gap')
  for (let p = from; p <= to; p++) out.push(p)
  if (to < count - 1) out.push('gap')
  out.push(count)
  return out
}

/** Пагинация: «1-50 из 1 234», номера страниц с пропусками, размер страницы. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  disabled = false,
  className,
}: PaginationProps) {
  const t = useMessages()
  const fmt = (n: number) => n.toLocaleString(t.intl)
  const narrow = useMediaQuery('(max-width: 720px)')
  const count = Math.max(1, Math.ceil(total / pageSize))
  // Записей стало меньше (фильтр, удаление) - текущая страница не должна оказаться за концом списка.
  const outOfRange = total > 0 && page > count
  useEffect(() => {
    if (outOfRange) onPageChange(count)
  }, [outOfRange, count, onPageChange])
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className={cx('ev-pagination', className)}>
      <div className="ev-pagination-info ev-num">
        {total === 0 ? t.pagination.noRecords : t.pagination.range(fmt(from), fmt(to), fmt(total))}
      </div>
      {onPageSizeChange ? (
        <div className="ev-pagination-size">
          <span className="ev-muted">{t.pagination.rows}</span>
          <Select
            size="sm"
            width={76}
            aria-label={t.pagination.rowsPerPage}
            value={String(pageSize)}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => v && onPageSizeChange(Number(v))}
            searchable={false}
            disabled={disabled}
          />
        </div>
      ) : null}
      {count > 1 ? (
        <nav className="ev-pagination-pages" aria-label={t.pagination.pages}>
          {!narrow ? (
            <Button size="sm" variant="ghost" aria-label={t.pagination.first} icon={<ChevronsLeft size={15} />} disabled={disabled || page <= 1} onClick={() => onPageChange(1)} />
          ) : null}
          <Button size="sm" variant="ghost" aria-label={t.pagination.prev} icon={<ChevronLeft size={15} />} disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} />
          {narrow ? (
            <span className="ev-pagination-current ev-num">
              {page} / {count}
            </span>
          ) : (
            pageList(page, count).map((p, i) =>
              p === 'gap' ? (
                <span key={`g${i}`} className="ev-pagination-gap" aria-hidden="true">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className="ev-pagination-num ev-num"
                  data-active={p === page || undefined}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={t.pagination.page(p)}
                  disabled={disabled}
                  onClick={() => p !== page && onPageChange(p)}
                >
                  {p}
                </button>
              ),
            )
          )}
          <Button size="sm" variant="ghost" aria-label={t.pagination.next} icon={<ChevronRight size={15} />} disabled={disabled || page >= count} onClick={() => onPageChange(page + 1)} />
          {!narrow ? (
            <Button size="sm" variant="ghost" aria-label={t.pagination.last} icon={<ChevronsRight size={15} />} disabled={disabled || page >= count} onClick={() => onPageChange(count)} />
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}

export interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  /** Фильтры: Select, MultiSelect, DateRangePicker. */
  children?: ReactNode
  /** Количество применённых фильтров (кроме поиска). */
  activeCount?: number
  onReset?: () => void
  /** Справа: экспорт, создание. */
  actions?: ReactNode
  className?: string
}

/** Строка фильтров над таблицей. На узком экране фильтры прячутся под кнопку. */
export function FilterBar({ search, children, activeCount = 0, onReset, actions, className }: FilterBarProps) {
  const t = useMessages()
  const narrow = useMediaQuery('(max-width: 720px)')
  const [expanded, setExpanded] = useState(false)
  const hasFilters = Boolean(children)
  const showFilters = !narrow || expanded
  const canReset = Boolean(onReset) && (activeCount > 0 || Boolean(search?.value))
  return (
    <div className={cx('ev-filterbar', className)}>
      <div className="ev-filterbar-main">
        {search ? (
          <SearchInput
            wrapperClassName="ev-filterbar-search"
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? t.common.search}
            aria-label={search.placeholder ?? t.common.search}
          />
        ) : null}
        {narrow && hasFilters ? (
          <Button
            variant="secondary"
            icon={<SlidersHorizontal size={15} />}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {t.filters.filters}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        ) : null}
        {showFilters && hasFilters ? <div className="ev-filterbar-filters">{children}</div> : null}
        {canReset ? (
          <Button variant="ghost" onClick={onReset}>
            {t.common.reset}
          </Button>
        ) : null}
        {actions ? <div className="ev-filterbar-actions">{actions}</div> : null}
      </div>
    </div>
  )
}
