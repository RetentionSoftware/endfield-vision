'use client'

import { Check, X } from 'lucide-react'
import { isValidElement, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import type { Tone } from './Display'

/*
 * Чип - компактная метка-значение: тег, выбранный фильтр, получатель.
 * Три режима: статичный, фильтр (кнопка aria-pressed, onClick/selected) и
 * удаляемый (кнопка-крестик onRemove). Фильтр и крестик - соседние кнопки,
 * не вложенные: кнопка в кнопке недопустима.
 */

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick' | 'children'> {
  children: ReactNode
  /** Тон. По умолчанию neutral, у фильтра - accent (цвет выбранного состояния). */
  tone?: Tone
  /** Иконка слева. У выбранного фильтра без иконки - галочка. */
  icon?: ReactNode
  /** Кнопка-крестик «Убрать». */
  onRemove?: () => void
  /** Режим фильтра: чип - кнопка-переключатель с aria-pressed. */
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  /** Текст для подписи крестика, если children - не строка. */
  label?: string
  /** Клавиши на крестике (TagInput ведёт по ним фокус стрелками). */
  onRemoveKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
  /** tabIndex крестика: -1, если фокусом управляет контейнер. */
  removeTabIndex?: number
  removeRef?: Ref<HTMLButtonElement>
}

/** Текст из children: строки и числа, в том числе внутри элементов. */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children)
  return ''
}

export function Chip({
  children,
  tone,
  icon,
  onRemove,
  selected,
  onClick,
  size = 'md',
  disabled = false,
  label,
  onRemoveKeyDown,
  removeTabIndex,
  removeRef,
  className,
  ...rest
}: ChipProps) {
  const t = useMessages()
  const toggle = selected !== undefined || onClick !== undefined
  const shownIcon = icon ?? (toggle && selected ? <Check size={size === 'sm' ? 11 : 13} strokeWidth={2.5} /> : null)
  const body = (
    <>
      {shownIcon ? (
        <span className="ev-chip-icon" aria-hidden="true">
          {shownIcon}
        </span>
      ) : null}
      <span className="ev-chip-label">{children}</span>
    </>
  )
  return (
    <span
      {...rest}
      className={cx('ev-chip', className)}
      data-tone={tone ?? (toggle ? 'accent' : 'neutral')}
      data-size={size}
      data-toggle={toggle || undefined}
      data-selected={(toggle && selected) || undefined}
      data-removable={onRemove ? true : undefined}
      data-disabled={disabled || undefined}
    >
      {toggle ? (
        <button type="button" className="ev-chip-main" aria-pressed={Boolean(selected)} disabled={disabled} onClick={onClick}>
          {body}
        </button>
      ) : (
        <span className="ev-chip-main">{body}</span>
      )}
      {onRemove ? (
        <button
          ref={removeRef}
          type="button"
          className="ev-chip-remove"
          aria-label={t.chip.remove(label ?? nodeText(children))}
          disabled={disabled}
          tabIndex={removeTabIndex}
          onClick={onRemove}
          onKeyDown={onRemoveKeyDown}
        >
          <X size={size === 'sm' ? 11 : 13} strokeWidth={2.25} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

export interface ChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Подпись группы для скринридера: «Фильтры по статусу». С ней группа получает role="group". */
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Ряд чипов с переносом. */
export function ChipGroup({ children, className, ...rest }: ChipGroupProps) {
  const named = Boolean(rest['aria-label'] || rest['aria-labelledby'])
  return (
    <div role={named ? 'group' : undefined} {...rest} className={cx('ev-chip-group', className)}>
      {children}
    </div>
  )
}
