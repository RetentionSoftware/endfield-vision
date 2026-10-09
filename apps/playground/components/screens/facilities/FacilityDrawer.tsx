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
  Timeline,
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
import { formatDate } from '@/lib/format'
import { bi, useT } from '@/lib/i18n'
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
  const { t, tx } = useT()
  const f = facility
  return (
    <Drawer
      open={Boolean(f && profile)}
      onClose={onClose}
      width={600}
      title={f ? tx(f.name) : undefined}
      subtitle={f ? `${f.code} · ${tx(f.region)}` : undefined}
      footer={
        f ? (
          <>
            <Button icon={<FileDown size={15} />} onClick={() => onExport(f)}>
              {t('Паспорт', 'Passport')}
            </Button>
            {f.status === 'maintenance' ? (
              <Button variant="primary" icon={<Play size={15} />} onClick={() => onResume(f)}>
                {t('Вернуть в работу', 'Bring back online')}
              </Button>
            ) : (
              <Button variant="primary" icon={<Wrench size={15} />} disabled={f.status === 'offline'} onClick={() => onMaintenance(f)}>
                {t('В обслуживание', 'Put into maintenance')}
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
  const { t, tx, plural, formatNum } = useT()
  const [tab, setTab] = useState<DrawerTab>('summary')
  const [journal, setJournal] = useState<JournalEntry[]>(() => facilityJournal(f))
  const staff = facilityStaff(f)
  const st = FACILITY_STATUS[f.status]
  const plan = Math.round(profile.capacity * 0.85)
  const chart = f.history.map((v, i) => ({ label: HISTORY_LABELS[i] ?? String(i + 1), fact: v, plan }))
  const onShift = staff.filter((m) => m.shift === 'day' || m.shift === 'night').length
  const units = t('ед.', 'units')

  return (
    <div className={s.drawer}>
      <div className={s.drawerHead}>
        <StatusPill tone={st.tone}>{tx(st.label)}</StatusPill>
        <Badge tone="neutral">
          {profile.shifts} {plural(profile.shifts, ['смена', 'смены', 'смен'], ['shift', 'shifts'])}
        </Badge>
        {f.output < plan && f.status === 'online' ? <Badge tone="warning">{t('Ниже плана', 'Below plan')}</Badge> : null}
      </div>

      <Tabs
        variant="pill"
        idBase="facility-drawer"
        aria-label={t('Разделы карточки объекта', 'Facility card sections')}
        value={tab}
        onChange={setTab}
        items={[
          { value: 'summary', label: t('Сводка', 'Summary') },
          { value: 'staff', label: t('Персонал', 'Staff'), count: staff.length },
          { value: 'journal', label: t('Журнал', 'Log'), count: journal.length },
        ]}
      />

      {tab === 'summary' ? (
        <TabPanel idBase="facility-drawer" value="summary" className={s.drawerPanel}>
          <div className={s.drawerStats}>
            <div className={s.nested}>
              <span className={s.metricLabel}>{t('Выпуск за сутки', 'Daily output')}</span>
              <span className={s.nestedValue}>
                {formatNum(f.output)} {units}
              </span>
              <span className="ev-muted">
                {t('план', 'plan')} {formatNum(plan)}
              </span>
            </div>
            <div className={s.nested}>
              <span className={s.metricLabel}>{t('Энергия', 'Energy')}</span>
              <span className={s.nestedValue}>
                {formatNum(f.energy)} {t('МВт·ч', 'MWh')}
              </span>
              <span className="ev-muted">
                {t('лимит', 'limit')} {formatNum(profile.energyLimit)}
              </span>
            </div>
          </div>
          <Progress label={t('Загрузка мощностей', 'Capacity utilization')} value={f.load} tone={loadTone(f.load)} showValue />
          <section className={s.drawerSection}>
            <h3 className={s.drawerSectionTitle}>{t('Выпуск за 14 дней, ед.', 'Output over 14 days, units')}</h3>
            <LineChart
              aria-label={t(`Выпуск объекта ${f.name.ru}: план и факт`, `${f.name.en} output: plan vs actual`)}
              data={chart}
              x={(d) => d.label}
              height={200}
              series={[
                { key: 'fact', label: t('Факт', 'Actual'), value: (d) => d.fact },
                { key: 'plan', label: t('План', 'Plan'), value: (d) => d.plan },
              ]}
              format={(v) => `${formatNum(v)} ${units}`}
            />
          </section>
          <section className={s.drawerSection}>
            <h3 className={s.drawerSectionTitle}>{t('Паспорт', 'Passport')}</h3>
            <KeyValueList
              labelWidth={170}
              items={[
                { key: 'code', label: t('Код', 'Code'), value: f.code, mono: true },
                { key: 'address', label: t('Адрес', 'Address'), value: tx(profile.address) },
                { key: 'manager', label: t('Руководитель', 'Manager'), value: tx(f.manager) },
                { key: 'opened', label: t('Введён в работу', 'Commissioned'), value: formatDate(f.openedAt) },
                {
                  key: 'capacity',
                  label: t('Проектная мощность', 'Design capacity'),
                  value: profile.capacity ? `${formatNum(profile.capacity)} ${t('ед./сут', 'units/day')}` : EMPTY_VALUE,
                },
                { key: 'last', label: t('Последняя проверка', 'Last inspection'), value: formatDate(profile.lastInspection || null) },
                {
                  key: 'next',
                  label: t('Следующая проверка', 'Next inspection'),
                  value: formatDate(profile.nextInspection || null),
                  hint: profile.nextInspection && profile.nextInspection < '2026-11-01' ? t('Меньше месяца до срока', 'Due in less than a month') : undefined,
                },
              ]}
            />
          </section>
        </TabPanel>
      ) : null}

      {tab === 'staff' ? (
        <TabPanel idBase="facility-drawer" value="staff" className={s.drawerPanel}>
          <p className="ev-muted">
            {t(
              `Всего по штату: ${formatNum(f.staff)}. На смене сейчас из ключевых сотрудников: ${onShift} из ${staff.length}.`,
              `Total headcount: ${formatNum(f.staff)}. Key staff on shift now: ${onShift} of ${staff.length}.`,
            )}
          </p>
          <ul role="list" className={s.staffList}>
            {staff.map((m) => (
              <li key={m.id} className={s.staffItem}>
                <Avatar name={tx(m.name)} size={34} />
                <div className={s.staffBody}>
                  <span className={s.staffName}>{tx(m.name)}</span>
                  <span className="ev-muted">{tx(m.role)}</span>
                </div>
                <StatusPill tone={SHIFT_STATE[m.shift].tone}>{tx(SHIFT_STATE[m.shift].label)}</StatusPill>
                <IconButton
                  label={t('Позвонить', 'Call')}
                  size="sm"
                  icon={<Phone size={15} />}
                  disabled={m.shift === 'off' || m.shift === 'sick'}
                  onClick={() => toast.info(`${t('Вызов', 'Calling')}: ${tx(m.name)}`, { description: m.phone })}
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
              setJournal((list) => [{ id: `u${list.length + 1}`, at: bi('сейчас', 'now'), who: bi('Вы', 'You'), text, kind: 'info' }, ...list])
              toast.success(t('Запись добавлена в журнал', 'Entry added to the log'))
            }}
          />
          <Timeline
            aria-label={t('Журнал объекта', 'Facility log')}
            items={journal.map((j) => ({ id: j.id, tone: j.kind, title: tx(j.who), time: tx(j.at), description: tx(j.text) }))}
          />
        </TabPanel>
      ) : null}
    </div>
  )
}

function JournalForm({ onAdd }: { onAdd: (text: string) => void }) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className={s.journalForm}
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim().length < 5) {
          setError(t('Опишите событие: не меньше 5 символов.', 'Describe the event: at least 5 characters.'))
          return
        }
        onAdd(text.trim())
        setText('')
        setError(null)
      }}
    >
      <Field label={t('Новая запись', 'New entry')} error={error}>
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
          placeholder={t('Например: заменён датчик давления на линии №2', 'For example: replaced the pressure sensor on line 2')}
        />
      </Field>
      <div className={s.journalFormActions}>
        <Button type="submit" size="sm" icon={<Send size={14} />}>
          {t('Добавить', 'Add')}
        </Button>
      </div>
    </form>
  )
}
