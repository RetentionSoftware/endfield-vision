'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'

/** useLayoutEffect без предупреждения при серверном рендере. */
export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Стабильная ссылка на последнюю версию колбэка. Нужна для обработчиков,
 * которые подписываются в эффектах и не должны переподписываться на каждый рендер.
 */
export function useEventCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn)
  useIsoLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}

/**
 * Контролируемое или внутреннее состояние: если value передан - компонент
 * управляется снаружи, иначе хранит значение сам (defaultValue).
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  const set = useEventCallback((next: T) => {
    if (!controlled) setInner(next)
    onChange?.(next)
  })
  return [current, set]
}

/** Признак клиента после гидрации: порталы и window только после него. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

function noopSubscribe(): () => void {
  return () => undefined
}

/** Медиа-запрос; на сервере - false. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Ширина элемента через ResizeObserver (для адаптивных графиков). */
export function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/** Клик или касание вне перечисленных элементов. */
export function useOutsideClick(
  refs: Array<RefObject<HTMLElement | null>>,
  handler: (e: PointerEvent) => void,
  enabled = true,
): void {
  const cb = useEventCallback(handler)
  useEffect(() => {
    if (!enabled) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (!t) return
      for (const r of refs) if (r.current?.contains(t)) return
      // Клик во вложенном слое (выпадающий список внутри поповера) не закрывает
      // родителя. Слои - порталы в body, поэтому открытый позже стоит дальше в DOM.
      const layer = t instanceof Element ? t.closest('[data-ev-layer]') : t.parentElement?.closest('[data-ev-layer]')
      if (layer) {
        for (const r of refs) {
          const own = r.current
          if (own?.hasAttribute('data-ev-layer') && own.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING) return
        }
      }
      cb(e)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
    // refs - массив ref-объектов, сами объекты стабильны
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cb])
}

/** Значение с задержкой: поиск в списках не дёргает API на каждую букву. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return v
}
