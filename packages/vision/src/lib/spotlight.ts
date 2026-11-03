'use client'

import { getFocusable } from './overlay'

/*
 * Подсветка элемента поверх интерфейса (coach mark): всё, кроме элемента,
 * уходит под затемнение с размытием, как подложка окна, а вокруг элемента -
 * вырез, кольцо фокуса и расходящаяся волна. Вызывается императивно на DOM-
 * элементе (формы часто живут в окне, в портале, вне провайдеров приложения).
 *
 * Элемент остаётся живым: слой пропускает указатель, можно сразу кликать и
 * печатать. Слой ниже тостов (тост объясняет, зачем подсветка) и выше окон
 * и выпадающих списков. Вырез следует за элементом каждый кадр (прокрутка
 * окна, смена размеров). Закрытие: любое нажатие указателем, Escape (первый
 * закрывает только подсветку, не окно под ней), ввод внутри элемента, таймер.
 * Подсветка одна: новый вызов заменяет предыдущую.
 */

export interface SpotlightOptions {
  /** Отступ выреза от элемента, px (по умолчанию 6). */
  padding?: number
  /** Скругление выреза, px. По умолчанию - --ev-radius-md. */
  radius?: number
  /** Перевести фокус внутрь элемента: на первый фокусируемый (или сам элемент). */
  focus?: boolean
  /** Закрыть через столько мс (по умолчанию 4000); 0 - только по действию пользователя. */
  timeout?: number
  /** Вызывается после закрытия (любым способом). */
  onDismiss?: () => void
}

export interface SpotlightRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Путь затемнения с вырезом (для clip-path: path(evenodd, ...)): прямоугольник
 * окна и скруглённый прямоугольник выреза. Радиус не больше половины стороны.
 */
export function spotlightPath(viewW: number, viewH: number, hole: SpotlightRect, radius: number): string {
  const { left: x, top: y, width: w, height: h } = hole
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  const n = (v: number) => Math.round(v * 100) / 100
  return (
    `M0 0H${n(viewW)}V${n(viewH)}H0Z` +
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  )
}

let current: (() => void) | null = null

function cssMs(root: HTMLElement, name: string, fallback: number): number {
  const v = getComputedStyle(root).getPropertyValue(name).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n
}

/** Подсветить элемент. Возвращает функцию закрытия. На сервере - ничего не делает. */
export function spotlight(el: HTMLElement, options: SpotlightOptions = {}): () => void {
  if (typeof document === 'undefined') return () => undefined
  current?.()
  const { padding = 6, focus = false, timeout = 4000, onDismiss } = options
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const root = document.createElement('div')
  root.className = 'ev-spotlight'
  root.setAttribute('aria-hidden', 'true')
  const backdrop = document.createElement('div')
  backdrop.className = 'ev-spotlight-backdrop'
  const ring = document.createElement('div')
  ring.className = 'ev-spotlight-ring'
  root.append(backdrop, ring)
  document.body.append(root)

  const radius = options.radius ?? (parseFloat(getComputedStyle(root).getPropertyValue('--ev-radius-md')) || 8)
  ring.style.setProperty('--ev-spotlight-r', `${radius}px`)

  el.scrollIntoView?.({ block: 'nearest' })

  let last = ''
  let frame = 0
  const place = () => {
    frame = requestAnimationFrame(place)
    if (!el.isConnected) {
      dismiss()
      return
    }
    const b = el.getBoundingClientRect()
    const hole = { left: b.left - padding, top: b.top - padding, width: b.width + padding * 2, height: b.height + padding * 2 }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const key = `${hole.left}|${hole.top}|${hole.width}|${hole.height}|${vw}|${vh}`
    if (key === last) return
    last = key
    backdrop.style.clipPath = `path(evenodd, '${spotlightPath(vw, vh, hole, radius)}')`
    ring.style.left = `${hole.left}px`
    ring.style.top = `${hole.top}px`
    ring.style.width = `${hole.width}px`
    ring.style.height = `${hole.height}px`
  }
  place()
  // Появление - со следующего кадра, чтобы сработал переход.
  requestAnimationFrame(() => {
    if (root.isConnected) root.dataset.state = 'open'
  })

  if (focus) {
    const target = el.matches(':is(a[href], button, input, select, textarea, [tabindex])') ? el : getFocusable(el)[0]
    target?.focus({ preventScroll: true })
  }

  let closed = false
  let timer = 0
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.isComposing) return
    // Раньше слоёв Escape (окно, список): первый Escape закрывает только подсветку.
    e.preventDefault()
    e.stopImmediatePropagation()
    dismiss()
  }
  const onPointer = () => dismiss()
  const onInput = () => dismiss()

  function dismiss() {
    if (closed) return
    closed = true
    if (current === dismiss) current = null
    cancelAnimationFrame(frame)
    window.clearTimeout(timer)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('pointerdown', onPointer, true)
    el.removeEventListener('input', onInput, true)
    root.dataset.state = 'closing'
    const remove = () => root.remove()
    if (reduced) remove()
    else window.setTimeout(remove, cssMs(root, '--ev-dur-slow', 280))
    onDismiss?.()
  }

  window.addEventListener('keydown', onKey, true)
  el.addEventListener('input', onInput, true)
  // Нажатие, которое вызвало подсветку, уже прошло; слушаем следующие.
  window.setTimeout(() => {
    if (!closed) window.addEventListener('pointerdown', onPointer, true)
  }, 0)
  if (timeout > 0) timer = window.setTimeout(dismiss, timeout)

  current = dismiss
  return dismiss
}
