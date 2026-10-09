import type { ReactNode } from 'react'

/*
 * Чистые помощники для чисел, которые набираются при появлении (Progress,
 * RingProgress, Gauge, DonutChart). Без хуков - пригодны и для серверных
 * компонентов.
 */

/** Знаков после запятой у числа (не больше 6): 12 -> 0, 96.4 -> 1. */
export function decimalsOf(n: number): number {
  if (!Number.isFinite(n) || Number.isInteger(n)) return 0
  const s = String(n)
  const exp = s.match(/e-(\d+)$/)
  if (exp) return Math.min(6, Number(exp[1]))
  const dot = s.indexOf('.')
  return dot < 0 ? 0 : Math.min(6, s.length - dot - 1)
}

/**
 * Промежуточное значение с точностью итогового: пока число набирается до 96,4,
 * в кадре не появится «57,38291».
 */
export function roundLike(value: number, target: number): number {
  if (value === target || !Number.isFinite(value)) return value
  return Number(value.toFixed(decimalsOf(target)))
}

/**
 * Видимое промежуточное значение и итоговое для скринридера: тот читает
 * итог один раз, а не каждый кадр. Без анимации - просто итоговое.
 */
export function countUpText(animating: boolean, shown: ReactNode, final: ReactNode): ReactNode {
  if (!animating) return final
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="ev-visually-hidden">{final}</span>
    </>
  )
}
