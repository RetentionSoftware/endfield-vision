'use client'

import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  DataTable,
  Field,
  LineChart,
  LinkButton,
  Menu,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  Sparkline,
  StatTile,
  StatusPill,
  Textarea,
  toast,
  useModals,
  type Column,
} from 'endfield-vision'
import { AlertTriangle, ArrowRight, Download, Factory, FileText, MoreHorizontal, Plus, Users, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FACILITIES, FACILITY_STATUS, type Facility } from '@/lib/demo/facilities'
import { bi, useT, type Bi } from '@/lib/i18n'
import s from './overview.module.css'

type Period = 'day' | 'week' | 'month'

const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 25 + i))
  const fact = FACILITIES.reduce((sum, f) => sum + (f.history[i] ?? 0), 0)
  return {
    label: `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    plan: 5600 + (i % 7 === 5 || i % 7 === 6 ? -400 : 0),
    fact,
  }
})

interface Incident {
  id: string
  title: Bi
  facility: Bi
  severity: 'critical' | 'major' | 'minor'
  openedAt: Bi | string
}

const INCIDENTS: Incident[] = [
  { id: 'INC-2291', title: bi('Потеря связи с ретранслятором', 'Relay connection lost'), facility: bi('Ретранслятор Южный', 'South Relay'), severity: 'critical', openedAt: '08:12' },
  { id: 'INC-2288', title: bi('Перегрев линии сборки №3', 'Assembly line 3 overheating'), facility: bi('Хребет', 'Ridge'), severity: 'major', openedAt: '06:47' },
  { id: 'INC-2284', title: bi('Задержка поставки реагентов', 'Reagent delivery delayed'), facility: bi('Лаборатория Сигма', 'Sigma Lab'), severity: 'minor', openedAt: bi('вчера', 'yesterday') },
  { id: 'INC-2280', title: bi('Плановая замена фильтров', 'Scheduled filter replacement'), facility: bi('Застава', 'Outpost'), severity: 'minor', openedAt: bi('вчера', 'yesterday') },
]

const SEVERITY = {
  critical: { label: bi('Критический', 'Critical'), tone: 'danger' },
  major: { label: bi('Серьёзный', 'Major'), tone: 'warning' },
  minor: { label: bi('Низкий', 'Low'), tone: 'neutral' },
} as const

const EVENTS = [
  { id: 'e1', who: bi('Глеб Сорокин', 'Gleb Sorokin'), what: bi('закрыл задачу', 'closed a task'), target: bi('Калибровка датчиков VAL-01', 'VAL-01 sensor calibration'), time: bi('5 мин назад', '5 min ago') },
  { id: 'e2', who: bi('Мария Котова', 'Maria Kotova'), what: bi('приняла партию', 'received a batch'), target: bi('240 контейнеров в Порт Ясный', '240 containers at Clearwater Port'), time: bi('22 мин назад', '22 min ago') },
  { id: 'e3', who: bi('Тимур Ахмедов', 'Timur Akhmedov'), what: bi('открыл инцидент', 'opened an incident'), target: bi('INC-2288 Перегрев линии сборки', 'INC-2288 Assembly line overheating'), time: bi('1 ч назад', '1 h ago') },
  { id: 'e4', who: bi('Алина Воронцова', 'Alina Vorontsova'), what: bi('пригласила в команду', 'invited to the team'), target: bi('Дарья Миронова', 'Darya Mironova'), time: bi('2 ч назад', '2 h ago') },
  { id: 'e5', who: bi('Павел Гусев', 'Pavel Gusev'), what: bi('перевёл объект в обслуживание', 'put a facility into maintenance'), target: bi('Застава', 'Outpost'), time: bi('3 ч назад', '3 h ago') },
]

function loadTone(load: number) {
  return load >= 90 ? 'warning' : load === 0 ? 'danger' : load < 30 ? 'info' : 'accent'
}

export function OverviewScreen() {
  const [period, setPeriod] = useState<Period>('day')
  const modals = useModals()
  const { t, tx, formatNum } = useT()

  const totals = useMemo(
    () => ({
      output: FACILITIES.reduce((a, f) => a + f.output, 0),
      energy: FACILITIES.reduce((a, f) => a + f.energy, 0),
      staff: FACILITIES.reduce((a, f) => a + f.staff, 0),
    }),
    [],
  )

  const incidentColumns: Column<Incident>[] = [
    {
      key: 'title',
      header: t('Инцидент', 'Incident'),
      primary: true,
      cell: (i) => (
        <span className={s.incident}>
          <span>{tx(i.title)}</span>
          <span className="ev-muted ev-mono">{i.id}</span>
        </span>
      ),
    },
    { key: 'facility', header: t('Объект', 'Facility'), hideOnMobile: true, cell: (i) => tx(i.facility) },
    { key: 'severity', header: t('Уровень', 'Severity'), cell: (i) => <StatusPill tone={SEVERITY[i.severity].tone}>{tx(SEVERITY[i.severity].label)}</StatusPill> },
    { key: 'openedAt', header: t('Открыт', 'Opened'), align: 'right', cell: (i) => <span className="ev-muted">{tx(i.openedAt)}</span> },
  ]

  const newTask = () => {
    let title = ''
    let facility: string | null = null
    modals.open({
      title: t('Новая задача', 'New task'),
      subtitle: t('Задача попадёт в очередь ответственного объекта.', "The task goes to the responsible facility's queue."),
      size: 'md',
      body: <NewTaskForm onTitle={(v) => (title = v)} onFacility={(v) => (facility = v)} />,
      footer: {
        buttons: [
          { label: t('Отмена', 'Cancel'), variant: 'ghost' },
          {
            label: t('Создать', 'Create'),
          variant: 'primary',
            onClick: async ({ setBusy, close }) => {
              if (!title.trim() || !facility) {
                toast.warning(t('Заполните название и объект', 'Enter a title and choose a facility'))
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 700))
              close()
              toast.success(t('Задача создана', 'Task created'), { description: title })
            },
          },
        ],
      },
    })
  }

  return (
    <>
      <PageHeader
        title={t('Обзор', 'Overview')}
        subtitle={t('Сводка по объектам, выпуску и инцидентам.', 'Summary of facilities, output and incidents.')}
        meta={
          <Badge tone="success" dot>
            {t('Все системы на связи: 7 из 8', 'Systems online: 7 of 8')}
          </Badge>
        }
        actions={
          <>
            <SegmentedControl
              aria-label={t('Период', 'Period')}
              size="sm"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'day', label: t('Сутки', 'Day') },
                { value: 'week', label: t('Неделя', 'Week') },
                { value: 'month', label: t('Месяц', 'Month') },
              ]}
            />
            <Button
              icon={<Download size={15} />}
              onClick={() => toast.info(t('Отчёт формируется', 'Generating report'), { description: t('Файл появится во входящих.', 'The file will appear in your inbox.') })}
            >
              {t('Отчёт', 'Report')}
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={newTask}>
              {t('Новая задача', 'New task')}
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '230px' }}>
          <StatTile
            label={t('Выпуск за сутки', 'Daily output')}
            value={`${formatNum(totals.output)} ${t('ед.', 'units')}`}
            icon={<Factory size={16} />}
            delta={6.4}
            deltaLabel={t('к плану', 'vs plan')}
            trend={<Sparkline values={DAYS.map((d) => d.fact)} width="auto" aria-label={t('Выпуск за 14 дней', 'Output over 14 days')} />}
          />
          <StatTile
            label={t('Энергопотребление', 'Energy use')}
            value={`${formatNum(totals.energy)} ${t('МВт·ч', 'MWh')}`}
            icon={<Zap size={16} />}
            tone="warning"
            delta={3.1}
            positiveIsGood={false}
            deltaLabel={t('ко вчера', 'vs yesterday')}
            trend={
              <Sparkline
                values={[2310, 2290, 2350, 2380, 2330, 2400, 2409]}
                width="auto"
                color="var(--ev-warning)"
                aria-label={t('Энергия за неделю', 'Energy over the week')}
              />
            }
          />
          <StatTile
            label={t('Персонал на смене', 'Staff on shift')}
            value={formatNum(totals.staff)}
            icon={<Users size={16} />}
            tone="info"
            hint={t('Три смены, 8 объектов', 'Three shifts, 8 facilities')}
          />
          <StatTile
            label={t('Открытые инциденты', 'Open incidents')}
            value={INCIDENTS.length}
            icon={<AlertTriangle size={16} />}
            tone="danger"
            delta={-2}
            formatDelta={(d) => `${d > 0 ? '+' : ''}${d}`}
            deltaLabel={t('за сутки', 'in 24 h')}
          />
        </div>

        <Callout
          tone="danger"
          title={t('Ретранслятор Южный не отвечает', 'South Relay is not responding')}
          actions={
            <LinkButton href="/facilities" size="sm" iconRight={<ArrowRight size={14} />}>
              {t('К объекту', 'Go to facility')}
            </LinkButton>
          }
        >
          {t(
            'Связь потеряна в 08:12. Данные объекта не обновляются, дежурная бригада выехала.',
            'Connection lost at 08:12. Facility data is not updating; the on-call crew is on its way.',
          )}
        </Callout>

        <div className="pg-split">
          <Card
            title={t('Выпуск: план и факт', 'Output: plan vs actual')}
            description={t('Сумма по всем объектам за 14 дней, ед.', 'Total across all facilities over 14 days, units')}
          >
            <LineChart
              aria-label={t('Выпуск: план и факт', 'Output: plan vs actual')}
              data={DAYS}
              x={(d) => d.label}
              height={260}
              series={[
                { key: 'fact', label: t('Факт', 'Actual'), value: (d) => d.fact },
                { key: 'plan', label: t('План', 'Plan'), value: (d) => d.plan },
              ]}
              format={(v) => `${formatNum(v)} ${t('ед.', 'units')}`}
            />
          </Card>
          <Card
            title={t('Загрузка мощностей', 'Capacity utilization')}
            actions={
              <LinkButton href="/facilities" size="sm" variant="ghost">
                {t('Все объекты', 'All facilities')}
              </LinkButton>
            }
          >
            <div className={s.loads}>
              {FACILITIES.slice(0, 6).map((f) => (
                <Progress key={f.id} label={tx(f.name)} value={f.load} tone={loadTone(f.load)} showValue size="sm" />
              ))}
            </div>
          </Card>
        </div>

        <div className="pg-split">
          <Card
            title={t('Инциденты', 'Incidents')}
            flush
            actions={
              <Menu
                label={t('Действия с инцидентами', 'Incident actions')}
                trigger={
                  <Button size="sm" variant="ghost" iconRight={<MoreHorizontal size={15} />}>
                    {t('Действия', 'Actions')}
                  </Button>
                }
                items={[
                  {
                    id: 'all',
                    label: t('Все инциденты', 'All incidents'),
                    icon: <FileText size={15} />,
                    onSelect: () => toast.info(t('Раздел в разработке', 'Section in development')),
                  },
                  {
                    id: 'export',
                    label: t('Выгрузить CSV', 'Export CSV'),
                    icon: <Download size={15} />,
                    onSelect: () => toast.success(t('Файл выгружен', 'File exported')),
                  },
                ]}
              />
            }
          >
            <DataTable
              aria-label={t('Открытые инциденты', 'Open incidents')}
              columns={incidentColumns}
              rows={INCIDENTS}
              rowKey={(i) => i.id}
              onRowClick={(i) => toast.info(i.id, { description: tx(i.title) })}
            />
          </Card>
          <Card title={t('Последние события', 'Recent activity')}>
            <ul role="list" className={s.feed}>
              {EVENTS.map((e) => (
                <li key={e.id} className={s.feedItem}>
                  <Avatar name={tx(e.who)} size={30} />
                  <div className={s.feedBody}>
                    <div>
                      <span className={s.feedWho}>{tx(e.who)}</span> <span className="ev-secondary">{tx(e.what)}</span>
                    </div>
                    <div className={s.feedTarget}>{tx(e.target)}</div>
                    <div className={s.feedTime}>{tx(e.time)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <FacilityStrip facilities={FACILITIES} />
      </div>
    </>
  )
}

function FacilityStrip({ facilities }: { facilities: Facility[] }) {
  const { t, tx } = useT()
  return (
    <div className={s.strip}>
      {facilities.map((f) => (
        <div key={f.id} className={s.stripItem}>
          <div className={s.stripHead}>
            <span className="ev-mono ev-muted">{f.code}</span>
            <StatusPill tone={FACILITY_STATUS[f.status].tone}>{tx(FACILITY_STATUS[f.status].label)}</StatusPill>
          </div>
          <div className={s.stripName}>{tx(f.name)}</div>
          <Sparkline values={f.history} width="auto" height={28} aria-label={`${t('Выпуск', 'Output')}: ${tx(f.name)}`} />
        </div>
      ))}
    </div>
  )
}

function NewTaskForm({ onTitle, onFacility }: { onTitle: (v: string) => void; onFacility: (v: string | null) => void }) {
  const [title, setTitle] = useState('')
  const [facility, setFacility] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const { t, tx } = useT()
  return (
    <div className="ev-stack">
      <Field label={t('Название', 'Title')} required>
        <Textarea
          value={title}
          rows={1}
          autoResize
          onChange={(e) => {
            setTitle(e.target.value)
            onTitle(e.target.value)
          }}
          placeholder={t('Например: заменить фильтры линии №2', 'For example: replace filters on line 2')}
        />
      </Field>
      <Field label={t('Объект', 'Facility')} required>
        <Select
          value={facility}
          onChange={(v) => {
            setFacility(v)
            onFacility(v)
          }}
          placeholder={t('Выберите объект', 'Choose a facility')}
          options={FACILITIES.map((f) => ({ value: f.id, label: tx(f.name), hint: f.code, group: tx(f.region) }))}
        />
      </Field>
      <Field label={t('Комментарий', 'Comment')} hint={t('Необязательно.', 'Optional.')}>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoResize
          placeholder={t('Детали для исполнителя', 'Details for the assignee')}
        />
      </Field>
    </div>
  )
}
