'use client'

import { Check, Copy, ExternalLink, FileUp, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { Button, IconButton } from './Button'
import { useToast } from './Toast'
import { Tooltip } from './Tooltip'

/** Копирование в буфер: Clipboard API, запасной путь - execCommand (http, старые браузеры). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ниже - запасной путь
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Копирование значения: тост «Скопировано» (или ошибка) и признак done на
 * полторы секунды - иконка копирования меняется на галочку.
 */
function useCopy(text: string, withToast: boolean): { done: boolean; run: () => Promise<void> } {
  const [done, setDone] = useState(false)
  const toast = useToast()
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  const run = async () => {
    const ok = await copyText(text)
    if (!ok) {
      toast.error('Не удалось скопировать')
      return
    }
    setDone(true)
    if (withToast) toast.success('Скопировано', { duration: 1800, id: 'ev-copy' })
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1500)
  }
  return { done, run }
}

export interface CopyButtonProps {
  text: string
  /** Подпись рядом с иконкой; без неё - кнопка-иконка с подсказкой. */
  label?: ReactNode
  tooltip?: string
  /** Тост после копирования (по умолчанию да). */
  toast?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function CopyButton({ text, label, tooltip = 'Скопировать', toast: withToast = true, size = 'sm', className }: CopyButtonProps) {
  const { done, run } = useCopy(text, withToast)
  const icon = done ? <Check size={14} /> : <Copy size={14} />
  if (label) {
    return (
      <Button size={size} variant="ghost" icon={icon} onClick={run} className={className}>
        {label}
      </Button>
    )
  }
  return <IconButton label={done ? 'Скопировано' : tooltip} icon={icon} size={size} onClick={run} className={className} />
}

export interface CopyValueProps {
  /** Копируемое значение. */
  value: string
  /** Что показать вместо значения (например, @имя бота); по умолчанию - само значение. */
  children?: ReactNode
  /** Подсказка и подпись кнопки для скринридера: «Скопировать ссылку». */
  label?: string
  /** Моноширинный шрифт: коды, ссылки, идентификаторы (по умолчанию да). */
  mono?: boolean
  /** Адрес рядом со значением: кнопка-иконка открывает его в новой вкладке. */
  href?: string
  /** Подсказка кнопки-ссылки. */
  hrefLabel?: string
  /** Тост после копирования (по умолчанию да). */
  toast?: boolean
  /** На всю ширину контейнера; длинное значение обрезается многоточием. */
  block?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Значение, которое копируется кликом: плашка с текстом и иконкой
 * копирования (после копирования - галочка и тост «Скопировано»). Кнопка
 * доступна с клавиатуры, подпись - в подсказке и aria-label.
 */
export function CopyValue({
  value,
  children,
  label = 'Скопировать',
  mono = true,
  href,
  hrefLabel = 'Открыть',
  toast: withToast = true,
  block = false,
  size = 'md',
  className,
}: CopyValueProps) {
  const { done, run } = useCopy(value, withToast)
  return (
    <span className={cx('ev-copyvalue', className)} data-block={block || undefined} data-size={size}>
      <Tooltip content={done ? 'Скопировано' : label}>
        <button
          type="button"
          className="ev-copyvalue-btn"
          aria-label={`${label}: ${value}`}
          data-done={done || undefined}
          onClick={() => void run()}
        >
          <span className={cx('ev-copyvalue-text', mono && 'ev-copyvalue-mono')}>{children ?? value}</span>
          <span className="ev-copyvalue-icon" aria-hidden="true">
            {done ? <Check size={14} /> : <Copy size={14} />}
          </span>
        </button>
      </Tooltip>
      {href ? (
        <Tooltip content={hrefLabel}>
          <a
            className="ev-btn ev-btn-iconic"
            data-variant="ghost"
            data-size={size === 'sm' ? 'sm' : undefined}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={hrefLabel}
          >
            <span className="ev-btn-icon">
              <ExternalLink size={14} />
            </span>
          </a>
        </Tooltip>
      ) : null}
    </span>
  )
}

export interface FileDropProps {
  /** MIME-типы или расширения: 'application/pdf', '.pdf'. */
  accept?: string
  multiple?: boolean
  /** Максимальный размер файла в байтах. */
  maxSize?: number
  onFiles: (files: File[]) => void
  /** Выбранные файлы (для показа и удаления). */
  files?: File[]
  onRemove?: (file: File) => void
  title?: ReactNode
  hint?: ReactNode
  disabled?: boolean
  /** Ошибка снаружи (например, от сервера). */
  error?: ReactNode
  className?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

function acceptMatches(file: File, accept?: string): boolean {
  if (!accept) return true
  const rules = accept.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some((r) => {
    if (r.startsWith('.')) return name.endsWith(r)
    if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1))
    return type === r
  })
}

/** Зона перетаскивания файла с выбором по клику и проверкой типа и размера. */
export function FileDrop({
  accept,
  multiple = false,
  maxSize,
  onFiles,
  files,
  onRemove,
  title = 'Перетащите файл сюда или выберите на компьютере',
  hint,
  disabled = false,
  error,
  className,
}: FileDropProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [over, setOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const arr = Array.from(list).slice(0, multiple ? undefined : 1)
    const wrongType = arr.find((f) => !acceptMatches(f, accept))
    if (wrongType) {
      setLocalError(`Файл «${wrongType.name}» не подходит по типу`)
      return
    }
    const tooBig = maxSize ? arr.find((f) => f.size > maxSize) : undefined
    if (tooBig && maxSize) {
      setLocalError(`Файл «${tooBig.name}» больше ${formatSize(maxSize)}`)
      return
    }
    setLocalError(null)
    onFiles(arr)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!disabled) take(e.dataTransfer.files)
  }

  const shownError = error ?? localError
  return (
    <div className={cx('ev-filedrop-wrap', className)}>
      <label
        htmlFor={inputId}
        className="ev-filedrop"
        data-over={over || undefined}
        data-invalid={shownError ? true : undefined}
        data-disabled={disabled || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <FileUp size={22} aria-hidden="true" className="ev-filedrop-icon" />
        <span className="ev-filedrop-title">{title}</span>
        {hint ? <span className="ev-filedrop-hint">{hint}</span> : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="ev-visually-hidden"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {shownError ? (
        <div className="ev-field-error" role="alert">
          {shownError}
        </div>
      ) : null}
      {files && files.length > 0 ? (
        <ul className="ev-filedrop-files" role="list">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`}>
              <span className="ev-truncate">{f.name}</span>
              <span className="ev-muted ev-num">{formatSize(f.size)}</span>
              {onRemove ? <IconButton size="sm" label="Убрать файл" icon={<X size={14} />} onClick={() => onRemove(f)} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
