'use client'

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  DataTable,
  Divider,
  IconButton,
  KeyValueList,
  PageHeader,
  Panel,
  SectionTitle,
  Sidebar,
  SidebarCollapseButton,
  SidebarItem,
  SidebarSection,
  StatTile,
  StatusPill,
  Tabs,
  Topbar,
  UiLink,
  useElementWidth,
  useMediaQuery,
  useMounted,
  type Column,
} from 'endfield-vision'
import { Bell, Boxes, ClipboardList, Download, Factory, LayoutDashboard, Pencil, Plus, Search, Settings, Users } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { CodeBlock, Subhead } from './parts'
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

interface HookRow {
  name: string
  text: string
}

const LOW_LEVEL: HookRow[] = [
  { name: 'useControllable', text: 'Управляемое или внутреннее состояние компонента' },
  { name: 'useEventCallback', text: 'Стабильный обработчик со свежим замыканием' },
  { name: 'useIsoLayoutEffect', text: 'useLayoutEffect в браузере, useEffect на сервере' },
  { name: 'useOutsideClick', text: 'Клик вне элементов с учётом вложенных слоёв' },
  { name: 'useDebouncedValue', text: 'Значение с задержкой для поиска (пример - на вкладке «Формы»)' },
  { name: 'Portal', text: 'Рендер в document.body после гидрации' },
  { name: 'useFloating', text: 'Позиция всплывающего слоя у якоря с переворотом у края' },
  { name: 'useFocusTrap', text: 'Ловушка фокуса окна с возвратом на инициатора' },
  { name: 'useScrollLock', text: 'Блокировка прокрутки страницы под окном' },
  { name: 'useEscapeLayer', text: 'Escape закрывает только верхний слой' },
  { name: 'UiLink / useLinkComponent', text: 'Ссылка через компонент из LinkProvider (next/link)' },
  { name: 'useFieldContext / useFieldProps', text: 'Связка своего контрола с Field (пример - «Код партии»)' },
]

const HOOK_COLUMNS: Column<HookRow>[] = [
  { key: 'name', header: 'Экспорт', primary: true, cell: (r) => <code>{r.name}</code> },
  { key: 'text', header: 'Назначение', wrap: true, cell: (r) => <span className="ev-secondary">{r.text}</span> },
]

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

function HooksCard() {
  const narrow = useMediaQuery('(max-width: 1023px)')
  const mounted = useMounted()
  const ref = useRef<HTMLDivElement | null>(null)
  const width = useElementWidth(ref)
  return (
    <Card title="Хуки и низкоуровневое API" description="То, на чём построены компоненты: пригодится для своих контролов и оверлеев." flush>
      <div className="ev-stack" style={{ padding: 'var(--ev-space-6)' }}>
        <KeyValueList
          labelWidth={200}
          items={[
            { key: 'mq', label: 'useMediaQuery', value: narrow ? 'Узкий экран (меню - шторкой)' : 'Широкий экран (меню закреплено)', hint: '(max-width: 1023px), на сервере - false' },
            { key: 'mounted', label: 'useMounted', value: mounted ? 'Клиент, после гидрации' : 'Серверный рендер' },
            { key: 'width', label: 'useElementWidth', value: `${Math.round(width)} px`, hint: 'Ширина блока ниже: потяните за правый нижний угол' },
          ]}
        />
        <div ref={ref} className={s.resizable}>
          ResizeObserver следит за этим блоком.
        </div>
      </div>
      <DataTable aria-label="Низкоуровневые экспорты" columns={HOOK_COLUMNS} rows={LOW_LEVEL} rowKey={(r) => r.name} dense mobile="scroll" />
    </Card>
  )
}

function UtilitiesCard() {
  return (
    <Card title="Утилиты" description="Классы ev-* в слое ev.utilities: раскладка без своих стилей. Отступ задаётся переменной --ev-gap, минимальная ширина колонки сетки - --ev-grid-min.">
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>ev-stack</Subhead>
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            <span className={s.demoBox}>Первый</span>
            <span className={s.demoBox}>Второй</span>
            <span className={s.demoBox}>--ev-gap: var(--ev-space-2)</span>
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>ev-row и ev-spacer</Subhead>
          <div className="ev-row">
            <span className={s.demoBox}>Слева</span>
            <span className={s.demoBox}>Рядом</span>
            <span className="ev-spacer" />
            <span className={s.demoBox}>Справа</span>
          </div>
          <div className="ev-row" data-nowrap="">
            <span className={`${s.demoBox} ev-truncate`}>data-nowrap: ряд не переносится, длинный текст обрезается</span>
            <span className={s.demoBox}>OK</span>
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>ev-grid</Subhead>
          <div className="ev-grid" style={{ '--ev-grid-min': '90px', '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            {['A', 'B', 'C', 'D', 'E'].map((x) => (
              <span key={x} className={s.demoBox}>
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Divider label="Текст" />
      <KeyValueList
        labelWidth={170}
        items={[
          { key: 'mono', label: <code>ev-mono</code>, value: <span className="ev-mono">SKU-40217 · VAL-01</span> },
          { key: 'num', label: <code>ev-num</code>, value: <span className="ev-num">1 111 111 / 8 808 808</span>, hint: 'Цифры одной ширины: колонки чисел не пляшут' },
          { key: 'muted', label: <code>ev-muted</code>, value: <span className="ev-muted">Обновлено 5 минут назад</span> },
          { key: 'secondary', label: <code>ev-secondary</code>, value: <span className="ev-secondary">Вторичный текст</span> },
          {
            key: 'truncate',
            label: <code>ev-truncate</code>,
            value: <span className={`ev-truncate ${s.truncateBox}`}>Фильтр гидравлический высокого давления, партия 3, стеллаж B-14</span>,
          },
          {
            key: 'link',
            label: <code>ev-link</code>,
            value: (
              <UiLink href="/team" className="ev-link">
                Команда объекта
              </UiLink>
            ),
            hint: 'UiLink - ссылка через next/link из LinkProvider',
          },
          { key: 'empty', label: <code>ev-empty-value</code>, value: <span className="ev-empty-value">-</span> },
          {
            key: 'vh',
            label: <code>ev-visually-hidden</code>,
            value: (
              <span>
                Иконка без подписи
                <span className="ev-visually-hidden"> (текст только для скринридера)</span>
              </span>
            ),
          },
        ]}
      />
    </Card>
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

      <Card title="PageHeader и Breadcrumbs" description="Шапка страницы: цепочка, заголовок с бейджами статуса, описание, действия справа, вкладки или фильтры снизу. Breadcrumbs - отдельно, для вложенных экранов.">
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <Panel>
            <PageHeader
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
      </div>

      <UtilitiesCard />
      <HooksCard />
    </div>
  )
}
