'use client'

import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Divider,
  Field,
  FormSection,
  InlineEdit,
  OtpInput,
  Slider,
  TagInput,
  toast,
  useNumberFormat,
  type SliderRange,
} from 'endfield-vision'
import { CircleAlert, CircleCheck, Factory, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Subhead } from '../parts'
import s from '../vision.module.css'

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

const TEMP_MARKS = [
  { value: -20, label: '-20 °C' },
  { value: 0, label: '0 °C' },
  { value: 20, label: '20 °C' },
  { value: 40, label: '40 °C' },
  { value: 60, label: '60 °C' },
]

function SliderCard() {
  const nf = useNumberFormat()
  const [load, setLoad] = useState(75)
  const [committed, setCommitted] = useState(75)
  const [temp, setTemp] = useState<SliderRange>([4, 25])
  const [budget, setBudget] = useState<SliderRange>([120_000, 340_000])
  const [vibration, setVibration] = useState(2.8)
  return (
    <Card
      title="Slider"
      description="Число в известных границах, где важнее положение, чем точное значение: порог тревоги, диапазон температур, бюджет. Для точного ввода - NumberInput. Перетаскивание, клик по дорожке, стрелки (шаг), PageUp / PageDown (10 шагов), Home / End. onChangeEnd - значение после отпускания: для запросов к API."
    >
      <FormSection>
        <Field label="Порог загрузки линии" hint={`Сохранено: ${committed} %. onChange - при движении, onChangeEnd - при отпускании.`}>
          <Slider value={load} onChange={setLoad} onChangeEnd={setCommitted} step={5} showValue format={(v) => `${v} %`} />
        </Field>
        <Field label="Допустимая температура склада" hint="Диапазон: бегунки не перескакивают друг друга. Значение - над бегунком.">
          <Slider value={temp} onChange={setTemp} min={-20} max={60} marks={TEMP_MARKS} showValue="tooltip" format={(v) => `${v} °C`} />
        </Field>
        <Field label="Бюджет закупки" hint="Шаг 10 000 ₽, риски без подписей.">
          <Slider
            value={budget}
            onChange={setBudget}
            min={0}
            max={500_000}
            step={10_000}
            marks={[{ value: 100_000 }, { value: 200_000 }, { value: 300_000 }, { value: 400_000 }]}
            showValue
            format={(v) => `${nf(v)} ₽`}
          />
        </Field>
        <Field label="Порог вибрации, мм/с" hint="size=sm, шаг 0,1.">
          <Slider value={vibration} onChange={setVibration} min={0} max={10} step={0.1} size="sm" showValue />
        </Field>
        <Field label="Резерв мощности" hint="Недоступен: объект на консервации." disabled>
          <Slider value={30} onChange={() => undefined} showValue format={(v) => `${v} %`} />
        </Field>
      </FormSection>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Chip                                                                */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { id: 'new', label: 'Новые', count: 12 },
  { id: 'work', label: 'В работе', count: 34 },
  { id: 'check', label: 'На проверке', count: 5 },
  { id: 'done', label: 'Закрыты', count: 128 },
]

const INITIAL_APPLIED = ['Объект: Долина-1', 'Приоритет: высокий', 'Исполнитель: Глеб Сорокин', 'Срок: эта неделя']

function ChipCard() {
  const [statuses, setStatuses] = useState<string[]>(['new', 'work'])
  const [applied, setApplied] = useState(INITIAL_APPLIED)
  const toggle = (id: string) => setStatuses((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  return (
    <Card
      title="Chip и ChipGroup"
      description="Компактная метка: быстрый фильтр (кнопка-переключатель с aria-pressed), применённый фильтр с крестиком, тег оборудования. Статус сущности в таблице - Badge или StatusPill; чип - то, что пользователь включает или убирает."
    >
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>Быстрые фильтры</Subhead>
          <ChipGroup aria-label="Статус задач">
            {STATUS_FILTERS.map((f) => (
              <Chip key={f.id} selected={statuses.includes(f.id)} onClick={() => toggle(f.id)}>
                {f.label} <span className="ev-num ev-muted">{f.count}</span>
              </Chip>
            ))}
            <Chip selected={false} onClick={() => undefined} disabled>
              Архив
            </Chip>
          </ChipGroup>
          <span className="ev-muted">Выбрано: {statuses.length === 0 ? 'все статусы' : statuses.length}. Выбранный без своей иконки получает галочку - цвет не единственный признак.</span>
        </div>
        <div className="ev-stack">
          <Subhead>Применённые фильтры</Subhead>
          <ChipGroup aria-label="Применённые фильтры">
            {applied.map((a) => (
              <Chip key={a} onRemove={() => setApplied((cur) => cur.filter((x) => x !== a))}>
                {a}
              </Chip>
            ))}
            {applied.length === 0 ? <span className="ev-muted">Фильтров нет.</span> : null}
          </ChipGroup>
          {applied.length < INITIAL_APPLIED.length ? (
            <Button variant="link" onClick={() => setApplied(INITIAL_APPLIED)}>
              Вернуть все
            </Button>
          ) : null}
        </div>
      </div>
      <Divider />
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>Тоны</Subhead>
          <ChipGroup>
            <Chip icon={<Factory size={13} />}>Долина-1</Chip>
            <Chip tone="accent">Плановое ТО</Chip>
            <Chip tone="success" icon={<CircleCheck size={13} />}>
              Исправен
            </Chip>
            <Chip tone="warning" icon={<Wrench size={13} />}>
              Нужен ремонт
            </Chip>
            <Chip tone="danger" icon={<CircleAlert size={13} />}>
              Авария
            </Chip>
            <Chip tone="info">Телеметрия</Chip>
            <Chip tone="violet">Пилот</Chip>
          </ChipGroup>
        </div>
        <div className="ev-stack">
          <Subhead>Размер sm</Subhead>
          <ChipGroup>
            <Chip size="sm">насос</Chip>
            <Chip size="sm" tone="info" onRemove={() => toast.info('Метка «датчик» убрана')}>
              датчик
            </Chip>
            <Chip size="sm" selected onClick={() => undefined}>
              только мои
            </Chip>
          </ChipGroup>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* TagInput                                                            */
/* ------------------------------------------------------------------ */

const EQUIPMENT_TAGS = [
  'насос',
  'насосная станция',
  'компрессор',
  'клапан',
  'задвижка',
  'датчик давления',
  'датчик температуры',
  'частотный привод',
  'теплообменник',
  'фильтр',
  'редуктор',
]

const INVENTORY_RE = /^INV-\d{4}$/

function TagInputCard() {
  const [tags, setTags] = useState(['насос', 'частотный привод'])
  const [inventory, setInventory] = useState(['INV-0412'])
  const [recipients, setRecipients] = useState<string[]>([])
  return (
    <Card
      title="TagInput"
      description="Свободный список коротких значений: теги оборудования, инвентарные номера, адреса рассылки. Для выбора из закрытого списка - MultiSelect. Enter, запятая или Tab добавляют метку, вставка делится по запятым и строкам, Backspace в пустом поле: первое нажатие подсвечивает последнюю метку, второе удаляет. Стрелка влево - к крестикам меток."
    >
      <FormSection>
        <Field label="Теги оборудования" hint="Подсказки из справочника, не больше 6, всё в нижнем регистре.">
          <TagInput value={tags} onChange={setTags} suggestions={EQUIPMENT_TAGS} max={6} transform={(s) => s.toLowerCase()} />
        </Field>
        <Field label="Инвентарные номера" hint="Формат INV-0000. Можно вставить столбец из таблицы.">
          <TagInput
            value={inventory}
            onChange={setInventory}
            placeholder="INV-0000"
            tone="info"
            transform={(s) => s.toUpperCase()}
            validate={(t) => (INVENTORY_RE.test(t) ? null : 'Номер в формате INV-0000')}
          />
        </Field>
        <Field label="Получатели отчёта" hint="size=sm, повторы разрешены (allowDuplicates)." error={recipients.length === 0 ? 'Добавьте хотя бы одного получателя' : undefined}>
          <TagInput value={recipients} onChange={setRecipients} size="sm" allowDuplicates placeholder="Почта или логин" />
        </Field>
        <Field label="Метки смены" hint="Недоступно: смена закрыта." disabled>
          <TagInput value={['ночная', 'резерв']} onChange={() => undefined} />
        </Field>
      </FormSection>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* OtpInput                                                            */
/* ------------------------------------------------------------------ */

function OtpCard() {
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState('482913')
  return (
    <Card
      title="OtpInput"
      description="Одноразовый код из SMS или приложения: подтверждение входа, подписи наряда, сброса пароля. Ввод перескакивает к следующей ячейке, Backspace возвращается, вставка и автозаполнение из SMS раскладывают код целиком. onComplete - когда введены все символы."
    >
      <FormSection>
        <Field label="Код из SMS" hint="Отправлен на +7 900 000-12-34. Группы по 3 цифры.">
          <OtpInput
            value={code}
            onChange={setCode}
            groupSize={3}
            onComplete={(c) => toast.success('Код принят', { description: `Проверяем ${c}` })}
          />
        </Field>
        <Field label="PIN терминала" hint="mask - символы скрыты, 4 цифры.">
          <OtpInput value={pin} onChange={setPin} length={4} mask onComplete={() => toast.info('PIN введён')} />
        </Field>
        <Field label="Код подписи наряда" error={wrong.length === 6 ? 'Неверный код. Осталось 2 попытки' : undefined}>
          <OtpInput value={wrong} onChange={setWrong} groupSize={3} />
        </Field>
        <Field label="Код доступа к шлюзу" hint="mode=alphanumeric, size=sm: латиница и цифры.">
          <OtpInput value="" onChange={() => undefined} length={5} mode="alphanumeric" size="sm" disabled />
        </Field>
      </FormSection>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* InlineEdit                                                          */
/* ------------------------------------------------------------------ */

function fakeSave(next: string): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (next.trim() === '') reject(new Error('Название не может быть пустым'))
      else if (/тест/i.test(next)) reject(new Error('Объект «Тест» уже есть в реестре'))
      else resolve()
    }, 900)
  })
}

function InlineEditCard() {
  const [name, setName] = useState('Долина-1, насосная станция')
  const [code, setCode] = useState('VAL-01')
  const [note, setNote] = useState('Плановое ТО насосов 14 октября.\nКлюч от щитовой - у начальника смены.')
  return (
    <Card
      title="InlineEdit"
      description="Правка одного поля без отдельной формы: название объекта, заметка смены, ответственный в карточке. Enter сохраняет, Escape отменяет, уход фокуса сохраняет. Пока идёт сохранение - спиннер; ошибка onSave откатывает значение и показывает текст под полем."
    >
      <FormSection>
        <Field label="Название объекта" hint="Сохранение ~1 с. Пустое значение или слово «тест» - ошибка сервера.">
          <InlineEdit
            value={name}
            onSave={async (next) => {
              await fakeSave(next)
              setName(next)
              toast.success('Название сохранено')
            }}
          />
        </Field>
        <Field label="Код объекта" hint="validate - проверка до отправки, size=sm.">
          <InlineEdit
            value={code}
            size="sm"
            maxLength={8}
            validate={(v) => (/^[A-Z]{3}-\d{2}$/.test(v) ? null : 'Формат: ABC-01')}
            renderValue={(v) => <span className="ev-mono">{v}</span>}
            onSave={setCode}
          />
        </Field>
        <Field label="Заметка смены" hint="multiline: Enter - новая строка, Ctrl+Enter - сохранить.">
          <InlineEdit value={note} onSave={setNote} multiline placeholder="Заметок нет" />
        </Field>
        <Field label="Ответственный" hint="Недоступно: назначает руководитель." disabled>
          <InlineEdit value="" onSave={() => undefined} />
        </Field>
      </FormSection>
    </Card>
  )
}

export function InputCards() {
  return (
    <div className="ev-stack">
      <SliderCard />
      <ChipCard />
      <TagInputCard />
      <OtpCard />
      <InlineEditCard />
    </div>
  )
}
