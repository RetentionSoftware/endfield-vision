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
import { useState, type CSSProperties } from 'react'

/* ------------------------------------------------------------------ */
/* Палитра команд                                                      */
/* ------------------------------------------------------------------ */

function CommandPaletteCard() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const run = (label: string) => () => {
    setLast(label)
    toast.info(label)
  }
  const items: CommandItem[] = [
    { id: 'nav-dash', group: 'Разделы', label: 'Сводка', icon: <LayoutDashboard />, keywords: ['dashboard', 'главная'], onSelect: run('Сводка') },
    { id: 'nav-sites', group: 'Разделы', label: 'Площадки', icon: <Factory />, keywords: ['цех', 'завод', 'sites'], onSelect: run('Площадки') },
    { id: 'nav-stock', group: 'Разделы', label: 'Остатки на складе', icon: <Boxes />, keywords: ['inventory', 'склад'], onSelect: run('Остатки на складе') },
    { id: 'nav-fleet', group: 'Разделы', label: 'Погрузчики', icon: <Forklift />, keywords: ['техника', 'fleet'], onSelect: run('Погрузчики') },
    { id: 'nav-staff', group: 'Разделы', label: 'Смены и персонал', icon: <Users />, keywords: ['график', 'staff'], onSelect: run('Смены и персонал') },
    {
      id: 'act-task',
      group: 'Действия',
      label: 'Создать задачу',
      icon: <Plus />,
      keywords: ['наряд', 'task', 'new'],
      hint: (
        <>
          <Kbd>Alt</Kbd>
          <Kbd>N</Kbd>
        </>
      ),
      onSelect: run('Создать задачу'),
    },
    { id: 'act-ship', group: 'Действия', label: 'Оформить отгрузку', icon: <Truck />, keywords: ['shipment', 'накладная'], onSelect: run('Оформить отгрузку') },
    { id: 'act-repair', group: 'Действия', label: 'Заявка на ремонт', icon: <Wrench />, keywords: ['поломка', 'repair'], hint: 'ТО', onSelect: run('Заявка на ремонт') },
    { id: 'act-report', group: 'Действия', label: 'Отчёт за смену', icon: <FileText />, keywords: ['report'], hint: 'Нет прав', disabled: true, onSelect: run('Отчёт за смену') },
    { id: 'eq-oven', group: 'Оборудование', label: 'Печь закалки П-2', icon: <Thermometer />, keywords: ['oven', 'линия 2'], hint: 'Линия 2', onSelect: run('Печь закалки П-2') },
    { id: 'eq-press', group: 'Оборудование', label: 'Гидравлический пресс ГП-400', icon: <Cog />, keywords: ['press', 'линия 1'], hint: 'Линия 1', onSelect: run('Гидравлический пресс ГП-400') },
    { id: 'eq-plc', group: 'Оборудование', label: 'Контроллер линии КЛ-7', icon: <Cpu />, keywords: ['plc', 'scada'], hint: 'Линия 1', onSelect: run('Контроллер линии КЛ-7') },
  ]
  return (
    <Card
      title="CommandPalette"
      description="Поиск по командам и разделам: группы, ключевые слова, стрелки, Home/End, Enter, Escape. Поле - combobox, активная строка объявляется через aria-activedescendant. По умолчанию открывается сочетанием Ctrl/Cmd+K; здесь оно выключено (hotkey={false}), чтобы не спорить с поиском консоли."
    >
      <div className="ev-row">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Открыть палитру
        </Button>
        <span className="ev-secondary">
          {last ? (
            <>
              Последняя команда: <strong>{last}</strong>
            </>
          ) : (
            <>
              Попробуйте «склад», «наряд» или «линия 1»
            </>
          )}
        </span>
      </div>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        hotkey={false}
        footer={<span>12 команд</span>}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Шаги                                                                */
/* ------------------------------------------------------------------ */

const ONBOARDING: StepItem[] = [
  { id: 'site', title: 'Площадка', description: 'Адрес и тип объекта' },
  { id: 'lines', title: 'Линии', description: 'Участки и оборудование' },
  { id: 'staff', title: 'Персонал', description: 'Смены и допуски', optional: true },
  { id: 'sensors', title: 'Датчики', description: 'Подключение телеметрии' },
  { id: 'launch', title: 'Запуск', description: 'Проверка и ввод в работу' },
]

const AUDIT: StepItem[] = [
  { id: 'request', title: 'Заявка принята', description: '06.10, 09:12 - диспетчер Орлова', status: 'complete' },
  { id: 'inspect', title: 'Осмотр пресса ГП-400', description: 'Найдена течь гидроцилиндра', status: 'error' },
  { id: 'parts', title: 'Заказ уплотнений', description: 'Ожидается поставка 10.10', status: 'current' },
  { id: 'repair', title: 'Ремонт', status: 'upcoming' },
  { id: 'accept', title: 'Приёмка ОТК', status: 'upcoming' },
]

function StepsCard() {
  const [current, setCurrent] = useState(1)
  const last = ONBOARDING.length - 1
  return (
    <Card
      title="Steps"
      description="Шаги мастера: номер, галочка или крестик в маркере, линия между шагами. Статусы выводятся из current или задаются явно. Пройденные шаги - кнопки (onStepClick). На экране до 720px горизонтальные шаги сворачиваются в «Шаг 2 из 5»."
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <Steps items={ONBOARDING} current={current} onStepClick={setCurrent} aria-label="Подключение площадки" />
          <div className="ev-row">
            <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
              Назад
            </Button>
            <Button variant="primary" disabled={current > last} onClick={() => setCurrent((c) => Math.min(last + 1, c + 1))}>
              {current >= last ? 'Завершить' : 'Далее'}
            </Button>
            {current > last ? <Badge tone="success">Площадка подключена</Badge> : null}
          </div>
        </div>
        <div className="ev-stack">
          <span className="ev-muted">Вертикальные шаги с явными статусами: ремонт после осмотра с замечанием</span>
          <Steps items={AUDIT} orientation="vertical" aria-label="Ход ремонта" />
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Аккордеон и Disclosure                                              */
/* ------------------------------------------------------------------ */

const FAQ: AccordionItem[] = [
  {
    id: 'shift',
    title: 'Как передать смену?',
    icon: <ClipboardList />,
    content: 'Закройте открытые наряды, отметьте остатки на участке и подпишите журнал передачи. Принимающий мастер подтверждает приём в течение 15 минут.',
  },
  {
    id: 'stop',
    title: 'Что делать при аварийной остановке линии?',
    icon: <Gauge />,
    content: 'Нажмите аварийный стоп, сообщите диспетчеру и создайте заявку на ремонт с фотографией панели. Повторный пуск - только после осмотра механиком.',
  },
  {
    id: 'stock',
    title: 'Как списать брак?',
    icon: <Boxes />,
    content: 'Оформите акт списания в разделе «Склад», приложите заключение ОТК. Акт утверждает начальник смены.',
  },
  { id: 'archive', title: 'Архив регламентов 2023 года', icon: <FileText />, content: 'Недоступно.', disabled: true },
]

const SITES: AccordionItem[] = [
  {
    id: 'north',
    title: 'Северная площадка',
    meta: <Badge tone="success" size="sm">В работе</Badge>,
    content: '3 линии, 42 сотрудника в смене. Загрузка 87%, плановое ТО пресса - 14.10.',
  },
  {
    id: 'south',
    title: 'Южный склад',
    meta: <Badge tone="warning" size="sm">Ограничения</Badge>,
    content: 'Зона Б закрыта на инвентаризацию до 09.10. Приёмка - через ворота 3.',
  },
  {
    id: 'east',
    title: 'Восточный терминал',
    meta: <Badge tone="danger" size="sm">Простой</Badge>,
    content: 'Нет связи с весовой. Отгрузки перенесены на Северную площадку.',
  },
]

function AccordionCard() {
  const [open, setOpen] = useState<string[]>(['north'])
  return (
    <Card
      title="Accordion"
      description="Секции с заголовком-кнопкой (aria-expanded, aria-controls) и панелью role=region. Высота раскрывается плавно, стрелки, Home и End переходят между заголовками. separated - отдельные блоки на поверхности, flush - список с разделителями."
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '320px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <span className="ev-muted">separated, одна открытая секция</span>
          <Accordion items={FAQ} defaultValue={['shift']} />
        </div>
        <div className="ev-stack">
          <span className="ev-muted">flush, multiple, кнопка «Развернуть все», контролируемое состояние</span>
          <Accordion items={SITES} variant="flush" multiple showExpandAll value={open} onValueChange={setOpen} />
        </div>
      </div>
    </Card>
  )
}

function DisclosureCard() {
  return (
    <Card title="Disclosure" description="Одиночный раскрывающийся блок: подробности, дополнительные параметры формы, технические детали ошибки.">
      <div className="ev-stack">
        <span className="ev-secondary">Отгрузка ОТГ-2817 задержана: весовая не ответила за 30 секунд.</span>
        <Disclosure title="Технические подробности">
          Узел: weigh-east-01. Последний ответ: 08.10, 14:02:11. Код ошибки: TIMEOUT. Повторная попытка через 5 минут.
        </Disclosure>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Дерево                                                              */
/* ------------------------------------------------------------------ */

const FACILITIES: TreeNode[] = [
  {
    id: 'north',
    label: 'Северная площадка',
    icon: <Factory />,
    meta: '3 линии',
    children: [
      {
        id: 'north-l1',
        label: 'Линия 1 - штамповка',
        icon: <Cog />,
        children: [
          { id: 'press-400', label: 'Пресс ГП-400', icon: <Wrench />, meta: <Badge tone="warning" size="sm">ТО</Badge> },
          { id: 'press-250', label: 'Пресс ГП-250', icon: <Wrench /> },
          { id: 'plc-7', label: 'Контроллер КЛ-7', icon: <Cpu /> },
        ],
      },
      {
        id: 'north-l2',
        label: 'Линия 2 - термообработка',
        icon: <Cog />,
        children: [
          { id: 'oven-2', label: 'Печь закалки П-2', icon: <Thermometer />, meta: '860 °C' },
          { id: 'oven-1', label: 'Печь П-1 (выведена)', icon: <Thermometer />, disabled: true },
        ],
      },
      { id: 'north-l3', label: 'Линия 3 - сборка', icon: <Cog />, children: [{ id: 'conveyor', label: 'Конвейер К-12', icon: <Container /> }] },
    ],
  },
  {
    id: 'south',
    label: 'Южный склад',
    icon: <Warehouse />,
    meta: '2 зоны',
    children: [
      { id: 'zone-a', label: 'Зона А - стеллажи', icon: <Boxes />, children: [{ id: 'fork-3', label: 'Погрузчик П-3', icon: <Forklift /> }] },
      { id: 'zone-b', label: 'Зона Б - напольное хранение', icon: <Boxes /> },
    ],
  },
  { id: 'east', label: 'Восточный терминал', icon: <Truck /> },
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
  const [selected, setSelected] = useState<string[]>(['press-400'])
  const [checked, setChecked] = useState<string[]>(['north-l1', 'zone-b'])
  const current = selected[0] ? findLabel(FACILITIES, selected[0]) : null
  return (
    <Card
      title="TreeView"
      description="Иерархия по шаблону WAI-ARIA tree: один Tab-стоп, стрелки вверх/вниз, вправо раскрывает и входит в узел, влево сворачивает и выходит к родителю, Home/End, поиск по первым буквам, * раскрывает соседей. Выбор одного узла или флажки с частичным состоянием родителя."
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '320px', '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
        <div className="ev-stack">
          <span className="ev-muted">single: выбранное оборудование - {current ?? 'ничего'}</span>
          <TreeView
            nodes={FACILITIES}
            selectable="single"
            selected={selected}
            onSelectedChange={setSelected}
            defaultExpanded={['north', 'north-l1']}
            aria-label="Площадки и оборудование"
          />
        </div>
        <div className="ev-stack">
          <span className="ev-muted">multiple: отмечено узлов - {checked.length}</span>
          <TreeView
            nodes={FACILITIES}
            selectable="multiple"
            selected={checked}
            onSelectedChange={setChecked}
            defaultExpanded={['north', 'north-l2', 'south']}
            aria-label="Объекты для инвентаризации"
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
