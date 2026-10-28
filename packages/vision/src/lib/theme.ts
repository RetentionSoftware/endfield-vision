'use client'

import { useEffect, useSyncExternalStore } from 'react'
import {
  ACCENT_STORAGE_KEY,
  STYLE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type Accent,
  type AccentName,
  type Style,
  type Theme,
  type ThemePreference,
} from './theme-script'

/*
 * Тема, акцент и стиль во время работы. Источник истины - атрибуты <html>
 * (их ставит ThemeScript до отрисовки), выбор сохраняется в localStorage.
 * На сервере и при гидрации - значения по умолчанию, затем реальные.
 */

const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Приватный режим: выбор действует до перезагрузки.
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function readPreference(): ThemePreference {
  const p = document.documentElement.dataset.themePref
  return p === 'system' || p === 'light' ? p : p === 'dark' ? 'dark' : readTheme()
}

function readAccent(): string {
  return document.documentElement.dataset.accent ?? 'indigo'
}

function readStyle(): Style {
  return (document.documentElement.dataset.style as Style | undefined) ?? 'default'
}

/** Тема: 'dark' | 'light' или 'system' - по настройке ОС. */
export function setTheme(pref: ThemePreference, { persist = true, storageKey = THEME_STORAGE_KEY } = {}): void {
  const root = document.documentElement
  root.dataset.themePref = pref
  root.dataset.theme = pref === 'system' ? systemTheme() : pref
  if (persist) store(storageKey, pref)
  emit()
}

/** Акцент: встроенный пресет (styles/accents.css) или свой (AccentPreset). 'indigo' - базовый, атрибут снимается. */
export function setAccent(accent: AccentName, { persist = true, storageKey = ACCENT_STORAGE_KEY } = {}): void {
  const root = document.documentElement
  if (accent === 'indigo') delete root.dataset.accent
  else root.dataset.accent = accent
  if (persist) store(storageKey, accent)
  emit()
}

/** Стиль оформления (styles/slim.css и др.). 'default' - базовый, атрибут снимается. */
export function setStyle(style: Style, { persist = true, storageKey = STYLE_STORAGE_KEY } = {}): void {
  const root = document.documentElement
  if (style === 'default') delete root.dataset.style
  else root.dataset.style = style
  if (persist) store(storageKey, style)
  emit()
}

/**
 * Состояние темы. A - имена акцентов приложения: по умолчанию встроенные;
 * со своими пресетами - useTheme<Accent | 'brand'>().
 */
export interface ThemeState<A extends string = Accent> {
  /** Действующая тема. */
  theme: Theme
  /** Выбор пользователя (может быть 'system'). */
  preference: ThemePreference
  accent: A
  style: Style
  setTheme: typeof setTheme
  setAccent: typeof setAccent
  setStyle: typeof setStyle
}

export function useTheme<A extends string = Accent>(): ThemeState<A> {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme)
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'dark' as ThemePreference)
  const accent = useSyncExternalStore(subscribe, readAccent, () => 'indigo') as A
  const style = useSyncExternalStore(subscribe, readStyle, () => 'default' as Style)

  // Режим 'system': следим за сменой темы ОС.
  useEffect(() => {
    if (preference !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      document.documentElement.dataset.theme = mql.matches ? 'light' : 'dark'
      emit()
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [preference])

  return { theme, preference, accent, style, setTheme, setAccent, setStyle }
}
