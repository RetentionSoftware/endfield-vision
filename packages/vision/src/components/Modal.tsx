'use client'

import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cx } from '../lib/cx'
import { useIsoLayoutEffect } from '../lib/hooks'
import { Portal, useEscapeLayer, useFocusTrap, useScrollLock } from '../lib/overlay'
import { Button, type ButtonVariant } from './Button'
import { toast } from './Toast'

/*
 * Окна. Modal - декларативный компонент; useModals() - императивный API
 * (open / confirm / alert) поверх него. Ловушка фокуса, возврат фокуса на
 * инициатора, Escape закрывает только верхнее окно, подложка не закрывает
 * окно во время сохранения. На узком экране окно - на весь экран.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  size?: ModalSize
  /** Крестик, Escape и клик по подложке. */
  closable?: boolean
  /** Идёт операция: закрыть нельзя. */
  busy?: boolean
  footer?: ReactNode
  /** Слева в подвале: статус, подсказка. */
  footerLeft?: ReactNode
  children?: ReactNode
  className?: string
  /** Тело без отступов (таблица, редактор). */
  flush?: boolean
}

const SIZE_WIDTH: Record<ModalSize, string> = {
  sm: 'min(440px, 100%)',
  md: 'min(580px, 100%)',
  lg: 'min(800px, 100%)',
  xl: 'min(1080px, 100%)',
  full: 'min(1400px, 100%)',
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  closable = true,
  busy = false,
  footer,
  footerLeft,
  children,
  className,
  flush = false,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const ref = useRef<HTMLDivElement | null>(null)
  const canClose = closable && !busy
  useFocusTrap(ref, open)
  useScrollLock(open)
  useEscapeLayer(open, () => {
    if (canClose) onClose()
  })
  if (!open) return null
  return (
    <Portal>
      <div
        className="ev-modal-backdrop"
        data-ev-layer=""
        onMouseDown={(e) => {
          // Закрываем только по клику именно в подложку (не по отпусканию мыши после выделения текста в окне).
          if (e.target === e.currentTarget && canClose) onClose()
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={subtitle ? descId : undefined}
          aria-busy={busy || undefined}
          tabIndex={-1}
          className={cx('ev-modal', className)}
          data-size={size}
          style={{ '--ev-modal-w': SIZE_WIDTH[size] } as CSSProperties}
        >
          {title || closable ? (
            <header className="ev-modal-head">
              <div className="ev-modal-titles">
                {title ? (
                  <h2 className="ev-modal-title" id={titleId}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="ev-modal-subtitle" id={descId}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {closable ? (
                <button type="button" className="ev-modal-close" aria-label="Закрыть" data-dialog-close="" disabled={busy} onClick={onClose}>
                  <X size={17} />
                </button>
              ) : null}
            </header>
          ) : null}
          <div className={cx('ev-modal-body', flush && 'ev-modal-body-flush')}>{children}</div>
          {footer || footerLeft ? (
            <footer className="ev-modal-foot">
              {footerLeft ? <div className="ev-modal-foot-left">{footerLeft}</div> : <span />}
              {footer ? <div className="ev-modal-foot-actions">{footer}</div> : null}
            </footer>
          ) : null}
        </div>
      </div>
    </Portal>
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  side?: 'right' | 'left'
  /** Ширина панели. */
  width?: number | string
  footer?: ReactNode
  closable?: boolean
  busy?: boolean
  children?: ReactNode
  className?: string
  /** Без шапки (мобильное меню рисует свою). */
  bare?: boolean
  'aria-label'?: string
}

/** Выезжающая панель: детали записи, фильтры, мобильное меню. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  side = 'right',
  width = 480,
  footer,
  closable = true,
  busy = false,
  children,
  className,
  bare = false,
  ...aria
}: DrawerProps) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement | null>(null)
  const canClose = closable && !busy
  useFocusTrap(ref, open)
  useScrollLock(open)
  useEscapeLayer(open, () => {
    if (canClose) onClose()
  })
  if (!open) return null
  return (
    <Portal>
      <div
        className="ev-drawer-backdrop"
        data-ev-layer=""
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && canClose) onClose()
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title && !bare ? titleId : undefined}
          aria-label={aria['aria-label']}
          tabIndex={-1}
          className={cx('ev-drawer', className)}
          data-side={side}
          style={{ '--ev-drawer-w': typeof width === 'number' ? `${width}px` : width } as CSSProperties}
        >
          {!bare ? (
            <header className="ev-modal-head">
              <div className="ev-modal-titles">
                {title ? (
                  <h2 className="ev-modal-title" id={titleId}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? <p className="ev-modal-subtitle">{subtitle}</p> : null}
              </div>
              {closable ? (
                <button type="button" className="ev-modal-close" aria-label="Закрыть" data-dialog-close="" disabled={busy} onClick={onClose}>
                  <X size={17} />
                </button>
              ) : null}
            </header>
          ) : null}
          <div className={cx('ev-drawer-body', bare && 'ev-drawer-body-bare')}>{children}</div>
          {footer ? <footer className="ev-modal-foot ev-drawer-foot">{footer}</footer> : null}
        </div>
      </div>
    </Portal>
  )
}

/* ------------------------------------------------------------------ */
/* Императивный API                                                    */
/* ------------------------------------------------------------------ */

export interface ModalButtonContext<R> {
  close: (result?: R) => void
  setBusy: (busy: boolean) => void
}

export interface ModalButton<R = unknown> {
  label: string
  icon?: ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  /** Фокус на кнопку при открытии. */
  autoFocus?: boolean
  /** Закрыть окно после клика. По умолчанию - да, если нет onClick. */
  closeOnClick?: boolean
  result?: R
  onClick?: (ctx: ModalButtonContext<R>) => void | Promise<void>
}

export interface ModalOptions<R = unknown> {
  title?: ReactNode
  subtitle?: ReactNode
  size?: ModalSize
  closable?: boolean
  body?: ReactNode | ((ctx: ModalButtonContext<R>) => ReactNode)
  /** null - без подвала; по умолчанию одна кнопка «Закрыть». */
  footer?: { left?: ReactNode; buttons?: ModalButton<R>[] } | null
  flush?: boolean
  className?: string
  onClose?: (result: R | undefined) => void
}

export interface ModalHandle<R = unknown> {
  id: string
  close: (result?: R) => void
  update: (patch: Partial<ModalOptions<R>>) => void
  result: Promise<R | undefined>
}

export interface ConfirmOptions {
  title: ReactNode
  message?: ReactNode
  subtitle?: ReactNode
  okLabel?: string
  cancelLabel?: string
  /** danger - для необратимых действий. */
  okVariant?: 'primary' | 'danger'
  okIcon?: ReactNode
  size?: ModalSize
  /** Выполнить действие внутри окна: false - не закрывать. Ошибка остаётся в окне. */
  onOk?: () => boolean | void | Promise<boolean | void>
}

export interface AlertOptions {
  title: ReactNode
  message?: ReactNode
  okLabel?: string
  size?: ModalSize
}

export interface ModalsApi {
  open: <R = unknown>(opts: ModalOptions<R>) => ModalHandle<R>
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  alert: (opts: AlertOptions) => Promise<void>
  close: (id: string, result?: unknown) => void
  closeAll: () => void
}

interface Entry {
  id: string
  opts: ModalOptions<unknown>
  busy: boolean
  resolve: (r: unknown) => void
}

const ModalsContext = createContext<ModalsApi | null>(null)

let globalApi: ModalsApi | null = null

/** Вызов окон вне React (клиент API, обработчики). Работает, пока смонтирован ModalsProvider. */
export const modals: ModalsApi = {
  open: (o) => {
    if (!globalApi) throw new Error('ModalsProvider не смонтирован')
    return globalApi.open(o)
  },
  confirm: (o) => (globalApi ? globalApi.confirm(o) : Promise.resolve(false)),
  alert: (o) => (globalApi ? globalApi.alert(o) : Promise.resolve()),
  close: (id, r) => globalApi?.close(id, r),
  closeAll: () => globalApi?.closeAll(),
}

export function useModals(): ModalsApi {
  const api = useContext(ModalsContext)
  if (!api) throw new Error('useModals() вне ModalsProvider')
  return api
}

let modalSeq = 0

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined
}

/**
 * Провайдер окон. Ставится ниже провайдеров данных и сессии: тела окон
 * рендерятся внутри него и видят все контексты выше.
 */
export function ModalsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  // Источник правды - ref: побочные эффекты (onClose, resolve) выполняются
  // вне функций-апдейтеров setState, которые StrictMode вызывает дважды.
  const listRef = useRef<Entry[]>([])
  const commit = useCallback((next: Entry[]) => {
    listRef.current = next
    setEntries(next)
  }, [])

  const close = useCallback(
    (id: string, result?: unknown) => {
      const e = listRef.current.find((x) => x.id === id)
      if (!e) return
      commit(listRef.current.filter((x) => x.id !== id))
      e.opts.onClose?.(result)
      e.resolve(result)
    },
    [commit],
  )

  const setBusy = useCallback(
    (id: string, busy: boolean) => {
      commit(listRef.current.map((x) => (x.id === id ? { ...x, busy } : x)))
    },
    [commit],
  )

  const api = useMemo<ModalsApi>(() => {
    const open = <R,>(opts: ModalOptions<R>): ModalHandle<R> => {
      const id = `m${++modalSeq}`
      let resolve!: (r: unknown) => void
      const result = new Promise<R | undefined>((res) => {
        resolve = res as (r: unknown) => void
      })
      commit([...listRef.current, { id, opts: opts as ModalOptions<unknown>, busy: false, resolve }])
      return {
        id,
        close: (r?: R) => close(id, r),
        update: (patch) =>
          commit(
            listRef.current.map((x) =>
              x.id === id ? { ...x, opts: { ...x.opts, ...(patch as Partial<ModalOptions<unknown>>) } } : x,
            ),
          ),
        result,
      }
    }

    const confirm = (o: ConfirmOptions): Promise<boolean> => {
      const h = open<boolean>({
        title: o.title,
        subtitle: o.subtitle,
        size: o.size ?? 'sm',
        body: o.message ? <div className="ev-modal-message">{o.message}</div> : undefined,
        footer: {
          buttons: [
            { label: o.cancelLabel ?? 'Отмена', variant: 'ghost', result: false },
            {
              label: o.okLabel ?? 'Подтвердить',
              variant: o.okVariant ?? 'primary',
              icon: o.okIcon,
              autoFocus: true,
              onClick: async (ctx) => {
                if (!o.onOk) {
                  ctx.close(true)
                  return
                }
                ctx.setBusy(true)
                try {
                  const r = await o.onOk()
                  if (r !== false) ctx.close(true)
                } catch (err) {
                  toast.error('Не удалось выполнить действие', { description: errorMessage(err) })
                } finally {
                  ctx.setBusy(false)
                }
              },
            },
          ],
        },
      })
      return h.result.then((r) => r === true)
    }

    const alert = (o: AlertOptions): Promise<void> =>
      open<void>({
        title: o.title,
        size: o.size ?? 'sm',
        body: o.message ? <div className="ev-modal-message">{o.message}</div> : undefined,
        footer: { buttons: [{ label: o.okLabel ?? 'Понятно', variant: 'primary', autoFocus: true }] },
      }).result.then(() => undefined)

    return {
      open,
      confirm,
      alert,
      close,
      closeAll: () => {
        const list = listRef.current
        commit([])
        list.forEach((e) => {
          e.opts.onClose?.(undefined)
          e.resolve(undefined)
        })
      },
    }
  }, [close, commit])

  // Регистрация модульного API: в layout-эффекте, раньше эффектов детей.
  useIsoLayoutEffect(() => {
    globalApi = api
    return () => {
      if (globalApi === api) globalApi = null
    }
  }, [api])

  return (
    <ModalsContext.Provider value={api}>
      {children}
      {entries.map((e) => (
        <ModalEntry key={e.id} entry={e} close={close} setBusy={setBusy} />
      ))}
    </ModalsContext.Provider>
  )
}

function ModalEntry({
  entry,
  close,
  setBusy,
}: {
  entry: Entry
  close: (id: string, r?: unknown) => void
  setBusy: (id: string, b: boolean) => void
}) {
  const { opts, busy, id } = entry
  const ctx: ModalButtonContext<unknown> = {
    close: (r) => close(id, r),
    setBusy: (b) => setBusy(id, b),
  }
  const buttons = opts.footer === null ? null : (opts.footer?.buttons ?? [{ label: 'Закрыть', variant: 'ghost' as const }])
  const footer = buttons
    ? buttons.map((b, i) => (
        <Button
          key={i}
          variant={b.variant ?? 'ghost'}
          icon={b.icon}
          disabled={b.disabled || busy}
          loading={busy && b.autoFocus === true}
          data-autofocus={b.autoFocus ? '' : undefined}
          onClick={() => {
            const shouldClose = b.closeOnClick ?? !b.onClick
            if (b.onClick) void b.onClick(ctx)
            if (shouldClose) ctx.close(b.result)
          }}
        >
          {b.label}
        </Button>
      ))
    : undefined
  return (
    <Modal
      open
      onClose={() => close(id, undefined)}
      title={opts.title}
      subtitle={opts.subtitle}
      size={opts.size}
      closable={opts.closable ?? true}
      busy={busy}
      flush={opts.flush}
      className={opts.className}
      footer={footer}
      footerLeft={opts.footer?.left}
    >
      {typeof opts.body === 'function' ? opts.body(ctx) : opts.body}
    </Modal>
  )
}
