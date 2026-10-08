'use client'

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EMPTY_VALUE,
  Field,
  IconButton,
  KeyValueList,
  LineChart,
  Progress,
  StatusPill,
  TabPanel,
  Tabs,
  Textarea,
  toast,
} from 'endfield-vision'
import { FileDown, Phone, Play, Send, Wrench } from 'lucide-react'
import { useState } from 'react'
import { FACILITY_STATUS, type Facility } from '@/lib/demo/facilities'
import {
  facilityJournal,
  facilityStaff,
  HISTORY_LABELS,
  loadTone,
  SHIFT_STATE,
  type FacilityProfile,
  type JournalEntry,
} from '@/lib/demo/facility-details'
import { formatDate, formatNum } from '@/lib/format'
import s from './facilities.module.css'

type DrawerTab = 'summary' | 'staff' | 'journal'

interface FacilityDrawerProps {
  facility: Facility | null
  profile: FacilityProfile | null
  onClose: () => void
  onMaintenance: (f: Facility) => void
  onResume: (f: Facility) => void
  onExport: (f: Facility) => void
}

/** Карточка объекта в шторке: сводка, персонал смен, журнал. */
export function FacilityDrawer({ facility, profile, onClose, onMaintenance, onResume, onExport }: FacilityDrawerProps) {
  const f = facility
  return (
    <Drawer
      open={Boolean(f && profile)}
      onClose={onClose}
      width={600}
      title={f?.name}
      subtitle={f ? `${f.code} · ${f.region}` : undefined}
      footer={
        f ? (
          <>
            <Button icon={<FileDown size={15} />} onClick={() => onExport(f)}>
              Паспорт
            </Button>
            {f.status === 'maintenance' ? (
              <Button variant="primary" icon={<Play size={15} />} onClick={() => onResume(f)}>
                Вернуть в работу
              </Button>
            ) : (
              <Button variant="primary" icon={<Wrench size={15} />} disabled={f.status === 'offline'} onClick={() => onMaintenance(f)}>
                В обслуживание
              </Button>
            )}
          </>
        ) : null
      }
    >
      {f && profile ? <DrawerBody key={f.id} facility={f} profile={profile} /> : null}
    </Drawer>
  )
}

function DrawerBody({ facility: f, profile }: { facility: Facility; profile: FacilityProfile }) {
  const [tab, setTab] = useState<DrawerTab>('summary')
  const [journal, setJournal] = useState<JournalEntry[]>(() => facilityJournal(f))
  const staff = facilityStaff(f)
  const st = FACILITY_STATUS[f.status]
  const plan = Math.round(profile.capacity * 0.85)
  const chart = f.history.map((v, i) => ({ label: HISTORY_LABELS[i] ?? String(i + 1), fact: v, plan }))
  const onShift = staff.filter((m) => m.shift === 'day' || m.shift === 'night').length

  return (
    <div className={s.drawer}>
      <div className={s.drawerHead}>
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
        <Badge tone="neutral">{profile.shifts} {profile.shifts === 1 ? 'смена' : 'смены'}</Badge>
        {f.output < plan && f.status === 'online' ? <Badge tone="warning">Ниже плана</Badge> : null}
      </div>

      <Tabs
        variant="pill"
        idBase="facility-drawer"
        aria-label="Разделы карточки объекта"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'summary', label: 'Сводка' },
          { value: 'staff', label: 'Персонал', count: staff.length },
          { value: 'journal', label: 'Журнал', count: journal.length },
        ]}
      />

      {tab === 'summary' ? (
        <TabPanel idBase="facility-drawer" value="summary" className={s.drawerPanel}>
          <div className={s.drawerStats}>
            <div className={s.nested}>
              <span className={s.metricLabel}>Выпуск за сутки</span>
              <span className={s.nestedValue}>{formatNum(f.output)} ед.</span>
              <span className="ev-muted">план {formatNum(plan)}</span>
            </div>
            <div className={s.nested}>
              <span className={s.metricLabel}>Энергия</span>
              <span className={s.nestedValue}>{formatNum(f.energy)} МВт·ч</span>
              <span className="ev-muted">лимит {formatNum(profile.energyLimit)}</span>
            </div>
          </div>
          <Progress label="Загрузка мощностей" value={f.load} tone={loadTone(f.load)} showValue />
          <section className={s.drawerSection}>
            <h3 className={s.drawerSectionTitle}>Выпуск за 14 дней, ед.</h3>
            <LineChart
              aria-label={`Выпуск объекта ${f.name}: план и факт`}
              data={chart}
              x={(d) => d.label}
              height={200}
              series={[
                { key: 'fact', label: 'Факт', value: (d) => d.fact },
                { key: 'plan', label: 'План', value: (d) => d.plan },
              ]}
              format={(v) => `${formatNum(v)} ед.`}
            />
          </section>
          <section className={s.drawerSection}>
            <h3 className={s.drawerSectionTitle}>Паспорт</h3>
            <KeyValueList
              labelWidth={170}
              items={[
                { key: 'code', label: 'Код', value: f.code, mono: true },
                { key: 'address', label: 'Адрес', value: profile.address },
                { key: 'manager', label: 'Руководитель', value: f.manager },
                { key: 'opened', label: 'Введён в работу', value: formatDate(f.openedAt) },
                { key: 'capacity', label: 'Проектная мощность', value: profile.capacity ? `${formatNum(profile.capacity)} ед./сут` : EMPTY_VALUE },
                { key: 'last', label: 'Последняя проверка', value: formatDate(profile.lastInspection || null) },
                {
                  key: 'next',
                  label: 'Следующая проверка',
                  value: formatDate(profile.nextInspection || null),
                  hint: profile.nextInspection && profile.nextInspection < '2026-11-01' ? 'Меньше месяца до срока' : undefined,
                },
              ]}
            />
          </section>
        </TabPanel>
      ) : null}

      {tab === 'staff' ? (
        <TabPanel idBase="facility-drawer" value="staff" className={s.drawerPanel}>
          <p className="ev-muted">
            Всего по штату: {formatNum(f.staff)}. На смене сейчас из ключевых сотрудников: {onShift} из {staff.length}.
          </p>
          <ul role="list" className={s.staffList}>
            {staff.map((m) => (
              <li key={m.id} className={s.staffItem}>
                <Avatar name={m.name} size={34} />
                <div className={s.staffBody}>
                  <span className={s.staffName}>{m.name}</span>
                  <span className="ev-muted">{m.role}</span>
                </div>
                <StatusPill tone={SHIFT_STATE[m.shift].tone}>{SHIFT_STATE[m.shift].label}</StatusPill>
                <IconButton
                  label="Позвонить"
                  size="sm"
                  icon={<Phone size={15} />}
                  disabled={m.shift === 'off' || m.shift === 'sick'}
                  onClick={() => toast.info(`Вызов: ${m.name}`, { description: m.phone })}
                />
              </li>
            ))}
          </ul>
        </TabPanel>
      ) : null}

      {tab === 'journal' ? (
        <TabPanel idBase="facility-drawer" value="journal" className={s.drawerPanel}>
          <JournalForm
            onAdd={(text) => {
              setJournal((list) => [{ id: `u${list.length + 1}`, at: 'сейчас', who: 'Вы', text, kind: 'info' }, ...list])
              toast.success('Запись добавлена в журнал')
            }}
          />
          <ol className={s.journal}>
            {journal.map((j) => (
              <li key={j.id} className={s.journalItem} data-kind={j.kind}>
                <span className={s.journalDot} aria-hidden="true" />
                <div className={s.journalBody}>
                  <div className={s.journalMeta}>
                    <span className="ev-num">{j.at}</span>
                    <span>{j.who}</span>
                  </div>
                  <div>{j.text}</div>
                </div>
              </li>
            ))}
          </ol>
        </TabPanel>
      ) : null}
    </div>
  )
}

function JournalForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className={s.journalForm}
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim().length < 5) {
          setError('Опишите событие: не меньше 5 символов.')
          return
        }
        onAdd(text.trim())
        setText('')
        setError(null)
      }}
    >
      <Field label="Новая запись" error={error}>
        <Textarea
          rows={2}
          autoResize
          maxLength={280}
          showCount
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Например: заменён датчик давления на линии №2"
        />
      </Field>
      <div className={s.journalFormActions}>
        <Button type="submit" size="sm" icon={<Send size={14} />}>
          Добавить
        </Button>
      </div>
    </form>
  )
}
