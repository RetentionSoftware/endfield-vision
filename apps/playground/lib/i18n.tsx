'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { formatDate, formatDateTime, formatNum, formatRub, formatRubShort, plural } from './format'
import { LANG_COOKIE, type Bi, type Lang } from './lang'
import { crumbs } from './nav'

/*
 * Язык демо-консоли: русский или английский. Выбор - в cookie, поэтому сервер
 * сразу рендерит нужный язык (без мелькания русского при перезагрузке).
 * Переключение - в настройках профиля и в палитре команд.
 *
 * В компонентах: const { t, tx } = useT()
 *   t('Сохранить', 'Save')     - пара строк прямо в коде экрана;
 *   tx(item.title)             - двуязычное значение из демо-данных ({ ru, en }).
 */

export type { Bi, Lang } from './lang'
export { bi } from './lang'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'ru', setLang: () => undefined })

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(initial)
  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      document.documentElement.lang = next
      setLangState(next)
      // Серверные части (заголовки страниц) - на новом языке.
      router.refresh()
    },
    [router],
  )
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  return useContext(LangContext)
}

export interface Translator {
  lang: Lang
  /** Локаль Intl для своих вызовов toLocaleString. */
  intl: 'ru-RU' | 'en-US'
  /** Пара строк: русская и английская. */
  t: (ru: string, en: string) => string
  /** Двуязычное значение из демо-данных; обычная строка - как есть. */
  tx: (value: Bi | string) => string
  /** Склонение: ru - [один, несколько, много], en - [one, other]. */
  plural: (n: number, ru: [string, string, string], en: [string, string]) => string
  formatNum: (n: number) => string
  formatRub: (kopecks: number) => string
  formatRubShort: (kopecks: number) => string
  formatDate: (iso: string | null) => string | null
  formatDateTime: (iso: string) => string
}

export function translator(lang: Lang): Translator {
  return {
    lang,
    intl: lang === 'en' ? 'en-US' : 'ru-RU',
    t: (ru, en) => (lang === 'en' ? en : ru),
    tx: (value) => (typeof value === 'string' ? value : value[lang]),
    plural: (n, ruForms, enForms) => (lang === 'en' ? (n === 1 ? enForms[0] : enForms[1]) : plural(n, ...ruForms)),
    formatNum: (n) => formatNum(n, lang),
    formatRub: (k) => formatRub(k, lang),
    formatRubShort: (k) => formatRubShort(k, lang),
    formatDate: (iso) => formatDate(iso),
    formatDateTime: (iso) => formatDateTime(iso),
  }
}

export function useT(): Translator {
  const { lang } = useLang()
  return useMemo(() => translator(lang), [lang])
}

/** Хлебные крошки раздела на текущем языке: «Консоль / Раздел / ...rest». */
export function useCrumbs(key: string, ...rest: Array<{ label: string; href?: string }>) {
  const { lang } = useLang()
  return crumbs(key, lang, ...rest)
}
