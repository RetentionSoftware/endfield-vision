import { describe, expect, it } from 'vitest'
import {
  formatByMask,
  formatPhone,
  formatPhoneNational,
  isCompletePhone,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_CODES,
  sanitizePhonePaste,
  splitPhone,
} from '../lib/masks'
import { en, ru } from '../lib/i18n-messages'

describe('маски телефонов', () => {
  it('маска по мере ввода: разделители перед цифрой, скобка - после группы', () => {
    expect(formatByMask('(###) ###-####', '')).toBe('')
    expect(formatByMask('(###) ###-####', '2')).toBe('(2')
    expect(formatByMask('(###) ###-####', '201')).toBe('(201)')
    expect(formatByMask('(###) ###-####', '2015')).toBe('(201) 5')
    expect(formatByMask('# ## ## ## ##', '61234')).toBe('6 12 34')
    expect(formatByMask('##-###-####', '501234567')).toBe('50-123-4567')
  })

  it('плейсхолдер каждой страны - полный номер своей длины', () => {
    for (const code of PHONE_COUNTRY_CODES) {
      const info = PHONE_COUNTRIES[code]
      expect(info.placeholder.replace(/\D/g, '')).toHaveLength(info.length)
      expect(formatPhoneNational(code, info.placeholder.replace(/\D/g, ''))).toBe(info.placeholder)
    }
  })

  it('у каждой страны есть название на обоих языках', () => {
    for (const code of PHONE_COUNTRY_CODES) {
      expect(ru.phone.countries[code]).toBeTruthy()
      expect(en.phone.countries[code]).toBeTruthy()
    }
  })

  it('общий код +7: Казахстан по первым цифрам 6 и 7, остальное - Россия', () => {
    expect(splitPhone('+77011234567')).toEqual({ country: 'KZ', national: '7011234567' })
    expect(splitPhone('+76001234567')).toEqual({ country: 'KZ', national: '6001234567' })
    expect(splitPhone('+79001234567')).toEqual({ country: 'RU', national: '9001234567' })
    expect(splitPhone('87011234567')).toEqual({ country: 'KZ', national: '7011234567' })
  })

  it('самый длинный код побеждает: +998 - не +9...', () => {
    expect(splitPhone('+998901234567').country).toBe('UZ')
    expect(splitPhone('+905321234567')).toEqual({ country: 'TR', national: '5321234567' })
    expect(splitPhone('+919812345678')).toEqual({ country: 'IN', national: '9812345678' })
    expect(splitPhone('+12015550123')).toEqual({ country: 'US', national: '2015550123' })
    expect(splitPhone('+447911123456')).toEqual({ country: 'GB', national: '7911123456' })
  })

  it('неизвестный код - страна по умолчанию с пустой частью', () => {
    expect(splitPhone('+5551234', 'BY')).toEqual({ country: 'BY', national: '' })
    expect(splitPhone('', 'KZ')).toEqual({ country: 'KZ', national: '' })
  })

  it('полный номер - по длине маски страны и списку разрешённых', () => {
    expect(isCompletePhone('+375291234567')).toBe(true)
    expect(isCompletePhone('+37529123456')).toBe(false)
    expect(isCompletePhone('+3741234567')).toBe(false)
    expect(isCompletePhone('+37477123456')).toBe(true)
    expect(isCompletePhone('+8613123456789')).toBe(true)
    expect(isCompletePhone('+77011234567', ['RU'])).toBe(true)
    expect(isCompletePhone('+375291234567', ['RU', 'KZ'])).toBe(false)
  })

  it('вставка: код страны распознаётся, вне списка - номер остаётся в текущей стране', () => {
    expect(sanitizePhonePaste('+375 (29) 123-45-67', 'RU')).toEqual({ country: 'BY', national: '291234567' })
    expect(sanitizePhonePaste('+1 201 555 0123', 'RU')).toEqual({ country: 'US', national: '2015550123' })
    expect(sanitizePhonePaste('+375291234567', 'RU', ['RU', 'KZ'])).toEqual({ country: 'RU', national: '3752912345' })
  })

  it('вывод номера', () => {
    expect(formatPhone('+77011234567')).toBe('+7 (701) 123-45-67')
    expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78')
    expect(formatPhone('+995555123456')).toBe('+995 (555) 12-34-56')
  })
})
