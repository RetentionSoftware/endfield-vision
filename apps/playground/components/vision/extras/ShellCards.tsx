'use client'

import {
  Badge,
  Button,
  Card,
  Checkbox,
  ContextMenu,
  ContextMenuProvider,
  Kbd,
  ScreenOverlay,
  SearchInput,
  SegmentedControl,
  serializeFilters,
  StatusBar,
  StatusBarClock,
  StatusBarItem,
  StatusBarSeparator,
  toast,
  useContextMenuProvider,
  useUrlFilters,
  WorkspaceSwitcher,
  type MenuEntry,
  type WorkspaceItem,
} from 'endfield-vision'
import {
  Antenna,
  Archive,
  Copy,
  Cpu,
  ExternalLink,
  Factory,
  FlaskConical,
  Gauge,
  Mountain,
  Pencil,
  Pickaxe,
  Settings,
  Shield,
  Ship,
  Trash2,
  UserRound,
  Warehouse,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useT } from '@/lib/i18n'
import { CodeBlock, Subhead } from '../parts'

/* ------------------------------------------------------------------ */
/* Общие стили демо                                                    */
/* ------------------------------------------------------------------ */

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  margin: 0,
  padding: 'var(--ev-space-1)',
  listStyle: 'none',
  background: 'var(--ev-surface-nested)',
  borderRadius: 'var(--ev-radius-md)',
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '88px 1fr auto',
  alignItems: 'center',
  gap: 'var(--ev-space-4)',
  padding: 'var(--ev-space-3) var(--ev-space-4)',
  borderRadius: 'var(--ev-radius-sm)',
  fontSize: 'var(--ev-fs-sm)',
  cursor: 'context-menu',
}

const nestedStyle: CSSProperties = {
  background: 'var(--ev-surface-nested)',
  borderRadius: 'var(--ev-radius-md)',
  overflow: 'hidden',
}

function LastAction({ value }: { value: string | null }) {
  const { t } = useT()
  return (
    <span className="ev-secondary" aria-live="polite">
      {value ? (
        <>
          {t('Последнее действие:', 'Last action:')} <strong>{value}</strong>
        </>
      ) : (
        t('Действий пока не было', 'No actions yet')
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Контекстное меню                                                    */
/* ------------------------------------------------------------------ */

interface OrderRow {
  id: string
  title: string
  site: string
  done: boolean
}

function ContextMenuCard() {
  const { t } = useT()
  const [last, setLast] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string[]>(['WO-1042'])

  const rows: OrderRow[] = [
    { id: 'WO-1041', title: t('Замена подшипника насоса Н-2', 'Replace pump P-2 bearing'), site: t('Долина-1', 'Valley-1'), done: false },
    { id: 'WO-1042', title: t('Поверка датчиков давления', 'Pressure sensor calibration'), site: t('Хребет', 'Ridge'), done: false },
    { id: 'WO-1043', title: t('Осмотр конвейерной ленты', 'Conveyor belt inspection'), site: t('Порт Ясный', 'Clearwater Port'), done: true },
    { id: 'WO-1044', title: t('Обновление прошивки КЛ-7', 'LC-7 firmware update'), site: t('Застава', 'Outpost'), done: false },
  ]

  const act = (label: string) => () => setLast(label)

  // Одна обёртка на весь список: пункты собираются по строке под курсором.
  const itemsFor = (target: HTMLElement): MenuEntry[] | null => {
    const id = target.closest<HTMLElement>('[data-row]')?.dataset.row
    const row = rows.find((r) => r.id === id)
    if (!row) return null
    const isPinned = pinned.includes(row.id)
    return [
      { type: 'label', id: 'head', label: row.id },
      { id: 'open', label: t('Открыть', 'Open'), icon: <ExternalLink size={15} />, shortcut: 'Enter', onSelect: act(`${t('Открыть', 'Open')} ${row.id}`) },
      { id: 'edit', label: t('Изменить', 'Edit'), icon: <Pencil size={15} />, disabled: row.done, onSelect: act(`${t('Изменить', 'Edit')} ${row.id}`) },
      {
        id: 'pin',
        label: t('Закрепить', 'Pin'),
        checked: isPinned,
        onSelect: () => {
          setPinned((p) => (isPinned ? p.filter((x) => x !== row.id) : [...p, row.id]))
          setLast(`${isPinned ? t('Откреплено', 'Unpinned') : t('Закреплено', 'Pinned')} ${row.id}`)
        },
      },
      { type: 'separator', id: 's1' },
      { id: 'copy', label: t('Скопировать номер', 'Copy number'), icon: <Copy size={15} />, onSelect: act(`${t('Скопировано', 'Copied')} ${row.id}`) },
      { id: 'archive', label: t('В архив', 'Archive'), icon: <Archive size={15} />, onSelect: act(`${t('В архив', 'Archive')} ${row.id}`) },
      { id: 'delete', label: t('Удалить', 'Delete'), icon: <Trash2 size={15} />, danger: true, onSelect: act(`${t('Удалить', 'Delete')} ${row.id}`) },
    ]
  }

  return (
    <Card
      title="ContextMenu"
      description={t(
        'Меню по правой кнопке мыши. Пункты - те же MenuEntry, что у Menu: стрелки, Home/End, поиск по первым буквам, Enter, Escape с возвратом фокуса. С клавиатуры - клавиша ContextMenu или Shift+F10 на строке в фокусе. Правый клик с Shift и правый клик в поле ввода открывают нативное меню браузера.',
        'Right-click menu. Items are the same MenuEntry as in Menu: arrow keys, Home/End, typeahead, Enter, Escape with focus return. From the keyboard - the ContextMenu key or Shift+F10 on a focused row. Shift + right-click and right-click inside a text field open the native browser menu.',
      )}
    >
      <div className="ev-stack">
        <ContextMenu items={itemsFor}>
          <ul style={listStyle} aria-label={t('Наряды', 'Work orders')}>
            {rows.map((r) => (
              <li key={r.id} data-row={r.id} tabIndex={0} style={rowStyle} className="ev-corners" data-corners={pinned.includes(r.id) ? undefined : 'off'}>
                <span className="ev-mono">{r.id}</span>
                <span className="ev-truncate">{r.title}</span>
                <span className="ev-muted">{r.site}</span>
              </li>
            ))}
          </ul>
        </ContextMenu>
        <div className="ev-row">
          <span className="ev-muted">
            <Kbd>Shift</Kbd> <Kbd>F10</Kbd> {t('- меню строки в фокусе', '- menu for the focused row')}
          </span>
          <span className="ev-spacer" />
          <LastAction value={last} />
        </div>
      </div>
    </Card>
  )
}

/* Реестр видов объектов: экран регистрирует пункты для data-ctx-kind. */
function SiteTiles({ onAction }: { onAction: (label: string) => void }) {
  const { t } = useT()
  const sites = [
    { id: 'valley-1', name: t('Долина-1', 'Valley-1'), icon: <Factory size={16} /> },
    { id: 'ridge', name: t('Хребет', 'Ridge'), icon: <Mountain size={16} /> },
    { id: 'port', name: t('Порт Ясный', 'Clearwater Port'), icon: <Ship size={16} /> },
  ]
  useContextMenuProvider('site', (el, id) => {
    const name = el.dataset.name ?? id ?? ''
    return [
      { type: 'label', id: 'head', label: name },
      { id: 'open', label: t('Открыть площадку', 'Open site'), icon: <ExternalLink size={15} />, onSelect: () => onAction(`${t('Открыть', 'Open')} ${name}`) },
      { id: 'settings', label: t('Настройки', 'Settings'), icon: <Settings size={15} />, onSelect: () => onAction(`${t('Настройки', 'Settings')} ${name}`) },
    ]
  })
  useContextMenuProvider('person', (el) => [
    { id: 'profile', label: t('Профиль', 'Profile'), icon: <UserRound size={15} />, onSelect: () => onAction(`${t('Профиль', 'Profile')} ${el.dataset.name ?? ''}`) },
  ])
  return (
    <div className="ev-stack">
      <div className="ev-row">
        {sites.map((s) => (
          <div
            key={s.id}
            data-ctx-kind="site"
            data-ctx-id={s.id}
            data-name={s.name}
            tabIndex={0}
            className="ev-row"
            style={{ ...nestedStyle, padding: 'var(--ev-space-3) var(--ev-space-4)', cursor: 'context-menu', gap: 'var(--ev-space-2)' }}
          >
            {s.icon}
            {s.name}
          </div>
        ))}
      </div>
      <p className="ev-secondary">
        {t('Ответственный: ', 'Owner: ')}
        <span data-ctx-kind="person" data-ctx-id="u-7" data-name={t('Алина Воронцова', 'Alina Vorontsova')} tabIndex={0} style={{ textDecoration: 'underline dotted' }}>
          {t('Алина Воронцова', 'Alina Vorontsova')}
        </span>
        {t('. Выделите часть имени или названия площадки и откройте на нём меню - первым пунктом появится «Копировать».', '. Select part of the name or a site title and open the menu on it - "Copy" comes first.')}
      </p>
    </div>
  )
}

function ContextRegistryCard() {
  const { t } = useT()
  const [last, setLast] = useState<string | null>(null)
  return (
    <Card
      title="ContextMenuProvider"
      description={t(
        'Реестр для больших приложений: разметка помечает объекты data-ctx-kind и data-ctx-id, экран регистрирует построитель пунктов useContextMenuProvider(kind, builder). Провайдер один на приложение и слушает document; общие пункты добавляются через globalItems, «Копировать» для выделенного текста встроен (copySelection). Где пунктов нет - нативное меню.',
        'Registry for large apps: markup tags objects with data-ctx-kind and data-ctx-id, a screen registers an item builder with useContextMenuProvider(kind, builder). One provider per app listens on document; shared items come from globalItems, and "Copy" for selected text is built in (copySelection). Where there are no items, the native menu shows.',
      )}
    >
      <ContextMenuProvider>
        <div className="ev-stack">
          <SiteTiles onAction={setLast} />
          <LastAction value={last} />
        </div>
      </ContextMenuProvider>
      <CodeBlock
        code={`// ${t('«Копировать» для выделенного текста - встроен (copySelection)', '"Copy" for selected text is built in (copySelection)')}
<ContextMenuProvider>
  <App />
</ContextMenuProvider>

// ${t('экран площадок', 'sites screen')}
useContextMenuProvider('site', (el, id) => [
  { id: 'open', label: '${t('Открыть площадку', 'Open site')}', onSelect: () => openSite(id) },
])

<div data-ctx-kind="site" data-ctx-id={site.id}>...</div>`}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Строка состояния                                                    */
/* ------------------------------------------------------------------ */

function StatusBarCard() {
  const { t } = useT()
  return (
    <Card
      title="StatusBar"
      description={t(
        'Тонкая строка внизу рабочего места: слева, по центру и справа. StatusBarItem - иконка, точка тона, текст, подсказка; может быть ссылкой или кнопкой. StatusBarClock обновляется сам и показывает время только после гидрации. В AppShell - проп statusBar, строка прилипает к низу окна.',
        'A thin bar at the bottom of the workspace with left, center and right zones. StatusBarItem takes an icon, a tone dot, text and a tooltip, and can be a link or a button. StatusBarClock updates itself and shows the time only after hydration. In AppShell use the statusBar prop - the bar sticks to the bottom of the window.',
      )}
    >
      <div className="ev-stack">
        <div style={nestedStyle}>
          <StatusBar
            landmark={false}
            left={
              <>
                <StatusBarItem tone="success" tooltip={t('Задержка 42 мс', 'Latency 42 ms')}>
                  {t('Связь есть', 'Online')}
                </StatusBarItem>
                <StatusBarSeparator />
                <StatusBarItem icon={<UserRound />}>{t('Алина Воронцова', 'Alina Vorontsova')}</StatusBarItem>
                <StatusBarItem icon={<Factory />}>{t('Долина-1', 'Valley-1')}</StatusBarItem>
              </>
            }
            right={
              <>
                <StatusBarItem
                  tone="warning"
                  icon={<Gauge />}
                  mono
                  tooltip={t('Открыть панель нагрузки', 'Open the load panel')}
                  onClick={() => toast.info(t('Нагрузка: 78% CPU, 61% памяти', 'Load: 78% CPU, 61% memory'))}
                >
                  CPU 78%
                </StatusBarItem>
                <StatusBarItem
                  mono
                  tooltip={t('История версий', 'Release notes')}
                  onClick={() => toast.info(t('Версия 1.4.2, сборка 7f3c2a1', 'Version 1.4.2, build 7f3c2a1'))}
                >
                  v1.4.2
                </StatusBarItem>
                <StatusBarSeparator />
                <StatusBarClock
                  value={new Date(Date.UTC(2026, 9, 9, 14, 30))}
                  format={{ hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }}
                  tooltip={t('Время сервера', 'Server time')}
                />
              </>
            }
          />
        </div>
        <CodeBlock
          code={`<AppShell
  sidebar={<AppSidebar />}
  topbar={<AppTopbar />}
  statusBar={
    <StatusBar
      left={<StatusBarItem tone="success">${t('Связь есть', 'Online')}</StatusBarItem>}
      right={<><StatusBarItem mono>v1.4.2</StatusBarItem><StatusBarClock /></>}
    />
  }
>
  {children}
</AppShell>`}
        />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Рабочие пространства                                                */
/* ------------------------------------------------------------------ */

function WorkspaceCard() {
  const { t } = useT()
  const [value, setValue] = useState('valley-1')
  const items: WorkspaceItem[] = [
    { id: 'valley-1', name: t('Долина-1', 'Valley-1'), description: t('Северный сектор', 'North sector'), icon: <Factory />, badge: 12 },
    { id: 'valley-2', name: t('Долина-2', 'Valley-2'), description: t('Северный сектор', 'North sector'), icon: <Factory /> },
    { id: 'ridge', name: t('Хребет', 'Ridge'), description: t('Восточный сектор', 'East sector'), icon: <Mountain />, badge: 3 },
    { id: 'port', name: t('Порт Ясный', 'Clearwater Port'), description: t('Прибрежный сектор', 'Coastal sector'), icon: <Ship /> },
    { id: 'outpost', name: t('Застава', 'Outpost'), description: t('Пограничный сектор', 'Border sector'), icon: <Shield /> },
    { id: 'mine', name: t('Рудник Глубокий', 'Deep Mine'), description: t('Центральный сектор', 'Central sector'), icon: <Pickaxe />, keywords: ['mine'] },
    { id: 'lab', name: t('Лаборатория Сигма', 'Sigma Lab'), description: t('Центральный сектор', 'Central sector'), icon: <FlaskConical />, badge: t('тест', 'test') },
    { id: 'relay', name: t('Ретранслятор Южный', 'South Relay'), description: t('Южный сектор', 'South sector'), icon: <Antenna />, disabled: true },
  ]
  const onSwitch = (id: string) => {
    setValue(id)
    const name = items.find((w) => w.id === id)?.name ?? id
    toast.success(t(`Площадка: ${name}`, `Site: ${name}`))
  }
  const footer = ({ close }: { close: () => void }): ReactNode => (
    <Button
      variant="ghost"
      size="sm"
      icon={<Warehouse size={14} />}
      onClick={() => {
        close()
        toast.info(t('Управление площадками', 'Manage sites'))
      }}
    >
      {t('Управление площадками', 'Manage sites')}
    </Button>
  )
  return (
    <Card
      title="WorkspaceSwitcher"
      description={t(
        'Переключатель рабочего пространства: организация, филиал, площадка. Поиск появляется, когда пунктов больше шести; текущее отмечено, недоступные пропускаются стрелками. Под списком - своё действие. В свёрнутом боковом меню - только логотип с подсказкой (режим берётся из AppShell или пропа collapsed).',
        'Workspace switcher for an organization, branch or site. Search appears when there are more than six items; the current one is marked and disabled ones are skipped by arrow keys. Add your own action under the list. In a collapsed sidebar only the logo with a tooltip is shown (the mode comes from AppShell or the collapsed prop).',
      )}
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '260px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <Subhead>{t('В заголовке бокового меню', 'In the sidebar header')}</Subhead>
          <div style={{ ...nestedStyle, padding: 'var(--ev-space-2)', width: 248 }}>
            <WorkspaceSwitcher items={items} value={value} onSwitch={onSwitch} footer={footer} heading={t('Площадки', 'Sites')} block />
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>{t('Свёрнутое меню', 'Collapsed sidebar')}</Subhead>
          <div style={{ ...nestedStyle, padding: 'var(--ev-space-3)', width: 64, display: 'flex', justifyContent: 'center' }}>
            <WorkspaceSwitcher items={items} value={value} onSwitch={onSwitch} collapsed />
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>{t('Короткий список, без поиска', 'Short list, no search')}</Subhead>
          <WorkspaceSwitcher items={items.slice(0, 4)} value={items.slice(0, 4).some((w) => w.id === value) ? value : 'valley-1'} onSwitch={onSwitch} />
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Экранные состояния                                                  */
/* ------------------------------------------------------------------ */

function ScreenOverlayCard() {
  const { t } = useT()
  const [maintenance, setMaintenance] = useState(false)
  const [update, setUpdate] = useState(false)
  return (
    <Card
      title="ScreenOverlay"
      description={t(
        'Экранные состояния приложения. maintenance - блокирующий слой на весь экран: фокус заперт, прокрутка выключена, Escape не закрывает; крестик - только при onDismiss (здесь он есть, чтобы закрыть демо). update - неблокирующее окно в углу «Доступна новая версия», Escape = «Позже». Когда показывать - решает приложение (опрос сервера, сравнение сборок).',
        'App-level screen states. maintenance is a full-screen blocking layer: focus is trapped, scrolling is off and Escape does nothing; the close button appears only with onDismiss (used here so you can leave the demo). update is a non-blocking corner dialog "A new version is available", Escape means "Later". Your app decides when to show them (server polling, build comparison).',
      )}
    >
      <div className="ev-row">
        <Button variant="primary" icon={<Cpu size={15} />} onClick={() => setMaintenance(true)}>
          {t('Показать техработы', 'Show maintenance')}
        </Button>
        <Button onClick={() => setUpdate(true)}>{t('Показать обновление', 'Show update')}</Button>
      </div>
      <ScreenOverlay
        variant="maintenance"
        open={maintenance}
        onDismiss={() => setMaintenance(false)}
        until="14:30"
        untilLabel={t('Окончание', 'Expected end')}
      >
        {t('Версия 1.4.2. Вопросы - дежурному инженеру, доб. 204.', 'Version 1.4.2. Questions - on-call engineer, ext. 204.')}
      </ScreenOverlay>
      <ScreenOverlay
        variant="update"
        open={update}
        onDismiss={() => setUpdate(false)}
        onReload={() => {
          setUpdate(false)
          toast.success(t('В приложении здесь была бы перезагрузка', 'A real app would reload here'))
        }}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Фильтры в адресе                                                    */
/* ------------------------------------------------------------------ */

const FILTER_DEFAULTS = {
  demo_q: '',
  demo_status: 'all',
  demo_overdue: false,
}

function UrlFiltersCard() {
  const { t } = useT()
  const { filters, setFilter, reset, activeCount } = useUrlFilters(FILTER_DEFAULTS, { scope: 'vision-demo' })
  const qs = serializeFilters(filters, FILTER_DEFAULTS).toString()
  return (
    <Card
      title="useUrlFilters"
      description={t(
        'Плоский объект фильтров в двусторонней связи с адресом: replaceState без засорения истории, popstate перечитывает адрес. Со scope последние фильтры запоминаются в localStorage и подставляются, когда адрес без параметров. Сервер и первый рендер видят значения по умолчанию. Демо пишет в адрес этой страницы ключи с префиксом demo_, ?tab= не трогается.',
        'A flat filter object kept in sync with the URL both ways: replaceState keeps history clean, popstate re-reads the URL. With a scope the last filters are saved to localStorage and restored when the URL has none. The server and the first render see the defaults. This demo writes demo_-prefixed keys to the URL of this page and leaves ?tab= alone.',
      )}
    >
      <div className="ev-stack">
        <div className="ev-row">
          <div style={{ width: 240 }}>
            <SearchInput value={filters.demo_q} onChange={(v) => setFilter('demo_q', v)} placeholder={t('Поиск по нарядам', 'Search work orders')} />
          </div>
          <SegmentedControl
            aria-label={t('Статус', 'Status')}
            value={filters.demo_status}
            onChange={(v) => setFilter('demo_status', v)}
            options={[
              { value: 'all', label: t('Все', 'All') },
              { value: 'open', label: t('Открытые', 'Open') },
              { value: 'done', label: t('Выполненные', 'Done') },
            ]}
          />
          <Checkbox checked={filters.demo_overdue} onChange={(v) => setFilter('demo_overdue', v)} label={t('Просроченные', 'Overdue')} />
          <span className="ev-spacer" />
          <Badge tone={activeCount > 0 ? 'accent' : 'neutral'}>{t(`Активных: ${activeCount}`, `Active: ${activeCount}`)}</Badge>
          <Button size="sm" variant="ghost" disabled={activeCount === 0} onClick={reset}>
            {t('Сбросить', 'Reset')}
          </Button>
        </div>
        <div className="ev-row">
          <span className="ev-muted">{t('Строка запроса:', 'Query string:')}</span>
          <code className="ev-mono">{qs ? `?${qs}` : t('(пусто)', '(empty)')}</code>
        </div>
        <CodeBlock
          code={`const { filters, setFilter, reset, activeCount } = useUrlFilters(
  { q: '', status: 'all', overdue: false },
  { scope: 'work-orders' },
)`}
        />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Раздел                                                              */
/* ------------------------------------------------------------------ */

export function ShellCards() {
  return (
    <>
      <ContextMenuCard />
      <ContextRegistryCard />
      <StatusBarCard />
      <WorkspaceCard />
      <ScreenOverlayCard />
      <UrlFiltersCard />
    </>
  )
}
