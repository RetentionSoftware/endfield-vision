'use client'

import { ChevronDown } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ClipboardEvent, type InputHTMLAttributes, type Ref } from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import {
  applyMaskedEdit,
  formatPhoneNational,
  formatSnils,
  normalizePlate,
  PHONE_COUNTRIES,
  phoneFieldValue,
  sanitizePhonePaste,
  splitPhone,
  type PhoneCountry,
} from '../lib/masks'
import { useFieldProps } from './Field'
import type { ControlSize } from './Input'
import { Menu } from './Menu'

/*
 * Поля с маской. В состоянии - только цифры, в поле - маска. После
 * переформатирования каретка ставится после того же числа цифр, поэтому
 * не прыгает при правке в середине. Стирание разделителя удаляет соседнюю
 * цифру (иначе Backspace на «-» не работает). Логика правки - applyMaskedEdit
 * (lib/masks).
 */

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'>

export interface MaskedDigitsInputProps extends BaseInputProps {
  digits: string
  onDigits: (digits: string) => void
  format: (digits: string) => string
  maxDigits: number
  /** Извлечение цифр из сырого ввода (по умолчанию - все цифры). */
  sanitize?: (raw: string) => string
  ref?: Ref<HTMLInputElement>
}

/** Низкоуровневое поле: только <input>, без рамки (рамку даёт обёртка). */
export function MaskedDigitsInput({ digits, onDigits, format, maxDigits, sanitize, ref, ...rest }: MaskedDigitsInputProps) {
  const inner = useRef<HTMLInputElement | null>(null)
  const caretRef = useRef<number | null>(null)
  const display = format(digits)

  useIsoLayoutEffect(() => {
    const el = inner.current
    if (el && caretRef.current !== null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current)
    }
    caretRef.current = null
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const r = applyMaskedEdit({
      prevDisplay: display,
      prevDigits: digits,
      raw: el.value,
      caret: el.selectionStart ?? el.value.length,
      inputType: (e.nativeEvent as Partial<InputEvent>).inputType,
      format,
      maxDigits,
      sanitize,
    })
    // Маска и каретка ставятся сразу, в этом же событии: следующая клавиша
    // при быстром вводе правит уже отформатированное значение.
    if (el.value !== r.display) el.value = r.display
    if (el.ownerDocument.activeElement === el) el.setSelectionRange(r.caret, r.caret)
    if (r.digits === digits) return
    caretRef.current = r.caret
    onDigits(r.digits)
  }

  return (
    <input
      {...rest}
      ref={(node) => {
        inner.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLInputElement | null }).current = node
      }}
      value={display}
      onChange={handleChange}
    />
  )
}

interface MaskedFieldShellProps {
  size?: ControlSize
  invalid?: boolean
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
  'aria-describedby'?: string
  autoFocus?: boolean
  name?: string
  onBlur?: () => void
}

export interface DigitsInputProps extends MaskedFieldShellProps {
  value: string
  onChange: (digits: string) => void
  maxDigits: number
  /** Своя маска; по умолчанию цифры как есть. */
  format?: (digits: string) => string
}

/** Только цифры (номер ВУ, ИНН, коды) в рамке обычного поля. */
export function DigitsInput({ value, onChange, maxDigits, format, size = 'md', className, invalid, ...rest }: DigitsInputProps) {
  const f = useFieldProps({ id: rest.id, invalid, disabled: rest.disabled, required: rest.required, 'aria-describedby': rest['aria-describedby'] })
  return (
    <div className={cx('ev-input', className)} data-size={size} data-invalid={f.invalid || undefined} data-disabled={f.disabled || undefined}>
      <MaskedDigitsInput
        {...rest}
        className="ev-input-el ev-num"
        inputMode="numeric"
        autoComplete="off"
        digits={value}
        onDigits={onChange}
        format={format ?? ((d) => d)}
        maxDigits={maxDigits}
        id={f.id}
        disabled={f.disabled}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
      />
    </div>
  )
}

export interface SnilsInputProps extends MaskedFieldShellProps {
  /** 11 цифр без разделителей. */
  value: string
  onChange: (digits: string) => void
}

export function SnilsInput({ placeholder = '000-000-000 00', ...rest }: SnilsInputProps) {
  return <DigitsInput {...rest} placeholder={placeholder} maxDigits={11} format={formatSnils} />
}

export interface PhoneInputProps extends MaskedFieldShellProps {
  /**
   * E.164 (+79001234567), пустая строка или неполный номер («+7900»).
   * Полноту проверяет форма: isCompletePhone(value).
   */
  value: string
  onChange: (e164: string) => void
  /** Разрешённые страны; по умолчанию РФ, Узбекистан, Таджикистан. */
  countries?: PhoneCountry[]
}

/**
 * Телефон с выбором страны (+7, +998, +992). Вставка полного номера
 * распознаёт код страны. Неполный номер уходит наружу как есть («+7900»),
 * а не пустой строкой: иначе форма молча стёрла бы телефон, который
 * пользователь видит в поле. Форма отклоняет его через isCompletePhone.
 */
export function PhoneInput({ value, onChange, countries = ['RU', 'UZ', 'TJ'], size = 'md', className, invalid, placeholder, ...rest }: PhoneInputProps) {
  const f = useFieldProps({ id: rest.id, invalid, disabled: rest.disabled, required: rest.required, 'aria-describedby': rest['aria-describedby'] })
  const initial = splitPhone(value)
  const [country, setCountry] = useState<PhoneCountry>(initial.country)
  const [national, setNational] = useState(initial.national)
  const [prevValue, setPrevValue] = useState(value)

  // Значение заменили снаружи (сброс формы, загрузка карточки) - разобрать заново.
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== phoneFieldValue(country, national)) {
      const s = splitPhone(value)
      setCountry(s.country)
      setNational(s.national)
    }
  }

  const info = PHONE_COUNTRIES[country]
  const update = (c: PhoneCountry, n: string) => {
    setCountry(c)
    setNational(n)
    const next = phoneFieldValue(c, n)
    setPrevValue(next)
    if (next !== value) onChange(next)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const digits = text.replace(/\D/g, '')
    if (digits.length >= 11) {
      e.preventDefault()
      const s = sanitizePhonePaste(text, country)
      if (countries.includes(s.country)) update(s.country, s.national)
    }
  }

  return (
    <div className={cx('ev-input ev-phone', className)} data-size={size} data-invalid={f.invalid || undefined} data-disabled={f.disabled || undefined}>
      {countries.length > 1 ? (
        <Menu
          label="Код страны"
          placement="bottom-start"
          minWidth={190}
          trigger={
            <button type="button" className="ev-phone-country" disabled={f.disabled} aria-label={`Код страны: +${info.dial}`}>
              +{info.dial}
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          }
          items={countries.map((c) => ({
            id: c,
            label: `+${PHONE_COUNTRIES[c].dial}`,
            hint: PHONE_COUNTRIES[c].label,
            checked: c === country,
            onSelect: () => update(c, national.slice(0, PHONE_COUNTRIES[c].length)),
          }))}
        />
      ) : (
        <span className="ev-input-affix ev-input-prefix ev-num">+{info.dial}</span>
      )}
      <MaskedDigitsInput
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="ev-input-el ev-num"
        placeholder={placeholder ?? info.placeholder}
        digits={national}
        onDigits={(d) => update(country, d)}
        format={(d) => formatPhoneNational(country, d)}
        maxDigits={info.length}
        onPaste={onPaste}
        id={f.id}
        disabled={f.disabled}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
      />
    </div>
  )
}

export interface PlateInputProps extends MaskedFieldShellProps {
  value: string
  onChange: (plate: string) => void
}

/** Госномер: кириллица в верхнем регистре без пробелов (латинские двойники заменяются). */
export function PlateInput({ value, onChange, size = 'md', className, invalid, placeholder = 'А123ВС77', onBlur, ...rest }: PlateInputProps) {
  const f = useFieldProps({ id: rest.id, invalid, disabled: rest.disabled, required: rest.required, 'aria-describedby': rest['aria-describedby'] })
  return (
    <div className={cx('ev-input', className)} data-size={size} data-invalid={f.invalid || undefined} data-disabled={f.disabled || undefined}>
      <input
        {...rest}
        className="ev-input-el ev-plate"
        autoComplete="off"
        spellCheck={false}
        maxLength={12}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(normalizePlate(e.target.value).slice(0, 9))}
        onBlur={onBlur}
        id={f.id}
        disabled={f.disabled}
        aria-invalid={f['aria-invalid']}
        aria-describedby={f['aria-describedby']}
      />
    </div>
  )
}
