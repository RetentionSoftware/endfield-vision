'use client'

import {
  Avatar,
  Badge,
  Button,
  Card,
  KanbanBoard,
  KanbanCard,
  KeyValueList,
  NumberInput,
  PermissionMatrix,
  SaveBar,
  Select,
  SettingRow,
  SettingsList,
  SettingsSection,
  SlaTimer,
  Switch,
  toast,
  useDirtyState,
  type KanbanColumn,
  type KeyValueItem,
  type PermissionColumn,
  type PermissionRow,
  type PermissionValue,
} from 'endfield-vision'
import { Save } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'

/*
 * Витрина группы «Рабочие процессы»: канбан нарядов с таймерами SLA, таймеры
 * в разных состояниях, матрица прав ролей, список настроек с панелью
 * сохранения. Опорное «сейчас» фиксировано: серверный и клиентский рендер
 * совпадают, после монтирования таймеры идут от него.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
/** 9 октября 2026, 09:00 UTC - «сейчас» для всех демо. */
const NOW = Date.UTC(2026, 9, 9, 9, 0)
const at = (minutes: number) => NOW + minutes * MINUTE

/* ------------------------------------------------------------------ */
/* Канбан нарядов                                                      */
/* ------------------------------------------------------------------ */

type ColumnId = 'new' | 'work' | 'review' | 'done'

interface WorkOrder {
  id: string
  title: Bi
  site: Bi
  assignee: Bi
  urgent?: boolean
  /** Срок выполнения, мс. */
  deadline: number
}

const PEOPLE = {
  alina: bi('Алина Воронцова', 'Alina Vorontsova'),
  gleb: bi('Глеб Сорокин', 'Gleb Sorokin'),
  irina: bi('Ирина Лебедева', 'Irina Lebedeva'),
  timur: bi('Тимур Ахмедов', 'Timur Akhmedov'),
  maria: bi('Мария Котова', 'Maria Kotova'),
  pavel: bi('Павел Гусев', 'Pavel Gusev'),
}

const INITIAL_BOARD: Record<ColumnId, WorkOrder[]> = {
  new: [
    { id: 'WO-1048', title: bi('Замена фильтра насосной станции', 'Replace pump station filter'), site: bi('Долина-1', 'Valley-1'), assignee: PEOPLE.gleb, urgent: true, deadline: at(40) },
    { id: 'WO-1047', title: bi('Поверка датчиков давления', 'Calibrate pressure sensors'), site: bi('Хребет', 'Ridge'), assignee: PEOPLE.irina, deadline: at(6 * 60) },
    { id: 'WO-1046', title: bi('Осмотр ограждения периметра', 'Inspect perimeter fence'), site: bi('Застава', 'Outpost'), assignee: PEOPLE.pavel, deadline: at(26 * 60) },
  ],
  work: [
    { id: 'WO-1041', title: bi('Ремонт конвейера Л-3', 'Repair conveyor L-3'), site: bi('Рудник Глубокий', 'Deep Mine'), assignee: PEOPLE.timur, urgent: true, deadline: at(-25) },
    { id: 'WO-1039', title: bi('Замена аккумуляторов ИБП', 'Replace UPS batteries'), site: bi('Лаборатория Сигма', 'Sigma Lab'), assignee: PEOPLE.alina, deadline: at(95) },
  ],
  review: [
    { id: 'WO-1036', title: bi('Наладка вентиляции склада', 'Tune warehouse ventilation'), site: bi('Порт Ясный', 'Clearwater Port'), assignee: PEOPLE.maria, deadline: at(3 * 60) },
  ],
  done: [
    { id: 'WO-1030', title: bi('Чистка теплообменника', 'Clean heat exchanger'), site: bi('Долина-2', 'Valley-2'), assignee: PEOPLE.gleb, deadline: at(-5 * 60) },
  ],
}

/** Ещё не загруженные новые наряды: «Показать ещё» догружает по два. */
const RESERVE: WorkOrder[] = [
  { id: 'WO-1045', title: bi('Проверка заземления подстанции', 'Check substation grounding'), site: bi('Ретранслятор Южный', 'South Relay'), assignee: PEOPLE.timur, deadline: at(30 * 60) },
  { id: 'WO-1044', title: bi('Замена ламп в цеху', 'Replace shop floor lamps'), site: bi('Долина-1', 'Valley-1'), assignee: PEOPLE.maria, deadline: at(48 * 60) },
  { id: 'WO-1043', title: bi('Смазка подшипников дробилки', 'Lubricate crusher bearings'), site: bi('Рудник Глубокий', 'Deep Mine'), assignee: PEOPLE.pavel, deadline: at(52 * 60) },
  { id: 'WO-1042', title: bi('Калибровка весов', 'Calibrate scales'), site: bi('Порт Ясный', 'Clearwater Port'), assignee: PEOPLE.irina, deadline: at(72 * 60) },
]
const PAGE = 2

function WorkOrderBoardCard() {
  const { t, tx } = useT()
  const [board, setBoard] = useState(INITIAL_BOARD)
  const [loaded, setLoaded] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadMore = () => {
    setLoading(true)
    window.setTimeout(() => {
      setBoard((prev) => ({ ...prev, new: [...prev.new, ...RESERVE.slice(loaded, loaded + PAGE)] }))
      setLoaded((n) => n + PAGE)
      setLoading(false)
    }, 700)
  }

  const move = (id: string, from: string, to: string, index: number) => {
    setBoard((prev) => {
      const source = prev[from as ColumnId]
      const item = source.find((o) => o.id === id)
      if (!item) return prev
      const rest = source.filter((o) => o.id !== id)
      const target = from === to ? rest : [...prev[to as ColumnId]]
      target.splice(index, 0, item)
      return { ...prev, [from]: rest, [to]: target }
    })
  }

  const columns: KanbanColumn<WorkOrder>[] = [
    {
      id: 'new',
      title: t('Новые', 'New'),
      tone: 'info',
      items: board.new,
      total: board.new.length + RESERVE.length - loaded,
      onLoadMore: loadMore,
      loading,
    },
    { id: 'work', title: t('В работе', 'In progress'), tone: 'warning', items: board.work },
    { id: 'review', title: t('На проверке', 'In review'), tone: 'violet', items: board.review },
    { id: 'done', title: t('Выполнены', 'Done'), tone: 'success', items: board.done },
  ]

  return (
    <Card
      title="KanbanBoard, KanbanCard"
      description={t(
        'Доска статусов с переносом карточек. Мышью - перетаскивание, на сенсорном экране - долгое нажатие, с клавиатуры - меню «Переместить в ...» у карточки. Колонка с порциями: счётчик «показано из всего» и «Показать ещё». Выполненный наряд нельзя вернуть в «Новые» (canMove).',
        'A status board with movable cards. Drag with the mouse, long-press on a touch screen, or use the "Move to ..." menu on each card from the keyboard. A paged column shows "shown of total" and "Show more". A finished work order cannot go back to "New" (canMove).',
      )}
    >
      <KanbanBoard
        aria-label={t('Наряды', 'Work orders')}
        columns={columns}
        getId={(o) => o.id}
        pageSize={PAGE}
        onMove={move}
        moveLabel={(o) => t(`Переместить наряд ${o.id}`, `Move work order ${o.id}`)}
        canMove={(_, from, to) => !(from === 'done' && to === 'new')}
        renderCard={(o, col) => (
          <KanbanCard
            title={tx(o.title)}
            tone={o.urgent && col.id !== 'done' ? 'danger' : undefined}
            onClick={() => toast.info(t(`Открыт наряд ${o.id}`, `Opened work order ${o.id}`))}
            meta={
              <>
                <span className="ev-mono">{o.id}</span>
                <span>{tx(o.site)}</span>
              </>
            }
            footer={
              <>
                {col.id === 'done' ? (
                  <Badge tone="success" size="sm">
                    {t('Закрыт', 'Closed')}
                  </Badge>
                ) : (
                  <SlaTimer deadline={o.deadline} now={NOW} compact warnBefore={2 * HOUR} />
                )}
                {o.urgent && col.id !== 'done' ? (
                  <Badge tone="danger" size="sm">
                    {t('Срочно', 'Urgent')}
                  </Badge>
                ) : null}
                <span className="ev-spacer" />
                <Avatar name={tx(o.assignee)} size={22} />
              </>
            }
          />
        )}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Таймеры SLA                                                         */
/* ------------------------------------------------------------------ */

function SlaTimersCard() {
  const { t } = useT()
  const items: KeyValueItem[] = [
    {
      key: 'fresh',
      label: t('Заявка ждёт ответа', 'Request awaiting reply'),
      value: <SlaTimer since={at(-8)} now={NOW} warnAfter={30 * MINUTE} dangerAfter={2 * HOUR} />,
      hint: t('Прошло 8 минут: нейтральный тон', '8 minutes elapsed: neutral tone'),
    },
    {
      key: 'slow',
      label: t('Инцидент без исполнителя', 'Unassigned incident'),
      value: <SlaTimer since={at(-47)} now={NOW} warnAfter={30 * MINUTE} dangerAfter={2 * HOUR} />,
      hint: t('Больше 30 минут: предупреждение', 'Over 30 minutes: warning'),
    },
    {
      key: 'stuck',
      label: t('Наряд на проверке', 'Work order in review'),
      value: <SlaTimer since={at(-135)} now={NOW} warnAfter={30 * MINUTE} dangerAfter={2 * HOUR} />,
      hint: t('Больше 2 часов: опасность', 'Over 2 hours: danger'),
    },
    {
      key: 'far',
      label: t('Плановое обслуживание', 'Scheduled maintenance'),
      value: <SlaTimer deadline={at(3 * 24 * 60 + 250)} now={NOW} warnBefore={HOUR} />,
      hint: t('До срока больше суток', 'More than a day to the deadline'),
    },
    {
      key: 'soon',
      label: t('Отгрузка в порт', 'Port shipment'),
      value: <SlaTimer deadline={at(12)} now={NOW} warnBefore={15 * MINUTE} />,
      hint: t('Меньше 15 минут: предупреждение, отсчёт по секундам', 'Under 15 minutes: warning, ticks every second'),
    },
    {
      key: 'late',
      label: t('Ответ контрагенту', 'Reply to counterparty'),
      value: <SlaTimer deadline={at(-80)} now={NOW} />,
      hint: t('Срок прошёл: своя иконка и текст', 'Deadline passed: its own icon and text'),
    },
    {
      key: 'compact',
      label: t('Компактный вид', 'Compact variant'),
      value: (
        <span className="ev-row" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
          <SlaTimer since={at(-47)} now={NOW} warnAfter={30 * MINUTE} compact />
          <SlaTimer deadline={at(95)} now={NOW} compact />
          <SlaTimer deadline={at(-80)} now={NOW} compact />
        </span>
      ),
      hint: t('Полная фраза - в подсказке и aria-label', 'The full phrase is in the tooltip and aria-label'),
    },
  ]
  return (
    <Card
      title="SlaTimer"
      description={t(
        'Таймер SLA: сколько прошло (since) или сколько осталось до срока (deadline). Тон - по порогам warnAfter / dangerAfter / warnBefore, просрочка - «просрочено на ...». Опорное now делает серверный рендер детерминированным; после монтирования таймер идёт: раз в секунду, пока меньше часа, дальше - раз в 30 секунд. Хелперы formatDuration и timerTone - для таблиц и своих компонентов.',
        'An SLA timer: time elapsed (since) or time left until a deadline (deadline). The tone follows the warnAfter / dangerAfter / warnBefore thresholds; past the deadline it reads "overdue by ...". A reference now keeps the server render deterministic; after mount the timer ticks every second under an hour and every 30 seconds beyond that. The formatDuration and timerTone helpers work in tables and custom components.',
      )}
    >
      <KeyValueList items={items} columns={2} labelWidth={200} />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Матрица прав                                                        */
/* ------------------------------------------------------------------ */

const PERM_ROWS: Array<{ id: string; label: Bi; description?: Bi; group: Bi }> = [
  { id: 'orders', label: bi('Наряды', 'Work orders'), description: bi('Создание, назначение, закрытие', 'Create, assign, close'), group: bi('Операции', 'Operations') },
  { id: 'incidents', label: bi('Инциденты', 'Incidents'), group: bi('Операции', 'Operations') },
  { id: 'stock', label: bi('Остатки', 'Stock'), group: bi('Склад', 'Warehouse') },
  { id: 'shipments', label: bi('Отгрузки', 'Shipments'), group: bi('Склад', 'Warehouse') },
  { id: 'invoices', label: bi('Счета', 'Invoices'), group: bi('Финансы', 'Finance') },
  { id: 'users', label: bi('Пользователи и роли', 'Users and roles'), group: bi('Администрирование', 'Administration') },
  { id: 'audit', label: bi('Журнал', 'Audit log'), description: bi('Только просмотр по регламенту', 'View-only by policy'), group: bi('Администрирование', 'Administration') },
]

const PERM_ROLES: Array<{ id: string; label: Bi; locked?: boolean }> = [
  { id: 'owner', label: bi('Владелец', 'Owner'), locked: true },
  { id: 'supervisor', label: bi('Начальник смены', 'Shift supervisor') },
  { id: 'dispatcher', label: bi('Диспетчер', 'Dispatcher') },
  { id: 'storekeeper', label: bi('Кладовщик', 'Storekeeper') },
  { id: 'auditor', label: bi('Аудитор', 'Auditor') },
]

const PERM_BASELINE: PermissionValue = {
  orders: { owner: 'full', supervisor: 'full', dispatcher: 'full', storekeeper: 'view', auditor: 'view' },
  incidents: { owner: 'full', supervisor: 'full', dispatcher: 'view', storekeeper: 'none', auditor: 'view' },
  stock: { owner: 'full', supervisor: 'view', dispatcher: 'view', storekeeper: 'full', auditor: 'view' },
  shipments: { owner: 'full', supervisor: 'view', dispatcher: 'full', storekeeper: 'full', auditor: 'view' },
  invoices: { owner: 'full', supervisor: 'none', dispatcher: 'none', storekeeper: 'none', auditor: 'view' },
  users: { owner: 'full', supervisor: 'view', dispatcher: 'none', storekeeper: 'none', auditor: 'none' },
  audit: { owner: 'full', supervisor: 'view', dispatcher: 'none', storekeeper: 'none', auditor: 'view' },
}

function PermissionsCard() {
  const { t, tx } = useT()
  const [baseline, setBaseline] = useState(PERM_BASELINE)
  const [value, setValue] = useState<PermissionValue>(() => ({
    ...PERM_BASELINE,
    // Одна несохранённая правка с самого начала: видно отметку и счётчик.
    invoices: { ...PERM_BASELINE.invoices, supervisor: 'view' },
  }))
  const rows: PermissionRow[] = useMemo(
    () => PERM_ROWS.map((r) => ({ id: r.id, label: tx(r.label), description: r.description ? tx(r.description) : undefined, group: tx(r.group) })),
    [tx],
  )
  const columns: PermissionColumn[] = useMemo(() => PERM_ROLES.map((r) => ({ id: r.id, label: tx(r.label), locked: r.locked })), [tx])
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline)
  return (
    <Card
      flush
      title="PermissionMatrix"
      description={t(
        'Права ролей: разделы по строкам, роли по столбцам. Нажатие по ячейке перебирает режимы, цифры 1-3 ставят режим сразу, стрелки ходят по сетке. Меню в шапке роли ставит режим на весь столбец, роль с замком не меняется. Изменения против сохранённого состояния (baseline) отмечены уголками, внизу - счётчик и сброс.',
        'Role permissions: sections in rows, roles in columns. Clicking a cell cycles through modes, keys 1-3 set a mode directly, and arrow keys move around the grid. The menu in a role header sets the whole column; a locked role cannot be changed. Changes against the saved state (baseline) are marked with corners, with a counter and reset at the bottom.',
      )}
      actions={
        <Button
          size="sm"
          variant="primary"
          icon={<Save size={14} />}
          disabled={!dirty}
          onClick={() => {
            setBaseline(value)
            toast.success(t('Права сохранены', 'Permissions saved'))
          }}
        >
          {t('Сохранить', 'Save')}
        </Button>
      }
    >
      <PermissionMatrix
        aria-label={t('Права ролей', 'Role permissions')}
        rows={rows}
        columns={columns}
        value={value}
        baseline={baseline}
        onChange={setValue}
        maxHeight={420}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Настройки                                                           */
/* ------------------------------------------------------------------ */

type Escalation = 'supervisor' | 'dispatcher' | 'nobody'

interface NotifySettings {
  digest: boolean
  digestHour: number | null
  escalation: Escalation
  warnMinutes: number | null
  autoClose: boolean
}

const INITIAL_SETTINGS: NotifySettings = { digest: true, digestHour: 9, escalation: 'supervisor', warnMinutes: 30, autoClose: false }

function SettingsCard() {
  const { t } = useT()
  const s = useDirtyState(INITIAL_SETTINGS)
  const [saving, setSaving] = useState(false)
  const v = s.value
  const patch = (next: Partial<NotifySettings>) => s.set((prev) => ({ ...prev, ...next }))
  const changed = (k: keyof NotifySettings) => v[k] !== s.saved[k]

  const save = () => {
    setSaving(true)
    window.setTimeout(() => {
      s.commit()
      setSaving(false)
      toast.success(t('Настройки сохранены', 'Settings saved'))
    }, 800)
  }

  return (
    <Card
      title="SettingsList, SettingRow, SaveBar"
      description={t(
        'Одна настройка - одна строка: название и описание слева, контрол справа (на узком экране - снизу). Контролы кита сами связываются с подписью строки. Изменённая строка отмечена уголком. Панель «Сохранить» закреплена снизу и появляется, только когда есть изменения; при уходе со страницы браузер предупредит (warnOnLeave). Черновик - хук useDirtyState.',
        'One setting per row: label and description on the left, control on the right (below on narrow screens). Kit controls link to the row label automatically. A changed row is marked with a corner. The sticky "Save" bar appears only when there are changes, and the browser warns before leaving the page (warnOnLeave). The draft lives in the useDirtyState hook.',
      )}
    >
      <SettingsList>
        <SettingsSection title={t('Уведомления', 'Notifications')} description={t('Что и когда получает дежурная смена', 'What the on-duty shift receives and when')}>
          <SettingRow
            label={t('Ежедневная сводка', 'Daily digest')}
            description={t('Письмо с открытыми нарядами и просрочками', 'An email with open work orders and overdue items')}
            changed={changed('digest')}
            control={<Switch checked={v.digest} onChange={(digest) => patch({ digest })} />}
          />
          <SettingRow
            label={t('Время отправки', 'Send time')}
            description={t('Час по времени объекта, 0-23', 'Hour in facility time, 0-23')}
            disabled={!v.digest}
            changed={changed('digestHour')}
            control={
              <div style={{ width: 120 }}>
                <NumberInput value={v.digestHour} onChange={(digestHour) => patch({ digestHour })} min={0} max={23} unit={t('ч', 'h')} />
              </div>
            }
          />
          <SettingRow
            label={t('Эскалация просрочки', 'Overdue escalation')}
            description={t('Кому уходит наряд, если срок прошёл', 'Who gets a work order once it is overdue')}
            changed={changed('escalation')}
            control={
              <Select<Escalation>
                width={220}
                value={v.escalation}
                onChange={(escalation) => escalation && patch({ escalation })}
                options={[
                  { value: 'supervisor', label: t('Начальник смены', 'Shift supervisor') },
                  { value: 'dispatcher', label: t('Диспетчер', 'Dispatcher') },
                  { value: 'nobody', label: t('Никому', 'Nobody') },
                ]}
              />
            }
          />
        </SettingsSection>
        <SettingsSection title="SLA" description={t('Пороги таймеров на карточках нарядов', 'Timer thresholds on work order cards')}>
          <SettingRow
            label={t('Предупреждать за', 'Warn before')}
            description={t('Таймер становится жёлтым до срока', 'The timer turns amber before the deadline')}
            hint={t('Изменено 2 октября, Алина Воронцова', 'Changed on October 2 by Alina Vorontsova')}
            changed={changed('warnMinutes')}
            control={
              <div style={{ width: 140 }}>
                <NumberInput value={v.warnMinutes} onChange={(warnMinutes) => patch({ warnMinutes })} min={5} max={240} step={5} stepper unit={t('мин', 'min')} />
              </div>
            }
          />
          <SettingRow
            label={t('Автозакрытие', 'Auto-close')}
            description={t('Закрывать наряд через 24 часа после проверки', 'Close a work order 24 hours after review')}
            badge={
              <Badge tone="violet" size="sm">
                {t('Бета', 'Beta')}
              </Badge>
            }
            changed={changed('autoClose')}
            control={<Switch checked={v.autoClose} onChange={(autoClose) => patch({ autoClose })} />}
          />
        </SettingsSection>
      </SettingsList>
      <SaveBar dirty={s.dirty} saving={saving} onSave={save} onDiscard={s.reset} warnOnLeave />
    </Card>
  )
}

/** Витрина группы «Рабочие процессы»: канбан, таймеры SLA, матрица прав, настройки. */
export function WorkflowCards() {
  return (
    <div className="ev-stack">
      <WorkOrderBoardCard />
      <SlaTimersCard />
      <PermissionsCard />
      <SettingsCard />
    </div>
  )
}
