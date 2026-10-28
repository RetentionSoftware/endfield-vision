'use client'

import { ImageOff, Play, Video, VideoOff } from 'lucide-react'
import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Lightbox, type LightboxImage } from './Lightbox'

/*
 * Миниатюра изображения или видео: кадр с заданными пропорциями (обрезка
 * cover или вписывание contain), подпись снизу, значок поверх, состояния
 * загрузки и ошибки. У видео (kind="video") - немой первый кадр, знак
 * воспроизведения и значок «Видео». С onClick кадр - кнопка. ThumbnailGrid -
 * сетка превью с переходом в Lightbox по индексу.
 */

/** Пропорции кадра: число (ширина / высота) или строка CSS aspect-ratio ('4/3', '16/9'). */
export type ThumbnailAspect = number | string

export interface ThumbnailProps {
  /** Адрес изображения или видео (у видео - и blob URL). */
  src: string
  /** image (по умолчанию) или video: превью - первый кадр без звука. */
  kind?: 'image' | 'video'
  /** Описание для скринридера; '' - декоративное изображение. */
  alt: string
  /** Подпись под кадром. */
  caption?: ReactNode
  /** Пропорции кадра (по умолчанию 4/3). */
  aspect?: ThumbnailAspect
  /** cover - обрезать по кадру (по умолчанию), contain - вписать целиком. */
  fit?: 'cover' | 'contain'
  /** Значок в углу кадра: «3 стр.». У видео по умолчанию - «Видео», null - без значка. */
  badge?: ReactNode
  /** Знак по центру кадра. У видео по умолчанию - иконка воспроизведения, null - без знака. */
  overlay?: ReactNode
  /** Кадр ещё готовится снаружи (загрузка файла, обработка): скелетон поверх. */
  loading?: boolean
  onClick?: () => void
  /** Подпись кнопки, если отличается от alt. */
  'aria-label'?: string
  /** Ширина миниатюры (по умолчанию 100% контейнера). */
  width?: number | string
  className?: string
}

type LoadState = 'loading' | 'loaded' | 'error'

function aspectValue(aspect: ThumbnailAspect): string {
  return typeof aspect === 'number' ? String(aspect) : aspect
}

/**
 * Состояние загрузки по src: смена адреса - снова загрузка, без сброса в эффекте.
 * Ref-callback ловит снимки и кадры, загруженные до гидратации (их onLoad React не видит).
 */
function useMediaState(src: string): [LoadState, (next: LoadState) => void, (el: HTMLImageElement | HTMLVideoElement | null) => void] {
  const [state, setState] = useState<{ src: string; value: LoadState } | null>(null)
  const value: LoadState = state?.src === src ? state.value : 'loading'
  const settle = useCallback((next: LoadState) => setState({ src, value: next }), [src])
  const watch = useCallback(
    (el: HTMLImageElement | HTMLVideoElement | null) => {
      if (!el) return
      if (el instanceof HTMLVideoElement) {
        if (el.error) settle('error')
        // HAVE_CURRENT_DATA: первый кадр уже есть.
        else if (el.readyState >= 2) settle('loaded')
      } else if (el.complete) settle(el.naturalWidth > 0 ? 'loaded' : 'error')
    },
    [settle],
  )
  return [value, settle, watch]
}

/** Адрес первого кадра: без отметки времени Safari не рисует кадр до запуска. */
function firstFrameSrc(src: string): string {
  return src.includes('#') ? src : `${src}#t=0.1`
}

export function Thumbnail({
  src,
  kind = 'image',
  alt,
  caption,
  aspect = '4/3',
  fit = 'cover',
  badge,
  overlay,
  loading = false,
  onClick,
  'aria-label': ariaLabel,
  width,
  className,
}: ThumbnailProps) {
  const t = useMessages()
  const [loadState, settle, watchMedia] = useMediaState(src)
  const state: LoadState = loading ? 'loading' : loadState
  const style = { '--ev-thumb-aspect': aspectValue(aspect), width } as CSSProperties
  const video = kind === 'video'
  const videoBadge = (
    <>
      <Video size={12} aria-hidden="true" />
      {t.thumbnail.video}
    </>
  )
  const shownBadge = badge !== undefined ? badge : video ? videoBadge : null
  const shownOverlay = overlay !== undefined ? overlay : video ? <Play size={18} /> : null

  const media = video ? (
    <video
      ref={watchMedia}
      className="ev-thumb-img"
      src={firstFrameSrc(src)}
      // Без кнопки кадр - картинка с подписью; в кнопке подпись у самой кнопки.
      role={onClick ? undefined : 'img'}
      aria-label={onClick ? undefined : alt || undefined}
      aria-hidden={onClick ? true : undefined}
      preload="metadata"
      muted
      playsInline
      disablePictureInPicture
      onLoadedData={() => settle('loaded')}
      onError={() => settle('error')}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={watchMedia}
      className="ev-thumb-img"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => settle('loaded')}
      onError={() => settle('error')}
    />
  )

  const frame = (
    <>
      {media}
      {state === 'loading' ? <span className="ev-thumb-skeleton" aria-hidden="true" /> : null}
      {state === 'error' ? (
        <span className="ev-thumb-error">
          {video ? <VideoOff size={20} aria-hidden="true" /> : <ImageOff size={20} aria-hidden="true" />}
          <span>{t.thumbnail.error}</span>
        </span>
      ) : null}
      {shownOverlay && state === 'loaded' ? (
        <span className="ev-thumb-overlay" aria-hidden="true">
          {shownOverlay}
        </span>
      ) : null}
      {shownBadge ? <span className="ev-thumb-badge">{shownBadge}</span> : null}
    </>
  )

  return (
    <figure
      className={cx('ev-thumb', className)}
      data-state={state}
      data-fit={fit}
      data-kind={video ? 'video' : undefined}
      style={style}
    >
      {onClick ? (
        <button
          type="button"
          className="ev-thumb-frame"
          aria-label={ariaLabel ?? (alt || undefined)}
          aria-busy={state === 'loading' || undefined}
          onClick={onClick}
        >
          {frame}
        </button>
      ) : (
        <div className="ev-thumb-frame" aria-busy={state === 'loading' || undefined}>
          {frame}
        </div>
      )}
      {caption ? <figcaption className="ev-thumb-caption">{caption}</figcaption> : null}
    </figure>
  )
}

export interface ThumbnailGridItem {
  /** Ключ элемента; по умолчанию - src. */
  key?: string
  /** Превью; у видео - адрес самого видео (первый кадр). */
  src: string
  /** image (по умолчанию) или video: в Lightbox видео открывается в плеере. */
  kind?: 'image' | 'video'
  alt: string
  caption?: ReactNode
  badge?: ReactNode
  overlay?: ReactNode
  loading?: boolean
  /** Полный снимок для Lightbox (по умолчанию src). */
  fullSrc?: string
  /** Имя файла в Lightbox и при скачивании. */
  name?: string
  downloadUrl?: string
  /** Своё действие вместо Lightbox (например видео); такой элемент в Lightbox не попадает. */
  onClick?: () => void
}

export interface ThumbnailGridProps {
  items: ThumbnailGridItem[]
  aspect?: ThumbnailAspect
  fit?: 'cover' | 'contain'
  /** Минимальная ширина колонки, px (по умолчанию 140): колонок столько, сколько помещается. */
  minWidth?: number
  /** Просмотр в Lightbox по нажатию (по умолчанию да). */
  lightbox?: boolean
  /** Нажатие на элемент (вызывается и при открытии Lightbox). */
  onItemClick?: (index: number) => void
  /** Lightbox: с последнего снимка - на первый и обратно. */
  loop?: boolean
  /** Lightbox: кнопка скачивания (по умолчанию да). */
  download?: boolean
  'aria-label'?: string
  className?: string
}

/** Сетка превью: колонки по ширине контейнера, просмотр в Lightbox. */
export function ThumbnailGrid({
  items,
  aspect,
  fit,
  minWidth = 140,
  lightbox = true,
  onItemClick,
  loop,
  download,
  'aria-label': ariaLabel,
  className,
}: ThumbnailGridProps) {
  const [viewing, setViewing] = useState<number | null>(null)
  // В Lightbox - только элементы без своего действия; номер элемента сетки -> номер снимка.
  const shots: LightboxImage[] = []
  const shotIndex = items.map((it) => {
    if (it.onClick) return -1
    shots.push({ src: it.fullSrc ?? it.src, kind: it.kind, alt: it.alt, name: it.name, downloadUrl: it.downloadUrl })
    return shots.length - 1
  })
  const clickable = lightbox || Boolean(onItemClick)

  return (
    <>
      <ul
        role="list"
        aria-label={ariaLabel}
        className={cx('ev-thumb-grid', className)}
        style={{ '--ev-thumb-min': `${minWidth}px` } as CSSProperties}
      >
        {items.map((it, i) => {
          const shot = shotIndex[i] ?? -1
          const open =
            it.onClick ?? (clickable
              ? () => {
                  onItemClick?.(i)
                  if (lightbox && shot >= 0) setViewing(shot)
                }
              : undefined)
          return (
            <li key={it.key ?? it.src}>
              <Thumbnail
                src={it.src}
                kind={it.kind}
                alt={it.alt}
                caption={it.caption}
                badge={it.badge}
                overlay={it.overlay}
                loading={it.loading}
                aspect={aspect}
                fit={fit}
                onClick={open}
              />
            </li>
          )
        })}
      </ul>
      {lightbox && shots.length > 0 ? (
        <Lightbox
          images={shots}
          open={viewing !== null}
          onClose={() => setViewing(null)}
          index={viewing ?? 0}
          onIndexChange={setViewing}
          loop={loop}
          download={download}
        />
      ) : null}
    </>
  )
}
