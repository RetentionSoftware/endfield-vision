'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { en, resolveMessages, type Locale, type Messages, type MessagesOverride } from './i18n-messages'

/*
 * Язык встроенных текстов. Без провайдера - английский. Провайдер ставится
 * в корне приложения (рядом с LinkProvider); вложенный провайдер меняет язык
 * для части страницы.
 */

const LocaleContext = createContext<Messages>(en)

export interface LocaleProviderProps {
  locale: Locale
  /** Свои формулировки поверх словаря языка. */
  messages?: MessagesOverride
  children: ReactNode
}

export function LocaleProvider({ locale, messages, children }: LocaleProviderProps) {
  const value = useMemo(() => resolveMessages(locale, messages), [locale, messages])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** Словарь текущего языка. */
export function useMessages(): Messages {
  return useContext(LocaleContext)
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

/** Число в формате текущего языка (разряды, дробная часть). */
export function useNumberFormat(): (n: number, options?: Intl.NumberFormatOptions) => string {
  const { intl } = useContext(LocaleContext)
  return useMemo(() => (n: number, options?: Intl.NumberFormatOptions) => n.toLocaleString(intl, options), [intl])
}
