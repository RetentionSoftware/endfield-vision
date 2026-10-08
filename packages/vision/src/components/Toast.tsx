'use client'

import { TriangleAlert, CircleCheck, Info, OctagonAlert, X } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useMessages } from '../lib/i18n'
import { Portal } from '../lib/overlay'

/*
 * Уведомления. Хранилище модульное: toast.* можно вызвать вне React
 * (клиент API, обработчики), а <Toaster /> рисует стек. На экране не больше
 * четырёх карточек, остальные сворачиваются в строку «и ещё N».
 * Повторный показ с тем же id заменяет карточку - без дублей.
 */

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  id?: string
  title: ReactNode
  description?: ReactNode
  tone?: ToastTone
  /** Мс до автоскрытия; null - не скрывать. */
  duration?: number | null
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends Required<Pick<ToastOptions, 'id' | 'tone'>> {
  title: ReactNode
  description?: ReactNode
  duration: number | null
  action?: ToastOptions['action']
  createdAt: number
}

const DEFAULT_DURATION: Record<ToastTone, number> = { info: 4500, success: 3500, warning: 6000, error: 8000 }
const MAX_VISIBLE = 4

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function show(opts: ToastOptions): string {
  const id = opts.id ?? `t${++seq}`
  const tone = opts.tone ?? 'info'
  const item: ToastItem = {
    id,
    tone,
    title: opts.title,
    description: opts.description,
    duration: opts.duration === undefined ? DEFAULT_DURATION[tone] : opts.duration,
    action: opts.action,
    createdAt: Date.now(),
  }
  const exists = items.some((t) => t.id === id)
  items = exists ? items.map((t) => (t.id === id ? item : t)) : [...items, item]
  emit()
  return id
}

function dismiss(id: string) {
  const next = items.filter((t) => t.id !== id)
  if (next.length !== items.length) {
    items = next
    emit()
  }
}

function dismissAll() {
  if (items.length === 0) return
  items = []
  emit()
}

type Shortcut = (title: ReactNode, opts?: Omit<ToastOptions, 'title' | 'tone'> & { description?: ReactNode }) => string

export interface ToastApi {
  show: (opts: ToastOptions) => string
  info: Shortcut
  success: Shortcut
  warning: Shortcut
  error: Shortcut
  dismiss: (id: string) => void
  /** Убрать все (выход из системы: в тостах могли быть персональные данные). */
  dismissAll: () => void
}

export const toast: ToastApi = {
  show,
  info: (title, opts) => show({ ...opts, title, tone: 'info' }),
  success: (title, opts) => show({ ...opts, title, tone: 'success' }),
  warning: (title, opts) => show({ ...opts, title, tone: 'warning' }),
  error: (title, opts) => show({ ...opts, title, tone: 'error' }),
  dismiss,
  dismissAll,
}

export function useToast(): ToastApi {
  return toast
}

const ICONS: Record<ToastTone, ReactNode> = {
  info: <Info size={17} />,
  success: <CircleCheck size={17} />,
  warning: <TriangleAlert size={17} />,
  error: <OctagonAlert size={17} />,
}

function ToastCard({ item }: { item: ToastItem }) {
  const t = useMessages()
  const remaining = useRef(item.duration)
  const started = useRef(0)
  const timer = useRef<number | null>(null)

  const stop = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
      if (remaining.current !== null) remaining.current -= Date.now() - started.current
    }
  }
  const start = () => {
    if (remaining.current === null) return
    started.current = Date.now()
    timer.current = window.setTimeout(() => dismiss(item.id), Math.max(800, remaining.current))
  }

  useEffect(() => {
    remaining.current = item.duration
    start()
    return stop
    // Перезапуск таймера только при замене карточки с тем же id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.createdAt])

  return (
    <div className="ev-toast ev-corners" data-corners="diagonal" data-tone={item.tone} role={item.tone === 'error' ? 'alert' : 'status'} onMouseEnter={stop} onMouseLeave={start}>
      <span className="ev-toast-icon" aria-hidden="true">
        {ICONS[item.tone]}
      </span>
      <div className="ev-toast-body">
        <div className="ev-toast-title">{item.title}</div>
        {item.description ? <div className="ev-toast-desc">{item.description}</div> : null}
        {item.action ? (
          <button
            type="button"
            className="ev-toast-action"
            onClick={() => {
              item.action?.onClick()
              dismiss(item.id)
            }}
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button type="button" className="ev-toast-close" aria-label={t.toast.dismiss} onClick={() => dismiss(item.id)}>
        <X size={14} />
      </button>
    </div>
  )
}

const EMPTY: ToastItem[] = []

/** Стек уведомлений. Ставится один раз в корне приложения. */
export function Toaster() {
  const t = useMessages()
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  )
  const hidden = Math.max(0, list.length - MAX_VISIBLE)
  const visible = list.slice(-MAX_VISIBLE)
  return (
    <Portal>
      <div className="ev-toasts" aria-live="polite">
        {hidden > 0 ? (
          <div className="ev-toasts-more">
            <span>{t.toast.more(hidden)}</span>
            <button type="button" onClick={dismissAll}>
              {t.toast.dismissAll}
            </button>
          </div>
        ) : null}
        {visible.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </div>
    </Portal>
  )
}

/** Провайдер для симметрии с ModalsProvider: рисует Toaster рядом с детьми. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
