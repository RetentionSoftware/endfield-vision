'use client'

import { Check, CircleAlert, Pencil, X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useControllable, useIsoLayoutEffect } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { getFocusable, useEscapeLayer } from '../lib/overlay'
import { Button } from './Button'
import { errorText } from './InlineEdit'

/*
 * Блок карточки сущности с правкой на месте. В просмотре - шапка с кнопкой
 * «Изменить» и содержимое (children). По кнопке блок показывает поля
 * (editContent или renderEdit), в шапке - «Отмена» и «Сохранить». Каждый
 * блок сохраняет только свои поля. Пока onSave выполняется - спиннер на
 * «Сохранить»; если он бросил ошибку - блок остаётся в правке, текст ошибки
 * под шапкой. Escape отменяет, Ctrl+Enter сохраняет. При входе в правку
 * фокус - на первое поле (или [data-autofocus]), после выхода - на «Изменить».
 */

export interface EditablePanelProps {
  title: ReactNode
  /** Строка под заголовком. */
  description?: ReactNode
  /** Иконка слева от заголовка. */
  icon?: ReactNode
  /** Содержимое в режиме просмотра. */
  children?: ReactNode
  /** Поля в режиме правки. */
  editContent?: ReactNode
  /** Поля в режиме правки (вызывается только в правке). Важнее editContent. */
  renderEdit?: () => ReactNode
  /** Сохранение. Промис - спиннер до завершения; исключение - правка остаётся, текст ошибки (message) под шапкой. */
  onSave: () => void | Promise<void>
  /** Отмена правки: сбросить черновик. */
  onCancel?: () => void
  /** Может ли пользователь править блок (по умолчанию да). Без права кнопки «Изменить» нет. */
  canEdit?: boolean
  /** Кнопки слева от «Изменить», видны только в просмотре. */
  extraActions?: ReactNode
  /** Режим правки снаружи. */
  editing?: boolean
  defaultEditing?: boolean
  /** Вход и выход из правки (в том числе после успешного сохранения). */
  onEditingChange?: (editing: boolean) => void
  /** Уровень заголовка (вид тот же). */
  headingLevel?: 2 | 3 | 4
  id?: string
  className?: string
}

const FIELD = 'input, textarea, select, [role="combobox"], [role="textbox"], [contenteditable="true"]'

export function EditablePanel({
  title,
  description,
  icon,
  children,
  editContent,
  renderEdit,
  onSave,
  onCancel,
  canEdit = true,
  extraActions,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  headingLevel = 2,
  id,
  className,
}: EditablePanelProps) {
  const t = useMessages()
  const titleId = useId()
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  const [editingState, setEditing] = useControllable(editingProp, defaultEditing, onEditingChange)
  const editing = canEdit && editingState
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const editBtnRef = useRef<HTMLButtonElement | null>(null)
  const busyRef = useRef(false)
  const prevEditing = useRef(editing)
  // Вернуть фокус на «Изменить» после выхода из правки, если фокус был внутри блока.
  const refocus = useRef(false)

  useIsoLayoutEffect(() => {
    if (prevEditing.current === editing) return
    prevEditing.current = editing
    if (editing) {
      const body = bodyRef.current
      if (!body) return
      const focusable = getFocusable(body)
      const target =
        body.querySelector<HTMLElement>('[data-autofocus]') ?? focusable.find((el) => el.matches(FIELD)) ?? focusable[0]
      target?.focus({ preventScroll: true })
    } else if (refocus.current) {
      refocus.current = false
      editBtnRef.current?.focus({ preventScroll: true })
    }
  }, [editing])

  const focusInside = () => {
    const root = rootRef.current
    return Boolean(root && typeof document !== 'undefined' && root.contains(document.activeElement))
  }

  const start = () => {
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    if (busyRef.current) return
    refocus.current = focusInside()
    setError(null)
    onCancel?.()
    setEditing(false)
  }

  const save = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    let ok = false
    try {
      await onSave()
      ok = true
    } catch (e) {
      setError(errorText(e))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
    if (ok) {
      refocus.current = focusInside()
      setEditing(false)
    }
  }

  // Escape - через общий стек слоёв: отменяет правку, не закрывая окно вокруг
  // (Modal, Drawer). Слой забирает Escape, только пока фокус внутри блока;
  // открытый внутри выпадающий список - слой выше, Escape сначала закрывает его.
  useEscapeLayer(editing, cancel, { claims: focusInside })

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!editing || e.defaultPrevented || e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void save()
    }
  }

  const actions = editing ? (
    <>
      <Button size="sm" variant="ghost" icon={<X size={14} />} disabled={busy} onClick={cancel}>
        {t.common.cancel}
      </Button>
      <Button size="sm" variant="primary" icon={<Check size={14} />} loading={busy} onClick={() => void save()}>
        {t.editablePanel.save}
      </Button>
    </>
  ) : canEdit || extraActions ? (
    <>
      {extraActions}
      {canEdit ? (
        <Button
          ref={editBtnRef}
          size="sm"
          variant="ghost"
          icon={<Pencil size={13} />}
          aria-describedby={titleId}
          onClick={start}
        >
          {t.editablePanel.edit}
        </Button>
      ) : null}
    </>
  ) : null

  const body = editing ? (renderEdit ? renderEdit() : editContent) : children

  return (
    <section
      ref={rootRef}
      id={id}
      className={cx('ev-card ev-edit-panel ev-corners', className)}
      data-corners={editing ? 'diagonal' : 'off'}
      data-editing={editing || undefined}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onKeyDown={onKeyDown}
    >
      <header className="ev-card-head">
        {icon ? (
          <span className="ev-card-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="ev-card-titles">
          <Heading id={titleId} className="ev-card-title">
            {title}
          </Heading>
          {description ? <p className="ev-card-desc">{description}</p> : null}
        </div>
        {actions ? <div className="ev-card-actions">{actions}</div> : null}
      </header>
      {error && editing ? (
        <div className="ev-edit-panel-error" role="alert">
          <CircleAlert size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      <div ref={bodyRef} className="ev-card-body">
        {body}
      </div>
    </section>
  )
}
