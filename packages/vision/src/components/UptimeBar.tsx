'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { formatIsoDate, parseIso } from '../lib/dates'
import { useMediaQuery } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { useEntranceMotion } from '../lib/motion'
import type { Messages } from '../lib/i18n-messages'
import { Tooltip } from './Tooltip'

/*
 * Полоса истории доступности (как на статус-страницах): один день - один сегмент.
 * Полоса - одна остановка Tab, стрелки, Home и End переходят между днями,
 * подсказка с датой, статусом и примечанием - по наведению и фокусу.
 * На узком экране (до 720px) - последние 30 дней.
 * Анимация появления (animate): сегменты поднимаются слева направо с быстрым
 * сдвигом по времени; только при первом показе.
 */

export type UptimeStatus = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'none'

export interface UptimeDay {
  /** 'YYYY-MM-DD'. */
  date: string
  status: UptimeStatus
  /** Примечание в подсказке: причина сбоя, длительность. */
  note?: ReactNode
}

export interface UptimeBarProps {
  /** Дни по порядку, последний - сегодня. */
  days: UptimeDay[]
  /** Высота полосы, px. */
  height?: number
  /** Легенда статусов под полосой. */
  showLegend?: boolean
  /** Подписи «N дней назад» и «Сегодня» под краями полосы. */
  showRange?: boolean
  /** Анимация появления (по умолчанию - из MotionProvider). */
  animate?: boolean
  /** Длительность анимации появления, мс (по умолчанию - из MotionProvider). */
  animationDuration?: number
  'aria-label'?: string
  className?: string
}

const NARROW_DAYS = 30
/** Доля общей длительности на подъём одного сегмента; остальное - сдвиг между сегментами. */
const RISE_SHARE = 0.45

/** Тайминги появления: подъём сегмента и шаг сдвига между соседними, мс. */
export function uptimeStagger(count: number, duration: number): { rise: number; step: number } {
  const rise = Math.round(duration * RISE_SHARE)
  const step = count > 1 ? Math.round(((duration - rise) / (count - 1)) * 100) / 100 : 0
  return { rise, step }
}
const LEGEND: UptimeStatus[] = ['operational', 'degraded', 'outage', 'maintenance']

function statusLabel(t: Messages, status: UptimeStatus): string {
  return status === 'none' ? t.uptime.noData : t.uptime[status]
}

/** Число дней между датами 'YYYY-MM-DD'; null, если дата не разбирается. */
function daysBetween(from: string, to: string): number | null {
  const a = parseIso(from)
  const b = parseIso(to)
  if (!a || !b) return null
  return Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / 86_400_000)
}

export function UptimeBar({
  days,
  height = 32,
  showLegend = false,
  showRange = false,
  animate,
  animationDuration,
  'aria-label': ariaLabel,
  className,
}: UptimeBarProps) {
  const t = useMessages()
  const narrow = useMediaQuery('(max-width: 720px)')
  const visible = narrow && days.length > NARROW_DAYS ? days.slice(-NARROW_DAYS) : days
  const rootRef = useRef<HTMLDivElement | null>(null)
  const motion = useEntranceMotion(rootRef, animate, { duration: animationDuration })
  // После появления атрибут снимается: новые дни и смена ширины не переигрывают анимацию.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (motion.phase !== 'run') return
    const id = window.setTimeout(() => setSettled(true), motion.duration + 50)
    return () => window.clearTimeout(id)
  }, [motion.phase, motion.duration])
  const motionAttr = settled ? undefined : motion.attr
  const stagger = uptimeStagger(visible.length, motion.duration)
  const [activeRaw, setActive] = useState<number | null>(null)
  const active = Math.min(activeRaw ?? visible.length - 1, visible.length - 1)
  const refs = useRef<Array<HTMLElement | null>>([])

  const move = (index: number) => {
    const next = Math.max(0, Math.min(index, visible.length - 1))
    setActive(next)
    refs.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(visible.length - 1)
    else return
    e.preventDefault()
  }

  const first = visible[0]
  const last = visible[visible.length - 1]
  // Как на статус-страницах: полоса из 90 дней подписана «90 дней назад» (охват включительно).
  const span = first && last ? (daysBetween(first.date, last.date) ?? visible.length - 1) + 1 : 0
  const present = new Set(visible.map((d) => d.status))
  const legend = present.has('none') ? [...LEGEND, 'none' as const] : LEGEND

  return (
    <div ref={rootRef} className={cx('ev-uptime', className)} data-ev-motion={motionAttr}>
      <div
        className="ev-uptime-strip"
        role="group"
        aria-label={ariaLabel ?? t.uptime.label(visible.length)}
        style={
          motionAttr
            ? ({ height, '--ev-motion-dur': `${stagger.rise}ms`, '--ev-motion-step': `${stagger.step}ms` } as CSSProperties)
            : { height }
        }
        onKeyDown={onKeyDown}
      >
        {visible.map((d, i) => {
          const label = statusLabel(t, d.status)
          const date = formatIsoDate(d.date) || d.date
          return (
            <Tooltip
              key={d.date}
              content={
                <div className="ev-uptime-tip">
                  <div className="ev-uptime-tip-date ev-num">{date}</div>
                  <div className="ev-uptime-tip-status">
                    <span className="ev-uptime-swatch" data-status={d.status} aria-hidden="true" />
                    {label}
                  </div>
                  {d.note ? <div className="ev-uptime-tip-note">{d.note}</div> : null}
                </div>
              }
            >
              <span
                ref={(el) => {
                  refs.current[i] = el
                }}
                className="ev-uptime-day"
                data-status={d.status}
                role="img"
                aria-label={`${date}: ${label}`}
                tabIndex={i === active ? 0 : -1}
                onFocus={() => setActive(i)}
                style={motionAttr ? ({ '--ev-i': i } as CSSProperties) : undefined}
              />
            </Tooltip>
          )
        })}
      </div>
      {showRange && visible.length > 0 ? (
        <div className="ev-uptime-range" aria-hidden="true">
          <span>{span > 1 ? t.uptime.daysAgo(span) : null}</span>
          <span>{t.uptime.today}</span>
        </div>
      ) : null}
      {showLegend ? (
        <ul role="list" className="ev-uptime-legend">
          {legend.map((s) => (
            <li key={s}>
              <span className="ev-uptime-swatch" data-status={s} aria-hidden="true" />
              {statusLabel(t, s)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
