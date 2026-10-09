'use client'

import { useRef, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { formatNumericText, parseNumericText, useCountUp, useEntranceMotion } from '../lib/motion'

/*
 * Число, которое набирается при появлении и плавно меняется при обновлении.
 * Скринридер читает итоговое значение один раз (видимые промежуточные цифры
 * скрыты от него), ширина не прыгает - цифры табличные.
 */

export interface AnimatedNumberProps {
  value: number
  /** Формат вывода; по умолчанию - число по правилам языка с decimals знаками. */
  format?: (value: number) => string
  /** Знаков после запятой при формате по умолчанию. */
  decimals?: number
  /** Анимировать (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность, мс (по умолчанию - из MotionProvider). */
  duration?: number
  className?: string
}

export function AnimatedNumber({ value, format, decimals = 0, animate, duration, className }: AnimatedNumberProps) {
  const { intl } = useMessages()
  const ref = useRef<HTMLSpanElement | null>(null)
  const motion = useEntranceMotion(ref, animate, { duration })
  const current = useCountUp(value, motion.phase, motion.duration)
  const fmt = format ?? ((v: number) => v.toLocaleString(intl, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
  // Промежуточные значения округляются до точности итогового, иначе «12 845 000,37 ₽».
  const rounded = format ? current : Number(current.toFixed(decimals))
  return (
    <span ref={ref} className={cx('ev-animated-number ev-num', className)}>
      {motion.phase === 'static' ? (
        fmt(value)
      ) : (
        <>
          <span aria-hidden="true">{fmt(rounded)}</span>
          <span className="ev-visually-hidden">{fmt(value)}</span>
        </>
      )}
    </span>
  )
}

/**
 * Число внутри готовой строки («12 845 000 ₽», «96,4%»): набирается с
 * сохранением формата, префикса и суффикса. Строка без числа или узел -
 * выводится как есть.
 */
export function AnimatedText({ children, animate, duration }: { children: ReactNode; animate?: boolean; duration?: number }) {
  const { intl } = useMessages()
  const text = typeof children === 'number' ? children.toLocaleString(intl) : typeof children === 'string' ? children : null
  const parsed = text === null ? null : parseNumericText(text, intl)
  const ref = useRef<HTMLSpanElement | null>(null)
  const motion = useEntranceMotion(ref, parsed ? animate : false, { duration })
  const current = useCountUp(parsed?.value ?? 0, motion.phase, motion.duration)
  if (!parsed || text === null) return <>{children}</>
  return (
    <span ref={ref} className="ev-animated-number">
      {motion.phase === 'static' ? (
        text
      ) : (
        <>
          <span aria-hidden="true">{formatNumericText(parsed, current, intl)}</span>
          <span className="ev-visually-hidden">{text}</span>
        </>
      )}
    </span>
  )
}
