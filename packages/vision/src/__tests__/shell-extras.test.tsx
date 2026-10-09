import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../components/AppShell'
import {
  compactMenuEntries,
  ContextMenu,
  ContextMenuPanel,
  ContextMenuProvider,
  isContextMenuKey,
  joinMenuSections,
  placeContextMenu,
} from '../components/ContextMenu'
import type { MenuEntry } from '../components/Menu'
import { isBlockingOverlay, ScreenNoticeView, ScreenOverlay, ScreenOverlayView } from '../components/ScreenOverlay'
import { StatusBar, StatusBarClock, StatusBarItem, StatusBarSeparator } from '../components/StatusBar'
import { filterWorkspaces, WorkspaceSwitcher, type WorkspaceItem } from '../components/WorkspaceSwitcher'
import { LocaleProvider } from '../lib/i18n'
import {
  countActiveFilters,
  filterValueEquals,
  hasFilterParams,
  mergeFilterSearch,
  parseFilters,
  serializeFilters,
} from '../lib/url-filters'
import { renderRu } from './render-ru'

/* Оболочка: контекстное меню, строка состояния, рабочие пространства, экранные состояния, фильтры в адресе. */

const noop = () => undefined

/* ------------------------------------------------------------------ */
/* ContextMenu                                                         */
/* ------------------------------------------------------------------ */

const ENTRIES: MenuEntry[] = [
  { type: 'label', id: 'l', label: 'Строка' },
  { id: 'open', label: 'Открыть', shortcut: 'Enter', onSelect: noop },
  { id: 'copy', label: 'Копировать номер', onSelect: noop },
  { type: 'separator', id: 's1' },
  { id: 'pin', label: 'Закрепить', checked: true, onSelect: noop },
  { id: 'del', label: 'Удалить', danger: true, disabled: true, onSelect: noop },
]

describe('ContextMenu: чистые функции', () => {
  it('убирает разделители по краям и подряд, пустые подписи групп', () => {
    const out = compactMenuEntries([
      { type: 'separator', id: 'a' },
      { id: 'x', label: 'X' },
      { type: 'separator', id: 'b' },
      { type: 'separator', id: 'c' },
      { type: 'label', id: 'g', label: 'Группа' },
      { type: 'separator', id: 'd' },
      { id: 'y', label: 'Y' },
      { type: 'separator', id: 'e' },
      { type: 'label', id: 'h', label: 'Хвост' },
    ])
    expect(out.map((e) => e.id)).toEqual(['x', 'b', 'y'])
  })

  it('склеивает группы через разделитель и пропускает пустые', () => {
    const out = joinMenuSections([[{ id: 'a', label: 'A' }], null, [], [{ id: 'b', label: 'B' }]])
    expect(out.map((e) => e.type ?? 'item')).toEqual(['item', 'separator', 'item'])
    expect(joinMenuSections([null, undefined])).toEqual([])
  })

  it('ставит меню у курсора и переворачивает у края окна', () => {
    const vp = { width: 1000, height: 800 }
    const size = { width: 200, height: 300 }
    expect(placeContextMenu({ x: 100, y: 100 }, size, vp)).toEqual({ left: 100, top: 100 })
    // Справа не помещается - слева от курсора; снизу не помещается - над курсором.
    expect(placeContextMenu({ x: 900, y: 700 }, size, vp)).toEqual({ left: 700, top: 400 })
    // Открытие с клавиатуры: вверх - от верха элемента.
    expect(placeContextMenu({ x: 10, y: 700, flipY: 670 }, size, vp)).toEqual({ left: 10, top: 370 })
    // Меню больше окна - прижато к отступу.
    expect(placeContextMenu({ x: 5, y: 5 }, { width: 2000, height: 2000 }, vp)).toEqual({ left: 8, top: 8 })
  })

  it('узнаёт клавиши открытия', () => {
    expect(isContextMenuKey({ key: 'ContextMenu', shiftKey: false })).toBe(true)
    expect(isContextMenuKey({ key: 'F10', shiftKey: true })).toBe(true)
    expect(isContextMenuKey({ key: 'F10', shiftKey: false })).toBe(false)
  })
})

describe('ContextMenu: разметка', () => {
  it('закрытое меню не меняет разметку элемента', () => {
    const html = renderRu(
      <ContextMenu items={ENTRIES}>
        <div className="row">Строка 1</div>
      </ContextMenu>,
    )
    expect(html).toBe('<div class="row">Строка 1</div>')
  })

  it('провайдер рендерит только детей', () => {
    const html = renderRu(
      <ContextMenuProvider>
        <div data-ctx-kind="task" data-ctx-id="t-1">
          Задача
        </div>
      </ContextMenuProvider>,
    )
    expect(html).toContain('data-ctx-kind="task"')
    expect(html).not.toContain('role="menu"')
  })

  it('панель: role=menu с подписью, пункты, отметка, недоступный пункт', () => {
    const html = renderRu(<ContextMenuPanel items={ENTRIES} label="Контекстное меню" active={1} />)
    expect(html).toContain('role="menu"')
    expect(html).toContain('aria-label="Контекстное меню"')
    expect(html).toContain('ev-context-menu')
    expect(html.split('role="menuitem"').length - 1).toBe(3)
    expect(html).toContain('role="menuitemcheckbox"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('role="separator"')
    expect(html).toContain('<kbd class="ev-kbd">Enter</kbd>')
    expect(html).toMatch(/data-active="true"[^>]*>.*Открыть/)
  })
})

/* ------------------------------------------------------------------ */
/* StatusBar                                                           */
/* ------------------------------------------------------------------ */

describe('StatusBar', () => {
  it('ориентир с подписью из словаря и три зоны', () => {
    const html = renderRu(<StatusBar left={<StatusBarItem>Готово</StatusBarItem>} center="Центр" right={<StatusBarItem mono>v1.4.2</StatusBarItem>} />)
    expect(html).toContain('role="contentinfo"')
    expect(html).toContain('aria-label="Строка состояния"')
    expect(html).toContain('data-zone="left"')
    expect(html).toContain('data-zone="center"')
    expect(html).toContain('data-zone="right"')
    expect(html).toContain('data-mono="true"')
  })

  it('внутри карточки - группа; английская подпись', () => {
    const html = renderToString(
      <LocaleProvider locale="en">
        <StatusBar landmark={false} left="ok" />
      </LocaleProvider>,
    )
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="Status bar"')
    expect(html).not.toContain('data-zone="center"')
  })

  it('элементы: точка тона, ссылка, кнопка, фокус при подсказке, разделитель', () => {
    const html = renderRu(
      <StatusBar
        left={
          <>
            <StatusBarItem tone="success">Связь есть</StatusBarItem>
            <StatusBarSeparator />
            <StatusBarItem href="/changelog">v1.4.2</StatusBarItem>
            <StatusBarItem onClick={noop}>Нагрузка 42%</StatusBarItem>
            <StatusBarItem tooltip="Время сервера">12:00</StatusBarItem>
          </>
        }
      />,
    )
    expect(html).toContain('class="ev-statusbar-dot" data-tone="success" aria-hidden="true"')
    expect(html).toContain('href="/changelog"')
    expect(html).toContain('<button type="button" class="ev-statusbar-item"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('role="separator" aria-orientation="vertical"')
  })

  it('часы: фиксированное время с datetime, без него - заглушка до гидрации', () => {
    const fixed = renderRu(<StatusBarClock value={new Date(2026, 9, 9, 14, 5)} />)
    expect(fixed).toContain('14:05')
    expect(fixed).toContain('<time dateTime=')
    const live = renderRu(<StatusBarClock />)
    expect(live).toContain('--:--')
  })

  it('AppShell: строка состояния внизу колонки содержимого', () => {
    const html = renderRu(
      <AppShell sidebar={<nav>меню</nav>} topbar={<div>шапка</div>} statusBar={<StatusBar left="ok" />}>
        <p>содержимое</p>
      </AppShell>,
    )
    expect(html).toContain('class="ev-shell-statusbar"')
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('ev-shell-statusbar'))
    const without = renderRu(
      <AppShell sidebar={<nav>меню</nav>} topbar={<div>шапка</div>}>
        <p>содержимое</p>
      </AppShell>,
    )
    expect(without).not.toContain('ev-shell-statusbar')
  })
})

/* ------------------------------------------------------------------ */
/* WorkspaceSwitcher                                                   */
/* ------------------------------------------------------------------ */

const SPACES: WorkspaceItem[] = [
  { id: 'north', name: 'Северный сектор', description: 'Основная площадка', keywords: ['north'] },
  { id: 'east', name: 'Восточный сектор', description: 'Склад и логистика' },
  { id: 'port', name: 'Порт Ясный', badge: 3 },
  { id: 'lab', name: 'Лаборатория Сигма', description: 'Тестовый стенд', disabled: true },
]

describe('WorkspaceSwitcher', () => {
  it('фильтр: название, описание, ключевые слова; без регистра и «ё»; все слова', () => {
    expect(filterWorkspaces(SPACES, '').length).toBe(4)
    expect(filterWorkspaces(SPACES, 'СЕКТОР').map((w) => w.id)).toEqual(['north', 'east'])
    expect(filterWorkspaces(SPACES, 'склад').map((w) => w.id)).toEqual(['east'])
    expect(filterWorkspaces(SPACES, 'north').map((w) => w.id)).toEqual(['north'])
    expect(filterWorkspaces(SPACES, 'сектор основная').map((w) => w.id)).toEqual(['north'])
    expect(filterWorkspaces([{ id: 'x', name: 'Ёлки' }], 'елки').length).toBe(1)
    expect(filterWorkspaces(SPACES, 'нет такого')).toEqual([])
  })

  it('кнопка: подпись из словаря с названием текущего, список закрыт', () => {
    const html = renderRu(<WorkspaceSwitcher items={SPACES} value="east" onSwitch={noop} />)
    expect(html).toContain('aria-label="Сменить рабочее пространство: Восточный сектор"')
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Склад и логистика')
    expect(html).not.toContain('role="listbox"')
  })

  it('свёрнутый режим - только логотип', () => {
    const html = renderRu(<WorkspaceSwitcher items={SPACES} value="north" onSwitch={noop} collapsed />)
    expect(html).toContain('data-collapsed="true"')
    expect(html).not.toContain('ev-workspace-name')
  })

  it('одно пространство - подпись без кнопки', () => {
    const html = renderRu(<WorkspaceSwitcher items={[SPACES[0]!]} value="north" onSwitch={noop} />)
    expect(html).not.toContain('<button')
    expect(html).toContain('Северный сектор')
  })
})

/* ------------------------------------------------------------------ */
/* ScreenOverlay                                                       */
/* ------------------------------------------------------------------ */

describe('ScreenOverlay', () => {
  it('блокирующие варианты', () => {
    expect(isBlockingOverlay('maintenance')).toBe(true)
    expect(isBlockingOverlay('maintenance', false)).toBe(true)
    expect(isBlockingOverlay('update', true)).toBe(false)
    expect(isBlockingOverlay('custom')).toBe(true)
    expect(isBlockingOverlay('custom', false)).toBe(false)
  })

  it('закрытый слой ничего не рендерит, открытый - только в портале после гидрации', () => {
    expect(renderRu(<ScreenOverlay variant="maintenance" open={false} />)).toBe('')
    expect(renderRu(<ScreenOverlay variant="update" open />)).toBe('')
  })

  it('техработы: модальное окно с заголовком, текстом, сроком и крестиком', () => {
    const html = renderRu(
      <ScreenOverlayView
        variant="maintenance"
        titleId="t"
        textId="d"
        heading="Идут технические работы"
        body="Система временно недоступна."
        mark={<svg />}
        until="14:30"
        untilLabel="Окончание"
        closeLabel="Закрыть"
        onDismiss={noop}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="t"')
    expect(html).toContain('aria-describedby="d"')
    expect(html).toContain('data-variant="maintenance"')
    expect(html).toContain('data-corners="frame"')
    expect(html).toContain('Окончание')
    expect(html).toContain('14:30')
    expect(html).toContain('aria-label="Закрыть"')
  })

  it('без onDismiss крестика нет', () => {
    const html = renderRu(
      <ScreenOverlayView variant="maintenance" titleId="t" textId="d" heading="H" body={null} mark={null} closeLabel="Закрыть" />,
    )
    expect(html).not.toContain('ev-screen-overlay-close')
    expect(html).not.toContain('aria-describedby')
  })

  it('обновление: немодальное окно с действиями', () => {
    const html = renderRu(
      <ScreenNoticeView
        variant="update"
        titleId="t"
        textId="d"
        heading="Доступна новая версия"
        body="Обновите страницу."
        mark={<svg />}
        actions={<button type="button">Обновить</button>}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="false"')
    expect(html).toContain('data-variant="update"')
    expect(html).toContain('ev-screen-notice-actions')
  })
})

/* ------------------------------------------------------------------ */
/* useUrlFilters: чистые функции                                       */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  demo_q: '',
  demo_status: 'open',
  demo_tags: [] as string[],
  demo_overdue: false,
  demo_min: 0,
}

describe('url-filters', () => {
  it('пишет только отличия от значений по умолчанию', () => {
    expect(serializeFilters(DEFAULTS, DEFAULTS).toString()).toBe('')
    const sp = serializeFilters({ ...DEFAULTS, demo_q: 'насос', demo_tags: ['a', 'b'], demo_overdue: true, demo_min: 5 }, DEFAULTS)
    expect(sp.get('demo_q')).toBe('насос')
    expect(sp.get('demo_tags')).toBe('a,b')
    expect(sp.get('demo_overdue')).toBe('1')
    expect(sp.get('demo_min')).toBe('5')
    expect(sp.has('demo_status')).toBe(false)
  })

  it('пустое при непустом умолчании пишется пустым параметром', () => {
    const sp = serializeFilters({ ...DEFAULTS, demo_status: '' }, DEFAULTS)
    expect(sp.toString()).toBe('demo_status=')
    expect(parseFilters(sp, DEFAULTS).demo_status).toBe('')
  })

  it('читает типы по значениям по умолчанию и игнорирует чужие ключи', () => {
    const parsed = parseFilters(new URLSearchParams('tab=data&demo_tags=x,%20y&demo_overdue=true&demo_min=abc&demo_status=closed'), DEFAULTS)
    expect(parsed).toEqual({ demo_q: '', demo_status: 'closed', demo_tags: ['x', 'y'], demo_overdue: true, demo_min: 0 })
    expect('tab' in parsed).toBe(false)
  })

  it('туда и обратно - то же значение', () => {
    const value = { demo_q: 'a b', demo_status: 'closed', demo_tags: ['t1'], demo_overdue: true, demo_min: 12 }
    expect(parseFilters(serializeFilters(value, DEFAULTS), DEFAULTS)).toEqual(value)
  })

  it('считает активные фильтры', () => {
    expect(countActiveFilters(DEFAULTS, DEFAULTS)).toBe(0)
    expect(countActiveFilters({ ...DEFAULTS, demo_q: 'x', demo_tags: ['a'] }, DEFAULTS)).toBe(2)
    expect(filterValueEquals([], null)).toBe(true)
    expect(filterValueEquals(['a'], ['a'])).toBe(true)
    expect(filterValueEquals(['a'], ['b'])).toBe(false)
  })

  it('заменяет свои параметры в адресе и не трогает чужие', () => {
    const next = new URLSearchParams('demo_q=x')
    expect(mergeFilterSearch('?tab=data&demo_q=old&demo_min=3', next, Object.keys(DEFAULTS))).toBe('?tab=data&demo_q=x')
    expect(mergeFilterSearch('?demo_q=old', new URLSearchParams(), Object.keys(DEFAULTS))).toBe('')
    expect(hasFilterParams(new URLSearchParams('tab=data'), Object.keys(DEFAULTS))).toBe(false)
    expect(hasFilterParams(new URLSearchParams('demo_status='), Object.keys(DEFAULTS))).toBe(true)
  })
})
