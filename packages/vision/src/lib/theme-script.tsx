/*
 * Скрипт темы для <head>. Модуль без 'use client': серверный layout
 * вставляет строку как есть, до первой отрисовки - без вспышки другой темы.
 *
 * <html data-theme="dark|light" data-accent="indigo|amber|...">
 * Выбор пользователя хранится в localStorage: тема - 'dark' | 'light' | 'system'.
 */

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'
export const ACCENTS = ['indigo', 'amber', 'emerald', 'cyan', 'rose', 'violet'] as const
export type Accent = (typeof ACCENTS)[number]

export const THEME_STORAGE_KEY = 'ev-theme'
export const ACCENT_STORAGE_KEY = 'ev-accent'

export interface ThemeScriptOptions {
  /** Тема без сохранённого выбора. По умолчанию - 'dark'. */
  defaultTheme?: ThemePreference
  /** Акцент без сохранённого выбора. По умолчанию - 'indigo'. */
  defaultAccent?: Accent
  themeKey?: string
  accentKey?: string
}

/** Код скрипта: ставит data-theme и data-accent на <html>. */
export function themeBootstrap({
  defaultTheme = 'dark',
  defaultAccent = 'indigo',
  themeKey = THEME_STORAGE_KEY,
  accentKey = ACCENT_STORAGE_KEY,
}: ThemeScriptOptions = {}): string {
  const cfg = JSON.stringify({ t: defaultTheme, a: defaultAccent, tk: themeKey, ak: accentKey })
  return `(function(){var c=${cfg},d=document.documentElement,t=c.t,a=c.a;try{t=localStorage.getItem(c.tk)||t;a=localStorage.getItem(c.ak)||a}catch(e){}var p=t==='system'?'system':t==='light'?'light':'dark';if(p==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t==='light'?'light':'dark';d.dataset.themePref=p;if(a&&a!=='indigo')d.dataset.accent=a;else delete d.dataset.accent})()`
}

/** Скрипт для <head> корневого layout. Не требует клиента: подходит для серверных компонентов. */
export function ThemeScript(props: ThemeScriptOptions) {
  return <script dangerouslySetInnerHTML={{ __html: themeBootstrap(props) }} />
}
