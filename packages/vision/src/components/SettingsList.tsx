'use client'

import { TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Button } from './Button'
import { Field } from './Field'

/*
 * Список настроек: одна настройка - одна строка (слева название и описание,
 * справа контрол), родственные строки - в секции с заголовком. Сохранение
 * одно на список: SaveBar появляется, только когда есть несохранённые
 * изменения. Состояние черновика - у приложения или в useDirtyState.
 */

export interface SettingsListProps {
  children: ReactNode
  className?: string
}

/** Контейнер строк и секций настроек. Без своей поверхности: ставится в карточку или на страницу. */
export function SettingsList({ children, className }: SettingsListProps) {
  return <div className={cx('ev-settings', className)}>{children}</div>
}

export interface SettingsSectionProps {
  title?: ReactNode
  description?: ReactNode
  /** Справа в шапке секции. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Группа строк настроек с заголовком. */
export function SettingsSection({ title, description, actions, children, className }: SettingsSectionProps) {
  const titleId = useId()
  return (
    <section className={cx('ev-settings-section', className)} aria-labelledby={title ? titleId : undefined}>
      {title || description || actions ? (
        <header className="ev-settings-section-head">
          <div className="ev-settings-section-titles">
            {title ? (
              <h3 id={titleId} className="ev-settings-section-title">
                {title}
              </h3>
            ) : null}
            {description ? <p className="ev-settings-section-desc">{description}</p> : null}
          </div>
          {actions ? <div className="ev-settings-section-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ev-settings-rows">{children}</div>
    </section>
  )
}

/** Атрибуты для связи своего контрола с подписью и описанием строки. */
export interface SettingControlProps {
  id: string
  'aria-labelledby': string
  'aria-describedby'?: string
}

export interface SettingRowProps {
  label: ReactNode
  description?: ReactNode
  /**
   * Контрол справа. Контролы кита (Switch, Input, NumberInput, Select) сами
   * получают id из строки и связываются с подписью и описанием. Функция
   * получает id и aria-атрибуты для своего контрола.
   */
  control?: ReactNode | ((props: SettingControlProps) => ReactNode)
  /** Бейдж рядом с названием: «Бета», «Требует перезапуска». */
  badge?: ReactNode
  /** Служебная строка под описанием: кто и когда менял, когда применится. */
  hint?: ReactNode
  /** Значение изменено и не сохранено: тонированный фон и уголок, для скринридера - пометка «изменено» в подписи. */
  changed?: boolean
  disabled?: boolean
  /** id контрола (иначе генерируется). */
  controlId?: string
  className?: string
}

/** Строка настройки: название, описание и контрол справа; на узком экране контрол уходит вниз. */
export function SettingRow({ label, description, control, badge, hint, changed = false, disabled = false, controlId, className }: SettingRowProps) {
  const t = useMessages()
  const auto = useId()
  const id = controlId ?? `set${auto}`
  const labelId = `${id}-label`
  const descId = description ? `${id}-desc` : undefined
  const content =
    typeof control === 'function' ? control({ id, 'aria-labelledby': labelId, 'aria-describedby': descId }) : control
  return (
    <div
      className={cx('ev-setting', changed && 'ev-corners', className)}
      data-changed={changed || undefined}
      data-disabled={disabled || undefined}
    >
      <div className="ev-setting-main">
        <div className="ev-setting-label-row">
          <label id={labelId} className="ev-setting-label" htmlFor={id}>
            {label}
            {changed ? <span className="ev-visually-hidden">, {t.settings.changed}</span> : null}
          </label>
          {badge ? <span className="ev-setting-badge">{badge}</span> : null}
        </div>
        {description ? (
          <p id={descId} className="ev-setting-desc">
            {description}
          </p>
        ) : null}
        {hint ? <p className="ev-setting-hint">{hint}</p> : null}
      </div>
      {content !== undefined && content !== null ? (
        <div className="ev-setting-control">
          {typeof control === 'function' ? (
            content
          ) : (
            <Field id={id} disabled={disabled || undefined} describedBy={descId}>
              {content}
            </Field>
          )}
        </div>
      ) : null}
    </div>
  )
}

export interface SaveBarProps {
  /** Есть несохранённые изменения: только тогда панель видна. */
  dirty: boolean
  onSave: () => void
  onDiscard?: () => void
  /** Идёт сохранение: «Сохранить» занята, «Отменить» недоступна. */
  saving?: boolean
  /** Сохранять нельзя (ошибка в поле): «Сохранить» недоступна. */
  canSave?: boolean
  /** Свой текст вместо «Есть несохранённые изменения» (например, причина, почему сохранить нельзя). */
  message?: ReactNode
  /** Предупреждение браузера при уходе со страницы, пока есть изменения. */
  warnOnLeave?: boolean
  className?: string
}

/** Закреплённая снизу панель «Сохранить / Отменить». Без изменений не рендерится. */
export function SaveBar({ dirty, onSave, onDiscard, saving = false, canSave = true, message, warnOnLeave = false, className }: SaveBarProps) {
  const t = useMessages()

  useEffect(() => {
    if (!dirty || !warnOnLeave) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Старые браузеры показывают предупреждение только при заданном returnValue.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, warnOnLeave])

  if (!dirty) return null
  return (
    <div className={cx('ev-savebar', className)} role="region" aria-label={t.settings.unsaved}>
      <span className="ev-savebar-text" role="status">
        <TriangleAlert size={14} aria-hidden="true" />
        <span>{message ?? t.settings.unsaved}</span>
      </span>
      <div className="ev-savebar-actions">
        {onDiscard ? (
          <Button size="sm" variant="ghost" onClick={onDiscard} disabled={saving}>
            {t.settings.discard}
          </Button>
        ) : null}
        <Button size="sm" variant="primary" onClick={onSave} loading={saving} disabled={!canSave}>
          {t.settings.save}
        </Button>
      </div>
    </div>
  )
}

/** Структурное сравнение простых данных: примитивы, массивы, обычные объекты, Date. */
export function isEqualValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => isEqualValue(v, b[i]))
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && isEqualValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

export interface DirtyState<T> {
  /** Черновик. */
  value: T
  /** Сохранённое значение, с которым сравнивается черновик. */
  saved: T
  set: (next: T | ((prev: T) => T)) => void
  /** Есть отличия от сохранённого. */
  dirty: boolean
  /** Вернуть черновик к сохранённому. */
  reset: () => void
  /** Зафиксировать черновик (или переданное значение) как сохранённое. */
  commit: (next?: T) => void
}

/**
 * Черновик настроек с признаком изменений: dirty - для SaveBar, reset - для
 * «Отменить», commit - после успешного сохранения. initial читается один раз.
 */
export function useDirtyState<T>(initial: T, isEqual: (a: T, b: T) => boolean = isEqualValue): DirtyState<T> {
  const [saved, setSaved] = useState(initial)
  const [value, setValue] = useState(initial)
  const reset = useCallback(() => setValue(saved), [saved])
  const commit = useCallback(
    (next?: T) => {
      const v = next === undefined ? value : next
      setSaved(v)
      setValue(v)
    },
    [value],
  )
  return { value, saved, set: setValue, dirty: !isEqual(saved, value), reset, commit }
}
