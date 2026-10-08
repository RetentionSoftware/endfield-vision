import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as ui from '../index'
import {
  AppShell,
  Badge,
  BarChart,
  Button,
  Callout,
  Card,
  Checkbox,
  CopyButton,
  DataTable,
  DateField,
  DateRangePicker,
  EmptyState,
  ErrorState,
  Field,
  FileDrop,
  FilterBar,
  IconButton,
  Input,
  KeyValueList,
  LineChart,
  Menu,
  ModalsProvider,
  MoneyInput,
  MultiSelect,
  NumberInput,
  PageHeader,
  Pagination,
  PhoneInput,
  PlateInput,
  Popover,
  RadioGroup,
  SegmentedControl,
  Select,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SnilsInput,
  StatTile,
  Switch,
  Tabs,
  Textarea,
  ToastProvider,
  Topbar,
  type Column,
} from '../index'

/*
 * Серверный рендер компонентов: первая отрисовка без падений, разметка
 * доступности (подписи, роли, связи aria) и видимые значения. Поведение
 * в браузере (поповеры, клавиатура) проверяется на странице ev-kit.
 */

const html = (el: React.ReactElement) => renderToString(el)

describe('экспорт кита', () => {
  it('отдаёт заявленные компоненты', () => {
    const expected = [
      'Button', 'IconButton', 'Input', 'Textarea', 'NumberInput', 'MoneyInput', 'PasswordInput', 'SearchInput',
      'MaskedDigitsInput', 'PhoneInput', 'SnilsInput', 'PlateInput', 'DigitsInput', 'Select', 'MultiSelect',
      'DateField', 'DateRangePicker', 'Calendar', 'Checkbox', 'Switch', 'RadioGroup', 'SegmentedControl', 'Tabs',
      'Badge', 'StatusPill', 'Card', 'Panel', 'PageHeader', 'Breadcrumbs', 'DataTable', 'Pagination', 'FilterBar',
      'Modal', 'ModalsProvider', 'useModals', 'Drawer', 'Toaster', 'ToastProvider', 'useToast', 'toast', 'Tooltip',
      'Menu', 'Popover', 'Skeleton', 'Spinner', 'EmptyState', 'ErrorState', 'Callout', 'KeyValueList', 'StatTile',
      'BarChart', 'LineChart', 'AreaChart', 'Sparkline', 'CopyButton', 'FileDrop', 'Avatar', 'Divider', 'Kbd',
      'AppShell', 'Sidebar', 'SidebarSection', 'SidebarItem', 'Topbar', 'LinkProvider',
    ]
    for (const name of expected) expect(ui, name).toHaveProperty(name)
  })
})

describe('кнопки', () => {
  it('кнопка с загрузкой недоступна и помечена aria-busy', () => {
    const out = html(
      <Button variant="primary" loading>
        Сохранить
      </Button>,
    )
    expect(out).toContain('data-variant="primary"')
    expect(out).toContain('disabled')
    expect(out).toContain('aria-busy="true"')
    expect(out).toContain('Сохранить')
  })

  it('кнопка-иконка подписана для скринридера', () => {
    const out = html(<IconButton label="Удалить" icon={<span>x</span>} />)
    expect(out).toContain('aria-label="Удалить"')
    expect(out).not.toContain('title=')
  })
})

describe('поля', () => {
  it('Field связывает подпись, подсказку и поле', () => {
    const out = html(
      <Field label="Логин" hint="Латиница">
        <Input value="" onChange={() => undefined} />
      </Field>,
    )
    const id = /<input[^>]*id="([^"]+)"/.exec(out)?.[1]
    expect(id).toBeTruthy()
    expect(out).toContain(`for="${id}"`)
    expect(out).toContain(`aria-describedby="${id}-hint"`)
    expect(out).toContain(`id="${id}-hint"`)
  })

  it('ошибка поля - aria-invalid и текст с role=alert', () => {
    const out = html(
      <Field label="Пароль" error="Слишком короткий">
        <Input value="1" onChange={() => undefined} />
      </Field>,
    )
    expect(out).toContain('aria-invalid="true"')
    expect(out).toContain('role="alert"')
    expect(out).toContain('Слишком короткий')
  })

  it('маски показывают отформатированное значение', () => {
    expect(html(<PhoneInput value="+79001234567" onChange={() => undefined} />)).toContain('value="(900) 123-45-67"')
    expect(html(<PhoneInput value="+998901234567" onChange={() => undefined} />)).toContain('+998')
    expect(html(<SnilsInput value="12345678901" onChange={() => undefined} />)).toContain('value="123-456-789 01"')
    expect(html(<PlateInput value="А123ВС77" onChange={() => undefined} />)).toContain('value="А123ВС77"')
    expect(html(<DateField value="2026-10-05" onChange={() => undefined} />)).toContain('value="05.10.2026"')
  })

  it('числа и деньги', () => {
    expect(html(<NumberInput value={30} onChange={() => undefined} unit="дн." />)).toContain('value="30"')
    expect(html(<MoneyInput value={150050} onChange={() => undefined} />)).toContain('value="1500,5"')
    expect(html(<Textarea value="abc" onChange={() => undefined} maxLength={10} showCount />)).toContain('3 / 10')
  })
})

describe('выбор', () => {
  const options = [
    { value: 'a', label: 'Такси Север' },
    { value: 'b', label: 'Южный парк' },
  ]

  it('Select - кнопка role=combobox с выбранной подписью', () => {
    const out = html(<Select value="b" onChange={() => undefined} options={options} aria-label="Парк" />)
    expect(out).toContain('role="combobox"')
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('Южный парк')
    expect(out).not.toContain('<select')
  })

  it('Select без значения показывает плейсхолдер', () => {
    expect(html(<Select value={null} onChange={() => undefined} options={options} placeholder="Выберите парк" />)).toContain('Выберите парк')
  })

  it('MultiSelect - сводка и счётчик', () => {
    const out = html(<MultiSelect value={['a', 'b']} onChange={() => undefined} options={options} />)
    expect(out).toContain('Такси Север, Южный парк')
    expect(out).toMatch(/ev-select-count[^>]*>2</)
  })

  it('DateRangePicker показывает период', () => {
    const out = html(<DateRangePicker value={{ from: '2026-09-01', to: '2026-09-15' }} onChange={() => undefined} />)
    expect(out).toContain('01.09.2026 - 15.09.2026')
  })

  it('Checkbox, Switch, RadioGroup, SegmentedControl', () => {
    expect(html(<Checkbox checked onChange={() => undefined} label="Согласие" />)).toContain('checked')
    expect(html(<Switch checked onChange={() => undefined} label="Вкл" />)).toContain('role="switch"')
    const radio = html(<RadioGroup value="x" onChange={() => undefined} options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} aria-label="R" />)
    expect(radio).toContain('role="radiogroup"')
    expect(radio.match(/type="radio"/g)?.length).toBe(2)
    const seg = html(<SegmentedControl value="b" onChange={() => undefined} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    expect(seg).toContain('aria-checked="true"')
  })

  it('Tabs: вкладки-кнопки и вкладки-ссылки', () => {
    const tabs = html(<Tabs value="a" onChange={() => undefined} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', count: 3 }]} />)
    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('aria-selected="true"')
    const links = html(<Tabs value="a" items={[{ value: 'a', label: 'A', href: '/a' }, { value: 'b', label: 'B', href: '/b' }]} />)
    expect(links).toContain('href="/b"')
    expect(links).toContain('aria-current="page"')
  })
})

interface Row {
  id: string
  name: string
  sum: number | null
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Имя', sortable: true, cell: (r) => r.name },
  { key: 'sum', header: 'Сумма', numeric: true, cell: (r) => r.sum },
]

describe('данные', () => {
  it('DataTable рисует строки, сортировку и пустые значения', () => {
    const out = html(
      <DataTable
        aria-label="Тест"
        columns={columns}
        rows={[{ id: '1', name: 'Иванов', sum: null }]}
        rowKey={(r) => r.id}
        sort={{ key: 'name', dir: 'asc' }}
        onSortChange={() => undefined}
      />,
    )
    expect(out).toContain('Иванов')
    expect(out).toContain('aria-sort="ascending"')
    expect(out).toContain('ev-empty-value')
  })

  it('DataTable: скелетон при загрузке, пустое состояние, ошибка', () => {
    expect(html(<DataTable columns={columns} rows={undefined} rowKey={(r) => r.id} loading />)).toContain('ev-table-skeleton-row')
    expect(html(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} empty="Записей нет" />)).toContain('Записей нет')
    const err = html(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} error={{ message: 'Сбой' }} onRetry={() => undefined} />)
    expect(err).toContain('Сбой')
    expect(err).toContain('Повторить')
  })

  it('Pagination: диапазон и страницы', () => {
    const out = html(<Pagination page={2} pageSize={10} total={23} onPageChange={() => undefined} onPageSizeChange={() => undefined} />)
    expect(out).toContain('11-20 из 23')
    expect(out).toContain('aria-current="page"')
  })

  it('FilterBar, KeyValueList, StatTile, Badge, Card, Callout', () => {
    expect(html(<FilterBar search={{ value: 'abc', onChange: () => undefined }} activeCount={1} onReset={() => undefined} />)).toContain('Сбросить')
    expect(html(<KeyValueList items={[{ key: 'a', label: 'СНИЛС', value: null }]} />)).toContain('ev-empty-value')
    const tile = html(<StatTile label="Водителей" value="265" delta={4.2} />)
    expect(tile).toContain('265')
    expect(tile).toContain('+4,2%')
    expect(html(<Badge tone="success">Оплачен</Badge>)).toContain('data-tone="success"')
    expect(html(<Card title="Заголовок">Тело</Card>)).toContain('<h2 class="ev-card-title">Заголовок</h2>')
    expect(html(<Callout tone="danger">Ошибка</Callout>)).toContain('role="alert"')
  })

  it('графики: пустые данные и скрытая таблица для скринридера', () => {
    const data = [
      { x: '01.09', v: 3 },
      { x: '02.09', v: 5 },
    ]
    const bar = html(<BarChart aria-label="Листы" data={data} x={(d) => d.x} series={[{ key: 'v', label: 'Листов', value: (d) => d.v }]} />)
    expect(bar).toContain('<caption>Листы</caption>')
    expect(bar).toContain('02.09')
    const empty = html(<LineChart aria-label="Пусто" data={[] as typeof data} x={(d) => d.x} series={[{ key: 'v', label: 'V', value: (d) => d.v }]} />)
    expect(empty).toContain('Нет данных за период')
  })
})

describe('состояния, окна, каркас', () => {
  it('EmptyState и ErrorState', () => {
    expect(html(<EmptyState title="Раздел в разработке" />)).toContain('Раздел в разработке')
    expect(html(<ErrorState message="Нет связи" onRetry={() => undefined} />)).toContain('Нет связи')
  })

  it('PageHeader с цепочкой', () => {
    const out = html(<PageHeader title="Водители" subtitle="Описание" breadcrumbs={[{ label: 'Парк', href: '/p/1' }, { label: 'Водители' }]} />)
    expect(out).toContain('<h1 class="ev-page-title">Водители</h1>')
    expect(out).toContain('href="/p/1"')
    expect(out).toContain('aria-label="Навигационная цепочка"')
  })

  it('Menu и Popover: триггеры с aria-haspopup', () => {
    expect(html(<Menu trigger={<button type="button">Действия</button>} items={[{ id: 'a', label: 'A' }]} />)).toContain('aria-haspopup="menu"')
    expect(html(<Popover trigger={<button type="button">Фильтры</button>}>тело</Popover>)).toContain('aria-haspopup="dialog"')
  })

  it('провайдеры окон и уведомлений рендерят детей', () => {
    const out = html(
      <ToastProvider>
        <ModalsProvider>
          <span>содержимое</span>
        </ModalsProvider>
      </ToastProvider>,
    )
    expect(out).toContain('содержимое')
  })

  it('CopyButton и FileDrop', () => {
    expect(html(<CopyButton text="CODE" />)).toContain('aria-label="Скопировать"')
    const drop = html(<FileDrop onFiles={() => undefined} accept=".pdf" />)
    expect(drop).toContain('type="file"')
    expect(drop).toContain('accept=".pdf"')
  })

  it('AppShell: меню, шапка, ссылка «к содержимому»', () => {
    const out = html(
      <AppShell
        sidebar={
          <Sidebar>
            <SidebarSection title="Раздел">
              <SidebarItem href="/drivers" label="Водители" active />
            </SidebarSection>
          </Sidebar>
        }
        topbar={<Topbar left={<span>Парк</span>} />}
      >
        <p>страница</p>
      </AppShell>,
    )
    expect(out).toContain('Перейти к содержимому')
    expect(out).toContain('aria-current="page"')
    expect(out).toContain('страница')
    expect(out).toContain('id="ev-main"')
  })
})
