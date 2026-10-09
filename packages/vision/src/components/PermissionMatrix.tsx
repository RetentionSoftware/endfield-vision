'use client'

import { Check, ChevronDown, Eye, Lock, Minus, RotateCcw } from 'lucide-react'
import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Button } from './Button'
import type { Tone } from './Display'
import { Menu, type MenuEntry } from './Menu'

/*
 * Матрица прав: строки - разделы, столбцы - роли, в ячейке - режим доступа.
 * Нажатие по ячейке перебирает режимы по кругу, цифры 1..N ставят режим
 * сразу, стрелки ходят по сетке (один tab-stop на всю матрицу). Меню в шапке
 * столбца ставит режим всей роли. С baseline ячейки с изменениями отмечены
 * уголками, внизу - счётчик и сброс.
 */

export type PermissionMode = 'none' | 'view' | 'full'

export interface PermissionModeOption<M extends string = PermissionMode> {
  value: M
  label: string
  tone?: Tone
  icon?: ReactNode
}

export interface PermissionRow {
  id: string
  label: string
  description?: ReactNode
  /** Группа: подряд идущие строки одной группы - под общим заголовком. */
  group?: string
}

export interface PermissionColumn {
  id: string
  label: string
  /** Права роли не меняются (владелец, системная роль): ячейки только для чтения. */
  locked?: boolean
}

export type PermissionValue<M extends string = PermissionMode> = Record<string, Record<string, M>>

export interface PermissionChange<M extends string = PermissionMode> {
  rowId: string
  columnId: string
  from: M | undefined
  to: M | undefined
}

/** Изменённые ячейки: value против baseline. Порядок - строки, затем столбцы, как в value, потом в baseline. */
export function diffPermissions<M extends string = PermissionMode>(
  baseline: PermissionValue<M>,
  value: PermissionValue<M>,
): PermissionChange<M>[] {
  const out: PermissionChange<M>[] = []
  const rowIds = new Set([...Object.keys(value), ...Object.keys(baseline)])
  for (const rowId of rowIds) {
    const a = baseline[rowId] ?? {}
    const b = value[rowId] ?? {}
    const colIds = new Set([...Object.keys(b), ...Object.keys(a)])
    for (const columnId of colIds) {
      const from = a[columnId]
      const to = b[columnId]
      if (from !== to) out.push({ rowId, columnId, from, to })
    }
  }
  return out
}

export interface PermissionMatrixProps<M extends string = PermissionMode> {
  rows: PermissionRow[]
  columns: PermissionColumn[]
  value: PermissionValue<M>
  onChange: (next: PermissionValue<M>) => void
  /** Сохранённое состояние: изменённые ячейки отмечаются, внизу - счётчик и сброс. */
  baseline?: PermissionValue<M>
  /** Режимы по порядку перебора. По умолчанию - нет доступа, просмотр, полный доступ. */
  modes?: PermissionModeOption<M>[]
  /** Только просмотр: ячейки не меняются. */
  readOnly?: boolean
  /** Подпись первого столбца. По умолчанию - «Раздел». */
  rowHeader?: ReactNode
  /** Предел высоты: дальше матрица прокручивается, шапка закреплена. */
  maxHeight?: number | string
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

function defaultModes(t: ReturnType<typeof useMessages>): PermissionModeOption<PermissionMode>[] {
  return [
    { value: 'none', label: t.permissions.denied, tone: 'neutral', icon: <Minus size={13} /> },
    { value: 'view', label: t.permissions.view, tone: 'info', icon: <Eye size={13} /> },
    { value: 'full', label: t.permissions.full, tone: 'success', icon: <Check size={13} /> },
  ]
}

interface RowSegment {
  group: string | undefined
  rows: Array<{ row: PermissionRow; index: number }>
}

function segmentRows(rows: PermissionRow[]): RowSegment[] {
  const out: RowSegment[] = []
  rows.forEach((row, index) => {
    const last = out[out.length - 1]
    if (last && last.group === row.group) last.rows.push({ row, index })
    else out.push({ group: row.group, rows: [{ row, index }] })
  })
  return out
}

export function PermissionMatrix<M extends string = PermissionMode>({
  rows,
  columns,
  value,
  onChange,
  baseline,
  modes: modesProp,
  readOnly = false,
  rowHeader,
  maxHeight,
  className,
  ...aria
}: PermissionMatrixProps<M>) {
  const t = useMessages()
  const modes = modesProp ?? (defaultModes(t) as unknown as PermissionModeOption<M>[])
  const fallback = modes[0]?.value
  const [active, setActive] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())

  const changes = baseline ? diffPermissions(baseline, value) : []
  const changed = new Set(changes.map((ch) => `${ch.rowId}\u0000${ch.columnId}`))

  const modeOf = (rowId: string, colId: string): M | undefined => value[rowId]?.[colId] ?? fallback
  const optionOf = (m: M | undefined) => modes.find((o) => o.value === m) ?? modes[0]

  const setCell = (rowId: string, colId: string, m: M) => {
    if (modeOf(rowId, colId) === m) return
    onChange({ ...value, [rowId]: { ...value[rowId], [colId]: m } })
  }

  const setColumn = (colId: string, m: M) => {
    const next: PermissionValue<M> = { ...value }
    for (const row of rows) next[row.id] = { ...next[row.id], [colId]: m }
    onChange(next)
  }

  const cycle = (rowId: string, colId: string) => {
    const i = modes.findIndex((o) => o.value === modeOf(rowId, colId))
    const next = modes[(i + 1) % modes.length]
    if (next) setCell(rowId, colId, next.value)
  }

  const focusCell = (r: number, c: number) => {
    const row = rows[r]
    const col = columns[c]
    if (!row || !col) return
    setActive({ r, c })
    cellRefs.current.get(`${row.id}\u0000${col.id}`)?.focus()
  }

  const onCellKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number, editable: boolean) => {
    const lastR = rows.length - 1
    const lastC = columns.length - 1
    let target: [number, number] | null = null
    switch (e.key) {
      case 'ArrowRight':
        target = [r, Math.min(c + 1, lastC)]
        break
      case 'ArrowLeft':
        target = [r, Math.max(c - 1, 0)]
        break
      case 'ArrowDown':
        target = [Math.min(r + 1, lastR), c]
        break
      case 'ArrowUp':
        target = [Math.max(r - 1, 0), c]
        break
      case 'Home':
        target = e.ctrlKey ? [0, 0] : [r, 0]
        break
      case 'End':
        target = e.ctrlKey ? [lastR, lastC] : [r, lastC]
        break
      default: {
        // Цифра - режим по номеру: 1 - первый в списке.
        const n = Number(e.key)
        if (editable && Number.isInteger(n) && n >= 1 && n <= modes.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          const row = rows[r]
          const col = columns[c]
          const m = modes[n - 1]
          if (row && col && m) setCell(row.id, col.id, m.value)
        }
        return
      }
    }
    e.preventDefault()
    focusCell(target[0], target[1])
  }

  const activeR = Math.min(active.r, Math.max(rows.length - 1, 0))
  const activeC = Math.min(active.c, Math.max(columns.length - 1, 0))
  const style = maxHeight !== undefined ? ({ maxHeight } as CSSProperties) : undefined

  return (
    <div className={cx('ev-perm', className)} data-readonly={readOnly || undefined}>
      <div className="ev-perm-scroll" style={style}>
        <table className="ev-perm-table" role="grid" {...aria}>
          <thead>
            <tr>
              <th scope="col" className="ev-perm-corner">
                {rowHeader ?? t.permissions.section}
              </th>
              {columns.map((col) => {
                const editable = !readOnly && !col.locked
                const entries: MenuEntry[] = modes.map((o) => ({
                  id: o.value,
                  label: o.label,
                  icon: o.icon,
                  onSelect: () => setColumn(col.id, o.value),
                }))
                return (
                  <th key={col.id} scope="col" className="ev-perm-colhead" data-locked={col.locked || undefined}>
                    {editable ? (
                      <Menu
                        label={col.label}
                        items={entries}
                        placement="bottom-start"
                        trigger={
                          <button type="button" className="ev-perm-colbtn">
                            <span>{col.label}</span>
                            <ChevronDown size={13} aria-hidden="true" />
                          </button>
                        }
                      />
                    ) : (
                      <span className="ev-perm-collabel">
                        {col.locked ? <Lock size={12} aria-hidden="true" /> : null}
                        <span>{col.label}</span>
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          {segmentRows(rows).map((seg, si) => (
            <tbody key={`${seg.group ?? ''}-${si}`}>
              {seg.group ? (
                <tr className="ev-perm-group">
                  <th scope="rowgroup" colSpan={columns.length + 1}>
                    {seg.group}
                  </th>
                </tr>
              ) : null}
              {seg.rows.map(({ row, index: r }) => (
                <tr key={row.id}>
                  <th scope="row" className="ev-perm-rowhead">
                    <span className="ev-perm-rowlabel">{row.label}</span>
                    {row.description ? <span className="ev-perm-rowdesc">{row.description}</span> : null}
                  </th>
                  {columns.map((col, c) => {
                    const key = `${row.id}\u0000${col.id}`
                    const mode = modeOf(row.id, col.id)
                    const opt = optionOf(mode)
                    const editable = !readOnly && !col.locked
                    const isChanged = changed.has(key)
                    return (
                      <td
                        key={col.id}
                        role="gridcell"
                        className={cx('ev-perm-td', isChanged && 'ev-corners')}
                        data-corners={isChanged ? 'diagonal' : undefined}
                        data-changed={isChanged || undefined}
                      >
                        <button
                          type="button"
                          ref={(n) => {
                            if (n) cellRefs.current.set(key, n)
                            else cellRefs.current.delete(key)
                          }}
                          className="ev-perm-cell"
                          data-tone={opt?.tone ?? 'neutral'}
                          data-mode={mode}
                          tabIndex={r === activeR && c === activeC ? 0 : -1}
                          aria-disabled={!editable || undefined}
                          onFocus={() => setActive({ r, c })}
                          onClick={editable ? () => cycle(row.id, col.id) : undefined}
                          onKeyDown={(e) => onCellKey(e, r, c, editable)}
                        >
                          {opt?.icon ? (
                            <span className="ev-perm-cell-icon" aria-hidden="true">
                              {opt.icon}
                            </span>
                          ) : null}
                          <span className="ev-perm-cell-label">{opt?.label}</span>
                          {isChanged ? <span className="ev-visually-hidden">, {t.permissions.changed}</span> : null}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {baseline ? (
        <>
          <span className="ev-visually-hidden" role="status">
            {changes.length > 0 ? t.permissions.changes(changes.length) : ''}
          </span>
          {changes.length > 0 ? (
            <div className="ev-perm-foot">
              <span className="ev-perm-count ev-num">{t.permissions.changes(changes.length)}</span>
              <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => onChange(baseline)} disabled={readOnly}>
                {t.permissions.reset}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
