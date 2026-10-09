/*
 * Типы и константы языка демо-консоли. Модуль без 'use client': его читают и
 * серверные части (layout, заголовки страниц), и демо-данные.
 */

export type Lang = 'ru' | 'en'

/** Двуязычное значение в демо-данных. */
export interface Bi {
  ru: string
  en: string
}

export function bi(ru: string, en: string): Bi {
  return { ru, en }
}

export const LANG_COOKIE = 'ev-playground-lang'

export function parseLang(value: string | undefined | null): Lang {
  return value === 'en' ? 'en' : 'ru'
}
