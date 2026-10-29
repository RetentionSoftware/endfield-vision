import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { describe, expect, it } from 'vitest'
import { AppShell, AppShellFill, Topbar, Sidebar } from '../components/AppShell'
import { Checkbox, SegmentedControl, Switch } from '../components/Choice'
import { FilterBar, Pagination } from '../components/DataTable'
import { Field, FormRow, FormSection } from '../components/Field'
import { Input } from '../components/Input'
import { submitModalOnEnter } from '../components/Modal'
import { SectionTitle } from '../components/Page'
import { PermissionMatrix } from '../components/PermissionMatrix'
import { SettingRow } from '../components/SettingsList'
import { Slider } from '../components/Slider'
import { Tabs } from '../components/Tabs'
import { ThumbnailGrid } from '../components/Thumbnail'
import { TreeView } from '../components/TreeView'
import { insertEscapeLayer, type EscapeLayer } from '../lib/overlay'
import { nextItemDelta, wheelDelta } from '../lib/scroll-overflow'
import { renderRu } from './render-ru'

/* Слои Escape, Enter в окне-форме, размеры и раскладка контролов, вкладки, каркас во всю высоту. */

const noop = () => undefined
const styles = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles')
const readCss = (file: string) => readFileSync(join(styles, file), 'utf8')

describe('стек Escape: порядок по вложенности узлов', () => {
  // Узел-заглушка: contains по списку вложенных узлов.
  const node = (...inside: Element[]): Element => ({ contains: (n: Node | null) => inside.includes(n as Element) }) as unknown as Element
  const layer = (id: number, nodes?: Element[]): EscapeLayer => ({ id, cb: noop, nodes })

  it('окно, зарегистрированное после открытого сразу списка внутри него, встаёт под список', () => {
    const selectWrap = node()
    const dialog = node(selectWrap)
    const stack: EscapeLayer[] = []
    // Эффект ребёнка (Select defaultOpen) выполняется раньше эффекта окна.
    insertEscapeLayer(stack, layer(1, [selectWrap]))
    insertEscapeLayer(stack, layer(2, [dialog]))
    expect(stack.map((l) => l.id)).toEqual([2, 1])
  })

  it('без вложенности и без узлов - наверх, как раньше', () => {
    const stack: EscapeLayer[] = [layer(1, [node()])]
    insertEscapeLayer(stack, layer(2, [node()]))
    insertEscapeLayer(stack, layer(3))
    expect(stack.map((l) => l.id)).toEqual([1, 2, 3])
  })

  it('список, открытый позже внутри окна, - выше окна', () => {
    const selectWrap = node()
    const stack: EscapeLayer[] = []
    insertEscapeLayer(stack, layer(1, [node(selectWrap)]))
    insertEscapeLayer(stack, layer(2, [selectWrap]))
    expect(stack.map((l) => l.id)).toEqual([1, 2])
  })
})

describe('Modal submitOnEnter', () => {
  interface FakeButton {
    disabled: boolean
    clicks: number
    getAttribute: (name: string) => string | null
    click: () => void
  }
  const button = (disabled = false): FakeButton => {
    const b: FakeButton = { disabled, clicks: 0, getAttribute: () => null, click: () => (b.clicks += 1) }
    return b
  }
  const setup = (opts: { own?: boolean; inside?: boolean; marked?: FakeButton; main?: FakeButton } = {}) => {
    const main = opts.main ?? button()
    const actions = {
      querySelector: () => opts.marked ?? null,
      querySelectorAll: () => [main],
    }
    const dialog = { contains: () => opts.inside ?? true, querySelector: () => actions }
    const target = { isContentEditable: false, closest: () => (opts.own ? {} : null) }
    let prevented = false
    const event = (patch: Partial<Record<'key' | 'shiftKey' | 'ctrlKey', unknown>> = {}) =>
      ({
        key: 'Enter',
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        defaultPrevented: false,
        nativeEvent: { isComposing: false },
        currentTarget: dialog,
        target,
        preventDefault: () => (prevented = true),
        ...patch,
      }) as unknown as ReactKeyboardEvent<HTMLElement>
    return { main, event, prevented: () => prevented }
  }

  it('Enter в поле нажимает главную кнопку подвала', () => {
    const s = setup()
    submitModalOnEnter(s.event())
    expect(s.main.clicks).toBe(1)
    expect(s.prevented()).toBe(true)
  })

  it('кнопка с data-modal-submit главнее последней primary', () => {
    const marked = button()
    const s = setup({ marked })
    submitModalOnEnter(s.event())
    expect(marked.clicks).toBe(1)
    expect(s.main.clicks).toBe(0)
  })

  it('не срабатывает: модификатор, другая клавиша, свой Enter у элемента, портал, заблокированная кнопка', () => {
    const s = setup()
    submitModalOnEnter(s.event({ shiftKey: true }))
    submitModalOnEnter(s.event({ ctrlKey: true }))
    submitModalOnEnter(s.event({ key: 'a' }))
    expect(s.main.clicks).toBe(0)
    const own = setup({ own: true })
    submitModalOnEnter(own.event())
    expect(own.main.clicks).toBe(0)
    const portal = setup({ inside: false })
    submitModalOnEnter(portal.event())
    expect(portal.main.clicks).toBe(0)
    const off = setup({ main: button(true) })
    submitModalOnEnter(off.event())
    expect(off.main.clicks).toBe(0)
    expect(off.prevented()).toBe(false)
  })
})

describe('SectionTitle', () => {
  it('flush - без отступа сверху; у первого ребёнка его нет и без флага', () => {
    expect(renderRu(<SectionTitle flush>Документы</SectionTitle>)).toContain('data-flush="true"')
    expect(renderRu(<SectionTitle>Документы</SectionTitle>)).not.toContain('data-flush')
    expect(readCss('components/display.css')).toMatch(/\.ev-section-title:first-child,\s*\.ev-section-title\[data-flush\] \{\s*margin-top: 0;/)
  })
})

describe('FormSection: колонки и строки на всю ширину', () => {
  it('columns и minColumn - переменные сетки, Field span и FormSection.Row', () => {
    const out = renderRu(
      <FormSection title="Парк" columns={2} minColumn={200}>
        <Field label="Название">
          <Input />
        </Field>
        <Field label="Адрес" span="full">
          <Input />
        </Field>
        <Field label="Код" span={2}>
          <Input />
        </Field>
        <FormSection.Row>Пояснение</FormSection.Row>
      </FormSection>,
    )
    expect(out).toContain('<div class="ev-form-grid" data-columns="" style="--ev-form-cols:2;--ev-form-min:200px">')
    expect(out).toContain('data-span="full"')
    expect(out).toContain('style="grid-column:span 2"')
    expect(out).toContain('<div class="ev-form-row">Пояснение</div>')
    expect(FormSection.Row).toBe(FormRow)
  })

  it('без параметров - сетка как раньше', () => {
    expect(renderRu(<FormSection>{null}</FormSection>)).toContain('<div class="ev-form-grid">')
  })
})

describe('Размеры и раскладка контролов', () => {
  it('SettingRow layout="stacked"', () => {
    expect(renderRu(<SettingRow label="Тема" layout="stacked" control={<Input />} />)).toContain('data-layout="stacked"')
    expect(renderRu(<SettingRow label="Тема" control={<Input />} />)).not.toContain('data-layout')
  })

  it('Slider width - как у полей', () => {
    expect(renderRu(<Slider aria-label="Громкость" value={40} onChange={noop} width="lg" />)).toContain(
      'style="width:var(--ev-control-w-lg);max-width:100%"',
    )
    expect(renderRu(<Slider aria-label="Громкость" value={40} onChange={noop} width={280} />)).toContain('width:280px')
  })

  it('Pagination size: номера и стрелки одного размера; по умолчанию sm', () => {
    const md = renderRu(<Pagination page={2} pageSize={10} total={50} onPageChange={noop} size="md" />)
    expect(md).toContain('class="ev-pagination" data-size="md"')
    expect(md).toMatch(/class="ev-btn ev-btn-iconic" data-variant="ghost" data-size="md"/)
    expect(renderRu(<Pagination page={1} pageSize={10} total={50} onPageChange={noop} />)).toContain('data-size="sm"')
  })

  it('FilterBar size передаётся поиску и кнопке сброса', () => {
    const out = renderRu(<FilterBar size="sm" search={{ value: 'а', onChange: noop }} onReset={noop} />)
    expect(out).toMatch(/class="ev-input[^"]*"[^>]*data-size="sm"/)
    expect(out).toMatch(/data-variant="ghost" data-size="sm"[^>]*><span class="ev-btn-label">Сбросить/)
  })
})

describe('Tabs: переполнение', () => {
  it('лента в рамке; на сервере стрелок нет', () => {
    const out = renderRu(<Tabs aria-label="Разделы" value="a" items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} className="x" />)
    expect(out).toMatch(/^<div class="ev-tabs-frame" data-variant="line"><div class="ev-tabs ev-scroll-track x" data-variant="line" role="tablist"/)
    expect(out).not.toContain('ev-tabs-arrow')
  })

  it('кольцо фокуса вкладки - внутри: лента с прокруткой его не срезает', () => {
    const tokens = readCss('tokens.css')
    const rings = [...tokens.matchAll(/--ev-focus-ring-inset: ([^;]+);/g)].map((m) => m[1]!)
    expect(rings.length).toBeGreaterThan(0)
    for (const ring of rings) expect(ring.startsWith('inset ')).toBe(true)
  })
})

describe('Мелочи', () => {
  it('прочерк пустого значения - цветом вторичного текста, не выключенного', () => {
    expect(readCss('base.css')).toMatch(/\.ev-empty-value \{\s*color: var\(--ev-text-muted\);/)
  })

  it('TreeView: подпись узла с подсказкой не меняет разметку', () => {
    const out = renderRu(<TreeView aria-label="Таблицы" nodes={[{ id: 'a', label: 'Очень длинное имя таблицы' }]} />)
    expect(out).toContain('class="ev-tree-label"')
    expect(out).toContain('Очень длинное имя таблицы')
  })

  it('AppShell fill и AppShellFill', () => {
    const shell = renderRu(
      <AppShell fill sidebar={<Sidebar>{null}</Sidebar>} topbar={<Topbar />}>
        <AppShellFill>Чат</AppShellFill>
      </AppShell>,
    )
    expect(shell).toContain('data-fill="true"')
    expect(shell).toContain('<div class="ev-shell-fill">Чат</div>')
  })
})

describe('SegmentedControl variant="plain"', () => {
  const options = [
    { value: 'day', label: 'День' },
    { value: 'week', label: 'Неделя' },
  ]
  it('без рамки - data-variant, по умолчанию - в рамке', () => {
    const plain = renderRu(<SegmentedControl aria-label="Период" value="day" onChange={noop} options={options} variant="plain" />)
    expect(plain).toContain('role="radiogroup"')
    expect(plain).toContain('data-variant="plain"')
    expect(plain).toContain('role="radio" aria-checked="true"')
    expect(renderRu(<SegmentedControl aria-label="Период" value="day" onChange={noop} options={options} />)).not.toContain('data-variant')
  })

  it('выбранный - токенами выделения, не акцентом', () => {
    const css = readCss('components/form.css')
    expect(css).toMatch(/\.ev-segmented\[data-variant='plain'\] \.ev-segmented-item\[data-active\] \{\s*background: var\(--ev-selected-bg\);\s*color: var\(--ev-selected-text\);/)
  })
})

describe('ThumbnailGrid: заполнение ширины', () => {
  const items = [{ src: '/1.jpg', alt: 'A' }]
  it('fill="auto-fit": пустые колонки схлопываются; по умолчанию - auto-fill', () => {
    const out = renderRu(<ThumbnailGrid items={items} fill="auto-fit" minWidth={160} />)
    expect(out).toContain('data-fill="auto-fit"')
    expect(out).toContain('style="--ev-thumb-min:160px"')
    expect(renderRu(<ThumbnailGrid items={items} />)).not.toContain('data-fill')
    expect(readCss('components/communication.css')).toMatch(/\.ev-thumb-grid\[data-fill='auto-fit'\] \{\s*grid-template-columns: repeat\(auto-fit,/)
  })
})

describe('Высота строки состояния', () => {
  it('--ev-statusbar-h на :root; у каркаса со строкой состояния - --ev-shell-statusbar-h', () => {
    expect(readCss('tokens.css')).toMatch(/:root \{[\s\S]*--ev-statusbar-h: 28px;/)
    const shell = renderRu(
      <AppShell sidebar={<Sidebar>{null}</Sidebar>} topbar={<Topbar />} statusBar={<span>OK</span>}>
        {null}
      </AppShell>,
    )
    expect(shell).toContain('data-statusbar=""')
    expect(readCss('shell.css')).toMatch(/\.ev-shell\[data-statusbar\] \{\s*--ev-shell-statusbar-h: var\(--ev-statusbar-h\);/)
  })
})

describe('Лента с прокруткой: SegmentedControl и стрелки', () => {
  it('сегменты - в ленте внутри рамки radiogroup; на сервере стрелок и затухания нет', () => {
    const out = renderRu(
      <SegmentedControl aria-label="Период" value="d" onChange={noop} options={[{ value: 'd', label: 'День' }, { value: 'w', label: 'Неделя' }]} />,
    )
    expect(out).toMatch(/^<div role="radiogroup" class="ev-segmented" data-size="md" aria-label="Период"><div class="ev-segmented-track ev-scroll-track"><button/)
    expect(out).not.toContain('ev-scroll-arrow')
    expect(out).not.toContain('data-overflow')
  })

  // Лента 0-300, затухание 36: видимая часть 36-264.
  const track = { left: 0, right: 300 }
  const items = [0, 100, 200, 300, 400].map((left) => ({ left, right: left + 90 }))

  it('стрелка вправо докручивает до первого скрытого справа элемента, он встаёт целиком', () => {
    // 200-290 заходит под затухание на 26 px.
    expect(nextItemDelta(track, items, 36, 1)).toBe(26)
    // Почти видимый элемент пропускается: следующий за ним.
    expect(nextItemDelta(track, [{ left: 170, right: 268 }, { left: 280, right: 370 }], 36, 1)).toBe(106)
  })

  it('стрелка влево - до ближайшего скрытого слева', () => {
    const shifted = items.map((i) => ({ left: i.left - 150, right: i.right - 150 }))
    // -50..40 - ближайший скрытый слева: встаёт от 36.
    expect(nextItemDelta(track, shifted, 36, -1)).toBe(-86)
  })

  it('без элементов - на половину ширины', () => {
    expect(nextItemDelta(track, [], 36, 1)).toBe(150)
    expect(nextItemDelta(track, [], 36, -1)).toBe(-150)
  })
})

describe('Колёсико над лентой', () => {
  const wheel = (deltaY: number, patch: Partial<{ deltaX: number; deltaMode: number; shiftKey: boolean; ctrlKey: boolean }> = {}) => ({
    deltaX: 0,
    deltaY,
    deltaMode: 0,
    shiftKey: false,
    ctrlKey: false,
    ...patch,
  })
  const track = (scrollLeft: number) => ({ scrollLeft, scrollWidth: 400, clientWidth: 280 })

  it('вертикальное колёсико крутит переполненную ленту', () => {
    expect(wheelDelta(wheel(100), track(0))).toBe(100)
    expect(wheelDelta(wheel(-100), track(60))).toBe(-100)
    // Строки - в пиксели.
    expect(wheelDelta(wheel(3, { deltaMode: 1 }), track(0))).toBe(48)
  })

  it('у края, без переполнения, по горизонтальному жесту, с Shift и Ctrl - событие остаётся странице', () => {
    expect(wheelDelta(wheel(-100), track(0))).toBe(0)
    expect(wheelDelta(wheel(100), track(120))).toBe(0)
    expect(wheelDelta(wheel(100), { scrollLeft: 0, scrollWidth: 280, clientWidth: 280 })).toBe(0)
    expect(wheelDelta(wheel(10, { deltaX: 40 }), track(0))).toBe(0)
    expect(wheelDelta(wheel(100, { shiftKey: true }), track(0))).toBe(0)
    expect(wheelDelta(wheel(100, { ctrlKey: true }), track(0))).toBe(0)
  })
})

describe('Блочный контент в описаниях и подсказках', () => {
  it('SettingRow: description и hint - div, блочный контент допустим', () => {
    const out = renderRu(
      <SettingRow
        label="Рейсы"
        description={<div>Описание блоком</div>}
        hint={<div>Подробности блоком</div>}
        control={<Input />}
      />,
    )
    expect(out).toContain('class="ev-setting-desc"><div>Описание блоком</div></div>')
    expect(out).toContain('<div class="ev-setting-hint"><div>Подробности блоком</div></div>')
    expect(out).not.toMatch(/<p[ >]/)
  })
})

describe('Checkbox и Switch: блок под описанием', () => {
  it('блок - вне label, вровень с текстом; без него разметка прежняя', () => {
    const out = renderRu(
      <Switch checked={false} onChange={noop} label="Мобильное приложение" description="Вход по коду" size="sm" className="x">
        <div>Подробное пояснение</div>
      </Switch>,
    )
    expect(out).toMatch(/^<div class="ev-check-block x" data-kind="switch" data-size="sm"><label class="ev-switch" /)
    expect(out).toContain('</label><div class="ev-check-extra"><div>Подробное пояснение</div></div></div>')
    const plain = renderRu(<Checkbox checked onChange={noop} label="Согласие" className="x" />)
    expect(plain).toMatch(/^<label class="ev-check x"/)
    expect(plain).not.toContain('ev-check-block')
  })
})

describe('PermissionMatrix: ширины и compact', () => {
  const rows = [{ id: 'keys', label: 'API-ключи' }]
  const columns = [{ id: 'admin', label: 'Администратор филиала' }]
  it('columnWidth и rowHeaderWidth - переменные, compact - иконка в ячейке, название скрыто визуально', () => {
    const out = renderRu(
      <PermissionMatrix
        aria-label="Права"
        rows={rows}
        columns={columns}
        value={{ keys: { admin: 'full' } }}
        onChange={noop}
        density="compact"
        columnWidth={88}
        rowHeaderWidth="10rem"
      />,
    )
    expect(out).toContain('data-density="compact" style="--ev-perm-col-w:88px;--ev-perm-rowhead-w:10rem"')
    expect(out).toContain('<span class="ev-perm-coltext">Администратор филиала</span>')
    expect(out).toMatch(/class="ev-perm-cell"[^>]*>[\s\S]*?<span class="ev-visually-hidden">Полный доступ<\/span>/)
    const normal = renderRu(<PermissionMatrix aria-label="Права" rows={rows} columns={columns} value={{}} onChange={noop} />)
    expect(normal).not.toContain('data-density')
    expect(normal).toContain('class="ev-perm-cell-label"')
  })
})

describe('Видео в Lightbox', () => {
  it('кадр вписывается в сцену по пропорциям: container query, не max-height', () => {
    const css = readCss('components/communication.css')
    expect(css).toMatch(/\.ev-lightbox-video \{[^}]*container-type: size;[^}]*height: 100%;/)
    expect(css).toMatch(/\.ev-lightbox-video \.ev-video-el \{\s*width: min\(100cqw, 100cqh \* var\(--ev-video-ar, 1\.7778\)\);/)
  })
})
