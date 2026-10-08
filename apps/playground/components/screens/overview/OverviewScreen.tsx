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
import { formatNum } from '@/lib/format'
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
  title: string
  facility: string
  severity: 'critical' | 'major' | 'minor'
  openedAt: string
}

const INCIDENTS: Incident[] = [
  { id: 'INC-2291', title: 'Потеря связи с ретранслятором', facility: 'Ретранслятор Южный', severity: 'critical', openedAt: '08:12' },
  { id: 'INC-2288', title: 'Перегрев линии сборки №3', facility: 'Хребет', severity: 'major', openedAt: '06:47' },
  { id: 'INC-2284', title: 'Задержка поставки реагентов', facility: 'Лаборатория Сигма', severity: 'minor', openedAt: 'вчера' },
  { id: 'INC-2280', title: 'Плановая замена фильтров', facility: 'Застава', severity: 'minor', openedAt: 'вчера' },
]

const SEVERITY = {
  critical: { label: 'Критический', tone: 'danger' },
  major: { label: 'Серьёзный', tone: 'warning' },
  minor: { label: 'Низкий', tone: 'neutral' },
} as const

const EVENTS = [
  { id: 'e1', who: 'Глеб Сорокин', what: 'закрыл задачу', target: 'Калибровка датчиков VAL-01', time: '5 мин назад' },
  { id: 'e2', who: 'Мария Котова', what: 'приняла партию', target: '240 контейнеров в Порт Ясный', time: '22 мин назад' },
  { id: 'e3', who: 'Тимур Ахмедов', what: 'открыл инцидент', target: 'INC-2288 Перегрев линии сборки', time: '1 ч назад' },
  { id: 'e4', who: 'Алина Воронцова', what: 'пригласила в команду', target: 'Дарья Миронова', time: '2 ч назад' },
  { id: 'e5', who: 'Павел Гусев', what: 'перевёл объект в обслуживание', target: 'Застава', time: '3 ч назад' },
]

function loadTone(load: number) {
  return load >= 90 ? 'warning' : load === 0 ? 'danger' : load < 30 ? 'info' : 'accent'
}

export function OverviewScreen() {
  const [period, setPeriod] = useState<Period>('day')
  const modals = useModals()

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
      header: 'Инцидент',
      primary: true,
      cell: (i) => (
        <span className={s.incident}>
          <span>{i.title}</span>
          <span className="ev-muted ev-mono">{i.id}</span>
        </span>
      ),
    },
    { key: 'facility', header: 'Объект', hideOnMobile: true, cell: (i) => i.facility },
    { key: 'severity', header: 'Уровень', cell: (i) => <StatusPill tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</StatusPill> },
    { key: 'openedAt', header: 'Открыт', align: 'right', cell: (i) => <span className="ev-muted">{i.openedAt}</span> },
  ]

  const newTask = () => {
    let title = ''
    let facility: string | null = null
    modals.open({
      title: 'Новая задача',
      subtitle: 'Задача попадёт в очередь ответственного объекта.',
      size: 'md',
      body: <NewTaskForm onTitle={(v) => (title = v)} onFacility={(v) => (facility = v)} />,
      footer: {
        buttons: [
          { label: 'Отмена', variant: 'ghost' },
          {
          label: 'Создать',
          variant: 'primary',
            onClick: async ({ setBusy, close }) => {
              if (!title.trim() || !facility) {
                toast.warning('Заполните название и объект')
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 700))
              close()
              toast.success('Задача создана', { description: title })
            },
          },
        ],
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Обзор"
        subtitle="Сводка по объектам, выпуску и инцидентам."
        meta={<Badge tone="success" dot>Все системы на связи: 7 из 8</Badge>}
        actions={
          <>
            <SegmentedControl
              aria-label="Период"
              size="sm"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'day', label: 'Сутки' },
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
              ]}
            />
            <Button icon={<Download size={15} />} onClick={() => toast.info('Отчёт формируется', { description: 'Файл появится во входящих.' })}>
              Отчёт
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={newTask}>
              Новая задача
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '230px' }}>
          <StatTile
            label="Выпуск за сутки"
            value={`${formatNum(totals.output)} ед.`}
            icon={<Factory size={16} />}
            delta={6.4}
            deltaLabel="к плану"
            trend={<Sparkline values={DAYS.map((d) => d.fact)} width="auto" aria-label="Выпуск за 14 дней" />}
          />
          <StatTile
            label="Энергопотребление"
            value={`${formatNum(totals.energy)} МВт·ч`}
            icon={<Zap size={16} />}
            tone="warning"
            delta={3.1}
            positiveIsGood={false}
            deltaLabel="ко вчера"
            trend={<Sparkline values={[2310, 2290, 2350, 2380, 2330, 2400, 2409]} width="auto" color="var(--ev-warning)" aria-label="Энергия за неделю" />}
          />
          <StatTile label="Персонал на смене" value={formatNum(totals.staff)} icon={<Users size={16} />} tone="info" hint="Три смены, 8 объектов" />
          <StatTile
            label="Открытые инциденты"
            value={INCIDENTS.length}
            icon={<AlertTriangle size={16} />}
            tone="danger"
            delta={-2}
            formatDelta={(d) => `${d > 0 ? '+' : ''}${d}`}
            deltaLabel="за сутки"
          />
        </div>

        <Callout
          tone="danger"
          title="Ретранслятор Южный не отвечает"
          actions={
            <LinkButton href="/facilities" size="sm" iconRight={<ArrowRight size={14} />}>
              К объекту
            </LinkButton>
          }
        >
          Связь потеряна в 08:12. Данные объекта не обновляются, дежурная бригада выехала.
        </Callout>

        <div className="pg-split">
          <Card title="Выпуск: план и факт" description="Сумма по всем объектам за 14 дней, ед.">
            <LineChart
              aria-label="Выпуск: план и факт"
              data={DAYS}
              x={(d) => d.label}
              height={260}
              series={[
                { key: 'fact', label: 'Факт', value: (d) => d.fact },
                { key: 'plan', label: 'План', value: (d) => d.plan },
              ]}
              format={(v) => `${formatNum(v)} ед.`}
            />
          </Card>
          <Card title="Загрузка мощностей" actions={<LinkButton href="/facilities" size="sm" variant="ghost">Все объекты</LinkButton>}>
            <div className={s.loads}>
              {FACILITIES.slice(0, 6).map((f) => (
                <Progress key={f.id} label={f.name} value={f.load} tone={loadTone(f.load)} showValue size="sm" />
              ))}
            </div>
          </Card>
        </div>

        <div className="pg-split">
          <Card
            title="Инциденты"
            flush
            actions={
              <Menu
                label="Действия с инцидентами"
                trigger={<Button size="sm" variant="ghost" iconRight={<MoreHorizontal size={15} />}>Действия</Button>}
                items={[
                  { id: 'all', label: 'Все инциденты', icon: <FileText size={15} />, onSelect: () => toast.info('Раздел в разработке') },
                  { id: 'export', label: 'Выгрузить CSV', icon: <Download size={15} />, onSelect: () => toast.success('Файл выгружен') },
                ]}
              />
            }
          >
            <DataTable
              aria-label="Открытые инциденты"
              columns={incidentColumns}
              rows={INCIDENTS}
              rowKey={(i) => i.id}
              onRowClick={(i) => toast.info(i.id, { description: i.title })}
            />
          </Card>
          <Card title="Последние события">
            <ul role="list" className={s.feed}>
              {EVENTS.map((e) => (
                <li key={e.id} className={s.feedItem}>
                  <Avatar name={e.who} size={30} />
                  <div className={s.feedBody}>
                    <div>
                      <span className={s.feedWho}>{e.who}</span> <span className="ev-secondary">{e.what}</span>
                    </div>
                    <div className={s.feedTarget}>{e.target}</div>
                    <div className={s.feedTime}>{e.time}</div>
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
  return (
    <div className={s.strip}>
      {facilities.map((f) => (
        <div key={f.id} className={s.stripItem}>
          <div className={s.stripHead}>
            <span className="ev-mono ev-muted">{f.code}</span>
            <StatusPill tone={FACILITY_STATUS[f.status].tone}>{FACILITY_STATUS[f.status].label}</StatusPill>
          </div>
          <div className={s.stripName}>{f.name}</div>
          <Sparkline values={f.history} width="auto" height={28} aria-label={`Выпуск: ${f.name}`} />
        </div>
      ))}
    </div>
  )
}

function NewTaskForm({ onTitle, onFacility }: { onTitle: (v: string) => void; onFacility: (v: string | null) => void }) {
  const [title, setTitle] = useState('')
  const [facility, setFacility] = useState<string | null>(null)
  const [note, setNote] = useState('')
  return (
    <div className="ev-stack">
      <Field label="Название" required>
        <Textarea
          value={title}
          rows={1}
          autoResize
          onChange={(e) => {
            setTitle(e.target.value)
            onTitle(e.target.value)
          }}
          placeholder="Например: заменить фильтры линии №2"
        />
      </Field>
      <Field label="Объект" required>
        <Select
          value={facility}
          onChange={(v) => {
            setFacility(v)
            onFacility(v)
          }}
          placeholder="Выберите объект"
          options={FACILITIES.map((f) => ({ value: f.id, label: f.name, hint: f.code, group: f.region }))}
        />
      </Field>
      <Field label="Комментарий" hint="Необязательно.">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoResize placeholder="Детали для исполнителя" />
      </Field>
    </div>
  )
}
