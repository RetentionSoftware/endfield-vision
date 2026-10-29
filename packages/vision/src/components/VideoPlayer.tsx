'use client'

import { VideoOff } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'

/*
 * Плеер видео: родные элементы управления браузера, ширина по контейнеру,
 * высота не больше maxHeight (по умолчанию 72vh), источник - адрес или blob
 * URL. Ошибка воспроизведения - заглушка с текстом вместо чёрного кадра.
 */

export interface VideoPlayerProps {
  src: string
  /** Кадр до запуска. */
  poster?: string
  /** Подпись для скринридера: что на видео. */
  'aria-label'?: string
  /** Предел высоты: число в px или CSS-длина (по умолчанию 72vh). */
  maxHeight?: number | string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  /** Что загружать заранее (по умолчанию metadata: длительность и первый кадр). */
  preload?: 'none' | 'metadata' | 'auto'
  onError?: () => void
  className?: string
}

export function VideoPlayer({
  src,
  poster,
  'aria-label': ariaLabel,
  maxHeight,
  autoPlay,
  loop,
  muted,
  preload = 'metadata',
  onError,
  className,
}: VideoPlayerProps) {
  const t = useMessages()
  // Ошибка привязана к адресу: новый src - новая попытка, без сброса в эффекте.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src
  // Пропорции кадра из метаданных (тоже по адресу): по ним плеер вписывает видео в сцену Lightbox.
  const [meta, setMeta] = useState<{ src: string; ratio: number } | null>(null)
  const ratio = meta?.src === src ? meta.ratio : undefined
  const readRatio = (el: HTMLVideoElement | null) => {
    if (!el || !el.videoWidth || !el.videoHeight) return
    const next = el.videoWidth / el.videoHeight
    if (meta?.src !== src || Math.abs(meta.ratio - next) > 0.001) setMeta({ src, ratio: next })
  }
  const style =
    maxHeight !== undefined
      ? ({ '--ev-video-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties)
      : undefined
  return (
    <div className={cx('ev-video', className)} data-state={failed ? 'error' : undefined} style={style}>
      {failed ? (
        <div className="ev-video-error" role="img" aria-label={ariaLabel ? `${ariaLabel}. ${t.video.error}` : t.video.error}>
          <VideoOff size={22} aria-hidden="true" />
          <span aria-hidden="true">{t.video.error}</span>
        </div>
      ) : (
        <video
          key={src}
          // Метаданные могли загрузиться до гидратации: читаем и при подключении узла.
          ref={(el) => {
            if (el && el.readyState >= 1) readRatio(el)
          }}
          className="ev-video-el"
          style={ratio !== undefined ? ({ '--ev-video-ar': ratio.toFixed(4) } as CSSProperties) : undefined}
          src={src}
          poster={poster}
          aria-label={ariaLabel}
          controls
          playsInline
          preload={preload}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          onLoadedMetadata={(e) => readRatio(e.currentTarget)}
          onError={() => {
            setFailedSrc(src)
            onError?.()
          }}
        />
      )}
    </div>
  )
}
