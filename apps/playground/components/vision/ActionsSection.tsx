'use client'

import {
  Button,
  Card,
  Field,
  IconButton,
  Kbd,
  LinkButton,
  Menu,
  Popover,
  SegmentedControl,
  Select,
  Switch,
  TabPanel,
  Tabs,
  toast,
  Tooltip,
  type ButtonSize,
  type ButtonVariant,
} from 'endfield-vision'
import {
  Archive,
  ArrowRight,
  Ban,
  CalendarDays,
  ClipboardList,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  Funnel,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  SquareKanban,
  Star,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'
import { Subhead, VISION_TAB_META } from './parts'
import s from './vision.module.css'

const VARIANTS: Array<{ variant: ButtonVariant; label: Bi }> = [
  { variant: 'primary', label: bi('Создать задачу', 'Create task') },
  { variant: 'secondary', label: bi('Изменить', 'Edit') },
  { variant: 'ghost', label: bi('Отмена', 'Cancel') },
  { variant: 'danger', label: bi('Удалить', 'Delete') },
  { variant: 'danger-ghost', label: bi('Списать', 'Write off') },
]

const SIZES: Array<{ size: ButtonSize; label: Bi }> = [
  { size: 'sm', label: bi('Маленькая', 'Small') },
  { size: 'md', label: bi('Обычная', 'Medium') },
  { size: 'lg', label: bi('Крупная', 'Large') },
]

function ButtonsCard() {
  const { t, tx } = useT()
  const [loading, setLoading] = useState(false)
  return (
    <Card
      title={t('Button и LinkButton', 'Button and LinkButton')}
      description={t(
        'primary - одно главное действие на экране; secondary - остальные; ghost - второстепенные в тулбарах; danger - необратимые; link - действие внутри текста. LinkButton - переход, оформленный кнопкой.',
        'primary is the one main action on a screen; secondary is for the rest; ghost is for minor toolbar actions; danger is for irreversible ones; link is an action inside text. LinkButton is navigation styled as a button.',
      )}
    >
      <div className="ev-stack">
        <Subhead>{t('Варианты', 'Variants')}</Subhead>
        <div className={s.row}>
          {VARIANTS.map((v) => (
            <Button key={v.variant} variant={v.variant} icon={v.variant === 'primary' ? <Plus size={15} /> : v.variant === 'danger' ? <Trash2 size={15} /> : undefined}>
              {tx(v.label)}
            </Button>
          ))}
          <Button disabled>{t('Недоступна', 'Disabled')}</Button>
        </div>
        <Subhead>{t('Размеры и состояния', 'Sizes and states')}</Subhead>
        <div className={s.row}>
          {SIZES.map((sz) => (
            <Button key={sz.size} size={sz.size} variant={sz.size === 'md' ? 'secondary' : 'primary'}>
              {tx(sz.label)}
            </Button>
          ))}
          <Button
            loading={loading}
            icon={<RefreshCw size={15} />}
            onClick={() => {
              setLoading(true)
              window.setTimeout(() => setLoading(false), 1500)
            }}
          >
            {t('Обновить остатки', 'Refresh stock')}
          </Button>
          <Button iconRight={<ArrowRight size={15} />}>{t('Далее', 'Next')}</Button>
        </div>
        <Subhead>variant=&quot;link&quot;</Subhead>
        <span className="ev-secondary">
          {t('Пропуск не сканируется?', 'Badge will not scan?')}{' '}
          <Button variant="link" onClick={() => toast.info(t('Код отправлен на почту', 'Code sent to your email'))}>
            {t('Получить код вручную', 'Get a code manually')}
          </Button>
          {t(
            '. Без фона и высоты контрола - для действий внутри текста.',
            '. No background or control height - for actions inside text.',
          )}
        </span>
        <Subhead>{t('Ссылка-кнопка и кнопка на всю ширину', 'Link button and full-width button')}</Subhead>
        <div className={s.row}>
          <LinkButton href="/tasks" icon={<ClipboardList size={15} />}>
            {t('К задачам', 'Go to tasks')}
          </LinkButton>
          <LinkButton href="/inventory" variant="ghost" iconRight={<ExternalLink size={14} />}>
            {t('Открыть склад', 'Open inventory')}
          </LinkButton>
        </div>
        <Button block variant="primary" icon={<Truck size={15} />}>
          {t('Оформить отгрузку', 'Create shipment')}
        </Button>
      </div>
    </Card>
  )
}

function IconButtonsCard() {
  const { t } = useT()
  const [starred, setStarred] = useState(true)
  return (
    <Card
      title="IconButton"
      description={t(
        'Кнопка-иконка в строках таблиц и тулбарах. Подпись label обязательна: это aria-label и текст встроенной подсказки.',
        'An icon button for table rows and toolbars. The label prop is required: it is both the aria-label and the built-in tooltip text.',
      )}
    >
      <div className="ev-stack">
        <div className={s.row}>
          <IconButton label={t('Изменить', 'Edit')} icon={<Pencil size={16} />} />
          <IconButton label={t('Скопировать', 'Copy')} icon={<Copy size={16} />} variant="secondary" />
          <IconButton label={t('Отправить', 'Send')} icon={<Send size={16} />} variant="primary" />
          <IconButton label={t('Удалить', 'Delete')} icon={<Trash2 size={16} />} variant="danger-ghost" />
          <IconButton label={t('Обновляется', 'Refreshing')} icon={<RefreshCw size={16} />} loading />
          <IconButton label={t('Недоступно', 'Unavailable')} icon={<Archive size={16} />} disabled />
        </div>
        <div className={s.row}>
          <IconButton
            label={starred ? t('Убрать из избранного', 'Remove from favorites') : t('В избранное', 'Add to favorites')}
            icon={<Star size={16} />}
            pressed={starred}
            onClick={() => setStarred((v) => !v)}
          />
          <IconButton label={t('Фильтры', 'Filters')} icon={<Funnel size={14} />} size="sm" variant="secondary" />
          <IconButton label={t('Скачать', 'Download')} icon={<Download size={18} />} size="lg" variant="secondary" tooltipPlacement="bottom" />
          <span className="ev-muted">{t('pressed - для кнопок-переключателей (aria-pressed).', 'pressed is for toggle buttons (aria-pressed).')}</span>
        </div>
      </div>
    </Card>
  )
}

function TooltipCard() {
  const { t } = useT()
  return (
    <Card
      title="Tooltip"
      description={t(
        'Короткое пояснение по наведению и фокусу. Вместо атрибута title: подсказка доступна с клавиатуры и связана через aria-describedby.',
        'A short hint on hover and focus. Use it instead of the title attribute: it is keyboard accessible and linked via aria-describedby.',
      )}
    >
      <div className={s.row}>
        <Tooltip content={t('Подсказка сверху', 'Tooltip on top')} placement="top">
          <Button size="sm">{t('Сверху', 'Top')}</Button>
        </Tooltip>
        <Tooltip content={t('Подсказка снизу', 'Tooltip on the bottom')} placement="bottom">
          <Button size="sm">{t('Снизу', 'Bottom')}</Button>
        </Tooltip>
        <Tooltip content={t('Подсказка справа', 'Tooltip on the right')} placement="right">
          <Button size="sm">{t('Справа', 'Right')}</Button>
        </Tooltip>
        <Tooltip content={t('Подсказка слева', 'Tooltip on the left')} placement="left">
          <Button size="sm">{t('Слева', 'Left')}</Button>
        </Tooltip>
        <Tooltip content={t('Место выбирается по свободному пространству', 'Placement follows the available space')}>
          <Button size="sm">{t('Авто', 'Auto')}</Button>
        </Tooltip>
        <Tooltip content={t('Нет прав на списание: обратитесь к кладовщику', 'No permission to write off: contact the storekeeper')}>
          <span tabIndex={0}>
            <Button size="sm" disabled>
              {t('Недоступна с пояснением', 'Disabled with a reason')}
            </Button>
          </span>
        </Tooltip>
      </div>
    </Card>
  )
}

function MenuPopoverCard() {
  const { t, lang } = useT()
  const [group, setGroup] = useState<'none' | 'facility' | 'assignee'>('facility')
  const [status, setStatus] = useState<string | null>(null)
  const [urgent, setUrgent] = useState(false)
  return (
    <Card
      title={t('Menu и Popover', 'Menu and Popover')}
      description={t(
        'Menu - список действий над объектом: стрелки, Home/End, Enter, Escape с возвратом фокуса, переход по первым буквам подписи. Popover - произвольное содержимое: фильтры, мини-форма; padded - стандартный отступ.',
        'Menu is a list of actions on an object: arrow keys, Home/End, Enter, Escape with focus return, and type-ahead by label. Popover holds arbitrary content such as filters or a mini form; padded adds the standard padding.',
      )}
    >
      <div className={s.row}>
        <Menu
          label={t('Действия с задачей', 'Task actions')}
          trigger={<Button iconRight={<Ellipsis size={15} />}>{t('Действия', 'Actions')}</Button>}
          items={[
            { type: 'label', id: 'l', label: t('Задача TSK-1042', 'Task TSK-1042') },
            { id: 'edit', label: t('Изменить', 'Edit'), icon: <Pencil size={15} />, shortcut: 'E', onSelect: () => toast.info(t('Изменить задачу', 'Edit task')) },
            {
              id: 'assign',
              label: t('Назначить', 'Assign'),
              icon: <UserPlus size={15} />,
              hint: t('Сейчас: Глеб Сорокин', 'Current: Gleb Sorokin'),
              onSelect: () => toast.info(t('Назначить исполнителя', 'Assign an assignee')),
            },
            { id: 'export', label: t('Выгрузить в PDF', 'Export to PDF'), icon: <Download size={15} />, shortcut: 'Ctrl+P', disabled: true },
            { id: 'open', label: t('Открыть объект', 'Open facility'), icon: <ExternalLink size={15} />, href: '/facilities' },
            { type: 'separator', id: 's1' },
            {
              id: 'cancel',
              label: t('Отменить задачу', 'Cancel task'),
              icon: <Ban size={15} />,
              danger: true,
              onSelect: () => toast.warning(t('Задача отменена', 'Task canceled')),
            },
          ]}
        />
        <Menu
          label={t('Группировка', 'Grouping')}
          placement="bottom-start"
          trigger={<Button variant="ghost">{t('Группировка', 'Grouping')}</Button>}
          items={[
            { type: 'label', id: 'l', label: t('Группировать по', 'Group by') },
            { id: 'none', label: t('Без группировки', 'No grouping'), checked: group === 'none', onSelect: () => setGroup('none') },
            { id: 'facility', label: t('Объекту', 'Facility'), checked: group === 'facility', onSelect: () => setGroup('facility') },
            { id: 'assignee', label: t('Исполнителю', 'Assignee'), checked: group === 'assignee', onSelect: () => setGroup('assignee') },
          ]}
        />
        <Menu
          label={t('Перевести на склад', 'Transfer to warehouse')}
          placement="bottom-start"
          trigger={<Button variant="ghost">{t('Перевести на склад', 'Transfer to warehouse')}</Button>}
          items={WAREHOUSE_MENU[lang].map((w) => ({ id: w, label: w, onSelect: () => toast.info(t('Перевод оформлен', 'Transfer created'), { description: w }) }))}
        />
        <Popover padded label={t('Фильтры задач', 'Task filters')} trigger={<Button icon={<Funnel size={14} />}>{t('Фильтры', 'Filters')}</Button>}>
          {({ close }) => (
            <div className="ev-stack" style={{ width: 'min(288px, 100vw - 64px)' }}>
              <Field label={t('Статус', 'Status')}>
                <Select
                  value={status}
                  onChange={setStatus}
                  clearable
                  placeholder={t('Любой', 'Any')}
                  options={[
                    { value: 'open', label: t('Открыта', 'Open') },
                    { value: 'progress', label: t('В работе', 'In progress') },
                    { value: 'done', label: t('Выполнена', 'Done') },
                  ]}
                />
              </Field>
              <Switch checked={urgent} onChange={setUrgent} label={t('Только срочные', 'Urgent only')} />
              <div className="ev-row" style={{ justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" onClick={close}>
                  {t('Закрыть', 'Close')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    close()
                    toast.success(t('Фильтры применены', 'Filters applied'))
                  }}
                >
                  {t('Применить', 'Apply')}
                </Button>
              </div>
            </div>
          )}
        </Popover>
      </div>
      <p className={s.text} style={{ marginTop: 'var(--ev-space-5)' }}>
        {lang === 'en' ? (
          <>
            In the &quot;Transfer to warehouse&quot; menu, type <Kbd>V</Kbd>: focus moves to &quot;Valley-1&quot;, and pressing the letter
            again moves it to &quot;Valley-2&quot;. Several letters in a row (<Kbd>S</Kbd> <Kbd>I</Kbd> <Kbd>G</Kbd>) narrow the
            search; a 0.5-second pause resets the input.
          </>
        ) : (
          <>
            В меню «Перевести на склад» наберите <Kbd>Л</Kbd>: фокус перейдёт на «Лаборатория Сигма», повтор буквы - на «Логистический
            узел». Несколько букв подряд (<Kbd>Д</Kbd> <Kbd>О</Kbd> <Kbd>Л</Kbd>) уточняют поиск; пауза 0,5 секунды сбрасывает набор.
          </>
        )}
      </p>
    </Card>
  )
}

/* Порядок - по алфавиту языка: на нём держится пример перехода по первым буквам. */
const WAREHOUSE_MENU = {
  ru: ['Долина-1', 'Долина-2', 'Застава', 'Лаборатория Сигма', 'Логистический узел', 'Хребет'],
  en: ['Logistics hub', 'Outpost', 'Ridge', 'Sigma Lab', 'Valley-1', 'Valley-2'],
}

function SegmentedCard() {
  const { t } = useT()
  const [view, setView] = useState<'list' | 'grid' | 'board' | 'calendar'>('list')
  const [period, setPeriod] = useState('w2')
  return (
    <Card
      title={t('SegmentedControl: иконки и прокрутка', 'SegmentedControl: icons and scrolling')}
      description={t(
        'Сегмент без подписи - только иконка: aria-label обязателен, он же текст подсказки. Не помещается по ширине - переключатель прокручивается внутри себя, выбранный сегмент остаётся в видимой области.',
        'A segment without a label shows only an icon: aria-label is required and doubles as the tooltip text. When it does not fit, the control scrolls internally and keeps the selected segment in view.',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <div className={s.row}>
          <SegmentedControl
            aria-label={t('Вид списка задач', 'Task list view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'list', icon: <List size={16} />, 'aria-label': t('Список', 'List') },
              { value: 'grid', icon: <LayoutGrid size={16} />, 'aria-label': t('Плитки', 'Tiles') },
              { value: 'board', icon: <SquareKanban size={16} />, 'aria-label': t('Доска', 'Board') },
              { value: 'calendar', icon: <CalendarDays size={16} />, 'aria-label': t('Календарь', 'Calendar') },
            ]}
          />
          <SegmentedControl
            size="sm"
            aria-label={t('Вид списка задач, компактно', 'Task list view, compact')}
            value={view}
            onChange={setView}
            options={[
              { value: 'list', icon: <List size={14} />, 'aria-label': t('Список', 'List') },
              { value: 'grid', icon: <LayoutGrid size={14} />, 'aria-label': t('Плитки', 'Tiles') },
              { value: 'board', icon: <SquareKanban size={14} />, 'aria-label': t('Доска', 'Board') },
              { value: 'calendar', icon: <CalendarDays size={14} />, 'aria-label': t('Календарь', 'Calendar') },
            ]}
          />
        </div>
        <div className="ev-stack">
          <Subhead>{t('Узкий контейнер: 280px', 'Narrow container: 280px')}</Subhead>
          <div style={{ maxWidth: 280 }}>
            <SegmentedControl
              aria-label={t('Период отчёта', 'Report period')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'd1', label: t('День', 'Day') },
                { value: 'w1', label: t('Неделя', 'Week') },
                { value: 'w2', label: t('Две недели', 'Two weeks') },
                { value: 'm1', label: t('Месяц', 'Month') },
                { value: 'q1', label: t('Квартал', 'Quarter') },
              ]}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

function TabsCard() {
  const { t, tx } = useT()
  const [v, setV] = useState('all')
  const [p, setP] = useState('week')
  return (
    <Card
      title={t('Tabs и TabPanel', 'Tabs and TabPanel')}
      description={t(
        'line - разделы страницы под заголовком; pill - переключатель внутри карточки. С idBase вкладки связаны с TabPanel (aria-controls), стрелки переключают вкладки. С href вкладка - ссылка.',
        'line is for page sections under a header; pill is a switch inside a card. With idBase, tabs are linked to TabPanel (aria-controls) and arrow keys move between them. With href, a tab becomes a link.',
      )}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Tabs
          aria-label={t('Задачи по статусу', 'Tasks by status')}
          idBase="vision-demo-tasks"
          value={v}
          onChange={setV}
          items={[
            { value: 'all', label: t('Все', 'All'), count: 48 },
            { value: 'open', label: t('Открытые', 'Open'), count: 31 },
            { value: 'overdue', label: t('Просроченные', 'Overdue'), count: 3 },
            { value: 'archive', label: t('Архив', 'Archive'), disabled: true },
          ]}
        />
        <TabPanel idBase="vision-demo-tasks" value={v}>
          <span className="ev-secondary">
            {t('Панель вкладки', 'Panel for tab')} <code>{v}</code>
            {t(
              ': role="tabpanel", подпись - по связанной вкладке.',
              ': role="tabpanel", labelled by its tab.',
            )}
          </span>
        </TabPanel>
        <Tabs
          variant="pill"
          aria-label={t('Период', 'Period')}
          value={p}
          onChange={setP}
          items={[
            { value: 'day', label: t('День', 'Day') },
            { value: 'week', label: t('Неделя', 'Week') },
            { value: 'month', label: t('Месяц', 'Month') },
          ]}
        />
        <Tabs
          aria-label={t('Разделы витрины', 'Showcase sections')}
          value="actions"
          items={[
            { value: 'actions', label: tx(VISION_TAB_META.actions.label), href: '/vision?tab=actions' },
            { value: 'forms', label: tx(VISION_TAB_META.forms.label), href: '/vision?tab=forms' },
            { value: 'data', label: tx(VISION_TAB_META.data.label), href: '/vision?tab=data' },
          ]}
        />
      </div>
    </Card>
  )
}

function KbdCard() {
  const { t, lang } = useT()
  return (
    <Card title="Kbd" description={t('Клавиши и сочетания в подсказках, меню и справке.', 'Keys and shortcuts in tooltips, menus and help.')}>
      <div className="ev-stack">
        <span className="ev-secondary">
          {t('Поиск по консоли:', 'Search the console:')} <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
        </span>
        <span className="ev-secondary">
          {t('Закрыть окно:', 'Close a dialog:')} <Kbd>Esc</Kbd>
        </span>
        <span className="ev-secondary">
          {lang === 'en' ? (
            <>
              Jump to a menu item by its first letter: <Kbd>A</Kbd>-<Kbd>Z</Kbd>
            </>
          ) : (
            <>
              Пункт меню по первой букве: <Kbd>А</Kbd>-<Kbd>Я</Kbd>, <Kbd>A</Kbd>-<Kbd>Z</Kbd>
            </>
          )}
        </span>
        <span className="ev-secondary">
          {t('Следующий месяц в календаре:', 'Next month in the calendar:')} <Kbd>PgDn</Kbd>, {t('следующий год:', 'next year:')}{' '}
          <Kbd>Shift</Kbd> + <Kbd>PgDn</Kbd>
        </span>
      </div>
    </Card>
  )
}

export function ActionsSection() {
  return (
    <div className={s.section}>
      <div className={`${s.grid} ${s.gridWide}`}>
        <ButtonsCard />
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <IconButtonsCard />
          <TooltipCard />
        </div>
      </div>
      <div className={`${s.grid} ${s.gridWide}`}>
        <MenuPopoverCard />
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <SegmentedCard />
          <KbdCard />
        </div>
      </div>
      <TabsCard />
    </div>
  )
}
