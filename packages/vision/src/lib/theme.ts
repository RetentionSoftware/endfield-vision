'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { ACCENT_STORAGE_KEY, THEME_STORAGE_KEY, type Accent, type Theme, type ThemePreference } from './theme-script'

/*
 * Тема и акцент во время работы. Источник истины - атрибуты <html>
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

function readAccent(): Accent {
  return (document.documentElement.dataset.accent as Accent | undefined) ?? 'indigo'
}

/** Тема: 'dark' | 'light' или 'system' - по настройке ОС. */
export function setTheme(pref: ThemePreference, { persist = true, storageKey = THEME_STORAGE_KEY } = {}): void {
  const root = document.documentElement
  root.dataset.themePref = pref
  root.dataset.theme = pref === 'system' ? systemTheme() : pref
  if (persist) store(storageKey, pref)
  emit()
}

/** Акцент из пресетов (styles/accents.css). 'indigo' - базовый, атрибут снимается. */
export function setAccent(accent: Accent, { persist = true, storageKey = ACCENT_STORAGE_KEY } = {}): void {
  const root = document.documentElement
  if (accent === 'indigo') delete root.dataset.accent
  else root.dataset.accent = accent
  if (persist) store(storageKey, accent)
  emit()
}

export interface ThemeState {
  /** Действующая тема. */
  theme: Theme
  /** Выбор пользователя (может быть 'system'). */
  preference: ThemePreference
  accent: Accent
  setTheme: typeof setTheme
  setAccent: typeof setAccent
}

export function useTheme(): ThemeState {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme)
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'dark' as ThemePreference)
  const accent = useSyncExternalStore(subscribe, readAccent, () => 'indigo' as Accent)

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

  return { theme, preference, accent, setTheme, setAccent }
}
