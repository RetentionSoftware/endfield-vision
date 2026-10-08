import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { LocaleProvider } from '../lib/i18n'

/** Серверный рендер с русским словарём: проверки разметки написаны на русских подписях. */
export function renderRu(el: ReactElement): string {
  return renderToString(<LocaleProvider locale="ru">{el}</LocaleProvider>)
}
