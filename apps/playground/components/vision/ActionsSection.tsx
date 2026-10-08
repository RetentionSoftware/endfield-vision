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
  ClipboardList,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  Funnel,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Subhead } from './parts'
import s from './vision.module.css'

const VARIANTS: Array<{ variant: ButtonVariant; label: string }> = [
  { variant: 'primary', label: 'Создать задачу' },
  { variant: 'secondary', label: 'Изменить' },
  { variant: 'ghost', label: 'Отмена' },
  { variant: 'danger', label: 'Удалить' },
  { variant: 'danger-ghost', label: 'Списать' },
]

const SIZES: Array<{ size: ButtonSize; label: string }> = [
  { size: 'sm', label: 'Маленькая' },
  { size: 'md', label: 'Обычная' },
  { size: 'lg', label: 'Крупная' },
]

function ButtonsCard() {
  const [loading, setLoading] = useState(false)
  return (
    <Card title="Button и LinkButton" description="primary - одно главное действие на экране; secondary - остальные; ghost - второстепенные в тулбарах; danger - необратимые. LinkButton - переход, оформленный кнопкой.">
      <div className="ev-stack">
        <Subhead>Варианты</Subhead>
        <div className={s.row}>
          {VARIANTS.map((v) => (
            <Button key={v.variant} variant={v.variant} icon={v.variant === 'primary' ? <Plus size={15} /> : v.variant === 'danger' ? <Trash2 size={15} /> : undefined}>
              {v.label}
            </Button>
          ))}
          <Button disabled>Недоступна</Button>
        </div>
        <Subhead>Размеры и состояния</Subhead>
        <div className={s.row}>
          {SIZES.map((sz) => (
            <Button key={sz.size} size={sz.size} variant={sz.size === 'md' ? 'secondary' : 'primary'}>
              {sz.label}
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
            Обновить остатки
          </Button>
          <Button iconRight={<ArrowRight size={15} />}>Далее</Button>
        </div>
        <Subhead>Ссылка-кнопка и кнопка на всю ширину</Subhead>
        <div className={s.row}>
          <LinkButton href="/tasks" icon={<ClipboardList size={15} />}>
            К задачам
          </LinkButton>
          <LinkButton href="/inventory" variant="ghost" iconRight={<ExternalLink size={14} />}>
            Открыть склад
          </LinkButton>
        </div>
        <Button block variant="primary" icon={<Truck size={15} />}>
          Оформить отгрузку
        </Button>
      </div>
    </Card>
  )
}

function IconButtonsCard() {
  const [starred, setStarred] = useState(true)
  return (
    <Card title="IconButton" description="Кнопка-иконка в строках таблиц и тулбарах. Подпись label обязательна: это aria-label и текст встроенной подсказки.">
      <div className="ev-stack">
        <div className={s.row}>
          <IconButton label="Изменить" icon={<Pencil size={16} />} />
          <IconButton label="Скопировать" icon={<Copy size={16} />} variant="secondary" />
          <IconButton label="Отправить" icon={<Send size={16} />} variant="primary" />
          <IconButton label="Удалить" icon={<Trash2 size={16} />} variant="danger-ghost" />
          <IconButton label="Обновляется" icon={<RefreshCw size={16} />} loading />
          <IconButton label="Недоступно" icon={<Archive size={16} />} disabled />
        </div>
        <div className={s.row}>
          <IconButton label={starred ? 'Убрать из избранного' : 'В избранное'} icon={<Star size={16} />} pressed={starred} onClick={() => setStarred((v) => !v)} />
          <IconButton label="Фильтры" icon={<Funnel size={14} />} size="sm" variant="secondary" />
          <IconButton label="Скачать" icon={<Download size={18} />} size="lg" variant="secondary" tooltipPlacement="bottom" />
          <span className="ev-muted">pressed - для кнопок-переключателей (aria-pressed).</span>
        </div>
      </div>
    </Card>
  )
}

function TooltipCard() {
  return (
    <Card title="Tooltip" description="Короткое пояснение по наведению и фокусу. Вместо атрибута title: подсказка доступна с клавиатуры и связана через aria-describedby.">
      <div className={s.row}>
        <Tooltip content="Подсказка сверху" placement="top">
          <Button size="sm">Сверху</Button>
        </Tooltip>
        <Tooltip content="Подсказка снизу" placement="bottom">
          <Button size="sm">Снизу</Button>
        </Tooltip>
        <Tooltip content="Подсказка справа" placement="right">
          <Button size="sm">Справа</Button>
        </Tooltip>
        <Tooltip content="Место выбирается по свободному пространству">
          <Button size="sm">Авто</Button>
        </Tooltip>
        <Tooltip content="Нет прав на списание: обратитесь к кладовщику">
          <span tabIndex={0}>
            <Button size="sm" disabled>
              Недоступна с пояснением
            </Button>
          </span>
        </Tooltip>
      </div>
    </Card>
  )
}

function MenuPopoverCard() {
  const [group, setGroup] = useState<'none' | 'facility' | 'assignee'>('facility')
  const [status, setStatus] = useState<string | null>(null)
  const [urgent, setUrgent] = useState(false)
  return (
    <Card title="Menu и Popover" description="Menu - список действий над объектом: стрелки, Home/End, Enter, Escape с возвратом фокуса. Popover - произвольное содержимое: фильтры, мини-форма.">
      <div className={s.row}>
        <Menu
          label="Действия с задачей"
          trigger={<Button iconRight={<Ellipsis size={15} />}>Действия</Button>}
          items={[
            { type: 'label', id: 'l', label: 'Задача TSK-1042' },
            { id: 'edit', label: 'Изменить', icon: <Pencil size={15} />, shortcut: 'E', onSelect: () => toast.info('Изменить задачу') },
            { id: 'assign', label: 'Назначить', icon: <UserPlus size={15} />, hint: 'Сейчас: Глеб Сорокин', onSelect: () => toast.info('Назначить исполнителя') },
            { id: 'export', label: 'Выгрузить в PDF', icon: <Download size={15} />, shortcut: 'Ctrl+P', disabled: true },
            { id: 'open', label: 'Открыть объект', icon: <ExternalLink size={15} />, href: '/facilities' },
            { type: 'separator', id: 's1' },
            { id: 'cancel', label: 'Отменить задачу', icon: <Ban size={15} />, danger: true, onSelect: () => toast.warning('Задача отменена') },
          ]}
        />
        <Menu
          label="Группировка"
          placement="bottom-start"
          trigger={<Button variant="ghost">Группировка</Button>}
          items={[
            { type: 'label', id: 'l', label: 'Группировать по' },
            { id: 'none', label: 'Без группировки', checked: group === 'none', onSelect: () => setGroup('none') },
            { id: 'facility', label: 'Объекту', checked: group === 'facility', onSelect: () => setGroup('facility') },
            { id: 'assignee', label: 'Исполнителю', checked: group === 'assignee', onSelect: () => setGroup('assignee') },
          ]}
        />
        <Popover label="Фильтры задач" trigger={<Button icon={<Funnel size={14} />}>Фильтры</Button>}>
          {({ close }) => (
            <div className="ev-stack" style={{ padding: 'var(--ev-space-6)', width: 'min(320px, 100vw - 32px)' }}>
              <Field label="Статус">
                <Select
                  value={status}
                  onChange={setStatus}
                  clearable
                  placeholder="Любой"
                  options={[
                    { value: 'open', label: 'Открыта' },
                    { value: 'progress', label: 'В работе' },
                    { value: 'done', label: 'Выполнена' },
                  ]}
                />
              </Field>
              <Switch checked={urgent} onChange={setUrgent} label="Только срочные" />
              <div className="ev-row" style={{ justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" onClick={close}>
                  Закрыть
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    close()
                    toast.success('Фильтры применены')
                  }}
                >
                  Применить
                </Button>
              </div>
            </div>
          )}
        </Popover>
      </div>
    </Card>
  )
}

function TabsCard() {
  const [v, setV] = useState('all')
  const [p, setP] = useState('week')
  return (
    <Card title="Tabs и TabPanel" description="line - разделы страницы под заголовком; pill - переключатель внутри карточки. С idBase вкладки связаны с TabPanel (aria-controls), стрелки переключают вкладки. С href вкладка - ссылка.">
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <Tabs
          aria-label="Задачи по статусу"
          idBase="vision-demo-tasks"
          value={v}
          onChange={setV}
          items={[
            { value: 'all', label: 'Все', count: 48 },
            { value: 'open', label: 'Открытые', count: 31 },
            { value: 'overdue', label: 'Просроченные', count: 3 },
            { value: 'archive', label: 'Архив', disabled: true },
          ]}
        />
        <TabPanel idBase="vision-demo-tasks" value={v}>
          <span className="ev-secondary">
            Панель вкладки <code>{v}</code>: role=&quot;tabpanel&quot;, подпись - по связанной вкладке.
          </span>
        </TabPanel>
        <Tabs
          variant="pill"
          aria-label="Период"
          value={p}
          onChange={setP}
          items={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
            { value: 'month', label: 'Месяц' },
          ]}
        />
        <Tabs
          aria-label="Разделы витрины"
          value="actions"
          items={[
            { value: 'actions', label: 'Кнопки и меню', href: '/vision?tab=actions' },
            { value: 'forms', label: 'Формы', href: '/vision?tab=forms' },
            { value: 'data', label: 'Данные', href: '/vision?tab=data' },
          ]}
        />
      </div>
    </Card>
  )
}

function KbdCard() {
  return (
    <Card title="Kbd" description="Клавиши и сочетания в подсказках, меню и справке.">
      <div className="ev-stack">
        <span className="ev-secondary">
          Поиск по консоли: <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
        </span>
        <span className="ev-secondary">
          Закрыть окно: <Kbd>Esc</Kbd>
        </span>
        <span className="ev-secondary">
          Следующий месяц в календаре: <Kbd>PgDn</Kbd>, следующий год: <Kbd>Shift</Kbd> + <Kbd>PgDn</Kbd>
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
        <KbdCard />
      </div>
      <TabsCard />
    </div>
  )
}
