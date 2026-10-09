'use client'

import {
  Calendar,
  Card,
  Checkbox,
  DateField,
  DateRangePicker,
  DEFAULT_RANGE_PRESETS,
  Divider,
  Field,
  FileDrop,
  formatIsoDate,
  FormSection,
  MultiSelect,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  type DateRange,
  type SelectOption,
} from 'endfield-vision'
import { CalendarDays, CalendarRange, Factory, FlaskConical, Truck, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT, type Translator } from '@/lib/i18n'
import { Subhead } from './parts'
import s from './vision.module.css'

type T = Translator['t']

const facilityOptions = (t: T): SelectOption[] => [
  { value: 'val-01', label: t('Долина-1', 'Valley-1'), hint: 'VAL-01', group: t('Северный сектор', 'North sector'), icon: <Factory size={15} /> },
  { value: 'val-02', label: t('Долина-2', 'Valley-2'), hint: 'VAL-02', group: t('Северный сектор', 'North sector'), icon: <Factory size={15} /> },
  { value: 'rdg-01', label: t('Хребет', 'Ridge'), hint: 'RDG-01', group: t('Горный сектор', 'Mountain sector'), icon: <Factory size={15} /> },
  { value: 'out-01', label: t('Застава', 'Outpost'), hint: 'OUT-01', group: t('Горный сектор', 'Mountain sector'), icon: <Warehouse size={15} /> },
  { value: 'lab-01', label: t('Лаборатория Сигма', 'Sigma Lab'), hint: 'LAB-01', group: t('Исследования', 'Research'), icon: <FlaskConical size={15} /> },
  { value: 'hub-01', label: t('Логистический узел', 'Logistics hub'), hint: 'HUB-01', group: t('Логистика', 'Logistics'), icon: <Truck size={15} /> },
  { value: 'old-01', label: t('Старый склад', 'Old warehouse'), hint: t('законсервирован', 'mothballed'), group: t('Логистика', 'Logistics'), disabled: true },
]

const roleOptions = (t: T): SelectOption[] => [
  { value: 'operator', label: t('Оператор линии', 'Line operator') },
  { value: 'engineer', label: t('Инженер', 'Engineer') },
  { value: 'storekeeper', label: t('Кладовщик', 'Storekeeper') },
  { value: 'dispatcher', label: t('Диспетчер', 'Dispatcher') },
  { value: 'lead', label: t('Руководитель смены', 'Shift lead') },
]

type Priority = 'low' | 'normal' | 'high'
type Shift = 'day' | 'night' | 'rotation'

function SelectsCard() {
  const { t } = useT()
  const facilityOpts = useMemo(() => facilityOptions(t), [t])
  const roleOpts = useMemo(() => roleOptions(t), [t])
  const [facility, setFacility] = useState<string | null>('val-01')
  const [facilities, setFacilities] = useState<string[]>(['val-01', 'rdg-01'])
  const [role, setRole] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  return (
    <Card
      title={t('Select и MultiSelect', 'Select and MultiSelect')}
      description={t(
        'Выбор из списка: поиск, группы, подсказки, недоступные пункты, очистка. Нативный <select> в консоли не используется.',
        'Picking from a list: search, groups, hints, disabled options, clearing. The console never uses a native <select>.',
      )}
    >
      <FormSection>
        <Field label={t('Объект', 'Facility')} hint={t('Поиск по названию и коду, группы по секторам.', 'Search by name and code, grouped by sector.')}>
          <Select
            value={facility}
            onChange={setFacility}
            options={facilityOpts}
            searchable
            clearable
            placeholder={t('Выберите объект', 'Select a facility')}
          />
        </Field>
        <Field
          label={t('Объекты (несколько)', 'Facilities (multiple)')}
          hint={t('Выбрать все / снять все - в шапке списка.', 'Select all / clear all is in the list header.')}
        >
          <MultiSelect value={facilities} onChange={setFacilities} options={facilityOpts} searchable bulkActions maxLabels={2} />
        </Field>
        <Field label={t('Роль', 'Role')} hint={t('Короткий список без поиска.', 'A short list without search.')}>
          <Select value={role} onChange={setRole} options={roleOpts} placeholder={t('Не выбрана', 'Not selected')} clearable />
        </Field>
        <Field
          label={t('Допуски', 'Clearances')}
          error={roles.length === 0 ? t('Выберите хотя бы одну роль', 'Select at least one role') : undefined}
        >
          <MultiSelect value={roles} onChange={setRoles} options={roleOpts} placeholder={t('Роли сотрудника', 'Employee roles')} />
        </Field>
        <Field label={t('Компактный список', 'Compact select')}>
          <Select size="sm" value={role} onChange={setRole} options={roleOpts} placeholder="size=sm" />
        </Field>
        <Field label={t('Недоступный список', 'Disabled select')} disabled>
          <Select value="val-01" onChange={() => undefined} options={facilityOpts} disabled />
        </Field>
      </FormSection>
    </Card>
  )
}

function DatesCard() {
  const { t } = useT()
  const [date, setDate] = useState('2026-10-08')
  const [due, setDue] = useState('')
  const [range, setRange] = useState<DateRange | null>({ from: '2026-09-01', to: '2026-09-30' })
  const [day, setDay] = useState('2026-10-08')
  const [span, setSpan] = useState<Partial<DateRange>>({ from: '2026-10-05', to: '2026-10-11' })
  const pickSpan = (iso: string) => {
    setSpan((r) => (!r.from || r.to || iso < r.from ? { from: iso } : { from: r.from, to: iso }))
  }
  return (
    <Card
      title={t('Даты и календарь', 'Dates and calendar')}
      description={t(
        'DateField - ввод с клавиатуры и календарь; DateRangePicker - период с пресетами; Calendar - сетка сама по себе. Неделя с понедельника, значения - ISO (YYYY-MM-DD).',
        'DateField offers keyboard entry plus a calendar; DateRangePicker picks a period with presets; Calendar is the grid on its own. Weeks start on Monday, values are ISO (YYYY-MM-DD).',
      )}
    >
      <FormSection>
        <Field
          label={t('Дата инвентаризации', 'Stocktaking date')}
          hint={t(`Значение: ${date || 'пусто'}`, `Value: ${date || 'empty'}`)}
        >
          <DateField value={date} onChange={setDate} min="2026-01-01" max="2026-12-31" />
        </Field>
        <Field label={t('Срок задачи', 'Due date')} hint={t('Только ввод, без кнопки календаря.', 'Typing only, no calendar button.')}>
          <DateField value={due} onChange={setDue} calendar={false} />
        </Field>
        <Field
          label={t('Период отчёта', 'Report period')}
          hint={t(
            `Пресетов по умолчанию: ${DEFAULT_RANGE_PRESETS.length}. Пустое значение - за всё время.`,
            `${DEFAULT_RANGE_PRESETS.length} default presets. An empty value means all time.`,
          )}
        >
          <DateRangePicker value={range} onChange={setRange} presets={DEFAULT_RANGE_PRESETS} clearable />
        </Field>
      </FormSection>
      <Divider />
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>
            <span className="ev-row">
              <CalendarDays size={13} /> {t('Один день', 'Single day')}
            </span>
          </Subhead>
          <Calendar value={day} onPick={setDay} min="2026-09-15" />
          <span className="ev-muted">
            {t(
              `Выбрано: ${formatIsoDate(day)}. Дни до 15.09.2026 недоступны (min).`,
              `Selected: ${formatIsoDate(day)}. Days before 15.09.2026 are unavailable (min).`,
            )}
          </span>
        </div>
        <div className="ev-stack">
          <Subhead>
            <span className="ev-row">
              <CalendarRange size={13} /> {t('Период', 'Range')}
            </span>
          </Subhead>
          <Calendar range={span} onPick={pickSpan} />
          <span className="ev-muted">
            {span.from && span.to
              ? `${formatIsoDate(span.from)} - ${formatIsoDate(span.to)}`
              : t('Выберите конец периода', 'Pick the end of the range')}
          </span>
        </div>
      </div>
    </Card>
  )
}

const CHECKLIST_IDS = ['ppe', 'lock', 'brief'] as const

function ChoiceCard() {
  const { t } = useT()
  const [notify, setNotify] = useState(true)
  const [compact, setCompact] = useState(false)
  const [agree, setAgree] = useState(true)
  const [checks, setChecks] = useState<string[]>(['ppe'])
  const [priority, setPriority] = useState<Priority>('normal')
  const [shift, setShift] = useState<Shift>('day')
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list')
  const [status, setStatus] = useState<'all' | 'open' | 'done'>('open')

  const checklistLabels: Record<(typeof CHECKLIST_IDS)[number], string> = {
    ppe: t('Средства защиты выданы', 'PPE issued'),
    lock: t('Оборудование обесточено', 'Equipment de-energized'),
    brief: t('Инструктаж проведён', 'Safety briefing done'),
  }
  const all = checks.length === CHECKLIST_IDS.length
  return (
    <Card
      title={t('Выбор и переключатели', 'Choices and toggles')}
      description={t(
        'Checkbox - согласие и пункты списка; Switch - мгновенное включение настройки; RadioGroup - один вариант из нескольких с пояснениями; SegmentedControl - режим отображения.',
        'Checkbox is for consent and list items; Switch turns a setting on instantly; RadioGroup picks one option of several with descriptions; SegmentedControl switches the view mode.',
      )}
    >
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>Checkbox</Subhead>
          <Checkbox
            checked={all}
            indeterminate={checks.length > 0 && !all}
            onChange={(v) => setChecks(v ? [...CHECKLIST_IDS] : [])}
            label={t('Допуск к работам', 'Work clearance')}
            description={t(`Выполнено ${checks.length} из ${CHECKLIST_IDS.length}`, `${checks.length} of ${CHECKLIST_IDS.length} done`)}
          />
          <div className="ev-stack" style={{ paddingLeft: 'var(--ev-space-7)' }}>
            {CHECKLIST_IDS.map((id) => (
              <Checkbox
                key={id}
                checked={checks.includes(id)}
                onChange={(v) => setChecks((list) => (v ? [...list, id] : list.filter((x) => x !== id)))}
                label={checklistLabels[id]}
              />
            ))}
          </div>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={t('С регламентом ознакомлен', 'I have read the procedure')}
            invalid={!agree}
          />
          <Checkbox checked={false} onChange={() => undefined} label={t('Недоступно', 'Unavailable')} disabled />
        </div>
        <div className="ev-stack">
          <Subhead>Switch</Subhead>
          <Switch
            checked={notify}
            onChange={setNotify}
            label={t('Уведомлять ответственного', 'Notify the assignee')}
            description={t('Сообщение при смене статуса задачи.', 'A message when the task status changes.')}
          />
          <Switch checked={compact} onChange={setCompact} size="sm" label={t('Компактный тумблер', 'Compact switch')} />
          <Switch checked onChange={() => undefined} label={t('Недоступно', 'Unavailable')} disabled />
          <Subhead>RadioGroup</Subhead>
          <RadioGroup<Priority>
            aria-label={t('Приоритет', 'Priority')}
            direction="horizontal"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'low', label: t('Низкий', 'Low') },
              { value: 'normal', label: t('Обычный', 'Normal') },
              { value: 'high', label: t('Срочный', 'Urgent') },
            ]}
          />
        </div>
        <div className="ev-stack">
          <Subhead>RadioGroup variant=&quot;card&quot;</Subhead>
          <RadioGroup<Shift>
            aria-label={t('График смены', 'Shift schedule')}
            variant="card"
            value={shift}
            onChange={setShift}
            options={[
              { value: 'day', label: t('Дневная', 'Day'), description: t('08:00 - 20:00, 12 человек', '08:00 - 20:00, 12 people') },
              { value: 'night', label: t('Ночная', 'Night'), description: t('20:00 - 08:00, 7 человек', '20:00 - 08:00, 7 people') },
              {
                value: 'rotation',
                label: t('Вахта', 'Rotation'),
                description: t('15 дней, недоступно для объекта', '15 days, unavailable for this facility'),
                disabled: true,
              },
            ]}
          />
        </div>
      </div>
      <Divider />
      <Subhead>SegmentedControl</Subhead>
      <div className={s.row}>
        <SegmentedControl
          aria-label={t('Вид', 'View')}
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: t('Список', 'List') },
            { value: 'board', label: t('Доска', 'Board') },
            { value: 'calendar', label: t('Календарь', 'Calendar') },
          ]}
        />
        <SegmentedControl
          size="sm"
          aria-label={t('Статус', 'Status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('Все', 'All'), count: 48 },
            { value: 'open', label: t('Открытые', 'Open'), count: 31 },
            { value: 'done', label: t('Выполнены', 'Done'), count: 17 },
          ]}
        />
      </div>
    </Card>
  )
}

function FileCard() {
  const { t } = useT()
  const [files, setFiles] = useState<File[]>([])
  return (
    <Card
      title="FileDrop"
      description={t(
        'Загрузка файла перетаскиванием или выбором. Проверка типа и размера - до отправки, ошибка - под зоной.',
        'Upload a file by dragging it in or browsing. Type and size are checked before upload, and errors show below the drop zone.',
      )}
    >
      <FileDrop
        accept="application/pdf,.pdf,image/png,image/jpeg"
        multiple
        maxSize={20 * 1024 * 1024}
        hint={t('Акты приёмки: PDF, PNG или JPG до 20 МБ, можно несколько', 'Receiving reports: PDF, PNG or JPG up to 20 MB, multiple files allowed')}
        files={files}
        onFiles={(list) => setFiles((prev) => [...prev, ...list])}
        onRemove={(f) => setFiles((list) => list.filter((x) => x !== f))}
      />
    </Card>
  )
}

export function FormsPickers() {
  return (
    <>
      <SelectsCard />
      <DatesCard />
      <ChoiceCard />
      <FileCard />
    </>
  )
}
