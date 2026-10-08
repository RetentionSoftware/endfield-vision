'use client'

import { Check } from 'lucide-react'
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { hexInputState, isLightHex, normalizeHexColor } from '../lib/color'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { useFieldContext } from './Field'
import { Input, type ControlSize } from './Input'
import { Popover } from './Popover'
import { Tooltip } from './Tooltip'

/*
 * Поле цвета: образец + ввод #RRGGBB. Образец открывает палитру готовых
 * цветов (кнопки с подписями, стрелки двигают фокус). Ввод проверяется:
 * полный цвет уходит в onChange сразу, неполный держится в поле и не
 * меняет значение, ошибка помечает поле (aria-invalid) и подсказывает
 * формат скринридеру. Escape возвращает текущее значение.
 */

export interface ColorSwatch {
  /** #RRGGBB */
  value: string
  /** Подпись для подсказки и скринридера (по умолчанию - код цвета). */
  label?: string
}

export interface ColorFieldProps {
  /** #RRGGBB; null/undefined - не задан или разный у нескольких объектов. */
  value: string | null | undefined
  onChange: (hex: string) => void
  /** Готовые цвета для окна образца. Без палитры образец только показывает цвет. */
  palette?: readonly ColorSwatch[]
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
  size?: ControlSize
  id?: string
  className?: string
  /** Подпись поля для скринридера, если поле вне Field с подписью. */
  'aria-label'?: string
  'aria-describedby'?: string
}

const PALETTE_COLUMNS = 6

export function ColorField({
  value,
  onChange,
  palette,
  disabled,
  invalid,
  placeholder,
  size = 'md',
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: ColorFieldProps) {
  const field = useFieldContext()
  const t = useMessages()
  const formatId = useId()
  const current = normalizeHexColor(value ?? null, { shorthand: false })
  const [text, setText] = useState(current ?? '')
  const [committed, setCommitted] = useState(false)
  const [shown, setShown] = useState(current)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Значение изменилось снаружи (отмена, выбор другого объекта) - поле показывает его.
  if (shown !== current) {
    setShown(current)
    setText(current ?? '')
    setCommitted(false)
  }

  const isDisabled = disabled ?? field?.disabled ?? false
  const state = hexInputState(text, committed)
  const bad = state === 'invalid'
  const describedBy =
    [ariaDescribedBy ?? field?.describedBy, bad ? formatId : null].filter(Boolean).join(' ') || undefined
  const name = ariaLabel ?? t.color.name

  const commit = (hex: string) => {
    setText(hex)
    setCommitted(false)
    if (hex !== current) onChange(hex)
  }

  const finishInput = () => {
    const v = text.trim()
    if (v === '') {
      // Пустой цвет не бывает: возвращаем текущее значение.
      setText(current ?? '')
      setCommitted(false)
      return
    }
    const hex = normalizeHexColor(v)
    if (hex) commit(hex)
    else setCommitted(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finishInput()
    } else if (e.key === 'Escape' && text !== (current ?? '')) {
      // Escape сначала отменяет ввод, а не закрывает окно вокруг поля.
      e.preventDefault()
      e.stopPropagation()
      setText(current ?? '')
      setCommitted(false)
    }
  }

  const swatchStyle = current ? ({ '--ev-swatch-color': current } as CSSProperties) : undefined
  const swatchFace = <span className="ev-color-swatch-face" data-empty={current ? undefined : ''} style={swatchStyle} aria-hidden="true" />

  const swatch =
    palette && palette.length > 0 ? (
      <Popover
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label={t.color.palette(name)}
        placement="bottom-start"
        trigger={
          <button type="button" className="ev-color-swatch" aria-label={t.color.pickFromPalette(name)} disabled={isDisabled}>
            {swatchFace}
          </button>
        }
      >
        {({ close }) => (
          <ColorPalette
            palette={palette}
            selected={current}
            onPick={(hex) => {
              commit(hex)
              close()
            }}
          />
        )}
      </Popover>
    ) : (
      <span className="ev-color-swatch" data-static="">
        {swatchFace}
      </span>
    )

  return (
    <>
      <Input
        id={id ?? field?.id}
        size={size}
        wrapperClassName={cx('ev-color-field', className)}
        value={text}
        placeholder={placeholder ?? (value === undefined ? t.color.mixed : '#000000')}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        disabled={isDisabled}
        invalid={invalid || bad || undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        prefix={swatch}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          setCommitted(false)
          // Полный цвет применяется сразу; #RGB - только после Enter или ухода из поля.
          const hex = normalizeHexColor(v, { shorthand: false })
          if (hex && hex !== current) onChange(hex)
        }}
        onBlur={finishInput}
        onKeyDown={onKeyDown}
      />
      {bad ? (
        <span id={formatId} className="ev-visually-hidden">
          {t.color.formatHint}
        </span>
      ) : null}
    </>
  )
}

function ColorPalette({
  palette,
  selected,
  onPick,
}: {
  palette: readonly ColorSwatch[]
  selected: string | null
  onPick: (hex: string) => void
}) {
  const t = useMessages()
  const gridRef = useRef<HTMLDivElement | null>(null)
  const items = palette
    .map((c) => ({ hex: normalizeHexColor(c.value), label: c.label }))
    .filter((c): c is { hex: string; label: string | undefined } => c.hex !== null)
  const selectedIndex = items.findIndex((c) => c.hex === selected)

  // Стрелки двигают фокус по сетке, Home/End - к краям.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(gridRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: PALETTE_COLUMNS,
      ArrowUp: -PALETTE_COLUMNS,
    }
    let next: number | null = null
    if (e.key in moves) next = Math.max(0, Math.min(buttons.length - 1, at + moves[e.key]!))
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = buttons.length - 1
    if (next === null) return
    e.preventDefault()
    buttons[next]?.focus()
  }

  return (
    <div ref={gridRef} className="ev-color-palette" role="group" aria-label={t.color.paletteGroup} onKeyDown={onKeyDown}>
      {items.map((c, i) => {
        const active = c.hex === selected
        const label = c.label ? `${c.label}, ${c.hex}` : c.hex
        return (
          <Tooltip key={c.hex} content={label}>
            <button
              type="button"
              className="ev-color-palette-item"
              style={{ '--ev-swatch-color': c.hex } as CSSProperties}
              aria-label={label}
              aria-pressed={active}
              data-light={isLightHex(c.hex) ? '' : undefined}
              data-autofocus={(selectedIndex >= 0 ? i === selectedIndex : i === 0) ? '' : undefined}
              onClick={() => onPick(c.hex)}
            >
              {active ? <Check size={14} aria-hidden="true" /> : null}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
