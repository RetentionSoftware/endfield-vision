/*
 * Форматирование для вывода. Деньги хранятся в копейках (целые числа),
 * как в MoneyInput библиотеки; рубли - только при показе. Язык - параметр
 * (в компонентах удобнее useT() из lib/i18n: функции там уже привязаны к языку).
 * Даты - «ДД.ММ.ГГГГ» на обоих языках, как в полях библиотеки.
 */

import type { Lang } from './lang'

const INTL: Record<Lang, string> = { ru: 'ru-RU', en: 'en-US' }

const rub = {
  ru: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
}
const rubExact = {
  ru: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }),
  en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }),
}
const num = { ru: new Intl.NumberFormat('ru-RU'), en: new Intl.NumberFormat('en-US') }

export function formatRub(kopecks: number, lang: Lang = 'ru'): string {
  return kopecks % 100 === 0 ? rub[lang].format(kopecks / 100) : rubExact[lang].format(kopecks / 100)
}

/** Короткая сумма для осей графиков: 1,2 млн / 350 тыс (en: 1.2M / 350K). */
export function formatRubShort(kopecks: number, lang: Lang = 'ru'): string {
  const r = kopecks / 100
  if (Math.abs(r) >= 1_000_000) {
    const v = (r / 1_000_000).toLocaleString(INTL[lang], { maximumFractionDigits: 1 })
    return lang === 'en' ? `${v}M` : `${v} млн`
  }
  if (Math.abs(r) >= 1_000) return lang === 'en' ? `${Math.round(r / 1_000)}K` : `${Math.round(r / 1_000)} тыс`
  return String(Math.round(r))
}

export function formatNum(n: number, lang: Lang = 'ru'): string {
  return num[lang].format(n)
}

/** YYYY-MM-DD -> ДД.ММ.ГГГГ */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** ISO с временем -> ДД.ММ.ГГГГ ЧЧ:ММ */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Русское склонение: plural(5, 'задача', 'задачи', 'задач'). Для двух языков - useT().plural. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
