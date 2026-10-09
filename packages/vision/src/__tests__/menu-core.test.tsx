import { describe, expect, it } from 'vitest'
import { ContextMenuPanel } from '../components/ContextMenu'
import {
  actionableIndexes,
  COPY_SELECTION_ID,
  edgeActive,
  isMenuAction,
  MenuPanel,
  menuKeyCommand,
  nextTypeahead,
  stepActive,
  TYPEAHEAD_RESET_MS,
  typeaheadLabels,
  withCopySelectionEntry,
  type MenuEntry,
} from '../components/MenuCore'
import { renderRu } from './render-ru'

/* Общее ядро Menu и ContextMenu: клавиатура, пункт «копировать выделенное», разметка. */

const noop = () => undefined

const ITEMS: MenuEntry[] = [
  { type: 'label', id: 'l', label: 'Группа' },
  { id: 'open', label: 'Открыть', onSelect: noop },
  { type: 'separator', id: 's' },
  { id: 'off', label: 'Отключено', disabled: true },
  { id: 'icon', label: <b>Узел</b> },
  { id: 'print', label: 'Печать', href: '/print' },
]

const key = (k: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key: k,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
})

describe('MenuCore: клавиатура', () => {
  it('доступные пункты и подписи для поиска', () => {
    expect(ITEMS.map(isMenuAction)).toEqual([false, true, false, true, true, true])
    expect(actionableIndexes(ITEMS)).toEqual([1, 4, 5])
    expect(typeaheadLabels(ITEMS)).toEqual([null, 'Открыть', null, 'Отключено', null, 'Печать'])
  })

  it('стрелки идут по кругу, без активного - с края', () => {
    const a = [1, 4, 5]
    expect(stepActive(a, -1, 1)).toBe(1)
    expect(stepActive(a, -1, -1)).toBe(5)
    expect(stepActive(a, 1, 1)).toBe(4)
    expect(stepActive(a, 5, 1)).toBe(1)
    expect(stepActive(a, 1, -1)).toBe(5)
    // Нет доступных - активный не меняется.
    expect(stepActive([], 3, 1)).toBe(3)
  })

  it('Home/End', () => {
    expect(edgeActive([1, 4, 5], 'first')).toBe(1)
    expect(edgeActive([1, 4, 5], 'last')).toBe(5)
    expect(edgeActive([], 'first')).toBe(-1)
  })

  it('набранные буквы копятся и сбрасываются после паузы', () => {
    const a = nextTypeahead({ text: '', at: 0 }, 'п', 1000)
    expect(a).toEqual({ text: 'п', at: 1000 })
    const b = nextTypeahead(a, 'е', 1000 + TYPEAHEAD_RESET_MS)
    expect(b.text).toBe('пе')
    expect(nextTypeahead(b, 'о', b.at + TYPEAHEAD_RESET_MS + 1).text).toBe('о')
  })

  it('команды по клавишам', () => {
    expect(menuKeyCommand(key('ArrowDown'))).toEqual({ type: 'step', dir: 1 })
    expect(menuKeyCommand(key('ArrowUp'))).toEqual({ type: 'step', dir: -1 })
    expect(menuKeyCommand(key('Home'))).toEqual({ type: 'edge', edge: 'first' })
    expect(menuKeyCommand(key('End'))).toEqual({ type: 'edge', edge: 'last' })
    expect(menuKeyCommand(key('Tab'))).toEqual({ type: 'close' })
    expect(menuKeyCommand(key('Tab', { shiftKey: true }))).toEqual({ type: 'close' })
    expect(menuKeyCommand(key('ContextMenu'))).toEqual({ type: 'swallow' })
    expect(menuKeyCommand(key('F10', { shiftKey: true }))).toEqual({ type: 'swallow' })
    expect(menuKeyCommand(key('п'))).toEqual({ type: 'type', char: 'п' })
    expect(menuKeyCommand(key('P', { shiftKey: true }))).toEqual({ type: 'type', char: 'P' })
    // Пробел и Enter нажимают пункт, сочетания с модификаторами - не ввод.
    expect(menuKeyCommand(key(' '))).toBeNull()
    expect(menuKeyCommand(key('Enter'))).toBeNull()
    expect(menuKeyCommand(key('Escape'))).toBeNull()
    expect(menuKeyCommand(key('c', { ctrlKey: true }))).toBeNull()
    expect(menuKeyCommand(key('c', { metaKey: true }))).toBeNull()
    expect(menuKeyCommand(key('c', { altKey: true }))).toBeNull()
  })
})

describe('MenuCore: пункт «копировать выделенное»', () => {
  const entries: MenuEntry[] = [{ id: 'open', label: 'Открыть', onSelect: noop }]

  it('первым и отдельной группой при непустом выделении', () => {
    const copied: string[] = []
    const out = withCopySelectionEntry(entries, '  Долина-1 ', { label: 'Копировать', shortcut: 'Ctrl+C', onCopy: (s) => copied.push(s) })
    expect(out.map((e) => e.id)).toEqual([COPY_SELECTION_ID, `${COPY_SELECTION_ID}-sep`, 'open'])
    expect(out[1]?.type).toBe('separator')
    const copy = out[0]
    if (!copy || !isMenuAction(copy)) throw new Error('нет пункта копирования')
    expect(copy.label).toBe('Копировать')
    expect(copy.shortcut).toBe('Ctrl+C')
    copy.onSelect?.()
    expect(copied).toEqual(['Долина-1'])
  })

  it('без выделения или без своих пунктов меню не меняется', () => {
    const item = { label: 'Копировать', onCopy: noop }
    expect(withCopySelectionEntry(entries, '', item)).toBe(entries)
    expect(withCopySelectionEntry(entries, '   ', item)).toBe(entries)
    expect(withCopySelectionEntry([], 'текст', item)).toEqual([])
  })
})

describe('MenuCore: разметка', () => {
  it('MenuPanel: id, сторона, фокусируемый список, ссылка и недоступная ссылка', () => {
    const html = renderRu(
      <MenuPanel
        id="m1"
        side="top"
        label="Действия"
        active={-1}
        items={[...ITEMS, { id: 'gone', label: 'Архив', href: '/archive', disabled: true }]}
      />,
    )
    expect(html).toMatch(/^<div id="m1" role="menu" aria-label="Действия" tabindex="-1" class="ev-menu" data-ev-layer="" data-side="top"/)
    expect(html).toContain('href="/print"')
    expect(html).not.toContain('href="/archive"')
    expect(html).not.toContain('data-active')
    expect(html).toContain('class="ev-menu-label"')
  })

  it('ContextMenuPanel - тот же список с классом ev-context-menu', () => {
    const html = renderRu(<ContextMenuPanel items={ITEMS} label="Меню" active={1} className="extra" />)
    expect(html).toContain('class="ev-menu ev-context-menu extra"')
    expect(html).toMatch(/data-active="true"[^>]*>.*Открыть/)
  })
})
