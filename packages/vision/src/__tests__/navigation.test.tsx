import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Accordion, Disclosure, expandableIds, toggleAccordionValue, type AccordionItem } from '../components/Accordion'
import {
  CommandPalette,
  commandMatches,
  filterCommands,
  groupCommands,
  isCommandHotkey,
  nextEnabledCommand,
  type CommandItem,
} from '../components/CommandPalette'
import { focusStepIndex, resolveStepStatuses, Steps, type StepItem } from '../components/Steps'
import {
  checkedIds,
  checkedLeafSet,
  flattenVisibleTree,
  indexTree,
  toggleTreeCheck,
  treeCheckState,
  TreeView,
  type TreeNode,
} from '../components/TreeView'
import { LocaleProvider } from '../lib/i18n'
import { renderRu } from './render-ru'

/* Навигация и структура: палитра команд, шаги, аккордеон, дерево. Чистые функции и серверный рендер. */

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

const noop = () => undefined

/* ------------------------------------------------------------------ */
/* CommandPalette                                                      */
/* ------------------------------------------------------------------ */

const COMMANDS: CommandItem[] = [
  { id: 'dash', label: 'Сводка', group: 'Разделы', onSelect: noop },
  { id: 'task-new', label: 'Новая задача', group: 'Действия', keywords: ['create', 'наряд'], onSelect: noop },
  { id: 'stock', label: 'Остатки на складе', group: 'Разделы', keywords: ['inventory'], onSelect: noop },
  { id: 'off', label: 'Отчёт за смену', group: 'Действия', disabled: true, onSelect: noop },
  { id: 'theme', label: 'Сменить тему', onSelect: noop },
]

describe('CommandPalette: поиск и группы', () => {
  it('ищет по названию, группе и ключевым словам, без учёта регистра и ё', () => {
    expect(commandMatches(COMMANDS[1]!, 'НАРЯД')).toBe(true)
    expect(commandMatches(COMMANDS[2]!, 'inventory')).toBe(true)
    expect(commandMatches(COMMANDS[0]!, 'разделы')).toBe(true)
    expect(commandMatches(COMMANDS[3]!, 'отчет')).toBe(true)
    expect(commandMatches(COMMANDS[0]!, 'склад')).toBe(false)
  })

  it('каждое слово запроса должно найтись', () => {
    expect(filterCommands(COMMANDS, 'действия задача').map((c) => c.id)).toEqual(['task-new'])
    expect(filterCommands(COMMANDS, '  ').length).toBe(COMMANDS.length)
  })

  it('группы - в порядке первого появления, команды группы собраны вместе', () => {
    const groups = groupCommands(COMMANDS)
    expect(groups.map((g) => g.group)).toEqual(['Разделы', 'Действия', undefined])
    expect(groups[0]!.items.map((c) => c.id)).toEqual(['dash', 'stock'])
  })

  it('стрелки пропускают отключённые команды и идут по кругу', () => {
    const flat = groupCommands(COMMANDS).flatMap((g) => g.items)
    // dash, stock, task-new, off(disabled), theme
    expect(nextEnabledCommand(flat, 3, 1)).toBe(4)
    expect(nextEnabledCommand(flat, 3, -1)).toBe(2)
    expect(nextEnabledCommand(flat, 5, 1)).toBe(0)
    expect(nextEnabledCommand([{ ...COMMANDS[3]! }], 0, 1)).toBe(-1)
  })

  it('сочетание Ctrl/Cmd+K, в том числе в русской раскладке', () => {
    const base = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }
    expect(isCommandHotkey({ ...base, key: 'k', code: 'KeyK', ctrlKey: true }, 'k')).toBe(true)
    expect(isCommandHotkey({ ...base, key: 'K', code: 'KeyK', metaKey: true }, 'k')).toBe(true)
    expect(isCommandHotkey({ ...base, key: 'л', code: 'KeyK', ctrlKey: true }, 'k')).toBe(true)
    expect(isCommandHotkey({ ...base, key: 'k', code: 'KeyK' }, 'k')).toBe(false)
    expect(isCommandHotkey({ ...base, key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true }, 'k')).toBe(false)
  })

  it('закрытая палитра ничего не рендерит, открытая - только после гидрации (портал)', () => {
    expect(renderRu(<CommandPalette open={false} onOpenChange={noop} items={COMMANDS} />)).toBe('')
    expect(renderRu(<CommandPalette open onOpenChange={noop} items={COMMANDS} hotkey={false} />)).toBe('')
  })
})

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

const STEPS: StepItem[] = [
  { id: 'site', title: 'Площадка' },
  { id: 'line', title: 'Линия', description: 'Участок и смена' },
  { id: 'check', title: 'Проверка', optional: true },
  { id: 'done', title: 'Запуск' },
]

describe('Steps', () => {
  it('статусы выводятся из current, явный status важнее', () => {
    expect(resolveStepStatuses(STEPS, 1)).toEqual(['complete', 'current', 'upcoming', 'upcoming'])
    expect(resolveStepStatuses([{}, { status: 'error' }, {}], 2)).toEqual(['complete', 'error', 'current'])
    expect(resolveStepStatuses([{}, {}])).toEqual(['upcoming', 'upcoming'])
  })

  it('шаг для компактной строки: текущий, ошибка, первый невыполненный, последний', () => {
    expect(focusStepIndex(['complete', 'current', 'upcoming'])).toBe(1)
    expect(focusStepIndex(['complete', 'error', 'upcoming'])).toBe(1)
    expect(focusStepIndex(['complete', 'upcoming'])).toBe(1)
    expect(focusStepIndex(['complete', 'complete'])).toBe(1)
  })

  it('разметка: ol с подписью, aria-current на текущем, скрытые статусы', () => {
    const out = renderRu(<Steps items={STEPS} current={1} />)
    expect(out).toContain('<ol class="ev-steps" data-orientation="horizontal" aria-label="Шаги"')
    expect(count(out, 'aria-current="step"')).toBe(1)
    expect(out).toContain('data-status="complete"')
    expect(out).toContain('<span class="ev-visually-hidden">, <!-- -->выполнен</span>')
    expect(out).toContain('<span class="ev-visually-hidden">, <!-- -->текущий</span>')
    expect(out).toContain('необязательно')
    expect(out).toContain('Участок и смена')
    // Без onStepClick кнопок нет.
    expect(out).not.toContain('<button')
  })

  it('onStepClick делает кнопками только пройденные шаги', () => {
    const out = renderRu(<Steps items={STEPS} current={2} onStepClick={noop} orientation="vertical" />)
    expect(out).toContain('data-orientation="vertical"')
    expect(count(out, '<button')).toBe(2)
  })

  it('английский словарь', () => {
    const out = renderToString(
      <LocaleProvider locale="en">
        <Steps items={STEPS} current={0} />
      </LocaleProvider>,
    )
    expect(out).toContain('aria-label="Progress"')
    expect(out).toContain('optional')
  })
})

/* ------------------------------------------------------------------ */
/* Accordion / Disclosure                                              */
/* ------------------------------------------------------------------ */

const SECTIONS: AccordionItem[] = [
  { id: 'a', title: 'Допуски', content: 'Список допусков' },
  { id: 'b', title: 'Оборудование', content: 'Станки', meta: '12' },
  { id: 'c', title: 'Архив', content: 'Старое', disabled: true },
]

describe('Accordion', () => {
  it('переключение: одиночный режим держит не больше одной секции', () => {
    expect(toggleAccordionValue(['a'], 'b', false)).toEqual(['b'])
    expect(toggleAccordionValue(['a'], 'a', false)).toEqual([])
    expect(toggleAccordionValue(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleAccordionValue(['a', 'b'], 'a', true)).toEqual(['b'])
    expect(expandableIds(SECTIONS)).toEqual(['a', 'b'])
  })

  it('начальное состояние, связи кнопки и региона', () => {
    const out = renderRu(<Accordion items={SECTIONS} defaultValue={['b']} />)
    expect(count(out, '<h3 class="ev-accordion-heading">')).toBe(3)
    expect(count(out, 'aria-expanded="true"')).toBe(1)
    expect(count(out, 'aria-expanded="false"')).toBe(2)
    expect(count(out, 'role="region"')).toBe(3)
    expect(count(out, 'data-open="true"')).toBe(2) // секция и её панель
    const [, triggerId, panelId] = out.match(/id="([^"]+)" class="ev-accordion-trigger" aria-expanded="false" aria-controls="([^"]+)"/) ?? []
    expect(triggerId).toBeTruthy()
    expect(out).toContain(`role="region" aria-labelledby="${triggerId}" id="${panelId}"`)
    expect(out).toContain('disabled=""')
    expect(out).toContain('data-variant="separated"')
  })

  it('отключённая секция не открывается даже из value', () => {
    const out = renderRu(<Accordion items={SECTIONS} value={['c']} />)
    expect(count(out, 'aria-expanded="true"')).toBe(0)
  })

  it('«Развернуть все» - только при multiple и showExpandAll', () => {
    expect(renderRu(<Accordion items={SECTIONS} showExpandAll />)).not.toContain('Развернуть все')
    expect(renderRu(<Accordion items={SECTIONS} multiple showExpandAll />)).toContain('Развернуть все')
    expect(renderRu(<Accordion items={SECTIONS} multiple showExpandAll defaultValue={['a', 'b']} />)).toContain('Свернуть все')
  })

  it('flush и уровень заголовка', () => {
    const out = renderRu(<Accordion items={SECTIONS} variant="flush" headingLevel={4} />)
    expect(out).toContain('data-variant="flush"')
    expect(count(out, '<h4 class="ev-accordion-heading">')).toBe(3)
  })

  it('Disclosure: кнопка с aria-expanded и панель', () => {
    const closed = renderRu(<Disclosure title="Подробнее">Текст</Disclosure>)
    expect(closed).toContain('aria-expanded="false"')
    expect(closed).toContain('class="ev-collapse"')
    const open = renderRu(
      <Disclosure title="Подробнее" defaultOpen>
        Текст
      </Disclosure>,
    )
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('class="ev-collapse" data-open="true"')
  })
})

/* ------------------------------------------------------------------ */
/* TreeView                                                            */
/* ------------------------------------------------------------------ */

const TREE: TreeNode[] = [
  {
    id: 'plant',
    label: 'Завод',
    children: [
      {
        id: 'line1',
        label: 'Линия 1',
        children: [
          { id: 'press', label: 'Пресс' },
          { id: 'robot', label: 'Робот' },
        ],
      },
      { id: 'line2', label: 'Линия 2', children: [{ id: 'oven', label: 'Печь' }, { id: 'old', label: 'Старый станок', disabled: true }] },
    ],
  },
  { id: 'store', label: 'Склад' },
]

describe('TreeView: чистые функции', () => {
  it('видимые узлы: уровни, позиции, свёрнутые поддеревья пропущены', () => {
    const flat = flattenVisibleTree(TREE, new Set(['plant', 'line1']))
    expect(flat.map((f) => f.node.id)).toEqual(['plant', 'line1', 'press', 'robot', 'line2', 'store'])
    const press = flat[2]!
    expect([press.level, press.parentId, press.posinset, press.setsize]).toEqual([3, 'line1', 1, 2])
    expect(flat[4]!.expanded).toBe(false)
    expect(flat[4]!.hasChildren).toBe(true)
    expect(flat[5]!.level).toBe(1)
  })

  it('индекс узлов знает родителя', () => {
    const idx = indexTree(TREE)
    expect(idx.get('robot')?.parentId).toBe('line1')
    expect(idx.get('plant')?.parentId).toBeNull()
  })

  it('id родителя во входном списке отмечает всё поддерево', () => {
    expect([...checkedLeafSet(TREE, ['line1'])].sort()).toEqual(['press', 'robot'])
  })

  it('состояние родителя: отмечен, частично, не отмечен', () => {
    const leaves = new Set(['press', 'robot', 'oven'])
    const idx = indexTree(TREE)
    expect(treeCheckState(idx.get('line1')!.node, leaves)).toBe('checked')
    expect(treeCheckState(idx.get('line2')!.node, leaves)).toBe('mixed')
    expect(treeCheckState(idx.get('plant')!.node, leaves)).toBe('mixed')
    expect(treeCheckState(idx.get('store')!.node, leaves)).toBe('unchecked')
    expect(checkedIds(TREE, leaves)).toEqual(['line1', 'press', 'robot', 'oven'])
  })

  it('отметка родителя проходит вниз и пропускает отключённые узлы', () => {
    const on = toggleTreeCheck(TREE, [], 'plant')
    expect(on).toEqual(['line1', 'press', 'robot', 'oven'])
    // Отключённый «Старый станок» не отмечен: завод частично отмечен, но повторный щелчок снимает все доступные отметки.
    expect(toggleTreeCheck(TREE, on, 'plant')).toEqual([])
    // Снятие листа снимает отметку с родителя.
    expect(toggleTreeCheck(TREE, ['line1'], 'robot')).toEqual(['press'])
    // Отключённый узел не переключается.
    expect(toggleTreeCheck(TREE, [], 'old')).toEqual([])
  })

  it('полностью отмеченный родитель снимается целиком', () => {
    expect(toggleTreeCheck(TREE, ['line1'], 'line1')).toEqual([])
  })
})

describe('TreeView: разметка', () => {
  it('tree / treeitem / group, уровни и раскрытие', () => {
    const out = renderRu(<TreeView nodes={TREE} defaultExpanded={['plant']} />)
    expect(out).toContain('role="tree"')
    expect(out).toContain('aria-label="Дерево"')
    expect(count(out, 'role="treeitem"')).toBe(4) // plant, line1, line2, store
    expect(count(out, 'role="group"')).toBe(1)
    expect(out).toContain('aria-level="2"')
    expect(out).not.toContain('aria-level="3"')
    expect(count(out, 'aria-expanded="true"')).toBe(1)
    expect(count(out, 'aria-expanded="false"')).toBe(2)
    // Один Tab-стоп - первый узел.
    expect(count(out, 'tabindex="0"')).toBe(1)
    expect(out).not.toContain('aria-selected')
    expect(out).not.toContain('aria-checked')
  })

  it('single: aria-selected, Tab-стоп - на выбранном', () => {
    const out = renderRu(<TreeView nodes={TREE} selectable="single" defaultSelected={['store']} />)
    expect(count(out, 'aria-selected="true"')).toBe(1)
    expect(out).toMatch(/aria-selected="true"[^>]*tabindex="0"/)
  })

  it('multiple: aria-checked с частичным состоянием и флажки', () => {
    const out = renderRu(
      <TreeView nodes={TREE} selectable="multiple" defaultExpanded={['plant', 'line1']} defaultSelected={['press']} />,
    )
    expect(out).toContain('aria-multiselectable="true"')
    expect(count(out, 'aria-checked="mixed"')).toBe(2) // plant, line1
    expect(count(out, 'aria-checked="true"')).toBe(1)
    expect(count(out, 'type="checkbox"')).toBe(6)
    expect(count(out, 'tabindex="-1"')).toBeGreaterThan(5)
  })

  it('aria-labelledby вместо подписи по умолчанию', () => {
    const out = renderToString(<TreeView nodes={TREE} aria-labelledby="t1" />)
    expect(out).toContain('aria-labelledby="t1"')
    expect(out).not.toContain('aria-label="')
  })
})
