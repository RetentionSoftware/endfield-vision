import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { LANG_COOKIE, parseLang, type Lang } from './lang'
import { section } from './nav'

/** Язык запроса из cookie (серверные компоненты, generateMetadata). */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value)
}

/** Заголовок страницы раздела на языке запроса. */
export async function sectionMetadata(key: string): Promise<Metadata> {
  const lang = await getLang()
  return { title: section(key).label[lang] }
}

/** Заголовок страницы вне меню (вход и т. п.). */
export async function titleMetadata(ru: string, en: string): Promise<Metadata> {
  return { title: (await getLang()) === 'en' ? en : ru }
}
