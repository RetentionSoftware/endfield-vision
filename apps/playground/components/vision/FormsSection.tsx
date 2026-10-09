'use client'

import {
  Card,
  ColorField,
  DigitsInput,
  Divider,
  Field,
  FormSection,
  formatPhone,
  formatSnils,
  Input,
  isCompletePhone,
  isValidTime,
  MaskedDigitsInput,
  MoneyInput,
  NumberInput,
  parseTime,
  PasswordInput,
  PhoneInput,
  PlateInput,
  PLATE_RE,
  SearchInput,
  SnilsInput,
  Textarea,
  TimeInput,
  useDebouncedValue,
  useFieldContext,
  type ColorSwatch,
} from 'endfield-vision'
import { AtSign, Hash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT, type Translator } from '@/lib/i18n'
import { FormsPickers } from './FormsPickers'
import s from './vision.module.css'

/** Цвета меток участков на схеме объекта: данные, а не стили экрана. */
const zonePalette = (t: Translator['t']): ColorSwatch[] => [
  { value: '#2A78D6', label: t('Синий - приёмка', 'Blue - receiving') },
  { value: '#1BAF7A', label: t('Зелёный - хранение', 'Green - storage') },
  { value: '#EDA100', label: t('Жёлтый - комплектация', 'Yellow - picking') },
  { value: '#EB6834', label: t('Оранжевый - отгрузка', 'Orange - shipping') },
  { value: '#E34948', label: t('Красный - карантин', 'Red - quarantine') },
  { value: '#4A3AA7', label: t('Фиолетовый - лаборатория', 'Purple - lab') },
  { value: '#808080', label: t('Серый - резерв', 'Gray - reserve') },
  { value: '#FFFFFF', label: t('Белый', 'White') },
]

/** Код партии: 2 цифры цеха, 4 - номер, 2 - год. */
function formatBatch(d: string): string {
  if (d.length <= 2) return d
  if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
}

/**
 * Своё поле на MaskedDigitsInput: обёртка ev-input даёт рамку. id, aria-invalid,
 * aria-describedby, disabled и required поле само берёт из Field; контекст
 * нужен только обёртке - для состояния ошибки.
 */
function BatchInput({ value, onChange }: { value: string; onChange: (digits: string) => void }) {
  const field = useFieldContext()
  return (
    <div className="ev-input" data-size="md" data-invalid={field?.invalid || undefined}>
      <MaskedDigitsInput
        className="ev-input-el ev-num"
        inputMode="numeric"
        autoComplete="off"
        digits={value}
        onDigits={onChange}
        maxDigits={8}
        format={formatBatch}
        placeholder="00-0000-00"
      />
    </div>
  )
}

function TextFields() {
  const { t } = useT()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('g.sorokin')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 400)
  const [note, setNote] = useState('')
  // Пока текст не правили - пример на языке консоли.
  const [comment, setComment] = useState<string | null>(null)
  return (
    <Card
      title={t('Текстовые поля', 'Text fields')}
      description={t(
        'Field связывает подпись, подсказку и ошибку с полем (htmlFor, aria-describedby, aria-invalid). FormSection - группа полей с заголовком на адаптивной сетке.',
        'Field wires the label, hint and error to the input (htmlFor, aria-describedby, aria-invalid). FormSection is a titled group of fields on a responsive grid.',
      )}
    >
      <FormSection
        title={t('Input и его варианты', 'Input and its variants')}
        description={t('Префикс и суффикс, очистка, размеры, ошибка, только чтение.', 'Prefix and suffix, clearing, sizes, error, read-only.')}
      >
        <Field label={t('Название объекта', 'Facility name')} hint={t('Как в реестре объектов.', 'As listed in the facility registry.')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Долина-1', 'Valley-1')} onClear={() => setName('')} />
        </Field>
        <Field label={t('Рабочая почта', 'Work email')}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} prefix={<AtSign size={15} />} suffix="@endfield.local" />
        </Field>
        <Field
          label={t('Поиск по складу', 'Inventory search')}
          hint={
            debounced
              ? t(`Запрос после паузы 400 мс (useDebouncedValue): «${debounced}»`, `Query after a 400 ms pause (useDebouncedValue): "${debounced}"`)
              : t('Escape очищает поле.', 'Escape clears the field.')
          }
        >
          <SearchInput value={search} onChange={setSearch} placeholder={t('Артикул, название, партия', 'SKU, name, batch')} />
        </Field>
        <Field label={t('Пароль', 'Password')} error={t('Не короче 8 символов', 'At least 8 characters')}>
          <PasswordInput defaultValue="1234" autoComplete="new-password" />
        </Field>
        <Field label={t('Код объекта', 'Facility code')} disabled>
          <Input value="VAL-01" readOnly prefix={<Hash size={14} />} />
        </Field>
        <Field label={t('Компактное поле', 'Compact field')} labelAside='size="sm"'>
          <Input size="sm" placeholder={t('Для фильтров и тулбаров', 'For filters and toolbars')} />
        </Field>
        <Field label={t('Крупное поле', 'Large field')} labelAside='size="lg"'>
          <Input size="lg" placeholder={t('Для форм входа и поиска на всю ширину', 'For sign-in forms and full-width search')} />
        </Field>
      </FormSection>
      <Divider />
      <FormSection title="Textarea" description={t('Авторост по содержимому и счётчик символов.', 'Grows with its content and counts characters.')}>
        <Field label={t('Описание задачи', 'Task description')} labelAside={`${note.length} / 500`}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            autoResize
            maxRows={8}
            placeholder={t('Что сделать, где и к какому сроку', 'What to do, where and by when')}
          />
        </Field>
        <Field label={t('Комментарий к смене', 'Shift comment')}>
          <Textarea
            value={comment ?? t('Плановая замена фильтров на линии сборки №3.', 'Scheduled filter replacement on assembly line 3.')}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            showCount
            rows={3}
          />
        </Field>
      </FormSection>
    </Card>
  )
}

function NumberFields() {
  const { t, formatRub } = useT()
  const palette = useMemo(() => zonePalette(t), [t])
  const [qty, setQty] = useState<number | null>(120)
  const [load, setLoad] = useState<number | null>(86.5)
  const [price, setPrice] = useState<number | null>(1_250_000)
  const [phone, setPhone] = useState('+79001234567')
  const [snils, setSnils] = useState('11223344595')
  const [plate, setPlate] = useState('')
  const [pass, setPass] = useState('')
  const [batch, setBatch] = useState('03104226')
  const [color, setColor] = useState('#1BAF7A')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('')
  const startParts = parseTime(start)
  return (
    <Card
      title={t('Числа, деньги и маски', 'Numbers, money and masks')}
      description={t(
        'Поля хранят «сырое» значение: число, копейки, цифры или E.164. Маска - только при показе, каретка не прыгает при правке в середине.',
        'Fields store the raw value: a number, kopecks, digits or E.164. The mask applies only to display, and the caret stays put when editing mid-value.',
      )}
    >
      <FormSection title={t('Числа', 'Numbers')}>
        <Field label={t('Количество', 'Quantity')} hint={t('Стрелки и колесо мыши меняют на шаг.', 'Arrow keys and the mouse wheel change it by one step.')}>
          <NumberInput value={qty} onChange={setQty} min={0} max={10_000} step={10} unit={t('шт.', 'pcs')} stepper />
        </Field>
        <Field label={t('Загрузка линии', 'Line utilization')} hint={t('Дробное значение, одна цифра после запятой.', 'A decimal value with one digit after the point.')}>
          <NumberInput value={load} onChange={setLoad} min={0} max={100} decimals={1} unit="%" />
        </Field>
        <Field
          label={t('Цена за единицу', 'Unit price')}
          hint={
            price === null
              ? t('Не указана', 'Not set')
              : t(`В копейках: ${price}. Показ: ${formatRub(price)}`, `In kopecks: ${price}. Display: ${formatRub(price)}`)
          }
        >
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
      </FormSection>
      <Divider />
      <FormSection title={t('Маски', 'Masks')}>
        <Field
          label={t('Телефон', 'Phone')}
          hint={
            isCompletePhone(phone)
              ? t(`E.164: ${phone}, показ: ${formatPhone(phone)}`, `E.164: ${phone}, display: ${formatPhone(phone)}`)
              : t('Неполный номер не сохраняется', 'An incomplete number is not saved')
          }
        >
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
        <Field
          label={t('СНИЛС', 'SNILS')}
          hint={snils ? t(`Цифры: ${snils}, показ: ${formatSnils(snils)}`, `Digits: ${snils}, display: ${formatSnils(snils)}`) : undefined}
        >
          <SnilsInput value={snils} onChange={setSnils} />
        </Field>
        <Field
          label={t('Госномер техники', 'Vehicle plate number')}
          hint={
            plate && !PLATE_RE.test(plate)
              ? t('Номер ещё не полный', 'The number is incomplete')
              : t('Латиница заменяется кириллицей.', 'Latin letters are replaced with their Cyrillic look-alikes.')
          }
        >
          <PlateInput value={plate} onChange={setPlate} />
        </Field>
        <Field label={t('Номер пропуска', 'Badge number')} hint={t('DigitsInput: только цифры, своя маска.', 'DigitsInput: digits only, with a custom mask.')}>
          <DigitsInput
            value={pass}
            onChange={setPass}
            maxDigits={8}
            format={(d) => (d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d)}
            placeholder="0000 0000"
          />
        </Field>
        <Field
          label={t('Код партии', 'Batch code')}
          hint={t(
            'MaskedDigitsInput в своей обёртке: подпись и подсказку берёт из Field сам.',
            'MaskedDigitsInput in a custom wrapper: it picks up the label and hint from Field on its own.',
          )}
        >
          <BatchInput value={batch} onChange={setBatch} />
        </Field>
        <Field
          label={t('Цвет участка', 'Zone color')}
          hint={t(`#RRGGBB или образец палитры. Значение: ${color}`, `#RRGGBB or a palette swatch. Value: ${color}`)}
        >
          <ColorField value={color} onChange={setColor} palette={palette} />
        </Field>
      </FormSection>
      <Divider />
      <FormSection
        title={t('Время', 'Time')}
        description={t(
          'TimeInput: «ЧЧ:ММ», 24 часа. Значение фиксируется только на полном корректном времени в пределах min/max; недописанное откатывается при потере фокуса.',
          'TimeInput: "HH:MM", 24-hour. The value commits only when the time is complete, valid and within min/max; a partial entry reverts on blur.',
        )}
      >
        <Field
          label={t('Начало смены', 'Shift start')}
          hint={
            startParts
              ? t(
                  `parseTime: ${startParts.hours} ч ${startParts.minutes} мин. Допустимо 06:00 - 12:00`,
                  `parseTime: ${startParts.hours} h ${startParts.minutes} min. Allowed 06:00 - 12:00`,
                )
              : t('Допустимо 06:00 - 12:00', 'Allowed 06:00 - 12:00')
          }
        >
          <TimeInput value={start} onChange={setStart} min="06:00" max="12:00" />
        </Field>
        <Field
          label={t('Конец смены', 'Shift end')}
          hint={t(
            `min - начало смены: более раннее время не принимается. isValidTime('${end}'): ${isValidTime(end)}`,
            `min is the shift start: earlier times are rejected. isValidTime('${end}'): ${isValidTime(end)}`,
          )}
        >
          <TimeInput value={end} onChange={setEnd} min={start || undefined} />
        </Field>
        <Field label={t('Перерыв', 'Break')} labelAside='size="sm"' disabled>
          <TimeInput size="sm" value="12:30" onChange={() => undefined} />
        </Field>
      </FormSection>
    </Card>
  )
}

export function FormsSection() {
  return (
    <div className={s.section}>
      <TextFields />
      <NumberFields />
      <FormsPickers />
    </div>
  )
}
