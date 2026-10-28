/*
 * Скрипт темы для <head>. Модуль без 'use client': серверный layout
 * вставляет строку как есть, до первой отрисовки - без вспышки другой темы.
 *
 * <html data-theme="dark|light" data-accent="indigo|amber|..." data-style="default|slim">
 * Выбор пользователя хранится в localStorage: тема - 'dark' | 'light' | 'system'.
 */

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'
export const ACCENTS = ['indigo', 'amber', 'emerald', 'cyan', 'rose', 'violet', 'ink'] as const
export type Accent = (typeof ACCENTS)[number]
/** Стили оформления: те же размеры и раскладка, другая подача. */
export const STYLES = ['default', 'slim'] as const
export type Style = (typeof STYLES)[number]

export const THEME_STORAGE_KEY = 'ev-theme'
export const ACCENT_STORAGE_KEY = 'ev-accent'
export const STYLE_STORAGE_KEY = 'ev-style'

export interface ThemeScriptOptions {
  /** Тема без сохранённого выбора. По умолчанию - 'dark'. */
  defaultTheme?: ThemePreference
  /** Акцент без сохранённого выбора. По умолчанию - 'indigo'. */
  defaultAccent?: Accent
  /** Стиль без сохранённого выбора. По умолчанию - 'default'. */
  defaultStyle?: Style
  themeKey?: string
  accentKey?: string
  styleKey?: string
}

/** Код скрипта: ставит data-theme, data-accent и data-style на <html>. */
export function themeBootstrap({
  defaultTheme = 'dark',
  defaultAccent = 'indigo',
  defaultStyle = 'default',
  themeKey = THEME_STORAGE_KEY,
  accentKey = ACCENT_STORAGE_KEY,
  styleKey = STYLE_STORAGE_KEY,
}: ThemeScriptOptions = {}): string {
  const cfg = JSON.stringify({ t: defaultTheme, a: defaultAccent, s: defaultStyle, tk: themeKey, ak: accentKey, sk: styleKey })
  return `(function(){var c=${cfg},d=document.documentElement,t=c.t,a=c.a,s=c.s;try{t=localStorage.getItem(c.tk)||t;a=localStorage.getItem(c.ak)||a;s=localStorage.getItem(c.sk)||s}catch(e){}var p=t==='system'?'system':t==='light'?'light':'dark';if(p==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t==='light'?'light':'dark';d.dataset.themePref=p;if(a&&a!=='indigo')d.dataset.accent=a;else delete d.dataset.accent;if(s&&s!=='default')d.dataset.style=s;else delete d.dataset.style})()`
}

export interface ThemeScriptProps extends ThemeScriptOptions {
  /** nonce для строгой CSP (script-src 'nonce-...'): тот же, что у остальных скриптов страницы. */
  nonce?: string
}

/** Скрипт для <head> корневого layout. Не требует клиента: подходит для серверных компонентов. */
export function ThemeScript({ nonce, ...options }: ThemeScriptProps) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap(options) }} />
}
