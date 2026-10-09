'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsoLayoutEffect } from './hooks'

/*
 * Фильтры списка в адресной строке.
 *
 * useUrlFilters держит плоский объект фильтров в двусторонней связи со
 * строкой запроса: изменение фильтра переписывает адрес через
 * history.replaceState (история не засоряется - «назад» уводит со страницы,
 * а не перебирает состояния чекбоксов), переход по истории (popstate)
 * перечитывает фильтры из адреса. Хук не зависит от роутера.
 *
 * Хук управляет только ключами из defaults: остальные параметры адреса
 * (?tab=, ?page= другого компонента) не трогаются. В адрес пишутся только
 * значения, отличные от значений по умолчанию.
 *
 * Запоминание: со scope последние фильтры хранятся в localStorage и
 * подставляются, когда раздел открыт без своих параметров (пункт меню ведёт
 * на голый адрес). Ссылка с параметрами главнее запомненного.
 *
 * Гидрация: сервер и первый клиентский рендер видят defaults, адрес и
 * хранилище читаются в эффекте после монтирования.
 *
 * Next.js (App Router, 14.1+): прямые вызовы window.history.replaceState
 * синхронизируются с роутером - useSearchParams и usePathname видят новый
 * адрес, перерисовки сервера и перехода не происходит.
 */

export type FilterValue = string | number | boolean | string[] | null | undefined
export type FilterValues = Record<string, FilterValue>

export interface UrlFiltersOptions<T extends FilterValues> {
  /** Ключ запоминания (раздел, список). Без него фильтры не запоминаются. */
  scope?: string
  /** Где запоминать: localStorage (по умолчанию при наличии scope) или нигде. */
  storage?: 'local' | 'none'
  /** Своя запись в строку запроса (по умолчанию - serializeFilters). */
  serialize?: (filters: T, defaults: T) => URLSearchParams
  /** Своё чтение из строки запроса (по умолчанию - parseFilters). */
  parse?: (params: URLSearchParams, defaults: T) => T
}

export interface UrlFiltersApi<T extends FilterValues> {
  filters: T
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void
  setFilters: (patch: Partial<T> | ((prev: T) => Partial<T>)) => void
  /** Вернуть значения по умолчанию и очистить запомненное. */
  reset: () => void
  /** Сколько фильтров отличается от значений по умолчанию. */
  activeCount: number
}

/** Префикс ключей localStorage. */
export const URL_FILTERS_STORAGE_PREFIX = 'ev.filters.'

function isEmpty(v: FilterValue): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

/** Совпадают ли значения фильтра (массивы - по содержимому и порядку, пустые значения равны между собой). */
export function filterValueEquals(a: FilterValue, b: FilterValue): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => x === b[i])
  }
  return a === b
}

function encodeValue(v: FilterValue): string {
  if (isEmpty(v)) return ''
  if (Array.isArray(v)) return v.join(',')
  if (typeof v === 'boolean') return v ? '1' : '0'
  return String(v)
}

/**
 * Фильтры - в параметры адреса: только ключи, отличные от defaults.
 * Массив - через запятую, логическое - 1/0, пустое при непустом значении по
 * умолчанию - пустой параметр (?status=), чтобы «все» не читалось обратно
 * как значение по умолчанию.
 */
export function serializeFilters<T extends FilterValues>(filters: T, defaults: T): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of Object.keys(defaults)) {
    const v = filters[key]
    if (filterValueEquals(v, defaults[key])) continue
    sp.set(key, encodeValue(v))
  }
  return sp
}

/**
 * Параметры адреса - в фильтры. Тип значения берётся из defaults: массив -
 * список через запятую, число - Number (нечисло - значение по умолчанию),
 * логическое - 1/true и 0/false, остальное - строка. Ключи не из defaults
 * игнорируются; отсутствующие - значения по умолчанию.
 */
export function parseFilters<T extends FilterValues>(params: URLSearchParams, defaults: T): T {
  const out: FilterValues = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const raw = params.get(key)
    if (raw === null) continue
    const def = defaults[key]
    if (Array.isArray(def)) {
      out[key] = raw === '' ? [] : raw.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (typeof def === 'number') {
      const n = raw === '' ? Number.NaN : Number(raw)
      out[key] = Number.isFinite(n) ? n : def
    } else if (typeof def === 'boolean') {
      out[key] = raw === '1' || raw === 'true' ? true : raw === '0' || raw === 'false' ? false : def
    } else {
      out[key] = raw
    }
  }
  return out as T
}

/** Есть ли в адресе хоть один параметр фильтров. */
export function hasFilterParams(params: URLSearchParams, keys: string[]): boolean {
  return keys.some((k) => params.has(k))
}

/** Сколько фильтров отличается от значений по умолчанию (для счётчика на кнопке «Фильтры»). */
export function countActiveFilters<T extends FilterValues>(filters: T, defaults: T): number {
  let n = 0
  for (const key of Object.keys(defaults)) if (!filterValueEquals(filters[key], defaults[key])) n += 1
  return n
}

/**
 * Новый адрес: параметры фильтров заменены, остальные сохранены по порядку.
 * managed - все ключи фильтров (удаляются, если их нет в next).
 */
export function mergeFilterSearch(search: string, next: URLSearchParams, managed: string[]): string {
  const sp = new URLSearchParams(search)
  for (const k of managed) sp.delete(k)
  next.forEach((v, k) => sp.append(k, v))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, qs: string): void {
  try {
    if (qs) window.localStorage.setItem(key, qs)
    else window.localStorage.removeItem(key)
  } catch {
    // Приватный режим или переполнение - фильтры просто не запомнятся.
  }
}

/**
 * Фильтры списка в адресе страницы с запоминанием по scope.
 *
 *   const { filters, setFilter, reset, activeCount } = useUrlFilters(
 *     { q: '', status: [] as string[], overdue: false },
 *     { scope: 'tasks' },
 *   )
 */
export function useUrlFilters<T extends FilterValues>(defaults: T, options: UrlFiltersOptions<T> = {}): UrlFiltersApi<T> {
  const { scope, storage = 'local', serialize = serializeFilters, parse = parseFilters } = options
  const [filters, setState] = useState<T>(defaults)

  // Значения по умолчанию и функции часто приходят литералами: держим последние в ref.
  const cfg = useRef({ defaults, serialize, parse })
  useIsoLayoutEffect(() => {
    cfg.current = { defaults, serialize, parse }
  })
  const current = useRef<T>(defaults)
  const storageKey = scope && storage === 'local' ? URL_FILTERS_STORAGE_PREFIX + scope : null

  const managedKeys = useCallback((...extra: URLSearchParams[]) => {
    const keys = new Set(Object.keys(cfg.current.defaults))
    for (const sp of extra) sp.forEach((_, k) => keys.add(k))
    return [...keys]
  }, [])

  const commit = useCallback(
    (next: T) => {
      const { defaults: defs, serialize: ser } = cfg.current
      const prevParams = ser(current.current, defs)
      const nextParams = ser(next, defs)
      current.current = next
      setState(next)
      const { pathname, search, hash } = window.location
      const qs = mergeFilterSearch(search, nextParams, managedKeys(prevParams, nextParams))
      if (qs !== search) window.history.replaceState(window.history.state, '', `${pathname}${qs}${hash}`)
      if (storageKey) writeStored(storageKey, nextParams.toString())
    },
    [managedKeys, storageKey],
  )

  // После монтирования: адрес, иначе запомненное; дальше - переходы по истории.
  useEffect(() => {
    const readUrl = (): T | null => {
      const { defaults: defs, parse: prs } = cfg.current
      const sp = new URLSearchParams(window.location.search)
      return hasFilterParams(sp, Object.keys(defs)) ? prs(sp, defs) : null
    }
    const fromUrl = readUrl()
    if (fromUrl) {
      current.current = fromUrl
      setState(fromUrl)
    } else if (storageKey) {
      const saved = readStored(storageKey)
      if (saved) commit(cfg.current.parse(new URLSearchParams(saved), cfg.current.defaults))
    }
    const onPop = () => {
      const next = readUrl() ?? cfg.current.defaults
      current.current = next
      setState(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [storageKey, commit])

  const setFilters = useCallback(
    (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
      const p = typeof patch === 'function' ? patch(current.current) : patch
      commit({ ...current.current, ...p })
    },
    [commit],
  )

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      commit({ ...current.current, [key]: value })
    },
    [commit],
  )

  const reset = useCallback(() => {
    commit(cfg.current.defaults)
    if (storageKey) writeStored(storageKey, '')
  }, [commit, storageKey])

  const activeCount = countActiveFilters(filters, defaults)

  return useMemo(() => ({ filters, setFilter, setFilters, reset, activeCount }), [filters, setFilter, setFilters, reset, activeCount])
}
