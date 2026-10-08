import { describe, expect, it } from 'vitest'
import { formatDateDigits } from '../lib/dates'
import { applyMaskedEdit, formatPhoneNational, formatSnils } from '../lib/masks'

// Группы разрядов, как в поле пробега (IssueWaybillModal, CloseWaybillModal).
const groupDigits = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/**
 * Поле в браузере: значение, выделение и обработчик MaskedDigitsInput.
 * Браузер сам ставит текст на место выделения, затем обработчик
 * (applyMaskedEdit) переформатирует значение и ставит каретку.
 */
class FieldModel {
  value: string
  start: number
  end: number

  constructor(
    public digits: string,
    private readonly format: (d: string) => string,
    private readonly maxDigits: number,
  ) {
    this.value = format(digits)
    this.start = this.end = this.value.length
  }

  selectAll() {
    this.start = 0
    this.end = this.value.length
  }

  select(start: number, end = start) {
    this.start = start
    this.end = end
  }

  /** Ввод текста одним событием input: клавиша, вставка, слово от IME. */
  insert(text: string, inputType: string | undefined = 'insertText') {
    const raw = this.value.slice(0, this.start) + text + this.value.slice(this.end)
    this.apply(raw, this.start + text.length, inputType)
  }

  /** Backspace (withType = false - событие из скрипта без inputType). */
  backspace(withType = true) {
    if (this.start !== this.end) {
      this.apply(this.value.slice(0, this.start) + this.value.slice(this.end), this.start, withType ? 'deleteContentBackward' : undefined)
    } else if (this.start > 0) {
      this.apply(this.value.slice(0, this.start - 1) + this.value.slice(this.start), this.start - 1, withType ? 'deleteContentBackward' : undefined)
    }
  }

  /** Delete. */
  del() {
    if (this.start !== this.end) {
      this.apply(this.value.slice(0, this.start) + this.value.slice(this.end), this.start, 'deleteContentForward')
    } else if (this.start < this.value.length) {
      this.apply(this.value.slice(0, this.start) + this.value.slice(this.start + 1), this.start, 'deleteContentForward')
    }
  }

  private apply(raw: string, caret: number, inputType: string | undefined) {
    const r = applyMaskedEdit({
      prevDisplay: this.value,
      prevDigits: this.digits,
      raw,
      caret,
      inputType,
      format: this.format,
      maxDigits: this.maxDigits,
    })
    this.digits = r.digits
    this.value = r.display
    this.start = this.end = r.caret
  }
}

const mileage = (digits: string) => new FieldModel(digits, groupDigits, 9)

describe('поле с маской: быстрый ввод', () => {
  it.each(['insertText', 'insertFromPaste', 'insertReplacementText', undefined])(
    'замена выделенного «125 150» на 125300 одним событием сохраняет все цифры (%s)',
    (inputType) => {
      // Быстрый ввод, который браузер или IME отдал одним событием, или вставка.
      // Цифр столько же, а текст короче (нет пробела) - раньше это считалось
      // стиранием разделителя и последняя цифра пропадала: «12 530».
      const f = mileage('125150')
      f.selectAll()
      f.insert('125300', inputType)
      expect(f.digits).toBe('125300')
      expect(f.value).toBe('125 300')
      expect(f.start).toBe(7)
    },
  )

  it.each(['insertText', undefined])('ввод по клавише поверх выделения: каждая цифра остаётся, каретка после последней (%s)', (inputType) => {
    const f = mileage('125150')
    f.selectAll()
    const typed = '125300'
    for (let i = 0; i < typed.length; i++) {
      f.insert(typed[i] as string, inputType)
      expect(f.digits).toBe(typed.slice(0, i + 1))
      expect(f.start).toBe(f.value.length)
    }
    expect(f.value).toBe('125 300')
  })

  it('обработчик со значением прошлого рендера не теряет цифру', () => {
    // Поле ещё не перерисовано: в нём сырой текст «125300», а состояние
    // компонента - прежнее «125 150».
    for (const inputType of ['insertText', undefined]) {
      const r = applyMaskedEdit({
        prevDisplay: '125 150',
        prevDigits: '125150',
        raw: '125300',
        caret: 6,
        inputType,
        format: groupDigits,
        maxDigits: 9,
      })
      expect(r).toEqual({ digits: '125300', display: '125 300', caret: 7 })
    }
  })

  it('ввод в середину и сверх максимума', () => {
    const f = mileage('125150')
    f.select(3)
    f.insert('9')
    expect(f.value).toBe('1 259 150')
    expect(f.start).toBe(5)

    const full = mileage('123456789')
    full.insert('0')
    expect(full.value).toBe('123 456 789')
    expect(full.start).toBe(full.value.length)
  })

  it('не цифра не меняет значение и каретку', () => {
    const f = mileage('125150')
    f.insert('a')
    expect(f.digits).toBe('125150')
    expect(f.value).toBe('125 150')
    expect(f.start).toBe(7)
  })

  it('замена выделения в других масках: телефон, дата, СНИЛС', () => {
    const phone = new FieldModel('9001234567', (d) => formatPhoneNational('RU', d), 10)
    phone.selectAll()
    phone.insert('9001234568', 'insertFromPaste')
    expect(phone.value).toBe('(900) 123-45-68')

    const date = new FieldModel('01102026', formatDateDigits, 8)
    date.selectAll()
    date.insert('05102026')
    expect(date.value).toBe('05.10.2026')

    const snils = new FieldModel('12345678901', formatSnils, 11)
    snils.selectAll()
    snils.insert('98765432100', undefined)
    expect(snils.value).toBe('987-654-321 00')
  })
})

describe('поле с маской: стирание', () => {
  it.each([true, false])('Backspace после разделителя стирает цифру перед ним (inputType: %s)', (withType) => {
    const f = mileage('125150')
    f.select(4)
    f.backspace(withType)
    expect(f.digits).toBe('12150')
    expect(f.value).toBe('12 150')
    expect(f.start).toBe(2)
  })

  it('Delete перед разделителем стирает цифру после него', () => {
    const f = mileage('125150')
    f.select(3)
    f.del()
    expect(f.digits).toBe('12550')
    expect(f.value).toBe('12 550')
    expect(f.start).toBe(4)
  })

  it('обычный Backspace стирает одну цифру', () => {
    const f = mileage('125150')
    f.backspace()
    expect(f.digits).toBe('12515')
    expect(f.value).toBe('12 515')
    expect(f.start).toBe(6)
  })

  it('Backspace по разделителю телефона', () => {
    const f = new FieldModel('9001234567', (d) => formatPhoneNational('RU', d), 10)
    // «(900) 123-|45-67»: стирается «-», а с ним цифра 3.
    f.select(10)
    f.backspace()
    expect(f.digits).toBe('900124567')
    expect(f.value).toBe('(900) 124-56-7')
    expect(f.start).toBe(8)
  })
})
