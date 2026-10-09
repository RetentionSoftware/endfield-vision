'use client'

import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { UiLink } from '../lib/link'
import { Tooltip } from './Tooltip'
import type { Tone } from './Display'

/*
 * Строка состояния внизу рабочего места: часы, версия сборки, связь,
 * нагрузка. Тонкая полоса с тремя зонами. В AppShell передаётся через
 * проп statusBar и прилипает к низу колонки содержимого.
 */

export interface StatusBarProps {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  /** Подпись области для скринридера; по умолчанию - «Строка состояния». */
  label?: string
  /**
   * Ориентир страницы (role="contentinfo"). По умолчанию да; для строки
   * внутри карточки или окна - false (тогда role="group").
   */
  landmark?: boolean
  className?: string
}

export function StatusBar({ left, center, right, label, landmark = true, className }: StatusBarProps) {
  const t = useMessages()
  return (
    <footer role={landmark ? 'contentinfo' : 'group'} aria-label={label ?? t.statusBar.label} className={cx('ev-statusbar', className)}>
      <div className="ev-statusbar-zone" data-zone="left">
        {left}
      </div>
      {center ? (
        <div className="ev-statusbar-zone" data-zone="center">
          {center}
        </div>
      ) : null}
      <div className="ev-statusbar-zone" data-zone="right">
        {right}
      </div>
    </footer>
  )
}

export interface StatusBarItemProps {
  icon?: ReactNode
  children?: ReactNode
  /** Подсказка при наведении и фокусе. */
  tooltip?: ReactNode
  /** Цветная точка слева (связь, нагрузка). Цвет дублируется текстом. */
  tone?: Tone
  /** Моноширинные цифры: время, версия, счётчики. */
  mono?: boolean
  /** Ссылка (история версий, страница статуса). */
  href?: string
  /** Кнопка (открыть панель нагрузки и т.п.). */
  onClick?: () => void
  /** Подпись для скринридера, если видимый текст неполный. */
  'aria-label'?: string
  className?: string
}

/** Элемент строки состояния: иконка, точка тона, текст, подсказка; может быть ссылкой или кнопкой. */
export function StatusBarItem({ icon, children, tooltip, tone, mono = false, href, onClick, className, ...aria }: StatusBarItemProps) {
  const body = (
    <>
      {tone ? <span className="ev-statusbar-dot" data-tone={tone} aria-hidden="true" /> : null}
      {icon ? (
        <span className="ev-statusbar-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children !== undefined && children !== null ? <span className="ev-statusbar-text">{children}</span> : null}
    </>
  )
  const cls = cx('ev-statusbar-item', className)
  const common = { className: cls, 'data-mono': mono || undefined, 'aria-label': aria['aria-label'] }
  let el
  if (href) {
    el = (
      <UiLink href={href} {...common} data-interactive="">
        {body}
      </UiLink>
    )
  } else if (onClick) {
    el = (
      <button type="button" {...common} data-interactive="" onClick={onClick}>
        {body}
      </button>
    )
  } else {
    // С подсказкой элемент должен получать фокус, иначе с клавиатуры её не увидеть.
    el = (
      <span {...common} tabIndex={tooltip ? 0 : undefined}>
        {body}
      </span>
    )
  }
  return tooltip ? (
    <Tooltip content={tooltip} placement="top">
      {el}
    </Tooltip>
  ) : (
    el
  )
}

/** Вертикальный разделитель между группами элементов. */
export function StatusBarSeparator() {
  return <span className="ev-statusbar-sep" role="separator" aria-orientation="vertical" />
}

export interface StatusBarClockProps {
  /** Зафиксированное время (демо, тесты, серверное время); без него - текущее. */
  value?: Date
  /** Период обновления, мс (по умолчанию 30 с). */
  interval?: number
  /** Формат Intl; по умолчанию - часы и минуты. */
  format?: Intl.DateTimeFormatOptions
  /** Дата перед временем. */
  showDate?: boolean
  tooltip?: ReactNode
  className?: string
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }

/**
 * Часы строки состояния. Без value показывают время только после гидрации
 * (серверный и клиентский рендер совпадают) и обновляются раз в interval;
 * время округляется вниз до interval. Отдельный компонент: тик не
 * перерисовывает остальную оболочку.
 */
export function StatusBarClock({ value, interval = 30_000, format, showDate = false, tooltip, className }: StatusBarClockProps) {
  const t = useMessages()
  const step = Math.max(1000, interval)
  const subscribe = useCallback(
    (cb: () => void) => {
      const id = window.setInterval(cb, step)
      return () => window.clearInterval(id)
    },
    [step],
  )
  const stamp = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / step) * step,
    () => null,
  )
  const date = value ?? (stamp === null ? null : new Date(stamp))
  const text = date ? new Intl.DateTimeFormat(t.intl, format ?? (showDate ? DATE_TIME_FORMAT : TIME_FORMAT)).format(date) : null
  return (
    <StatusBarItem mono tooltip={tooltip} className={className}>
      <time dateTime={date ? date.toISOString() : undefined}>{text ?? '--:--'}</time>
    </StatusBarItem>
  )
}
