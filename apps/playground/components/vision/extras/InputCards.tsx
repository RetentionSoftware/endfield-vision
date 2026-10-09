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
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'
import { Subhead } from '../parts'
import s from '../vision.module.css'

/*
 * Начальные значения с текстом хранятся как null: пока пользователь их не
 * менял, показывается пример на текущем языке консоли.
 */

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
  const { t } = useT()
  const nf = useNumberFormat()
  const [load, setLoad] = useState(75)
  const [committed, setCommitted] = useState(75)
  const [temp, setTemp] = useState<SliderRange>([4, 25])
  const [budget, setBudget] = useState<SliderRange>([120_000, 340_000])
  const [vibration, setVibration] = useState(2.8)
  return (
    <Card
      title="Slider"
      description={t(
        'Число в известных границах, где важнее положение, чем точное значение: порог тревоги, диапазон температур, бюджет. Для точного ввода - NumberInput. Перетаскивание, клик по дорожке, стрелки (шаг), PageUp / PageDown (10 шагов), Home / End. onChangeEnd - значение после отпускания: для запросов к API.',
        'A number within known bounds where position matters more than the exact value: an alarm threshold, a temperature range, a budget. For precise input, use NumberInput. Drag, click the track, arrow keys (one step), PageUp / PageDown (10 steps), Home / End. onChangeEnd fires on release: use it for API requests.',
      )}
    >
      <FormSection>
        <Field
          label={t('Порог загрузки линии', 'Line utilization threshold')}
          hint={t(
            `Сохранено: ${committed} %. onChange - при движении, onChangeEnd - при отпускании.`,
            `Saved: ${committed}%. onChange fires while dragging, onChangeEnd on release.`,
          )}
        >
          <Slider value={load} onChange={setLoad} onChangeEnd={setCommitted} step={5} showValue format={(v) => `${v} %`} />
        </Field>
        <Field
          label={t('Допустимая температура склада', 'Allowed warehouse temperature')}
          hint={t(
            'Диапазон: бегунки не перескакивают друг друга. Значение - над бегунком.',
            'A range: the thumbs cannot cross each other. The value shows above the thumb.',
          )}
        >
          <Slider value={temp} onChange={setTemp} min={-20} max={60} marks={TEMP_MARKS} showValue="tooltip" format={(v) => `${v} °C`} />
        </Field>
        <Field label={t('Бюджет закупки', 'Purchase budget')} hint={t('Шаг 10 000 ₽, риски без подписей.', 'Step of ₽10,000, unlabeled ticks.')}>
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
        <Field label={t('Порог вибрации, мм/с', 'Vibration threshold, mm/s')} hint={t('size=sm, шаг 0,1.', 'size=sm, step 0.1.')}>
          <Slider value={vibration} onChange={setVibration} min={0} max={10} step={0.1} size="sm" showValue />
        </Field>
        <Field
          label={t('Резерв мощности', 'Capacity reserve')}
          hint={t('Недоступен: объект на консервации.', 'Unavailable: the facility is mothballed.')}
          disabled
        >
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
  { id: 'new', label: bi('Новые', 'New'), count: 12 },
  { id: 'work', label: bi('В работе', 'In progress'), count: 34 },
  { id: 'check', label: bi('На проверке', 'In review'), count: 5 },
  { id: 'done', label: bi('Закрыты', 'Closed'), count: 128 },
]

const APPLIED: Array<{ id: string; label: Bi }> = [
  { id: 'facility', label: bi('Объект: Долина-1', 'Facility: Valley-1') },
  { id: 'priority', label: bi('Приоритет: высокий', 'Priority: high') },
  { id: 'assignee', label: bi('Исполнитель: Глеб Сорокин', 'Assignee: Gleb Sorokin') },
  { id: 'due', label: bi('Срок: эта неделя', 'Due: this week') },
]
const INITIAL_APPLIED = APPLIED.map((a) => a.id)

function ChipCard() {
  const { t, tx } = useT()
  const [statuses, setStatuses] = useState<string[]>(['new', 'work'])
  const [applied, setApplied] = useState(INITIAL_APPLIED)
  const toggle = (id: string) => setStatuses((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  return (
    <Card
      title={t('Chip и ChipGroup', 'Chip and ChipGroup')}
      description={t(
        'Компактная метка: быстрый фильтр (кнопка-переключатель с aria-pressed), применённый фильтр с крестиком, тег оборудования. Статус сущности в таблице - Badge или StatusPill; чип - то, что пользователь включает или убирает.',
        'A compact tag: a quick filter (a toggle button with aria-pressed), an applied filter with a remove button, an equipment tag. For an entity status in a table, use Badge or StatusPill; a chip is something the user turns on or removes.',
      )}
    >
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>{t('Быстрые фильтры', 'Quick filters')}</Subhead>
          <ChipGroup aria-label={t('Статус задач', 'Task status')}>
            {STATUS_FILTERS.map((f) => (
              <Chip key={f.id} selected={statuses.includes(f.id)} onClick={() => toggle(f.id)}>
                {tx(f.label)} <span className="ev-num ev-muted">{f.count}</span>
              </Chip>
            ))}
            <Chip selected={false} onClick={() => undefined} disabled>
              {t('Архив', 'Archive')}
            </Chip>
          </ChipGroup>
          <span className="ev-muted">
            {t('Выбрано: ', 'Selected: ')}
            {statuses.length === 0 ? t('все статусы', 'all statuses') : statuses.length}
            {t(
              '. Выбранный без своей иконки получает галочку - цвет не единственный признак.',
              '. A selected chip without its own icon gets a check mark, so color is not the only cue.',
            )}
          </span>
        </div>
        <div className="ev-stack">
          <Subhead>{t('Применённые фильтры', 'Applied filters')}</Subhead>
          <ChipGroup aria-label={t('Применённые фильтры', 'Applied filters')}>
            {APPLIED.filter((a) => applied.includes(a.id)).map((a) => (
              <Chip key={a.id} onRemove={() => setApplied((cur) => cur.filter((x) => x !== a.id))}>
                {tx(a.label)}
              </Chip>
            ))}
            {applied.length === 0 ? <span className="ev-muted">{t('Фильтров нет.', 'No filters.')}</span> : null}
          </ChipGroup>
          {applied.length < INITIAL_APPLIED.length ? (
            <Button variant="link" onClick={() => setApplied(INITIAL_APPLIED)}>
              {t('Вернуть все', 'Restore all')}
            </Button>
          ) : null}
        </div>
      </div>
      <Divider />
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>{t('Тоны', 'Tones')}</Subhead>
          <ChipGroup>
            <Chip icon={<Factory size={13} />}>{t('Долина-1', 'Valley-1')}</Chip>
            <Chip tone="accent">{t('Плановое ТО', 'Scheduled maintenance')}</Chip>
            <Chip tone="success" icon={<CircleCheck size={13} />}>
              {t('Исправен', 'Healthy')}
            </Chip>
            <Chip tone="warning" icon={<Wrench size={13} />}>
              {t('Нужен ремонт', 'Needs repair')}
            </Chip>
            <Chip tone="danger" icon={<CircleAlert size={13} />}>
              {t('Авария', 'Failure')}
            </Chip>
            <Chip tone="info">{t('Телеметрия', 'Telemetry')}</Chip>
            <Chip tone="violet">{t('Пилот', 'Pilot')}</Chip>
          </ChipGroup>
        </div>
        <div className="ev-stack">
          <Subhead>{t('Размер sm', 'Size sm')}</Subhead>
          <ChipGroup>
            <Chip size="sm">{t('насос', 'pump')}</Chip>
            <Chip size="sm" tone="info" onRemove={() => toast.info(t('Метка «датчик» убрана', 'Tag "sensor" removed'))}>
              {t('датчик', 'sensor')}
            </Chip>
            <Chip size="sm" selected onClick={() => undefined}>
              {t('только мои', 'mine only')}
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

const EQUIPMENT_TAGS = {
  ru: [
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
  ],
  en: [
    'pump',
    'pumping station',
    'compressor',
    'valve',
    'gate valve',
    'pressure sensor',
    'temperature sensor',
    'variable frequency drive',
    'heat exchanger',
    'filter',
    'gearbox',
  ],
}

const INITIAL_TAGS = { ru: ['насос', 'частотный привод'], en: ['pump', 'variable frequency drive'] }

const INVENTORY_RE = /^INV-\d{4}$/

function TagInputCard() {
  const { t, lang } = useT()
  const [tags, setTags] = useState<string[] | null>(null)
  const [inventory, setInventory] = useState(['INV-0412'])
  const [recipients, setRecipients] = useState<string[]>([])
  return (
    <Card
      title="TagInput"
      description={t(
        'Свободный список коротких значений: теги оборудования, инвентарные номера, адреса рассылки. Для выбора из закрытого списка - MultiSelect. Enter, запятая или Tab добавляют метку, вставка делится по запятым и строкам, Backspace в пустом поле: первое нажатие подсвечивает последнюю метку, второе удаляет. Стрелка влево - к крестикам меток.',
        'A free-form list of short values: equipment tags, inventory numbers, mailing addresses. To pick from a closed list, use MultiSelect. Enter, a comma or Tab adds a tag; pasted text splits on commas and line breaks. Backspace in an empty field highlights the last tag first, then removes it. The left arrow moves to the tag remove buttons.',
      )}
    >
      <FormSection>
        <Field
          label={t('Теги оборудования', 'Equipment tags')}
          hint={t('Подсказки из справочника, не больше 6, всё в нижнем регистре.', 'Suggestions come from a reference list; up to 6, all lowercase.')}
        >
          <TagInput
            value={tags ?? INITIAL_TAGS[lang]}
            onChange={setTags}
            suggestions={EQUIPMENT_TAGS[lang]}
            max={6}
            transform={(v) => v.toLowerCase()}
          />
        </Field>
        <Field
          label={t('Инвентарные номера', 'Inventory numbers')}
          hint={t('Формат INV-0000. Можно вставить столбец из таблицы.', 'Format INV-0000. You can paste a column from a spreadsheet.')}
        >
          <TagInput
            value={inventory}
            onChange={setInventory}
            placeholder="INV-0000"
            tone="info"
            transform={(v) => v.toUpperCase()}
            validate={(v) => (INVENTORY_RE.test(v) ? null : t('Номер в формате INV-0000', 'Use the INV-0000 format'))}
          />
        </Field>
        <Field
          label={t('Получатели отчёта', 'Report recipients')}
          hint={t('size=sm, повторы разрешены (allowDuplicates).', 'size=sm, duplicates allowed (allowDuplicates).')}
          error={recipients.length === 0 ? t('Добавьте хотя бы одного получателя', 'Add at least one recipient') : undefined}
        >
          <TagInput value={recipients} onChange={setRecipients} size="sm" allowDuplicates placeholder={t('Почта или логин', 'Email or username')} />
        </Field>
        <Field label={t('Метки смены', 'Shift tags')} hint={t('Недоступно: смена закрыта.', 'Unavailable: the shift is closed.')} disabled>
          <TagInput value={[t('ночная', 'night'), t('резерв', 'reserve')]} onChange={() => undefined} />
        </Field>
      </FormSection>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* OtpInput                                                            */
/* ------------------------------------------------------------------ */

function OtpCard() {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState('482913')
  return (
    <Card
      title="OtpInput"
      description={t(
        'Одноразовый код из SMS или приложения: подтверждение входа, подписи наряда, сброса пароля. Ввод перескакивает к следующей ячейке, Backspace возвращается, вставка и автозаполнение из SMS раскладывают код целиком. onComplete - когда введены все символы.',
        'A one-time code from SMS or an app: to confirm a sign-in, sign a work order or reset a password. Typing jumps to the next cell, Backspace goes back, and paste or SMS autofill spreads the whole code. onComplete fires once every character is entered.',
      )}
    >
      <FormSection>
        <Field label={t('Код из SMS', 'SMS code')} hint={t('Отправлен на +7 900 000-12-34. Группы по 3 цифры.', 'Sent to +7 900 000-12-34. Groups of 3 digits.')}>
          <OtpInput
            value={code}
            onChange={setCode}
            groupSize={3}
            onComplete={(c) => toast.success(t('Код принят', 'Code accepted'), { description: t(`Проверяем ${c}`, `Verifying ${c}`) })}
          />
        </Field>
        <Field label={t('PIN терминала', 'Terminal PIN')} hint={t('mask - символы скрыты, 4 цифры.', 'mask hides the characters; 4 digits.')}>
          <OtpInput value={pin} onChange={setPin} length={4} mask onComplete={() => toast.info(t('PIN введён', 'PIN entered'))} />
        </Field>
        <Field
          label={t('Код подписи наряда', 'Work order signing code')}
          error={wrong.length === 6 ? t('Неверный код. Осталось 2 попытки', 'Wrong code. 2 attempts left') : undefined}
        >
          <OtpInput value={wrong} onChange={setWrong} groupSize={3} />
        </Field>
        <Field
          label={t('Код доступа к шлюзу', 'Gateway access code')}
          hint={t('mode=alphanumeric, size=sm: латиница и цифры.', 'mode=alphanumeric, size=sm: Latin letters and digits.')}
        >
          <OtpInput value="" onChange={() => undefined} length={5} mode="alphanumeric" size="sm" disabled />
        </Field>
      </FormSection>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* InlineEdit                                                          */
/* ------------------------------------------------------------------ */

function fakeSave(next: string, t: Translator['t']): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (next.trim() === '') reject(new Error(t('Название не может быть пустым', 'The name cannot be empty')))
      else if (/тест|test/i.test(next)) reject(new Error(t('Объект «Тест» уже есть в реестре', 'A facility named "Test" is already in the registry')))
      else resolve()
    }, 900)
  })
}

function InlineEditCard() {
  const { t } = useT()
  const [name, setName] = useState<string | null>(null)
  const [code, setCode] = useState('VAL-01')
  const [note, setNote] = useState<string | null>(null)
  return (
    <Card
      title="InlineEdit"
      description={t(
        'Правка одного поля без отдельной формы: название объекта, заметка смены, ответственный в карточке. Enter сохраняет, Escape отменяет, уход фокуса сохраняет. Пока идёт сохранение - спиннер; ошибка onSave откатывает значение и показывает текст под полем.',
        'Edit a single field without a separate form: a facility name, a shift note, the owner on a card. Enter saves, Escape cancels, and blur saves. A spinner shows while saving; an onSave error reverts the value and shows the message below the field.',
      )}
    >
      <FormSection>
        <Field
          label={t('Название объекта', 'Facility name')}
          hint={t(
            'Сохранение ~1 с. Пустое значение или слово «тест» - ошибка сервера.',
            'Saving takes ~1 s. An empty value or the word "test" triggers a server error.',
          )}
        >
          <InlineEdit
            value={name ?? t('Долина-1, насосная станция', 'Valley-1, pumping station')}
            onSave={async (next) => {
              await fakeSave(next, t)
              setName(next)
              toast.success(t('Название сохранено', 'Name saved'))
            }}
          />
        </Field>
        <Field label={t('Код объекта', 'Facility code')} hint={t('validate - проверка до отправки, size=sm.', 'validate checks before saving; size=sm.')}>
          <InlineEdit
            value={code}
            size="sm"
            maxLength={8}
            validate={(v) => (/^[A-Z]{3}-\d{2}$/.test(v) ? null : t('Формат: ABC-01', 'Format: ABC-01'))}
            renderValue={(v) => <span className="ev-mono">{v}</span>}
            onSave={setCode}
          />
        </Field>
        <Field
          label={t('Заметка смены', 'Shift note')}
          hint={t('multiline: Enter - новая строка, Ctrl+Enter - сохранить.', 'multiline: Enter adds a new line, Ctrl+Enter saves.')}
        >
          <InlineEdit
            value={
              note ??
              t(
                'Плановое ТО насосов 14 октября.\nКлюч от щитовой - у начальника смены.',
                'Scheduled pump maintenance on October 14.\nThe switchboard room key is with the shift supervisor.',
              )
            }
            onSave={setNote}
            multiline
            placeholder={t('Заметок нет', 'No notes')}
          />
        </Field>
        <Field
          label={t('Ответственный', 'Owner')}
          hint={t('Недоступно: назначает руководитель.', 'Unavailable: assigned by a manager.')}
          disabled
        >
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
