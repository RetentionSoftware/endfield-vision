'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Вкладка в адресе (?tab=): ссылкой можно поделиться, «назад» возвращает вкладку.
 * Странице с этим хуком нужен Suspense выше (он есть в layout консоли).
 */
export function useUrlTab<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const raw = params.get('tab')
  const tab = raw && (tabs as readonly string[]).includes(raw) ? (raw as T) : fallback
  const setTab = useCallback(
    (t: T) => {
      const next = new URLSearchParams(params.toString())
      if (t === fallback) next.delete('tab')
      else next.set('tab', t)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, router, pathname, fallback],
  )
  return [tab, setTab]
}
