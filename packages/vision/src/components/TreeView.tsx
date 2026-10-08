'use client'

import { ChevronRight } from 'lucide-react'
import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useControllable } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Checkbox } from './Choice'
import { findTypeaheadMatch } from './Menu'

/*
 * Дерево (WAI-ARIA tree): вложенные role="tree" / treeitem / group,
 * один Tab-стоп (roving tabindex), стрелки, Home/End, поиск по первым
 * буквам, * раскрывает соседние узлы. Шеврон - декоративный (aria-hidden):
 * состояние узла объявляет aria-expanded самого treeitem, вложенных кнопок нет.
 * Выбор: single - aria-selected; multiple - флажки с частичным состоянием
 * родителя (aria-checked="mixed").
 */

export interface TreeNode {
  id: string
  /** Подпись узла; по ней работает поиск по первым буквам. */
  label: string
  icon?: ReactNode
  children?: TreeNode[]
  /** Справа в строке: счётчик, статус. */
  meta?: ReactNode
  /** Узел нельзя выбрать или отметить (раскрывать можно). */
  disabled?: boolean
}

export type TreeSelectionMode = 'none' | 'single' | 'multiple'
export type TreeCheckState = 'checked' | 'unchecked' | 'mixed'

export interface TreeViewProps {
  nodes: TreeNode[]
  /** Раскрытые узлы (id), контролируемый режим. */
  expanded?: string[]
  /** Раскрытые узлы при первом рендере. */
  defaultExpanded?: string[]
  onExpandedChange?: (expanded: string[]) => void
  /**
   * Выбор: none - без выбора, single - один узел, multiple - флажки.
   * В режиме multiple отметка родителя отмечает всех его доступных потомков,
   * родитель отмечен, когда отмечены все потомки, и частично - когда часть.
   */
  selectable?: TreeSelectionMode
  /**
   * Выбранные узлы (id), контролируемый режим. В режиме multiple - все отмеченные
   * узлы, включая полностью отмеченных родителей; id родителя во входном
   * списке отмечает всё его поддерево.
   */
  selected?: string[]
  /** Выбранные узлы при первом рендере. */
  defaultSelected?: string[]
  onSelectedChange?: (selected: string[]) => void
  /** Щелчок или Enter по узлу (кроме отключённых). */
  onNodeClick?: (node: TreeNode) => void
  /** Вертикальные направляющие вложенности. По умолчанию - да. */
  guides?: boolean
  /** Подпись дерева для скринридера. По умолчанию - «Дерево». */
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

/* ------------------------------------------------------------------ */
/* Чистые функции: обход, видимые узлы, флажки                         */
/* ------------------------------------------------------------------ */

function hasKids(n: TreeNode): boolean {
  return Boolean(n.children && n.children.length > 0)
}

export interface FlatTreeNode {
  node: TreeNode
  /** Уровень вложенности с 1 (aria-level). */
  level: number
  parentId: string | null
  /** Позиция среди соседей с 1 и число соседей (aria-posinset / aria-setsize). */
  posinset: number
  setsize: number
  hasChildren: boolean
  expanded: boolean
}

/** Видимые узлы в порядке обхода: потомки свёрнутых узлов пропускаются. Основа клавиатурной навигации. */
export function flattenVisibleTree(nodes: TreeNode[], expanded: ReadonlySet<string>): FlatTreeNode[] {
  const out: FlatTreeNode[] = []
  const walk = (list: TreeNode[], level: number, parentId: string | null) => {
    list.forEach((node, i) => {
      const kids = hasKids(node)
      const open = kids && expanded.has(node.id)
      out.push({ node, level, parentId, posinset: i + 1, setsize: list.length, hasChildren: kids, expanded: open })
      if (open) walk(node.children!, level + 1, node.id)
    })
  }
  walk(nodes, 1, null)
  return out
}

/** Узел и его родитель по id. */
export function indexTree(nodes: TreeNode[]): Map<string, { node: TreeNode; parentId: string | null }> {
  const map = new Map<string, { node: TreeNode; parentId: string | null }>()
  const walk = (list: TreeNode[], parentId: string | null) => {
    for (const node of list) {
      map.set(node.id, { node, parentId })
      if (node.children) walk(node.children, node.id)
    }
  }
  walk(nodes, null)
  return map
}

/**
 * Отмеченные листья: лист отмечен, если его id или id любого предка есть в selected.
 * Узел без потомков считается листом.
 */
export function checkedLeafSet(nodes: TreeNode[], selected: Iterable<string>): Set<string> {
  const sel = new Set(selected)
  const out = new Set<string>()
  const walk = (list: TreeNode[], inherited: boolean) => {
    for (const n of list) {
      const on = inherited || sel.has(n.id)
      if (hasKids(n)) walk(n.children!, on)
      else if (on) out.add(n.id)
    }
  }
  walk(nodes, false)
  return out
}

/** Состояние флажка узла по отмеченным листьям. */
export function treeCheckState(node: TreeNode, leaves: ReadonlySet<string>): TreeCheckState {
  if (!hasKids(node)) return leaves.has(node.id) ? 'checked' : 'unchecked'
  let all = true
  let any = false
  for (const c of node.children!) {
    const s = treeCheckState(c, leaves)
    if (s !== 'checked') all = false
    if (s !== 'unchecked') any = true
  }
  return all ? 'checked' : any ? 'mixed' : 'unchecked'
}

/** Все отмеченные узлы: листья из множества и полностью отмеченные родители (порядок обхода). */
export function checkedIds(nodes: TreeNode[], leaves: ReadonlySet<string>): string[] {
  const out: string[] = []
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (treeCheckState(n, leaves) === 'checked') out.push(n.id)
      if (hasKids(n)) walk(n.children!)
    }
  }
  walk(nodes)
  return out
}

/**
 * Переключение флажка узла id: отмечает или снимает узел и всех его доступных
 * потомков (отключённые узлы и их поддеревья не меняются). Возвращает новый
 * список отмеченных узлов с пересчитанными родителями.
 */
export function toggleTreeCheck(nodes: TreeNode[], selected: Iterable<string>, id: string): string[] {
  const entry = indexTree(nodes).get(id)
  const leaves = checkedLeafSet(nodes, selected)
  if (!entry || entry.node.disabled) return checkedIds(nodes, leaves)
  // Доступные листья поддерева. Все отмечены - снимаем, иначе отмечаем: отключённый
  // неотмеченный потомок не мешает снять отметку с родителя.
  const enabled: string[] = []
  const collect = (n: TreeNode) => {
    if (n.disabled) return
    if (hasKids(n)) n.children!.forEach(collect)
    else enabled.push(n.id)
  }
  collect(entry.node)
  const target = !enabled.every((id) => leaves.has(id))
  for (const id of enabled) {
    if (target) leaves.add(id)
    else leaves.delete(id)
  }
  return checkedIds(nodes, leaves)
}

/* ------------------------------------------------------------------ */
/* Компонент                                                           */
/* ------------------------------------------------------------------ */

const TYPEAHEAD_RESET_MS = 500

interface Ctx {
  mode: TreeSelectionMode
  expandedSet: ReadonlySet<string>
  selectedSet: ReadonlySet<string>
  leaves: ReadonlySet<string>
  focusId: string | null
  baseId: string
  register: (id: string, el: HTMLLIElement | null) => void
  onRowClick: (node: TreeNode) => void
  onRowDoubleClick: (node: TreeNode) => void
  onToggleExpand: (node: TreeNode) => void
  onCheck: (node: TreeNode) => void
  focusNode: (id: string) => void
}

export function TreeView({
  nodes,
  expanded,
  defaultExpanded,
  onExpandedChange,
  selectable = 'none',
  selected,
  defaultSelected,
  onSelectedChange,
  onNodeClick,
  guides = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: TreeViewProps) {
  const t = useMessages()
  const baseId = useId()
  const [expandedIds, setExpanded] = useControllable(expanded, defaultExpanded ?? [], onExpandedChange)
  const [selectedIds, setSelected] = useControllable(selected, defaultSelected ?? [], onSelectedChange)
  const [focusState, setFocusState] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLLIElement>())
  const typed = useRef({ text: '', at: 0 })

  const expandedSet = useMemo(() => new Set(expandedIds), [expandedIds])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const leaves = useMemo(
    () => (selectable === 'multiple' ? checkedLeafSet(nodes, selectedIds) : new Set<string>()),
    [nodes, selectedIds, selectable],
  )
  const flat = useMemo(() => flattenVisibleTree(nodes, expandedSet), [nodes, expandedSet])
  const index = useMemo(() => indexTree(nodes), [nodes])

  // Узел с tabindex=0: последний сфокусированный, если он виден; иначе ближайший
  // видимый предок; иначе первый выбранный видимый; иначе первый узел.
  const focusId = useMemo(() => {
    const visible = new Set(flat.map((f) => f.node.id))
    let id = focusState
    while (id && !visible.has(id)) id = index.get(id)?.parentId ?? null
    if (id) return id
    return flat.find((f) => selectedSet.has(f.node.id))?.node.id ?? flat[0]?.node.id ?? null
  }, [flat, focusState, index, selectedSet])

  const focusNode = (id: string) => {
    setFocusState(id)
    refs.current.get(id)?.focus()
  }

  const setNodeExpanded = (id: string, open: boolean) => {
    if (open === expandedSet.has(id)) return
    setExpanded(open ? [...expandedIds, id] : expandedIds.filter((x) => x !== id))
  }

  const select = (node: TreeNode) => {
    if (node.disabled) return
    if (selectable === 'single') {
      if (!selectedSet.has(node.id) || selectedIds.length !== 1) setSelected([node.id])
    } else if (selectable === 'multiple') {
      setSelected(toggleTreeCheck(nodes, selectedIds, node.id))
    }
  }

  /** Щелчок или Enter (notify - вызвать onNodeClick), пробел: выбор, а без выбора - раскрытие. */
  const activate = (node: TreeNode, notify: boolean) => {
    if (notify && !node.disabled) onNodeClick?.(node)
    if (selectable !== 'none') select(node)
    else if (hasKids(node)) setNodeExpanded(node.id, !expandedSet.has(node.id))
  }

  const ctx: Ctx = {
    mode: selectable,
    expandedSet,
    selectedSet,
    leaves,
    focusId,
    baseId,
    register: (id, el) => {
      if (el) refs.current.set(id, el)
      else refs.current.delete(id)
    },
    onRowClick: (node) => {
      focusNode(node.id)
      activate(node, true)
    },
    onRowDoubleClick: (node) => {
      // С выбором щелчок выбирает узел, двойной щелчок раскрывает.
      if (selectable !== 'none' && hasKids(node)) setNodeExpanded(node.id, !expandedSet.has(node.id))
    },
    onToggleExpand: (node) => {
      focusNode(node.id)
      setNodeExpanded(node.id, !expandedSet.has(node.id))
    },
    onCheck: (node) => {
      focusNode(node.id)
      select(node)
    },
    focusNode,
  }

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const pos = flat.findIndex((f) => f.node.id === focusId)
    const cur = flat[pos]
    if (!cur) return
    const go = (i: number) => {
      const f = flat[i]
      if (f) focusNode(f.node.id)
    }
    switch (e.key) {
      case 'ArrowDown':
        go(pos + 1)
        break
      case 'ArrowUp':
        go(pos - 1)
        break
      case 'Home':
        go(0)
        break
      case 'End':
        go(flat.length - 1)
        break
      case 'ArrowRight':
        if (!cur.hasChildren) break
        if (!cur.expanded) setNodeExpanded(cur.node.id, true)
        else go(pos + 1)
        break
      case 'ArrowLeft':
        if (cur.expanded) setNodeExpanded(cur.node.id, false)
        else if (cur.parentId) focusNode(cur.parentId)
        break
      case 'Enter':
        activate(cur.node, true)
        break
      case ' ':
        activate(cur.node, false)
        break
      case '*': {
        // Раскрыть всех соседей текущего узла.
        const siblings = flat.filter((f) => f.parentId === cur.parentId && f.hasChildren && !f.expanded).map((f) => f.node.id)
        if (siblings.length) setExpanded([...expandedIds, ...siblings])
        break
      }
      default: {
        if (e.key.length !== 1 || e.key === ' ') return
        const now = Date.now()
        const prev = now - typed.current.at > TYPEAHEAD_RESET_MS ? '' : typed.current.text
        const text = prev + e.key
        typed.current = { text, at: now }
        const hit = findTypeaheadMatch(
          flat.map((f) => f.node.label),
          flat.map((_, i) => i),
          pos,
          text,
        )
        if (hit >= 0) go(hit)
        break
      }
    }
    e.preventDefault()
  }

  return (
    <ul
      role="tree"
      className={cx('ev-tree', className)}
      data-guides={guides || undefined}
      data-selectable={selectable}
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? t.tree.label)}
      aria-labelledby={ariaLabelledBy}
      aria-multiselectable={selectable === 'multiple' || undefined}
      onKeyDown={onKeyDown}
    >
      {nodes.map((n, i) => (
        <TreeItem key={n.id} node={n} level={1} posinset={i + 1} setsize={nodes.length} ctx={ctx} />
      ))}
    </ul>
  )
}

function TreeItem({ node, level, posinset, setsize, ctx }: { node: TreeNode; level: number; posinset: number; setsize: number; ctx: Ctx }) {
  const kids = hasKids(node)
  const open = kids && ctx.expandedSet.has(node.id)
  const labelId = `${ctx.baseId}-${level}-${posinset}-${node.id.replace(/\s+/g, '_')}`
  const metaId = `${labelId}-meta`
  const check = ctx.mode === 'multiple' ? treeCheckState(node, ctx.leaves) : null
  const isSelected = ctx.mode === 'single' ? ctx.selectedSet.has(node.id) : undefined
  return (
    <li
      ref={(el) => ctx.register(node.id, el)}
      role="treeitem"
      className="ev-tree-item"
      aria-level={level}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-expanded={kids ? open : undefined}
      aria-selected={isSelected}
      aria-checked={check === null ? undefined : check === 'mixed' ? 'mixed' : check === 'checked'}
      aria-disabled={node.disabled || undefined}
      aria-labelledby={labelId}
      aria-describedby={node.meta ? metaId : undefined}
      tabIndex={ctx.focusId === node.id ? 0 : -1}
      onFocus={(e) => {
        // Фокус пришёл на сам узел (не всплыл от потомка) - запоминаем его для Tab-стопа.
        if (e.target === e.currentTarget && ctx.focusId !== node.id) ctx.focusNode(node.id)
      }}
    >
      <div
        className="ev-tree-row"
        style={{ '--ev-tree-level': level } as CSSProperties}
        data-selected={isSelected || check === 'checked' || undefined}
        data-disabled={node.disabled || undefined}
        onClick={() => ctx.onRowClick(node)}
        onDoubleClick={() => ctx.onRowDoubleClick(node)}
      >
        <span
          className="ev-tree-toggle"
          aria-hidden="true"
          data-open={open || undefined}
          onClick={
            kids
              ? (e) => {
                  e.stopPropagation()
                  ctx.onToggleExpand(node)
                }
              : undefined
          }
        >
          {kids ? <ChevronRight size={15} /> : null}
        </span>
        {check !== null ? (
          <span
            className="ev-tree-check"
            aria-hidden="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              // Щелчок по подписи флажка рождает второй click на input - обрабатываем только его.
              if ((e.target as HTMLElement).tagName === 'INPUT') ctx.onCheck(node)
            }}
          >
            <Checkbox
              checked={check === 'checked'}
              indeterminate={check === 'mixed'}
              disabled={node.disabled}
              tabIndex={-1}
              onChange={() => undefined}
            />
          </span>
        ) : null}
        {node.icon ? (
          <span className="ev-tree-icon" aria-hidden="true">
            {node.icon}
          </span>
        ) : null}
        <span className="ev-tree-label" id={labelId}>
          {node.label}
        </span>
        {node.meta ? (
          <span className="ev-tree-meta" id={metaId}>
            {node.meta}
          </span>
        ) : null}
      </div>
      {open ? (
        <ul role="group" className="ev-tree-group" style={{ '--ev-tree-level': level } as CSSProperties}>
          {node.children!.map((c, i) => (
            <TreeItem key={c.id} node={c} level={level + 1} posinset={i + 1} setsize={node.children!.length} ctx={ctx} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
