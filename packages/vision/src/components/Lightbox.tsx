'use client'

import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useControllable } from '../lib/hooks'
import { useMessages } from '../lib/i18n'
import { Portal, useEscapeLayer, useFocusTrap, useScrollLock } from '../lib/overlay'
import { IconButton } from './Button'
import { Tooltip } from './Tooltip'

/*
 * Полноэкранный просмотр изображений: вложения сообщений, фото в карточках.
 * Стрелки и клавиши Влево / Вправо листают, Escape закрывает, на сенсорном
 * экране - свайп. Фокус заперт внутри и возвращается на элемент-инициатор.
 */

export interface LightboxImage {
  src: string
  /** Описание для скринридера; без него - name. */
  alt?: string
  /** Имя файла: подпись в шапке и имя при скачивании. */
  name?: string
  /** Адрес для скачивания, если отличается от src (оригинал вместо превью). */
  downloadUrl?: string
}

export interface LightboxProps {
  images: LightboxImage[]
  open: boolean
  onClose: () => void
  /** Текущий снимок (управляемый режим). */
  index?: number
  /** Начальный снимок без управления снаружи. */
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** С последнего снимка - на первый и обратно (по умолчанию нет). */
  loop?: boolean
  /** Кнопка скачивания (по умолчанию да). */
  download?: boolean
}

/** Порог свайпа, px: короче - это касание, а не листание. */
const SWIPE = 48

export function Lightbox({ open, ...rest }: LightboxProps) {
  if (!open || rest.images.length === 0) return null
  return (
    <Portal>
      <LightboxFrame {...rest} />
    </Portal>
  )
}

/** Окно просмотра без портала. Экспортируется для тестов, в публичный API не входит. */
export function LightboxFrame({
  images,
  onClose,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  download = true,
}: Omit<LightboxProps, 'open'>) {
  const t = useMessages()
  const ref = useRef<HTMLDivElement | null>(null)
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const [rawIndex, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const count = images.length
  const index = Math.min(Math.max(0, rawIndex), count - 1)
  const image = images[index]!
  const hasPrev = loop ? count > 1 : index > 0
  const hasNext = loop ? count > 1 : index < count - 1

  useFocusTrap(ref, true)
  useScrollLock(true)
  useEscapeLayer(true, onClose)

  const go = (delta: number) => {
    if ((delta < 0 && !hasPrev) || (delta > 0 && !hasNext)) return
    setIndex((index + delta + count) % count)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== e.pointerId) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return
    go(dx < 0 ? 1 : -1)
  }

  return (
    <div
      ref={ref}
      className="ev-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.lightbox.label}
      tabIndex={-1}
      data-ev-layer=""
      onKeyDown={onKeyDown}
    >
      <div className="ev-lightbox-bar">
        {count > 1 ? (
          <span className="ev-lightbox-counter ev-num" aria-live="polite">
            {t.lightbox.counter(index + 1, count)}
          </span>
        ) : null}
        {image.name ? <span className="ev-lightbox-name ev-truncate">{image.name}</span> : null}
        <span className="ev-spacer" />
        {download ? (
          <Tooltip content={t.lightbox.download}>
            <a
              className="ev-btn ev-btn-iconic"
              data-variant="ghost"
              href={image.downloadUrl ?? image.src}
              download={image.name ?? ''}
              aria-label={t.lightbox.download}
            >
              <span className="ev-btn-icon">
                <Download size={17} />
              </span>
            </a>
          </Tooltip>
        ) : null}
        <IconButton label={t.common.close} icon={<X size={18} />} onClick={onClose} data-dialog-close="" />
      </div>
      <div
        className="ev-lightbox-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {/* Библиотека не завязана на next/image: обычный img. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={image.src}
          className="ev-lightbox-img"
          src={image.src}
          alt={image.alt ?? image.name ?? ''}
          draggable={false}
        />
        {count > 1 ? (
          <>
            <IconButton
              className="ev-lightbox-nav"
              data-dir="prev"
              variant="secondary"
              size="lg"
              label={t.lightbox.prev}
              icon={<ChevronLeft size={20} />}
              disabled={!hasPrev}
              onClick={() => go(-1)}
            />
            <IconButton
              className="ev-lightbox-nav"
              data-dir="next"
              variant="secondary"
              size="lg"
              label={t.lightbox.next}
              icon={<ChevronRight size={20} />}
              disabled={!hasNext}
              onClick={() => go(1)}
            />
          </>
        ) : null}
      </div>
      {image.alt && image.name && image.alt !== image.name ? (
        <p className="ev-lightbox-caption">{image.alt}</p>
      ) : null}
    </div>
  )
}
