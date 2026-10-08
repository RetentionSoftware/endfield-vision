'use client'

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { UiLink } from '../lib/link'
import { Spinner } from './Spinner'
import { Tooltip, type TooltipPlacement } from './Tooltip'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonOwnProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Иконка слева от подписи. */
  icon?: ReactNode
  /** Иконка справа (шеврон, стрелка). */
  iconRight?: ReactNode
  /** Спиннер вместо иконки, кнопка недоступна. */
  loading?: boolean
  /** На всю ширину контейнера. */
  block?: boolean
}

export interface ButtonProps extends ButtonOwnProps, ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>
}

function spinnerSize(size: ButtonSize): number {
  return size === 'sm' ? 12 : size === 'lg' ? 16 : 14
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const t = useMessages()
  const hasLabel = children !== undefined && children !== null && children !== false
  return (
    <button
      type={type}
      className={cx('ev-btn', block && 'ev-btn-block', !hasLabel && 'ev-btn-iconic', className)}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={spinnerSize(size)} label={t.common.inProgress} /> : icon ? <span className="ev-btn-icon">{icon}</span> : null}
      {hasLabel ? <span className="ev-btn-label">{children}</span> : null}
      {iconRight ? <span className="ev-btn-icon">{iconRight}</span> : null}
    </button>
  )
}

export interface LinkButtonProps extends Omit<ButtonOwnProps, 'loading'>, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  ref?: Ref<HTMLAnchorElement>
}

/** Переход, оформленный кнопкой: внутренняя навигация идёт через ссылку приложения. */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <UiLink className={cx('ev-btn', block && 'ev-btn-block', className)} data-variant={variant} data-size={size} {...rest}>
      {icon ? <span className="ev-btn-icon">{icon}</span> : null}
      {children !== undefined && children !== null ? <span className="ev-btn-label">{children}</span> : null}
      {iconRight ? <span className="ev-btn-icon">{iconRight}</span> : null}
    </UiLink>
  )
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Обязательная подпись: aria-label и текст подсказки. */
  label: string
  icon: ReactNode
  variant?: Extract<ButtonVariant, 'ghost' | 'secondary' | 'danger-ghost' | 'primary'>
  size?: ButtonSize
  loading?: boolean
  /** Не показывать подсказку (например, подпись уже видна рядом). */
  noTooltip?: boolean
  tooltipPlacement?: TooltipPlacement
  /** Нажатое состояние для кнопок-переключателей. */
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  noTooltip = false,
  tooltipPlacement,
  pressed,
  className,
  disabled,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const t = useMessages()
  const button = (
    <button
      type={type}
      className={cx('ev-btn ev-btn-iconic', className)}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      aria-pressed={pressed}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={spinnerSize(size)} label={t.common.inProgress} /> : <span className="ev-btn-icon">{icon}</span>}
    </button>
  )
  if (noTooltip) return button
  return (
    <Tooltip content={label} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  )
}
