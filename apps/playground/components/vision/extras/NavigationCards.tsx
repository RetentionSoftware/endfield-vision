'use client'

import {
  Accordion,
  Badge,
  Button,
  Card,
  CommandPalette,
  Disclosure,
  Kbd,
  Steps,
  toast,
  TreeView,
  type AccordionItem,
  type CommandItem,
  type StepItem,
  type TreeNode,
} from 'endfield-vision'
import {
  Boxes,
  ClipboardList,
  Cog,
  Container,
  Cpu,
  Factory,
  FileText,
  Forklift,
  Gauge,
  LayoutDashboard,
  Plus,
  Thermometer,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useT, type Translator } from '@/lib/i18n'

type T = Translator['t']

/* ------------------------------------------------------------------ */
/* Палитра команд                                                      */
/* ------------------------------------------------------------------ */

function CommandPaletteCard() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const run = (label: string) => () => {
    setLast(label)
    toast.info(label)
  }
  // Ключевые слова - на обоих языках: поиск находит команду при любом языке консоли.
  const sections = t('Разделы', 'Sections')
  const actions = t('Действия', 'Actions')
  const equipment = t('Оборудование', 'Equipment')
  const line1 = t('Линия 1', 'Line 1')
  const line2 = t('Линия 2', 'Line 2')
  const items: CommandItem[] = [
    {
      id: 'nav-dash',
      group: sections,
      label: t('Сводка', 'Dashboard'),
      icon: <LayoutDashboard />,
      keywords: ['dashboard', 'главная', 'home'],
      onSelect: run(t('Сводка', 'Dashboard')),
    },
    {
      id: 'nav-sites',
      group: sections,
      label: t('Площадки', 'Sites'),
      icon: <Factory />,
      keywords: ['цех', 'завод', 'sites', 'plant'],
      onSelect: run(t('Площадки', 'Sites')),
    },
    {
      id: 'nav-stock',
      group: sections,
      label: t('Остатки на складе', 'Warehouse stock'),
      icon: <Boxes />,
      keywords: ['inventory', 'склад', 'warehouse'],
      onSelect: run(t('Остатки на складе', 'Warehouse stock')),
    },
    {
      id: 'nav-fleet',
      group: sections,
      label: t('Погрузчики', 'Forklifts'),
      icon: <Forklift />,
      keywords: ['техника', 'fleet', 'vehicles'],
      onSelect: run(t('Погрузчики', 'Forklifts')),
    },
    {
      id: 'nav-staff',
      group: sections,
      label: t('Смены и персонал', 'Shifts and staff'),
      icon: <Users />,
      keywords: ['график', 'staff', 'schedule'],
      onSelect: run(t('Смены и персонал', 'Shifts and staff')),
    },
    {
      id: 'act-task',
      group: actions,
      label: t('Создать задачу', 'Create task'),
      icon: <Plus />,
      keywords: ['наряд', 'task', 'new', 'work order'],
      hint: (
        <>
          <Kbd>Alt</Kbd>
          <Kbd>N</Kbd>
        </>
      ),
      onSelect: run(t('Создать задачу', 'Create task')),
    },
    {
      id: 'act-ship',
      group: actions,
      label: t('Оформить отгрузку', 'Create shipment'),
      icon: <Truck />,
      keywords: ['shipment', 'накладная', 'waybill'],
      onSelect: run(t('Оформить отгрузку', 'Create shipment')),
    },
    {
      id: 'act-repair',
      group: actions,
      label: t('Заявка на ремонт', 'Repair request'),
      icon: <Wrench />,
      keywords: ['поломка', 'repair', 'breakdown'],
      hint: t('ТО', 'Service'),
      onSelect: run(t('Заявка на ремонт', 'Repair request')),
    },
    {
      id: 'act-report',
      group: actions,
      label: t('Отчёт за смену', 'Shift report'),
      icon: <FileText />,
      keywords: ['report', 'отчёт'],
      hint: t('Нет прав', 'No access'),
      disabled: true,
      onSelect: run(t('Отчёт за смену', 'Shift report')),
    },
    {
      id: 'eq-oven',
      group: equipment,
      label: t('Печь закалки П-2', 'Hardening furnace F-2'),
      icon: <Thermometer />,
      keywords: ['oven', 'furnace', 'линия 2', 'line 2'],
      hint: line2,
      onSelect: run(t('Печь закалки П-2', 'Hardening furnace F-2')),
    },
    {
      id: 'eq-press',
      group: equipment,
      label: t('Гидравлический пресс ГП-400', 'Hydraulic press HP-400'),
      icon: <Cog />,
      keywords: ['press', 'пресс', 'линия 1', 'line 1'],
      hint: line1,
      onSelect: run(t('Гидравлический пресс ГП-400', 'Hydraulic press HP-400')),
    },
    {
      id: 'eq-plc',
      group: equipment,
      label: t('Контроллер линии КЛ-7', 'Line controller LC-7'),
      icon: <Cpu />,
      keywords: ['plc', 'scada', 'controller'],
      hint: line1,
      onSelect: run(t('Контроллер линии КЛ-7', 'Line controller LC-7')),
    },
  ]
  return (
    <Card
      title="CommandPalette"
      description={t(
        'Поиск по командам и разделам: группы, ключевые слова, стрелки, Home/End, Enter, Escape. Поле - combobox, активная строка объявляется через aria-activedescendant. По умолчанию открывается сочетанием Ctrl/Cmd+K; здесь оно выключено (hotkey={false}), чтобы не спорить с поиском консоли.',
        'Search across commands and sections: groups, keywords, arrow keys, Home/End, Enter, Escape. The input is a combobox and the active row is announced via aria-activedescendant. It opens with Ctrl/Cmd+K by default; here the shortcut is off (hotkey={false}) so it does not clash with the console search.',
      )}
    >
      <div className="ev-row">
        <Button variant="primary" onClick={() => setOpen(true)}>
          {t('Открыть палитру', 'Open palette')}
        </Button>
        <span className="ev-secondary">
          {last ? (
            <>
              {t('Последняя команда:', 'Last command:')} <strong>{last}</strong>
            </>
          ) : (
            t('Попробуйте «склад», «наряд» или «линия 1»', 'Try "warehouse", "work order" or "line 1"')
          )}
        </span>
      </div>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        hotkey={false}
        footer={<span>{t('12 команд', '12 commands')}</span>}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Шаги                                                                */
/* ------------------------------------------------------------------ */

const onboarding = (t: T): StepItem[] => [
  { id: 'site', title: t('Площадка', 'Site'), description: t('Адрес и тип объекта', 'Address and facility type') },
  { id: 'lines', title: t('Линии', 'Lines'), description: t('Участки и оборудование', 'Areas and equipment') },
  { id: 'staff', title: t('Персонал', 'Staff'), description: t('Смены и допуски', 'Shifts and clearances'), optional: true },
  { id: 'sensors', title: t('Датчики', 'Sensors'), description: t('Подключение телеметрии', 'Telemetry hookup') },
  { id: 'launch', title: t('Запуск', 'Launch'), description: t('Проверка и ввод в работу', 'Checks and commissioning') },
]

const repair = (t: T): StepItem[] => [
  {
    id: 'request',
    title: t('Заявка принята', 'Request accepted'),
    description: t('06.10, 09:12 - диспетчер Орлова', '06.10, 09:12 - dispatcher Orlova'),
    status: 'complete',
  },
  {
    id: 'inspect',
    title: t('Осмотр пресса ГП-400', 'HP-400 press inspection'),
    description: t('Найдена течь гидроцилиндра', 'Hydraulic cylinder leak found'),
    status: 'error',
  },
  {
    id: 'parts',
    title: t('Заказ уплотнений', 'Seal order'),
    description: t('Ожидается поставка 10.10', 'Delivery expected 10.10'),
    status: 'current',
  },
  { id: 'repair', title: t('Ремонт', 'Repair'), status: 'upcoming' },
  { id: 'accept', title: t('Приёмка ОТК', 'QC acceptance'), status: 'upcoming' },
]

function StepsCard() {
  const { t } = useT()
  const steps = useMemo(() => onboarding(t), [t])
  const repairSteps = useMemo(() => repair(t), [t])
  const [current, setCurrent] = useState(1)
  const last = steps.length - 1
  return (
    <Card
      title="Steps"
      description={t(
        'Шаги мастера: номер, галочка или крестик в маркере, линия между шагами. Статусы выводятся из current или задаются явно. Пройденные шаги - кнопки (onStepClick). На экране до 720px горизонтальные шаги сворачиваются в «Шаг 2 из 5».',
        'Wizard steps: a number, check or cross in the marker and a line between steps. Statuses derive from current or are set explicitly. Completed steps are buttons (onStepClick). Below 720px, horizontal steps collapse into "Step 2 of 5".',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <Steps items={steps} current={current} onStepClick={setCurrent} aria-label={t('Подключение площадки', 'Site onboarding')} />
          <div className="ev-row">
            <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
              {t('Назад', 'Back')}
            </Button>
            <Button variant="primary" disabled={current > last} onClick={() => setCurrent((c) => Math.min(last + 1, c + 1))}>
              {current >= last ? t('Завершить', 'Finish') : t('Далее', 'Next')}
            </Button>
            {current > last ? <Badge tone="success">{t('Площадка подключена', 'Site connected')}</Badge> : null}
          </div>
        </div>
        <div className="ev-stack">
          <span className="ev-muted">
            {t(
              'Вертикальные шаги с явными статусами: ремонт после осмотра с замечанием',
              'Vertical steps with explicit statuses: a repair after an inspection found an issue',
            )}
          </span>
          <Steps items={repairSteps} orientation="vertical" aria-label={t('Ход ремонта', 'Repair progress')} />
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Аккордеон и Disclosure                                              */
/* ------------------------------------------------------------------ */

const faq = (t: T): AccordionItem[] => [
  {
    id: 'shift',
    title: t('Как передать смену?', 'How do I hand over a shift?'),
    icon: <ClipboardList />,
    content: t(
      'Закройте открытые наряды, отметьте остатки на участке и подпишите журнал передачи. Принимающий мастер подтверждает приём в течение 15 минут.',
      'Close open work orders, record stock at your area and sign the handover log. The incoming supervisor confirms the handover within 15 minutes.',
    ),
  },
  {
    id: 'stop',
    title: t('Что делать при аварийной остановке линии?', 'What do I do if a line makes an emergency stop?'),
    icon: <Gauge />,
    content: t(
      'Нажмите аварийный стоп, сообщите диспетчеру и создайте заявку на ремонт с фотографией панели. Повторный пуск - только после осмотра механиком.',
      'Press the emergency stop, notify the dispatcher and file a repair request with a photo of the panel. Restart only after a mechanic has inspected the line.',
    ),
  },
  {
    id: 'stock',
    title: t('Как списать брак?', 'How do I write off defective goods?'),
    icon: <Boxes />,
    content: t(
      'Оформите акт списания в разделе «Склад», приложите заключение ОТК. Акт утверждает начальник смены.',
      'Create a write-off report in Inventory and attach the QC findings. The shift supervisor approves the report.',
    ),
  },
  {
    id: 'archive',
    title: t('Архив регламентов 2023 года', '2023 procedures archive'),
    icon: <FileText />,
    content: t('Недоступно.', 'Unavailable.'),
    disabled: true,
  },
]

const sites = (t: T): AccordionItem[] => [
  {
    id: 'north',
    title: t('Северная площадка', 'North site'),
    meta: (
      <Badge tone="success" size="sm">
        {t('В работе', 'Operating')}
      </Badge>
    ),
    content: t(
      '3 линии, 42 сотрудника в смене. Загрузка 87%, плановое ТО пресса - 14.10.',
      '3 lines, 42 staff per shift. 87% utilization, scheduled press maintenance on 14.10.',
    ),
  },
  {
    id: 'south',
    title: t('Южный склад', 'South warehouse'),
    meta: (
      <Badge tone="warning" size="sm">
        {t('Ограничения', 'Limited')}
      </Badge>
    ),
    content: t(
      'Зона Б закрыта на инвентаризацию до 09.10. Приёмка - через ворота 3.',
      'Zone B is closed for stocktaking until 09.10. Receiving goes through gate 3.',
    ),
  },
  {
    id: 'east',
    title: t('Восточный терминал', 'East terminal'),
    meta: (
      <Badge tone="danger" size="sm">
        {t('Простой', 'Downtime')}
      </Badge>
    ),
    content: t(
      'Нет связи с весовой. Отгрузки перенесены на Северную площадку.',
      'No connection to the weighbridge. Shipments have moved to the North site.',
    ),
  },
]

function AccordionCard() {
  const { t } = useT()
  const faqItems = useMemo(() => faq(t), [t])
  const siteItems = useMemo(() => sites(t), [t])
  const [open, setOpen] = useState<string[]>(['north'])
  return (
    <Card
      title="Accordion"
      description={t(
        'Секции с заголовком-кнопкой (aria-expanded, aria-controls) и панелью role=region. Высота раскрывается плавно, стрелки, Home и End переходят между заголовками. separated - отдельные блоки на поверхности, flush - список с разделителями.',
        'Sections with a button header (aria-expanded, aria-controls) and a role=region panel. Height expands smoothly; arrow keys, Home and End move between headers. separated renders separate blocks on the surface, flush renders a list with dividers.',
      )}
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '320px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <span className="ev-muted">{t('separated, одна открытая секция', 'separated, one open section')}</span>
          <Accordion items={faqItems} defaultValue={['shift']} />
        </div>
        <div className="ev-stack">
          <span className="ev-muted">
            {t(
              'flush, multiple, кнопка «Развернуть все», контролируемое состояние',
              'flush, multiple, an "Expand all" button, controlled state',
            )}
          </span>
          <Accordion items={siteItems} variant="flush" multiple showExpandAll value={open} onValueChange={setOpen} />
        </div>
      </div>
    </Card>
  )
}

function DisclosureCard() {
  const { t } = useT()
  return (
    <Card
      title="Disclosure"
      description={t(
        'Одиночный раскрывающийся блок: подробности, дополнительные параметры формы, технические детали ошибки.',
        'A single expandable block: details, extra form options, technical details of an error.',
      )}
    >
      <div className="ev-stack">
        <span className="ev-secondary">
          {t(
            'Отгрузка ОТГ-2817 задержана: весовая не ответила за 30 секунд.',
            'Shipment SHP-2817 is delayed: the weighbridge did not respond within 30 seconds.',
          )}
        </span>
        <Disclosure title={t('Технические подробности', 'Technical details')}>
          {t(
            'Узел: weigh-east-01. Последний ответ: 08.10, 14:02:11. Код ошибки: TIMEOUT. Повторная попытка через 5 минут.',
            'Node: weigh-east-01. Last response: 08.10, 14:02:11. Error code: TIMEOUT. Retrying in 5 minutes.',
          )}
        </Disclosure>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Дерево                                                              */
/* ------------------------------------------------------------------ */

const facilities = (t: T): TreeNode[] => [
  {
    id: 'north',
    label: t('Северная площадка', 'North site'),
    icon: <Factory />,
    meta: t('3 линии', '3 lines'),
    children: [
      {
        id: 'north-l1',
        label: t('Линия 1 - штамповка', 'Line 1 - stamping'),
        icon: <Cog />,
        children: [
          {
            id: 'press-400',
            label: t('Пресс ГП-400', 'Press HP-400'),
            icon: <Wrench />,
            meta: (
              <Badge tone="warning" size="sm">
                {t('ТО', 'Service')}
              </Badge>
            ),
          },
          { id: 'press-250', label: t('Пресс ГП-250', 'Press HP-250'), icon: <Wrench /> },
          { id: 'plc-7', label: t('Контроллер КЛ-7', 'Controller LC-7'), icon: <Cpu /> },
        ],
      },
      {
        id: 'north-l2',
        label: t('Линия 2 - термообработка', 'Line 2 - heat treatment'),
        icon: <Cog />,
        children: [
          { id: 'oven-2', label: t('Печь закалки П-2', 'Hardening furnace F-2'), icon: <Thermometer />, meta: '860 °C' },
          { id: 'oven-1', label: t('Печь П-1 (выведена)', 'Furnace F-1 (decommissioned)'), icon: <Thermometer />, disabled: true },
        ],
      },
      {
        id: 'north-l3',
        label: t('Линия 3 - сборка', 'Line 3 - assembly'),
        icon: <Cog />,
        children: [{ id: 'conveyor', label: t('Конвейер К-12', 'Conveyor C-12'), icon: <Container /> }],
      },
    ],
  },
  {
    id: 'south',
    label: t('Южный склад', 'South warehouse'),
    icon: <Warehouse />,
    meta: t('2 зоны', '2 zones'),
    children: [
      {
        id: 'zone-a',
        label: t('Зона А - стеллажи', 'Zone A - racking'),
        icon: <Boxes />,
        children: [{ id: 'fork-3', label: t('Погрузчик П-3', 'Forklift F-3'), icon: <Forklift /> }],
      },
      { id: 'zone-b', label: t('Зона Б - напольное хранение', 'Zone B - floor storage'), icon: <Boxes /> },
    ],
  },
  { id: 'east', label: t('Восточный терминал', 'East terminal'), icon: <Truck /> },
]

function findLabel(nodes: TreeNode[], id: string): string | null {
  for (const n of nodes) {
    if (n.id === id) return n.label
    const hit = n.children ? findLabel(n.children, id) : null
    if (hit) return hit
  }
  return null
}

function TreeCard() {
  const { t } = useT()
  const nodes = useMemo(() => facilities(t), [t])
  const [selected, setSelected] = useState<string[]>(['press-400'])
  const [checked, setChecked] = useState<string[]>(['north-l1', 'zone-b'])
  const current = selected[0] ? findLabel(nodes, selected[0]) : null
  return (
    <Card
      title="TreeView"
      description={t(
        'Иерархия по шаблону WAI-ARIA tree: один Tab-стоп, стрелки вверх/вниз, вправо раскрывает и входит в узел, влево сворачивает и выходит к родителю, Home/End, поиск по первым буквам, * раскрывает соседей. Выбор одного узла или флажки с частичным состоянием родителя.',
        'A hierarchy following the WAI-ARIA tree pattern: a single Tab stop, up/down arrows, right expands and enters a node, left collapses and returns to the parent, Home/End, type-ahead, and * expands siblings. Select a single node, or use checkboxes with a partial parent state.',
      )}
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '320px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <span className="ev-muted">
            {t('single: выбранное оборудование - ', 'single: selected equipment - ')}
            {current ?? t('ничего', 'none')}
          </span>
          <TreeView
            nodes={nodes}
            selectable="single"
            selected={selected}
            onSelectedChange={setSelected}
            defaultExpanded={['north', 'north-l1']}
            aria-label={t('Площадки и оборудование', 'Sites and equipment')}
          />
        </div>
        <div className="ev-stack">
          <span className="ev-muted">
            {t('multiple: отмечено узлов - ', 'multiple: checked nodes - ')}
            {checked.length}
          </span>
          <TreeView
            nodes={nodes}
            selectable="multiple"
            selected={checked}
            onSelectedChange={setChecked}
            defaultExpanded={['north', 'north-l2', 'south']}
            aria-label={t('Объекты для инвентаризации', 'Facilities for stocktaking')}
          />
        </div>
      </div>
    </Card>
  )
}

/** Витрина группы «Навигация и структура»: палитра команд, шаги, аккордеон, раскрывающийся блок, дерево. */
export function NavigationCards() {
  return (
    <div className="ev-stack">
      <CommandPaletteCard />
      <StepsCard />
      <AccordionCard />
      <DisclosureCard />
      <TreeCard />
    </div>
  )
}
