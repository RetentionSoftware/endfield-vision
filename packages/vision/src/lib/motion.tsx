'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useIsoLayoutEffect, useMediaQuery } from './hooks'

/*
 * Анимация появления: числа набираются, графики строятся, когда элемент
 * впервые попадает в видимую область. Опция: проп animate у компонента или
 * MotionProvider для всего приложения; по умолчанию выключена. При
 * «уменьшить движение» в настройках системы анимация не запускается.
 *
 * Серверная разметка - всегда итоговое состояние (без JS всё видно). На
 * клиенте до появления в области видимости элемент получает
 * data-ev-motion="idle" (стартовое состояние), при появлении - "run".
 */

export interface MotionSettings {
  /** Анимировать появление по умолчанию (проп animate компонента сильнее). */
  animate: boolean
  /** Длительность анимации, мс. */
  duration: number
}

const DEFAULTS: MotionSettings = { animate: false, duration: 900 }

const MotionContext = createContext<MotionSettings>(DEFAULTS)

export function MotionProvider({ animate = true, duration = DEFAULTS.duration, children }: Partial<MotionSettings> & { children: ReactNode }) {
  const value = useMemo(() => ({ animate, duration }), [animate, duration])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotionSettings(): MotionSettings {
  return useContext(MotionContext)
}

/** Пользователь просит уменьшить движение (настройка ОС). */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Замедление к концу: быстрый старт, мягкая посадка. */
export function easeOutCubic(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return 1 - (1 - x) ** 3
}

/**
 * Фаза анимации появления:
 * - 'static' - анимация выключена (или сервер, или «уменьшить движение»): итоговое состояние;
 * - 'idle' - элемент ещё не виден: стартовое состояние;
 * - 'run' - элемент появился: анимация идёт (и остаётся 'run' после окончания).
 */
export type MotionPhase = 'static' | 'idle' | 'run'

export interface EntranceMotion {
  phase: MotionPhase
  /** Длительность из пропа или MotionProvider, мс. */
  duration: number
  /** Атрибут для CSS-анимаций: data-ev-motion={phase} (на 'static' - не ставится). */
  attr: MotionPhase | undefined
}

/**
 * Анимация появления по IntersectionObserver: запускается один раз, когда
 * не меньше threshold элемента видно. animate - проп компонента (undefined -
 * берётся из MotionProvider).
 */
export function useEntranceMotion(
  ref: RefObject<Element | null>,
  animate: boolean | undefined,
  options: { duration?: number; threshold?: number } = {},
): EntranceMotion {
  const settings = useMotionSettings()
  const reduced = useReducedMotion()
  const enabled = (animate ?? settings.animate) && !reduced
  const duration = options.duration ?? settings.duration
  const threshold = options.threshold ?? 0.25
  const [phase, setPhase] = useState<MotionPhase>('static')
  const played = useRef(false)

  // До первой отрисовки на клиенте: стартовое состояние, иначе график мелькнёт готовым.
  useIsoLayoutEffect(() => {
    if (!enabled) {
      setPhase('static')
      return
    }
    if (!played.current) setPhase('idle')
  }, [enabled])

  useEffect(() => {
    const el = ref.current
    if (!enabled || played.current || !el) return
    if (typeof IntersectionObserver === 'undefined') {
      // Без IntersectionObserver - сразу, но после отрисовки стартового кадра.
      const raf = requestAnimationFrame(() => {
        played.current = true
        setPhase('run')
      })
      return () => cancelAnimationFrame(raf)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          played.current = true
          setPhase('run')
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, ref, threshold])

  return { phase, duration, attr: phase === 'static' ? undefined : phase }
}

/**
 * Прогресс анимации 0..1 с замедлением (для анимаций, которые считает JS:
 * дуги колец и шкал, доли диаграммы). 'static' - сразу 1, 'idle' - 0.
 */
export function useMotionProgress(phase: MotionPhase, duration: number): number {
  const [t, setT] = useState(phase === 'idle' ? 0 : 1)
  useIsoLayoutEffect(() => {
    if (phase === 'static') {
      setT(1)
      return
    }
    if (phase === 'idle') {
      setT(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const x = Math.min((now - start) / duration, 1)
      setT(easeOutCubic(x))
      if (x < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, duration])
  return t
}

/**
 * Число, которое плавно идёт к target: при появлении - от нуля, при смене
 * значения - от прежнего. На 'static' - всегда target.
 */
export function useCountUp(target: number, phase: MotionPhase, duration: number): number {
  const [current, setCurrent] = useState(target)
  const from = useRef(0)
  const shown = useRef(target)

  useIsoLayoutEffect(() => {
    if (phase === 'static') {
      shown.current = target
      setCurrent(target)
      return
    }
    if (phase === 'idle') {
      shown.current = 0
      setCurrent(0)
      return
    }
    from.current = shown.current
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const x = Math.min((now - start) / duration, 1)
      const v = from.current + (target - from.current) * easeOutCubic(x)
      shown.current = v
      setCurrent(v)
      if (x < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, phase, duration])

  return current
}

/** Число внутри готовой строки: «12 845 000 ₽», «96,4%», «+3,8%», «1,234.5 kg». */
export interface NumericText {
  prefix: string
  value: number
  suffix: string
  /** Знаков после запятой - как в исходной строке. */
  decimals: number
  /** В исходной строке были разделители разрядов. */
  grouping: boolean
}

/**
 * Разбор числа в строке по правилам языка intl: разделители разрядов
 * (в т. ч. неразрывные пробелы) и дробной части. Нет числа - null.
 */
export function parseNumericText(text: string, intl: string): NumericText | null {
  const parts = new Intl.NumberFormat(intl).formatToParts(1234567.5)
  const group = parts.find((p) => p.type === 'group')?.value ?? ','
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.'
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Пробел-разделитель разрядов: обычный, неразрывный и узкий неразрывный.
  const groupClass = /\s/.test(group) ? '[\\s\\u00a0\\u202f]' : esc(group)
  const re = new RegExp(`(-?\\d{1,3}(?:${groupClass}\\d{3})+|-?\\d+)(?:${esc(decimal)}(\\d+))?`)
  const m = re.exec(text)
  if (!m || m.index === undefined) return null
  const intPart = m[1]!.replace(new RegExp(groupClass, 'g'), '')
  const frac = m[2] ?? ''
  const value = Number(`${intPart}${frac ? `.${frac}` : ''}`)
  if (!Number.isFinite(value)) return null
  return {
    prefix: text.slice(0, m.index),
    value,
    suffix: text.slice(m.index + m[0].length),
    decimals: frac.length,
    grouping: m[1]!.length !== intPart.length,
  }
}

/** Собрать строку обратно с промежуточным значением. */
export function formatNumericText(n: NumericText, value: number, intl: string): string {
  const s = value.toLocaleString(intl, {
    minimumFractionDigits: n.decimals,
    maximumFractionDigits: n.decimals,
    useGrouping: n.grouping,
  })
  return `${n.prefix}${s}${n.suffix}`
}
