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
  formatIsoRu,
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
import { useState } from 'react'
import { Subhead } from './parts'
import s from './vision.module.css'

const FACILITY_OPTIONS: SelectOption[] = [
  { value: 'val-01', label: 'Долина-1', hint: 'VAL-01', group: 'Северный сектор', icon: <Factory size={15} /> },
  { value: 'val-02', label: 'Долина-2', hint: 'VAL-02', group: 'Северный сектор', icon: <Factory size={15} /> },
  { value: 'rdg-01', label: 'Хребет', hint: 'RDG-01', group: 'Горный сектор', icon: <Factory size={15} /> },
  { value: 'out-01', label: 'Застава', hint: 'OUT-01', group: 'Горный сектор', icon: <Warehouse size={15} /> },
  { value: 'lab-01', label: 'Лаборатория Сигма', hint: 'LAB-01', group: 'Исследования', icon: <FlaskConical size={15} /> },
  { value: 'hub-01', label: 'Логистический узел', hint: 'HUB-01', group: 'Логистика', icon: <Truck size={15} /> },
  { value: 'old-01', label: 'Старый склад', hint: 'законсервирован', group: 'Логистика', disabled: true },
]

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'operator', label: 'Оператор линии' },
  { value: 'engineer', label: 'Инженер' },
  { value: 'storekeeper', label: 'Кладовщик' },
  { value: 'dispatcher', label: 'Диспетчер' },
  { value: 'lead', label: 'Руководитель смены' },
]

type Priority = 'low' | 'normal' | 'high'
type Shift = 'day' | 'night' | 'rotation'

function SelectsCard() {
  const [facility, setFacility] = useState<string | null>('val-01')
  const [facilities, setFacilities] = useState<string[]>(['val-01', 'rdg-01'])
  const [role, setRole] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  return (
    <Card title="Select и MultiSelect" description="Выбор из списка: поиск, группы, подсказки, недоступные пункты, очистка. Нативный <select> в консоли не используется.">
      <FormSection>
        <Field label="Объект" hint="Поиск по названию и коду, группы по секторам.">
          <Select value={facility} onChange={setFacility} options={FACILITY_OPTIONS} searchable clearable placeholder="Выберите объект" />
        </Field>
        <Field label="Объекты (несколько)" hint="Выбрать все / снять все - в шапке списка.">
          <MultiSelect value={facilities} onChange={setFacilities} options={FACILITY_OPTIONS} searchable bulkActions maxLabels={2} />
        </Field>
        <Field label="Роль" hint="Короткий список без поиска.">
          <Select value={role} onChange={setRole} options={ROLE_OPTIONS} placeholder="Не выбрана" clearable />
        </Field>
        <Field label="Допуски" error={roles.length === 0 ? 'Выберите хотя бы одну роль' : undefined}>
          <MultiSelect value={roles} onChange={setRoles} options={ROLE_OPTIONS} placeholder="Роли сотрудника" />
        </Field>
        <Field label="Компактный список">
          <Select size="sm" value={role} onChange={setRole} options={ROLE_OPTIONS} placeholder="size=sm" />
        </Field>
        <Field label="Недоступный список" disabled>
          <Select value="val-01" onChange={() => undefined} options={FACILITY_OPTIONS} disabled />
        </Field>
      </FormSection>
    </Card>
  )
}

function DatesCard() {
  const [date, setDate] = useState('2026-10-08')
  const [due, setDue] = useState('')
  const [range, setRange] = useState<DateRange | null>({ from: '2026-09-01', to: '2026-09-30' })
  const [day, setDay] = useState('2026-10-08')
  const [span, setSpan] = useState<Partial<DateRange>>({ from: '2026-10-05', to: '2026-10-11' })
  const pickSpan = (iso: string) => {
    setSpan((r) => (!r.from || r.to || iso < r.from ? { from: iso } : { from: r.from, to: iso }))
  }
  return (
    <Card title="Даты и календарь" description="DateField - ввод с клавиатуры и календарь; DateRangePicker - период с пресетами; Calendar - сетка сама по себе. Неделя с понедельника, значения - ISO (YYYY-MM-DD).">
      <FormSection>
        <Field label="Дата инвентаризации" hint={`Значение: ${date || 'пусто'}`}>
          <DateField value={date} onChange={setDate} min="2026-01-01" max="2026-12-31" />
        </Field>
        <Field label="Срок задачи" hint="Только ввод, без кнопки календаря.">
          <DateField value={due} onChange={setDue} calendar={false} />
        </Field>
        <Field label="Период отчёта" hint={`Пресетов по умолчанию: ${DEFAULT_RANGE_PRESETS.length}. Пустое значение - за всё время.`}>
          <DateRangePicker value={range} onChange={setRange} presets={DEFAULT_RANGE_PRESETS} clearable />
        </Field>
      </FormSection>
      <Divider />
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>
            <span className="ev-row">
              <CalendarDays size={13} /> Один день
            </span>
          </Subhead>
          <Calendar value={day} onPick={setDay} min="2026-09-15" />
          <span className="ev-muted">Выбрано: {formatIsoRu(day)}. Дни до 15.09.2026 недоступны (min).</span>
        </div>
        <div className="ev-stack">
          <Subhead>
            <span className="ev-row">
              <CalendarRange size={13} /> Период
            </span>
          </Subhead>
          <Calendar range={span} onPick={pickSpan} />
          <span className="ev-muted">
            {span.from && span.to ? `${formatIsoRu(span.from)} - ${formatIsoRu(span.to)}` : 'Выберите конец периода'}
          </span>
        </div>
      </div>
    </Card>
  )
}

function ChoiceCard() {
  const [notify, setNotify] = useState(true)
  const [compact, setCompact] = useState(false)
  const [agree, setAgree] = useState(true)
  const [checks, setChecks] = useState<string[]>(['ppe'])
  const [priority, setPriority] = useState<Priority>('normal')
  const [shift, setShift] = useState<Shift>('day')
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list')
  const [status, setStatus] = useState<'all' | 'open' | 'done'>('open')

  const CHECKLIST = [
    { id: 'ppe', label: 'Средства защиты выданы' },
    { id: 'lock', label: 'Оборудование обесточено' },
    { id: 'brief', label: 'Инструктаж проведён' },
  ]
  const all = checks.length === CHECKLIST.length
  return (
    <Card title="Выбор и переключатели" description="Checkbox - согласие и пункты списка; Switch - мгновенное включение настройки; RadioGroup - один вариант из нескольких с пояснениями; SegmentedControl - режим отображения.">
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>Checkbox</Subhead>
          <Checkbox
            checked={all}
            indeterminate={checks.length > 0 && !all}
            onChange={(v) => setChecks(v ? CHECKLIST.map((c) => c.id) : [])}
            label="Допуск к работам"
            description={`Выполнено ${checks.length} из ${CHECKLIST.length}`}
          />
          <div className="ev-stack" style={{ paddingLeft: 'var(--ev-space-7)' }}>
            {CHECKLIST.map((c) => (
              <Checkbox
                key={c.id}
                checked={checks.includes(c.id)}
                onChange={(v) => setChecks((list) => (v ? [...list, c.id] : list.filter((x) => x !== c.id)))}
                label={c.label}
              />
            ))}
          </div>
          <Checkbox checked={agree} onChange={setAgree} label="С регламентом ознакомлен" invalid={!agree} />
          <Checkbox checked={false} onChange={() => undefined} label="Недоступно" disabled />
        </div>
        <div className="ev-stack">
          <Subhead>Switch</Subhead>
          <Switch checked={notify} onChange={setNotify} label="Уведомлять ответственного" description="Сообщение при смене статуса задачи." />
          <Switch checked={compact} onChange={setCompact} size="sm" label="Компактный тумблер" />
          <Switch checked onChange={() => undefined} label="Недоступно" disabled />
          <Subhead>RadioGroup</Subhead>
          <RadioGroup<Priority>
            aria-label="Приоритет"
            direction="horizontal"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'low', label: 'Низкий' },
              { value: 'normal', label: 'Обычный' },
              { value: 'high', label: 'Срочный' },
            ]}
          />
        </div>
        <div className="ev-stack">
          <Subhead>RadioGroup variant=&quot;card&quot;</Subhead>
          <RadioGroup<Shift>
            aria-label="График смены"
            variant="card"
            value={shift}
            onChange={setShift}
            options={[
              { value: 'day', label: 'Дневная', description: '08:00 - 20:00, 12 человек' },
              { value: 'night', label: 'Ночная', description: '20:00 - 08:00, 7 человек' },
              { value: 'rotation', label: 'Вахта', description: '15 дней, недоступно для объекта', disabled: true },
            ]}
          />
        </div>
      </div>
      <Divider />
      <Subhead>SegmentedControl</Subhead>
      <div className={s.row}>
        <SegmentedControl
          aria-label="Вид"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'Список' },
            { value: 'board', label: 'Доска' },
            { value: 'calendar', label: 'Календарь' },
          ]}
        />
        <SegmentedControl
          size="sm"
          aria-label="Статус"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Все', count: 48 },
            { value: 'open', label: 'Открытые', count: 31 },
            { value: 'done', label: 'Выполнены', count: 17 },
          ]}
        />
      </div>
    </Card>
  )
}

function FileCard() {
  const [files, setFiles] = useState<File[]>([])
  return (
    <Card title="FileDrop" description="Загрузка файла перетаскиванием или выбором. Проверка типа и размера - до отправки, ошибка - под зоной.">
      <FileDrop
        accept="application/pdf,.pdf,image/png,image/jpeg"
        multiple
        maxSize={20 * 1024 * 1024}
        hint="Акты приёмки: PDF, PNG или JPG до 20 МБ, можно несколько"
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
