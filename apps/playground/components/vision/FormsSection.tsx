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
  MaskedDigitsInput,
  MoneyInput,
  NumberInput,
  PasswordInput,
  PhoneInput,
  PlateInput,
  PLATE_RE,
  SearchInput,
  SnilsInput,
  Textarea,
  useDebouncedValue,
  useFieldProps,
  type ColorSwatch,
} from 'endfield-vision'
import { AtSign, Hash } from 'lucide-react'
import { useState } from 'react'
import { formatRub } from '@/lib/format'
import { FormsPickers } from './FormsPickers'
import s from './vision.module.css'

/** Цвета меток участков на схеме объекта: данные, а не стили экрана. */
const ZONE_PALETTE: ColorSwatch[] = [
  { value: '#2A78D6', label: 'Синий - приёмка' },
  { value: '#1BAF7A', label: 'Зелёный - хранение' },
  { value: '#EDA100', label: 'Жёлтый - комплектация' },
  { value: '#EB6834', label: 'Оранжевый - отгрузка' },
  { value: '#E34948', label: 'Красный - карантин' },
  { value: '#4A3AA7', label: 'Фиолетовый - лаборатория' },
  { value: '#808080', label: 'Серый - резерв' },
  { value: '#FFFFFF', label: 'Белый' },
]

/** Код партии: 2 цифры цеха, 4 - номер, 2 - год. */
function formatBatch(d: string): string {
  if (d.length <= 2) return d
  if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
}

/** Своё поле на MaskedDigitsInput: обёртка ev-input и связка с Field через useFieldProps. */
function BatchInput({ value, onChange }: { value: string; onChange: (digits: string) => void }) {
  const f = useFieldProps({})
  return (
    <div className="ev-input" data-size="md" data-invalid={f.invalid || undefined}>
      <MaskedDigitsInput
        className="ev-input-el ev-num"
        inputMode="numeric"
        autoComplete="off"
        id={f.id}
        aria-describedby={f['aria-describedby']}
        aria-invalid={f['aria-invalid']}
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('g.sorokin')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 400)
  const [note, setNote] = useState('')
  const [comment, setComment] = useState('Плановая замена фильтров на линии сборки №3.')
  return (
    <Card title="Текстовые поля" description="Field связывает подпись, подсказку и ошибку с полем (htmlFor, aria-describedby, aria-invalid). FormSection - группа полей с заголовком на адаптивной сетке.">
      <FormSection title="Input и его варианты" description="Префикс и суффикс, очистка, размеры, ошибка, только чтение.">
        <Field label="Название объекта" hint="Как в реестре объектов." required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Долина-1" onClear={() => setName('')} />
        </Field>
        <Field label="Рабочая почта">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} prefix={<AtSign size={15} />} suffix="@endfield.local" />
        </Field>
        <Field label="Поиск по складу" hint={debounced ? `Запрос после паузы 400 мс (useDebouncedValue): «${debounced}»` : 'Escape очищает поле.'}>
          <SearchInput value={search} onChange={setSearch} placeholder="Артикул, название, партия" />
        </Field>
        <Field label="Пароль" error="Не короче 8 символов">
          <PasswordInput defaultValue="1234" autoComplete="new-password" />
        </Field>
        <Field label="Код объекта" disabled>
          <Input value="VAL-01" readOnly prefix={<Hash size={14} />} />
        </Field>
        <Field label="Компактное поле" labelAside='size="sm"'>
          <Input size="sm" placeholder="Для фильтров и тулбаров" />
        </Field>
        <Field label="Крупное поле" labelAside='size="lg"'>
          <Input size="lg" placeholder="Для форм входа и поиска на всю ширину" />
        </Field>
      </FormSection>
      <Divider />
      <FormSection title="Textarea" description="Авторост по содержимому и счётчик символов.">
        <Field label="Описание задачи" labelAside={`${note.length} / 500`}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} autoResize maxRows={8} placeholder="Что сделать, где и к какому сроку" />
        </Field>
        <Field label="Комментарий к смене">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} showCount rows={3} />
        </Field>
      </FormSection>
    </Card>
  )
}

function NumberFields() {
  const [qty, setQty] = useState<number | null>(120)
  const [load, setLoad] = useState<number | null>(86.5)
  const [price, setPrice] = useState<number | null>(1_250_000)
  const [phone, setPhone] = useState('+79001234567')
  const [snils, setSnils] = useState('11223344595')
  const [plate, setPlate] = useState('')
  const [pass, setPass] = useState('')
  const [batch, setBatch] = useState('03104226')
  const [color, setColor] = useState('#1BAF7A')
  return (
    <Card title="Числа, деньги и маски" description="Поля хранят «сырое» значение: число, копейки, цифры или E.164. Маска - только при показе, каретка не прыгает при правке в середине.">
      <FormSection title="Числа">
        <Field label="Количество" hint="Стрелки и колесо мыши меняют на шаг.">
          <NumberInput value={qty} onChange={setQty} min={0} max={10_000} step={10} unit="шт." stepper />
        </Field>
        <Field label="Загрузка линии" hint="Дробное значение, одна цифра после запятой.">
          <NumberInput value={load} onChange={setLoad} min={0} max={100} decimals={1} unit="%" />
        </Field>
        <Field label="Цена за единицу" hint={price === null ? 'Не указана' : `В копейках: ${price}. Показ: ${formatRub(price)}`}>
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
      </FormSection>
      <Divider />
      <FormSection title="Маски">
        <Field label="Телефон" hint={isCompletePhone(phone) ? `E.164: ${phone}, показ: ${formatPhone(phone)}` : 'Неполный номер не сохраняется'}>
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
        <Field label="СНИЛС" hint={snils ? `Цифры: ${snils}, показ: ${formatSnils(snils)}` : undefined}>
          <SnilsInput value={snils} onChange={setSnils} />
        </Field>
        <Field label="Госномер техники" hint={plate && !PLATE_RE.test(plate) ? 'Номер ещё не полный' : 'Латиница заменяется кириллицей.'}>
          <PlateInput value={plate} onChange={setPlate} />
        </Field>
        <Field label="Номер пропуска" hint="DigitsInput: только цифры, своя маска.">
          <DigitsInput value={pass} onChange={setPass} maxDigits={8} format={(d) => (d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d)} placeholder="0000 0000" />
        </Field>
        <Field label="Код партии" hint="MaskedDigitsInput в своей обёртке, связь с Field - useFieldProps.">
          <BatchInput value={batch} onChange={setBatch} />
        </Field>
        <Field label="Цвет участка" hint={`#RRGGBB или образец палитры. Значение: ${color}`}>
          <ColorField value={color} onChange={setColor} palette={ZONE_PALETTE} />
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
