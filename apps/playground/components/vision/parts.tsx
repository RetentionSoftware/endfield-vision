'use client'

import { CopyButton } from 'endfield-vision'
import {
  ChartColumn,
  BookOpen,
  LayoutTemplate,
  MessageSquareWarning,
  MousePointerClick,
  Palette,
  SwatchBook,
  Table2,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react'
import { useSyncExternalStore, type ReactNode } from 'react'
import s from './vision.module.css'

/* ------------------------------------------------------------------ */
/* Вкладки витрины                                                     */
/* ------------------------------------------------------------------ */

export const VISION_TABS = ['intro', 'tokens', 'theme', 'actions', 'forms', 'data', 'feedback', 'charts', 'layout'] as const
export type VisionTab = (typeof VISION_TABS)[number]

export const VISION_TAB_META: Record<VisionTab, { label: string; description: string; icon: LucideIcon }> = {
  intro: { label: 'Обзор', description: 'Что такое библиотека, установка и принципы.', icon: BookOpen },
  tokens: { label: 'Токены', description: 'Цвета, типографика, отступы, радиусы, тени, слои и движение.', icon: SwatchBook },
  theme: { label: 'Тема и акценты', description: 'Тёмная и светлая тема, пресеты акцента, свой акцент и каскадные слои.', icon: Palette },
  actions: { label: 'Кнопки и меню', description: 'Кнопки, подсказки, меню, поповер, вкладки и клавиши.', icon: MousePointerClick },
  forms: { label: 'Формы', description: 'Поля, маски, списки, даты, календарь, переключатели и загрузка файлов.', icon: TextCursorInput },
  data: { label: 'Данные', description: 'Таблица с фильтрами, показатели, бейджи, статусы, прогресс и копирование.', icon: Table2 },
  feedback: { label: 'Состояния и окна', description: 'Плашки, уведомления, окна, шторки, пустые состояния и загрузка.', icon: MessageSquareWarning },
  charts: { label: 'Графики', description: 'Столбцы, линии, области, стопки и мини-графики на токенах палитры.', icon: ChartColumn },
  layout: { label: 'Каркас', description: 'AppShell, шапка страницы, карточки, панели и утилиты раскладки.', icon: LayoutTemplate },
}

export const LIBRARY_VERSION = '0.1.0'

/* ------------------------------------------------------------------ */
/* Блок кода                                                           */
/* ------------------------------------------------------------------ */

/** Фрагмент кода с подписью и кнопкой копирования. */
export function CodeBlock({ code, label }: { code: string; label?: ReactNode }) {
  return (
    <div className={s.code}>
      <div className={s.codeHead}>
        <span className="ev-truncate">{label ?? 'Код'}</span>
        <CopyButton text={code} tooltip="Скопировать код" />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Подзаголовок внутри карточки демо. */
export function Subhead({ children }: { children: ReactNode }) {
  return <div className={s.subhead}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* Текущее значение токена                                             */
/* ------------------------------------------------------------------ */

/*
 * Значение CSS-переменной в текущей теме. Перечитывается при смене
 * data-theme / data-accent на <html>; на сервере - пусто.
 */
const tokenListeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribeTokens(cb: () => void): () => void {
  tokenListeners.add(cb)
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const l of tokenListeners) l()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] })
  }
  return () => {
    tokenListeners.delete(cb)
    if (tokenListeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/\s+/g, ' ')
}

export function useTokenValue(name: string): string {
  return useSyncExternalStore(
    subscribeTokens,
    () => readToken(name),
    () => '',
  )
}

export function TokenValue({ name }: { name: string }) {
  const value = useTokenValue(name)
  return <span className={s.tokenValue}>{value || ' '}</span>
}
