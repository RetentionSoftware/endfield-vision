'use client'

import { useSyncExternalStore } from 'react'

/*
 * Анимация появления в демо-консоли: настройка браузера (включена по умолчанию).
 * На сервере и при гидрации - включена, затем применяется сохранённый выбор.
 */

const KEY = 'ev-playground-motion'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function setMotionPref(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // Приватный режим: выбор действует до перезагрузки.
  }
  for (const l of listeners) l()
}

export function useMotionPref(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => true,
  )
}
