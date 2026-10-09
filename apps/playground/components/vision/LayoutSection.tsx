'use client'

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  DataTable,
  Divider,
  Field,
  IconButton,
  Input,
  normalizeSearch,
  PageHeader,
  Panel,
  SearchInput,
  SectionTitle,
  Sidebar,
  SidebarCollapseButton,
  SidebarItem,
  SidebarSection,
  StatTile,
  StatusPill,
  TabPanel,
  Tabs,
  Textarea,
  Topbar,
} from 'endfield-vision'
import { Bell, Boxes, ClipboardList, Download, Factory, LayoutDashboard, Pencil, Plus, Search, Settings, Users } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'
import { HooksCard, UtilitiesCard } from './LayoutUtilities'
import { CodeBlock } from './parts'
import s from './vision.module.css'

/** Пример каркаса: подписи пунктов - на языке витрины, код тот же. */
function shellCode({ t }: Translator): string {
  return `'use client'
import { AppShell, Sidebar, SidebarCollapseButton, SidebarItem, SidebarSection, Topbar } from 'endfield-vision'

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AppShell
      sidebar={
        <Sidebar header={<Brand />} footer={<SidebarCollapseButton />}>
          <SidebarSection title="${t('Операции', 'Operations')}">
            <SidebarItem href="/facilities" label="${t('Объекты', 'Facilities')}" icon={<Factory size={18} />} active={pathname === '/facilities'} />
            <SidebarItem href="/tasks" label="${t('Задачи', 'Tasks')}" icon={<ClipboardList size={18} />} badge={12} />
          </SidebarSection>
        </Sidebar>
      }
      topbar={<Topbar left={<CommandSearch />} right={<ThemeMenu />} />}
    >
      {children}
    </AppShell>
  )
}`
}

const SHELL_PARTS: Array<{ name: string; text: Bi }> = [
  {
    name: 'AppShell',
    text: bi(
      'Каркас: меню слева, шапка, область содержимого. От 1024px меню закреплено и сворачивается до иконок; уже - выезжает шторкой.',
      'The frame: sidebar on the left, top bar and content area. From 1024px up, the sidebar is pinned and collapses to icons; on narrower screens it slides out as a drawer.',
    ),
  },
  { name: 'Sidebar', text: bi('Меню: шапка (логотип), прокручиваемая навигация, подвал.', 'The sidebar: a header (logo), scrollable navigation and a footer.') },
  {
    name: 'SidebarSection',
    text: bi('Группа пунктов с заголовком; в свёрнутом меню - разделитель.', 'A titled group of items; turns into a divider when the sidebar is collapsed.'),
  },
  {
    name: 'SidebarItem',
    text: bi(
      'Пункт меню: иконка, подпись, счётчик. В свёрнутом меню подпись уходит в подсказку.',
      'A navigation item: icon, label and counter. In a collapsed sidebar, the label moves into a tooltip.',
    ),
  },
  {
    name: 'SidebarCollapseButton',
    text: bi('Свернуть или развернуть меню. На узком экране не показывается.', 'Collapses or expands the sidebar. Hidden on narrow screens.'),
  },
  {
    name: 'Topbar',
    text: bi(
      'Шапка: left, children по центру, right. Кнопка меню для узкого экрана встроена.',
      'The top bar: left, children in the center, right. The menu button for narrow screens is built in.',
    ),
  },
  {
    name: 'AppShellMenuButton',
    text: bi('Кнопка открытия меню на узком экране. Topbar ставит её сам.', 'Opens the sidebar on narrow screens. Topbar renders it for you.'),
  },
  {
    name: 'useAppShell()',
    text: bi(
      'Состояние каркаса: mobile, collapsed, navOpen и сеттеры - например, компактный логотип в свёрнутом меню.',
      'Shell state: mobile, collapsed, navOpen and their setters. Use it, for example, to show a compact logo in a collapsed sidebar.',
    ),
  },
]

const STORES: Array<{ n: Bi; q: number }> = [
  { n: bi('Долина-1', 'Valley-1'), q: 1204 },
  { n: bi('Долина-2', 'Valley-2'), q: 877 },
  { n: bi('Хребет', 'Ridge'), q: 986 },
  { n: bi('Застава', 'Outpost'), q: 412 },
  { n: bi('Логистический узел', 'Logistics hub'), q: 2310 },
]

type StoreRow = { n: string; q: number }

function storeColumns({ t }: Translator) {
  return [
    { key: 'n', header: t('Склад', 'Warehouse'), primary: true, cell: (r: StoreRow) => r.n },
    { key: 'q', header: t('Позиций', 'Items'), numeric: true, cell: (r: StoreRow) => r.q },
  ]
}

/** Слот toolbar: строка между шапкой и телом; у flush-карточки - с отступами карточки. */
function ToolbarCard() {
  const tr = useT()
  const { t, tx } = tr
  const [q, setQ] = useState('')
  const needle = normalizeSearch(q)
  const rows = STORES.map((r) => ({ n: tx(r.n), q: r.q })).filter((r) => !needle || normalizeSearch(r.n).includes(needle))
  return (
    <Card
      title="toolbar"
      description={t(
        'Поиск или фильтры между шапкой и телом карточки. У flush-карточки строка сохраняет отступы.',
        'Search or filters between the card header and body. In a flush card, this row keeps its padding.',
      )}
      flush
      toolbar={<SearchInput size="sm" value={q} onChange={setQ} placeholder={t('Склад', 'Warehouse')} aria-label={t('Поиск склада', 'Search warehouses')} />}
    >
      <DataTable
        aria-label={t('Склады с поиском', 'Searchable warehouses')}
        dense
        mobile="scroll"
        columns={storeColumns(tr)}
        rows={rows}
        rowKey={(r) => r.n}
        empty={t('Склады не найдены', 'No warehouses found')}
      />
    </Card>
  )
}

const KEEP_ID = 'vision-demo-keep'

/** TabPanel keepMounted: неактивная панель скрыта, но не размонтирована - черновик формы сохраняется. */
function KeepMountedCard() {
  const { t } = useT()
  const [tab, setTab] = useState('act')
  return (
    <Card
      title="TabPanel keepMounted"
      description={t(
        'С activeValue и keepMounted панели всех вкладок остаются в DOM скрытыми (hidden): введите текст, переключите вкладку и вернитесь - черновик на месте. Без keepMounted рендерится только выбранная панель.',
        'With activeValue and keepMounted, every tab panel stays in the DOM, just hidden: type some text, switch tabs and come back, and the draft is still there. Without keepMounted, only the selected panel is rendered.',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Tabs
          variant="pill"
          aria-label={t('Разделы акта', 'Report sections')}
          idBase={KEEP_ID}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'act', label: t('Акт', 'Report') },
            { value: 'note', label: t('Замечания', 'Remarks') },
          ]}
        />
        <TabPanel idBase={KEEP_ID} value="act" activeValue={tab} keepMounted>
          <Field label={t('Номер акта', 'Report number')}>
            <Input placeholder={t('АКТ-0000', 'REP-0000')} />
          </Field>
        </TabPanel>
        <TabPanel idBase={KEEP_ID} value="note" activeValue={tab} keepMounted>
          <Field label={t('Замечания приёмки', 'Receiving remarks')}>
            <Textarea rows={3} placeholder={t('Что не совпало с накладной', 'What did not match the waybill')} />
          </Field>
        </TabPanel>
      </div>
    </Card>
  )
}

/** Статичная миниатюра каркаса: настоящие Sidebar и Topbar без AppShell, недоступна для фокуса (inert). */
function ShellMiniature() {
  const { t } = useT()
  return (
    <div className={s.mini} inert>
      <div className={s.miniSidebar}>
        <Sidebar
          header={
            <span className={s.miniBrand}>
              <span className={s.miniMark} aria-hidden="true" />
              ENDFIELD
            </span>
          }
          footer={<SidebarCollapseButton />}
        >
          <SidebarSection>
            <SidebarItem href="/overview" label={t('Обзор', 'Overview')} icon={<LayoutDashboard size={18} />} />
          </SidebarSection>
          <SidebarSection title={t('Операции', 'Operations')}>
            <SidebarItem href="/facilities" label={t('Объекты', 'Facilities')} icon={<Factory size={18} />} active />
            <SidebarItem href="/tasks" label={t('Задачи', 'Tasks')} icon={<ClipboardList size={18} />} badge={12} />
            <SidebarItem href="/inventory" label={t('Склад', 'Inventory')} icon={<Boxes size={18} />} />
            <SidebarItem href="/team" label={t('Команда', 'Team')} icon={<Users size={18} />} />
          </SidebarSection>
        </Sidebar>
      </div>
      <div className={s.miniMain}>
        <div className={s.miniTopbar}>
          <Topbar
            left={
              <Button size="sm" variant="ghost" icon={<Search size={14} />}>
                {t('Поиск', 'Search')}
              </Button>
            }
            right={
              <>
                <IconButton label={t('Уведомления', 'Notifications')} icon={<Bell size={17} />} noTooltip />
                <IconButton label={t('Настройки', 'Settings')} icon={<Settings size={17} />} noTooltip />
              </>
            }
          />
        </div>
        <div className={s.miniContent}>
          <Breadcrumbs items={[{ label: t('Консоль', 'Console'), href: '/overview' }, { label: t('Объекты', 'Facilities') }]} />
          <div className="ev-grid" style={{ '--ev-grid-min': '150px' } as CSSProperties}>
            <StatTile label={t('Объектов', 'Facilities')} value="12" />
            <StatTile label={t('В работе', 'Operating')} value="9" tone="success" />
            <StatTile label={t('Обслуживание', 'Maintenance')} value="2" tone="info" />
          </div>
        </div>
      </div>
    </div>
  )
}

function cornersCode({ t }: Translator): string {
  return `<div className="ev-corners" data-tone="warning">...</div>              // ${t('уголок сверху слева', 'top-left corner')}
<div className="ev-corners" data-corners="diagonal">...</div>         // ${t('два уголка по диагонали', 'two diagonal corners')}
<div className="ev-corners" data-corners="frame" data-tone="danger">  // ${t('рамка видоискателя', 'full viewfinder frame')}
<div className="ev-corners" data-corners="off">...</div>              // ${t('метка скрыта', 'marker hidden')}

/* ${t('Размер, толщина и отступ - токены; цвет - тон элемента или свой:', 'Size, thickness and inset are tokens; the color follows the element tone or can be set:')} */
.my-card { --ev-corner-size: 14px; --ev-corner-color: var(--ev-violet); }`
}

/** Уголки видоискателя: фирменный акцент вместо цветной полосы по краю панели. */
function CornersCard() {
  const tr = useT()
  const { t } = tr
  const variants = [
    { corners: undefined, tone: 'warning', title: 'corner', text: t('Тихая метка тона: черновик, внимание.', 'A quiet tone marker: a draft, something to check.') },
    {
      corners: 'diagonal',
      tone: 'accent',
      title: 'diagonal',
      text: t('Основной вариант: уведомления, баннеры, активный пункт меню.', 'The default variant: toasts, banners, the active navigation item.'),
    },
    {
      corners: 'frame',
      tone: 'danger',
      title: 'frame',
      text: t('Выбранный или раскрытый элемент: идущий инцидент, фокус внимания.', 'A selected or expanded element: an ongoing incident, the focus of attention.'),
    },
  ] as const
  return (
    <Card
      title={t('Уголки видоискателя (ev-corners)', 'Viewfinder corners (ev-corners)')}
      description={t(
        'Фирменный акцент Endfield Vision вместо цветной полосы по краю панели. Острые угловые скобки внутри панели не повторяют её скругление - метка читается как элемент интерфейса, а не как кромка. Используются в Banner, Toast, активном пункте Sidebar и истории инцидентов.',
        'The signature Endfield Vision accent, used instead of a colored stripe along a panel edge. The sharp corner brackets sit inside the panel and do not follow its rounding, so the marker reads as an interface element rather than a border. Used in Banner, Toast, the active Sidebar item and the incident history.',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <div className="ev-grid" style={{ '--ev-grid-min': '200px' } as CSSProperties}>
          {variants.map((v) => (
            <Panel key={v.title} className="ev-corners" data-corners={v.corners} data-tone={v.tone}>
              <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-1)', padding: 'var(--ev-space-2)' } as CSSProperties}>
                <code>{v.title}</code>
                <span className={s.text}>{v.text}</span>
              </div>
            </Panel>
          ))}
        </div>
        <CodeBlock label="ev-corners" code={cornersCode(tr)} />
      </div>
    </Card>
  )
}

export function LayoutSection() {
  const tr = useT()
  const { t, tx } = tr
  const [tab, setTab] = useState('summary')
  const console_ = t('Консоль', 'Console')
  const valley = t('Долина-1', 'Valley-1')
  return (
    <div className={s.section}>
      <Card
        title="AppShell"
        description={t(
          'Каркас консоли: эта страница сама собрана на нём. Ниже - миниатюра из настоящих Sidebar и Topbar.',
          'The console frame: this very page is built on it. Below is a miniature assembled from the real Sidebar and Topbar.',
        )}
      >
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
          <ShellMiniature />
          <div className={s.parts}>
            {SHELL_PARTS.map((p) => (
              <div key={p.name} className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-1)' } as CSSProperties}>
                <code>{p.name}</code>
                <span className={s.text}>{tx(p.text)}</span>
              </div>
            ))}
          </div>
          <CodeBlock label="ConsoleShell.tsx" code={shellCode(tr)} />
        </div>
      </Card>

      <CornersCard />

      <Card
        title={t('PageHeader и Breadcrumbs', 'PageHeader and Breadcrumbs')}
        description={t(
          'Шапка страницы: цепочка, заголовок с бейджами статуса, описание, действия справа, вкладки или фильтры снизу. headingLevel - уровень заголовка, если h1 на странице уже есть (как здесь: пример - h2). Breadcrumbs - отдельно, для вложенных экранов.',
          'The page header: breadcrumbs, a title with status badges, a description, actions on the right, and tabs or filters below. headingLevel sets the heading level when the page already has an h1 (as here, where the example is an h2). Breadcrumbs also works on its own, for nested screens.',
        )}
      >
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <Panel>
            <PageHeader
              headingLevel={2}
              title={valley}
              subtitle={t('Производственная площадка, Северный сектор. Руководитель - Глеб Сорокин.', 'Production site, North sector. Manager: Gleb Sorokin.')}
              breadcrumbs={[{ label: console_, href: '/overview' }, { label: t('Объекты', 'Facilities'), href: '/facilities' }, { label: valley }]}
              meta={
                <>
                  <StatusPill tone="success">{t('В работе', 'Operating')}</StatusPill>
                  <Badge className="ev-mono">VAL-01</Badge>
                </>
              }
              actions={
                <>
                  <Button icon={<Download size={15} />}>{t('Отчёт', 'Report')}</Button>
                  <Button variant="primary" icon={<Pencil size={15} />}>
                    {t('Изменить', 'Edit')}
                  </Button>
                </>
              }
            >
              <Tabs
                aria-label={t('Разделы объекта', 'Facility sections')}
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'summary', label: t('Сводка', 'Summary') },
                  { value: 'tasks', label: t('Задачи', 'Tasks'), count: 7 },
                  { value: 'team', label: t('Команда', 'Team'), count: 48 },
                ]}
              />
            </PageHeader>
          </Panel>
          <Breadcrumbs
            items={[
              { label: console_, href: '/overview' },
              { label: t('Склад', 'Inventory'), href: '/inventory' },
              { label: valley, href: '/inventory' },
              { label: 'SKU-40217' },
            ]}
          />
        </div>
      </Card>

      <Card
        title="SectionTitle"
        description={t(
          'Заголовок раздела внутри страницы с действиями справа: разбивает длинный экран на смысловые блоки.',
          'An in-page section heading with actions on the right. It splits a long screen into meaningful blocks.',
        )}
      >
        <div className="ev-stack">
          <SectionTitle
            actions={
              <Button size="sm" variant="ghost" icon={<Plus size={14} />}>
                {t('Добавить', 'Add')}
              </Button>
            }
          >
            {t('Ответственные', 'Owners')}
          </SectionTitle>
          <span className={s.text}>{t('Содержимое раздела.', 'Section content.')}</span>
          <SectionTitle>{t('Без действий', 'No actions')}</SectionTitle>
        </div>
      </Card>

      <SectionTitle>{t('Карточки и панели', 'Cards and panels')}</SectionTitle>
      <div className={s.grid}>
        <Card
          title={t('Полная карточка', 'Full card')}
          description={t('Иконка, заголовок, описание, действия и подвал.', 'Icon, title, description, actions and footer.')}
          icon={<Factory size={17} />}
          actions={<IconButton label={t('Изменить', 'Edit')} icon={<Pencil size={15} />} size="sm" />}
          footer={
            <div className="ev-row">
              <span className="ev-muted">{t('Обновлено 08.10.2026', 'Updated 08.10.2026')}</span>
              <span className="ev-spacer" />
              <Button size="sm" variant="ghost">
                {t('Подробнее', 'Details')}
              </Button>
            </div>
          }
        >
          <span className={s.text}>
            {t('Card - основной контейнер: без рамки, его отделяет поверхность.', 'Card is the main container: it has no border and stands apart by its surface.')}
          </span>
        </Card>
        <Card as="article">
          <span className={s.text}>
            {t('Card без шапки', 'Card without a header')} (<code>as=&quot;article&quot;</code>){' '}
            {t('- для простых блоков текста и списков.', 'for simple blocks of text and lists.')}
          </span>
        </Card>
        <Card title="flush" description={t('Тело без отступов: таблица во всю ширину карточки.', 'A body without padding: the table spans the full width of the card.')} flush>
          <DataTable
            aria-label={t('Пример flush', 'flush example')}
            dense
            mobile="scroll"
            columns={storeColumns(tr)}
            rows={[
              { n: valley, q: 1204 },
              { n: t('Хребет', 'Ridge'), q: 986 },
              { n: t('Застава', 'Outpost'), q: 412 },
            ]}
            rowKey={(r) => r.n}
          />
        </Card>
        <Card
          title={t('Panel и Divider', 'Panel and Divider')}
          description={t(
            'Panel - плоский блок без шапки; внутри карточки - на --ev-surface-nested.',
            'Panel is a flat block without a header; inside a card it sits on --ev-surface-nested.',
          )}
        >
          <div className="ev-stack">
            <Panel>{t('Panel с отступами', 'Panel with padding')}</Panel>
            <Panel padded={false}>
              <div className={s.demoBox}>{t('padded=false - отступы задаёт содержимое', 'padded=false: the content sets its own padding')}</div>
            </Panel>
            <Divider />
            <Divider label={t('или', 'or')} />
            <div className="ev-row" style={{ height: 'var(--ev-space-8)' }}>
              <span className="ev-secondary">{t('Слева', 'Left')}</span>
              <Divider vertical />
              <span className="ev-secondary">{t('Справа', 'Right')}</span>
            </div>
          </div>
        </Card>
        <ToolbarCard />
        <KeepMountedCard />
      </div>

      <UtilitiesCard />
      <HooksCard />
    </div>
  )
}
