'use client'

import { RefreshCw, Wrench, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Portal, useEscapeLayer, useFocusTrap, useScrollLock } from '../lib/overlay'
import { Button } from './Button'

/*
 * Экранные состояния приложения.
 *  - maintenance: блокирующий слой на весь экран (технические работы).
 *    Фокус заперт внутри, прокрутка страницы выключена, Escape не закрывает.
 *    Кнопка закрытия - только если передан onDismiss (например, для
 *    разработчика или администратора).
 *  - update: неблокирующее окно в углу «Доступна новая версия» с кнопками
 *    «Обновить» и «Позже». Фокус не перехватывает, Escape = «Позже».
 *    Окно - внутри вежливой живой области (role="status"): скринридер
 *    объявляет его появление, не прерывая пользователя.
 *  - custom: блокирующий слой со своим заголовком, текстом и действиями
 *    (blocking={false} - неблокирующее окно в углу, как update).
 * Когда показывать (опрос сервера, сравнение версий) - решает приложение.
 */

export type ScreenOverlayVariant = 'maintenance' | 'update' | 'custom'

export interface ScreenOverlayProps {
  variant: ScreenOverlayVariant
  open: boolean
  /**
   * Закрыть: «Позже» у update, крестик у maintenance и custom.
   * Без него maintenance закрыть нельзя.
   */
  onDismiss?: () => void
  /** Своя формулировка заголовка (по умолчанию - из словаря для maintenance и update). */
  title?: ReactNode
  /** Своё пояснение под заголовком. */
  text?: ReactNode
  /** Ожидаемое окончание работ (maintenance), например «14:30» или <RelativeTime />. */
  until?: ReactNode
  /** Подпись перед until (по умолчанию «Ориентировочное окончание» из словаря); null - until выводится один. */
  untilLabel?: ReactNode
  /** Иконка вместо стандартной. */
  icon?: ReactNode
  /** Дополнительное содержимое под текстом (причина, контакты, номер сборки). */
  children?: ReactNode
  /** Кнопки (custom; у maintenance - вместо пустого подвала). */
  actions?: ReactNode
  /** update: «Обновить»; по умолчанию - location.reload(). */
  onReload?: () => void
  /** custom: блокирующий слой (по умолчанию да). */
  blocking?: boolean
  className?: string
}

const DEFAULT_ICON: Record<ScreenOverlayVariant, ReactNode> = {
  maintenance: <Wrench size={30} strokeWidth={1.6} />,
  update: <RefreshCw size={18} />,
  custom: null,
}

/** Блокирует ли вариант экран. */
export function isBlockingOverlay(variant: ScreenOverlayVariant, blocking?: boolean): boolean {
  if (variant === 'maintenance') return true
  if (variant === 'update') return false
  return blocking ?? true
}

export function ScreenOverlay(props: ScreenOverlayProps) {
  if (!props.open) return null
  return isBlockingOverlay(props.variant, props.blocking) ? <BlockingOverlay {...props} /> : <OverlayNotice {...props} />
}

function BlockingOverlay({ variant, onDismiss, title, text, until, untilLabel, icon, children, actions, className }: ScreenOverlayProps) {
  const t = useMessages()
  const titleId = useId()
  const textId = useId()
  const ref = useRef<HTMLDivElement | null>(null)
  useFocusTrap(ref, true)
  useScrollLock(true)
  // Слой перехватывает Escape: окна под ним не должны закрываться.
  useEscapeLayer(true, () => undefined)

  const heading = title ?? (variant === 'maintenance' ? t.screenOverlay.maintenanceTitle : null)
  const body = text ?? (variant === 'maintenance' ? t.screenOverlay.maintenanceText : null)
  const mark = icon ?? DEFAULT_ICON[variant]

  return (
    <Portal>
      <ScreenOverlayView
        ref={ref}
        variant={variant}
        titleId={titleId}
        textId={textId}
        heading={heading}
        body={body}
        mark={mark}
        until={until}
        untilLabel={untilLabel}
        actions={actions}
        className={className}
        closeLabel={t.common.close}
        onDismiss={onDismiss}
      >
        {children}
      </ScreenOverlayView>
    </Portal>
  )
}

/** Разметка блокирующего слоя без портала (серверный рендер в тестах). untilLabel по умолчанию - из словаря. */
export function ScreenOverlayView({
  ref,
  variant,
  titleId,
  textId,
  heading,
  body,
  mark,
  until,
  untilLabel,
  actions,
  children,
  className,
  closeLabel,
  onDismiss,
}: {
  ref?: Ref<HTMLDivElement>
  variant: ScreenOverlayVariant
  titleId: string
  textId: string
  heading: ReactNode
  body: ReactNode
  mark: ReactNode
  until?: ReactNode
  untilLabel?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  closeLabel: string
  onDismiss?: () => void
}) {
  const t = useMessages()
  const label = untilLabel === undefined ? t.screenOverlay.until : untilLabel
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={heading ? titleId : undefined}
      aria-describedby={body ? textId : undefined}
      tabIndex={-1}
      className={cx('ev-screen-overlay', className)}
      data-variant={variant}
      data-ev-layer=""
    >
      {onDismiss ? (
        <button type="button" className="ev-screen-overlay-close" aria-label={closeLabel} data-dialog-close="" onClick={onDismiss}>
          <X size={18} />
        </button>
      ) : null}
      <div className="ev-screen-overlay-body">
        {mark ? (
          <div className="ev-screen-overlay-mark ev-corners" data-corners="frame" aria-hidden="true">
            {mark}
          </div>
        ) : null}
        {heading ? (
          <h2 id={titleId} className="ev-screen-overlay-title">
            {heading}
          </h2>
        ) : null}
        {body ? (
          <p id={textId} className="ev-screen-overlay-text">
            {body}
          </p>
        ) : null}
        {until !== undefined && until !== null ? (
          <p className="ev-screen-overlay-until">
            {label ? <span className="ev-screen-overlay-until-label">{label}</span> : null}
            <span className="ev-screen-overlay-until-value">{until}</span>
          </p>
        ) : null}
        {children ? <div className="ev-screen-overlay-extra">{children}</div> : null}
        {actions ? <div className="ev-screen-overlay-actions">{actions}</div> : null}
      </div>
    </div>
  )
}

function OverlayNotice({ variant, onDismiss, title, text, icon, children, actions, onReload, className }: ScreenOverlayProps) {
  const t = useMessages()
  const titleId = useId()
  const textId = useId()
  useEscapeLayer(Boolean(onDismiss), () => onDismiss?.())
  // Живая область объявляет только изменения: сначала она появляется пустой,
  // содержимое - кадром позже (иначе часть скринридеров промолчит).
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const reload = () => {
    if (onReload) onReload()
    else window.location.reload()
  }
  return (
    <Portal>
      <ScreenNoticeView
        ready={ready}
        variant={variant}
        titleId={titleId}
        textId={textId}
        heading={title ?? (variant === 'update' ? t.screenOverlay.updateTitle : null)}
        body={text ?? (variant === 'update' ? t.screenOverlay.updateText : null)}
        mark={icon ?? DEFAULT_ICON[variant]}
        className={className}
        actions={
          actions ??
          (variant === 'update' ? (
            <>
              {onDismiss ? (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  {t.screenOverlay.later}
                </Button>
              ) : null}
              <Button variant="primary" size="sm" icon={<RefreshCw size={14} />} onClick={reload}>
                {t.screenOverlay.reload}
              </Button>
            </>
          ) : onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              {t.common.close}
            </Button>
          ) : null)
        }
      >
        {children}
      </ScreenNoticeView>
    </Portal>
  )
}

/**
 * Разметка неблокирующего окна без портала (серверный рендер в тестах).
 * Окно - внутри вежливой живой области; ready={false} - область пока пустая.
 */
export function ScreenNoticeView({
  ready = true,
  variant,
  titleId,
  textId,
  heading,
  body,
  mark,
  actions,
  children,
  className,
}: {
  ready?: boolean
  variant: ScreenOverlayVariant
  titleId: string
  textId: string
  heading: ReactNode
  body: ReactNode
  mark: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className="ev-screen-notice-live" role="status" aria-live="polite" aria-atomic="true">
      {ready ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby={heading ? titleId : undefined}
          aria-describedby={body ? textId : undefined}
          className={cx('ev-screen-notice ev-corners', className)}
          data-variant={variant}
          data-ev-layer=""
        >
          <div className="ev-screen-notice-head">
            {mark ? (
              <span className="ev-screen-notice-mark" aria-hidden="true">
                {mark}
              </span>
            ) : null}
            <div className="ev-screen-notice-titles">
              {heading ? (
                <h2 id={titleId} className="ev-screen-notice-title">
                  {heading}
                </h2>
              ) : null}
              {body ? (
                <p id={textId} className="ev-screen-notice-text">
                  {body}
                </p>
              ) : null}
            </div>
          </div>
          {children ? <div className="ev-screen-notice-extra">{children}</div> : null}
          {actions ? <div className="ev-screen-notice-actions">{actions}</div> : null}
        </section>
      ) : null}
    </div>
  )
}
