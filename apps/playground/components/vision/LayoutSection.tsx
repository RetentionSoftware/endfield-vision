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
import { HooksCard, UtilitiesCard } from './LayoutUtilities'
import { CodeBlock } from './parts'
import s from './vision.module.css'

const SHELL_CODE = `'use client'
import { AppShell, Sidebar, SidebarCollapseButton, SidebarItem, SidebarSection, Topbar } from 'endfield-vision'

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AppShell
      sidebar={
        <Sidebar header={<Brand />} footer={<SidebarCollapseButton />}>
          <SidebarSection title="Операции">
            <SidebarItem href="/facilities" label="Объекты" icon={<Factory size={18} />} active={pathname === '/facilities'} />
            <SidebarItem href="/tasks" label="Задачи" icon={<ClipboardList size={18} />} badge={12} />
          </SidebarSection>
        </Sidebar>
      }
      topbar={<Topbar left={<CommandSearch />} right={<ThemeMenu />} />}
    >
      {children}
    </AppShell>
  )
}`

const SHELL_PARTS: Array<{ name: string; text: string }> = [
  { name: 'AppShell', text: 'Каркас: меню слева, шапка, область содержимого. От 1024px меню закреплено и сворачивается до иконок; уже - выезжает шторкой.' },
  { name: 'Sidebar', text: 'Меню: шапка (логотип), прокручиваемая навигация, подвал.' },
  { name: 'SidebarSection', text: 'Группа пунктов с заголовком; в свёрнутом меню - разделитель.' },
  { name: 'SidebarItem', text: 'Пункт меню: иконка, подпись, счётчик. В свёрнутом меню подпись уходит в подсказку.' },
  { name: 'SidebarCollapseButton', text: 'Свернуть или развернуть меню. На узком экране не показывается.' },
  { name: 'Topbar', text: 'Шапка: left, children по центру, right. Кнопка меню для узкого экрана встроена.' },
  { name: 'AppShellMenuButton', text: 'Кнопка открытия меню на узком экране. Topbar ставит её сам.' },
  { name: 'useAppShell()', text: 'Состояние каркаса: mobile, collapsed, navOpen и сеттеры - например, компактный логотип в свёрнутом меню.' },
]

const STORES = [
  { n: 'Долина-1', q: 1204 },
  { n: 'Долина-2', q: 877 },
  { n: 'Хребет', q: 986 },
  { n: 'Застава', q: 412 },
  { n: 'Логистический узел', q: 2310 },
]

/** Слот toolbar: строка между шапкой и телом; у flush-карточки - с отступами карточки. */
function ToolbarCard() {
  const [q, setQ] = useState('')
  const needle = normalizeSearch(q)
  const rows = STORES.filter((r) => !needle || normalizeSearch(r.n).includes(needle))
  return (
    <Card
      title="toolbar"
      description="Поиск или фильтры между шапкой и телом карточки. У flush-карточки строка сохраняет отступы."
      flush
      toolbar={<SearchInput size="sm" value={q} onChange={setQ} placeholder="Склад" aria-label="Поиск склада" />}
    >
      <DataTable
        aria-label="Склады с поиском"
        dense
        mobile="scroll"
        columns={[
          { key: 'n', header: 'Склад', primary: true, cell: (r: { n: string; q: number }) => r.n },
          { key: 'q', header: 'Позиций', numeric: true, cell: (r: { n: string; q: number }) => r.q },
        ]}
        rows={rows}
        rowKey={(r) => r.n}
        empty="Склады не найдены"
      />
    </Card>
  )
}

const KEEP_ID = 'vision-demo-keep'

/** TabPanel keepMounted: неактивная панель скрыта, но не размонтирована - черновик формы сохраняется. */
function KeepMountedCard() {
  const [tab, setTab] = useState('act')
  return (
    <Card
      title="TabPanel keepMounted"
      description="С activeValue и keepMounted панели всех вкладок остаются в DOM скрытыми (hidden): введите текст, переключите вкладку и вернитесь - черновик на месте. Без keepMounted рендерится только выбранная панель."
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Tabs
          variant="pill"
          aria-label="Разделы акта"
          idBase={KEEP_ID}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'act', label: 'Акт' },
            { value: 'note', label: 'Замечания' },
          ]}
        />
        <TabPanel idBase={KEEP_ID} value="act" activeValue={tab} keepMounted>
          <Field label="Номер акта">
            <Input placeholder="АКТ-0000" />
          </Field>
        </TabPanel>
        <TabPanel idBase={KEEP_ID} value="note" activeValue={tab} keepMounted>
          <Field label="Замечания приёмки">
            <Textarea rows={3} placeholder="Что не совпало с накладной" />
          </Field>
        </TabPanel>
      </div>
    </Card>
  )
}

/** Статичная миниатюра каркаса: настоящие Sidebar и Topbar без AppShell, недоступна для фокуса (inert). */
function ShellMiniature() {
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
            <SidebarItem href="/overview" label="Обзор" icon={<LayoutDashboard size={18} />} />
          </SidebarSection>
          <SidebarSection title="Операции">
            <SidebarItem href="/facilities" label="Объекты" icon={<Factory size={18} />} active />
            <SidebarItem href="/tasks" label="Задачи" icon={<ClipboardList size={18} />} badge={12} />
            <SidebarItem href="/inventory" label="Склад" icon={<Boxes size={18} />} />
            <SidebarItem href="/team" label="Команда" icon={<Users size={18} />} />
          </SidebarSection>
        </Sidebar>
      </div>
      <div className={s.miniMain}>
        <div className={s.miniTopbar}>
          <Topbar
            left={<Button size="sm" variant="ghost" icon={<Search size={14} />}>Поиск</Button>}
            right={
              <>
                <IconButton label="Уведомления" icon={<Bell size={17} />} noTooltip />
                <IconButton label="Настройки" icon={<Settings size={17} />} noTooltip />
              </>
            }
          />
        </div>
        <div className={s.miniContent}>
          <Breadcrumbs items={[{ label: 'Консоль', href: '/overview' }, { label: 'Объекты' }]} />
          <div className="ev-grid" style={{ '--ev-grid-min': '150px' } as CSSProperties}>
            <StatTile label="Объектов" value="12" />
            <StatTile label="В работе" value="9" tone="success" />
            <StatTile label="Обслуживание" value="2" tone="info" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LayoutSection() {
  const [tab, setTab] = useState('summary')
  return (
    <div className={s.section}>
      <Card title="AppShell" description="Каркас консоли: эта страница сама собрана на нём. Ниже - миниатюра из настоящих Sidebar и Topbar.">
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
          <ShellMiniature />
          <div className={s.parts}>
            {SHELL_PARTS.map((p) => (
              <div key={p.name} className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-1)' } as CSSProperties}>
                <code>{p.name}</code>
                <span className={s.text}>{p.text}</span>
              </div>
            ))}
          </div>
          <CodeBlock label="ConsoleShell.tsx" code={SHELL_CODE} />
        </div>
      </Card>

      <Card title="PageHeader и Breadcrumbs" description="Шапка страницы: цепочка, заголовок с бейджами статуса, описание, действия справа, вкладки или фильтры снизу. headingLevel - уровень заголовка, если h1 на странице уже есть (как здесь: пример - h2). Breadcrumbs - отдельно, для вложенных экранов.">
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <Panel>
            <PageHeader
              headingLevel={2}
              title="Долина-1"
              subtitle="Производственная площадка, Северный сектор. Руководитель - Глеб Сорокин."
              breadcrumbs={[
                { label: 'Консоль', href: '/overview' },
                { label: 'Объекты', href: '/facilities' },
                { label: 'Долина-1' },
              ]}
              meta={
                <>
                  <StatusPill tone="success">В работе</StatusPill>
                  <Badge className="ev-mono">VAL-01</Badge>
                </>
              }
              actions={
                <>
                  <Button icon={<Download size={15} />}>Отчёт</Button>
                  <Button variant="primary" icon={<Pencil size={15} />}>
                    Изменить
                  </Button>
                </>
              }
            >
              <Tabs
                aria-label="Разделы объекта"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'summary', label: 'Сводка' },
                  { value: 'tasks', label: 'Задачи', count: 7 },
                  { value: 'team', label: 'Команда', count: 48 },
                ]}
              />
            </PageHeader>
          </Panel>
          <Breadcrumbs
            items={[
              { label: 'Консоль', href: '/overview' },
              { label: 'Склад', href: '/inventory' },
              { label: 'Долина-1', href: '/inventory' },
              { label: 'SKU-40217' },
            ]}
          />
        </div>
      </Card>

      <Card title="SectionTitle" description="Заголовок раздела внутри страницы с действиями справа: разбивает длинный экран на смысловые блоки.">
        <div className="ev-stack">
          <SectionTitle actions={<Button size="sm" variant="ghost" icon={<Plus size={14} />}>Добавить</Button>}>Ответственные</SectionTitle>
          <span className={s.text}>Содержимое раздела.</span>
          <SectionTitle>Без действий</SectionTitle>
        </div>
      </Card>

      <SectionTitle>Карточки и панели</SectionTitle>
      <div className={s.grid}>
        <Card
          title="Полная карточка"
          description="Иконка, заголовок, описание, действия и подвал."
          icon={<Factory size={17} />}
          actions={<IconButton label="Изменить" icon={<Pencil size={15} />} size="sm" />}
          footer={
            <div className="ev-row">
              <span className="ev-muted">Обновлено 08.10.2026</span>
              <span className="ev-spacer" />
              <Button size="sm" variant="ghost">
                Подробнее
              </Button>
            </div>
          }
        >
          <span className={s.text}>Card - основной контейнер: без рамки, его отделяет поверхность.</span>
        </Card>
        <Card as="article">
          <span className={s.text}>
            Card без шапки (<code>as=&quot;article&quot;</code>) - для простых блоков текста и списков.
          </span>
        </Card>
        <Card title="flush" description="Тело без отступов: таблица во всю ширину карточки." flush>
          <DataTable
            aria-label="Пример flush"
            dense
            mobile="scroll"
            columns={[
              { key: 'n', header: 'Склад', primary: true, cell: (r: { n: string; q: number }) => r.n },
              { key: 'q', header: 'Позиций', numeric: true, cell: (r: { n: string; q: number }) => r.q },
            ]}
            rows={[
              { n: 'Долина-1', q: 1204 },
              { n: 'Хребет', q: 986 },
              { n: 'Застава', q: 412 },
            ]}
            rowKey={(r) => r.n}
          />
        </Card>
        <Card title="Panel и Divider" description="Panel - плоский блок без шапки; внутри карточки - на --ev-surface-nested.">
          <div className="ev-stack">
            <Panel>Panel с отступами</Panel>
            <Panel padded={false}>
              <div className={s.demoBox}>padded=false - отступы задаёт содержимое</div>
            </Panel>
            <Divider />
            <Divider label="или" />
            <div className="ev-row" style={{ height: 'var(--ev-space-8)' }}>
              <span className="ev-secondary">Слева</span>
              <Divider vertical />
              <span className="ev-secondary">Справа</span>
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
