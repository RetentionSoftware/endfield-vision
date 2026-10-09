'use client'

import { CopyButton } from 'endfield-vision'
import {
  Briefcase,
  ChartColumn,
  Compass,
  FileText,
  BookOpen,
  Languages,
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
import { bi, useT, type Bi } from '@/lib/i18n'
import s from './vision.module.css'

/* ------------------------------------------------------------------ */
/* Вкладки витрины                                                     */
/* ------------------------------------------------------------------ */

export const VISION_TABS = ['intro', 'tokens', 'theme', 'i18n', 'actions', 'navigation', 'forms', 'data', 'content', 'feedback', 'charts', 'crm', 'layout'] as const
export type VisionTab = (typeof VISION_TABS)[number]

export const VISION_TAB_META: Record<VisionTab, { label: Bi; description: Bi; icon: LucideIcon }> = {
  intro: {
    label: bi('Обзор', 'Overview'),
    description: bi(
      'Что такое библиотека, установка и принципы.',
      'What the library is, how to install it and the principles behind it.',
    ),
    icon: BookOpen,
  },
  tokens: {
    label: bi('Токены', 'Tokens'),
    description: bi(
      'Цвета, типографика, отступы, радиусы, тени, слои и движение.',
      'Color, typography, spacing, radii, shadows, layers and motion.',
    ),
    icon: SwatchBook,
  },
  theme: {
    label: bi('Тема и акценты', 'Theme and accents'),
    description: bi(
      'Тёмная и светлая тема, пресеты акцента, свой акцент и каскадные слои.',
      'Dark and light themes, accent presets, custom accents and cascade layers.',
    ),
    icon: Palette,
  },
  i18n: {
    label: bi('Языки', 'Languages'),
    description: bi(
      'LocaleProvider, встроенные тексты на русском и английском, свои формулировки.',
      'LocaleProvider, built-in Russian and English strings, and custom wording.',
    ),
    icon: Languages,
  },
  actions: {
    label: bi('Кнопки и меню', 'Buttons and menus'),
    description: bi(
      'Кнопки, ссылки, подсказки, меню, поповер, переключатели, вкладки и клавиши.',
      'Buttons, links, tooltips, menus, popovers, toggles, tabs and keyboard keys.',
    ),
    icon: MousePointerClick,
  },
  navigation: {
    label: bi('Навигация', 'Navigation'),
    description: bi(
      'Палитра команд, шаги мастера, аккордеон, раскрывающийся блок и дерево.',
      'Command palette, wizard steps, accordion, disclosure and tree.',
    ),
    icon: Compass,
  },
  forms: {
    label: bi('Формы', 'Forms'),
    description: bi(
      'Поля, маски, время, списки, даты, календарь, переключатели, слайдер, теги, код подтверждения, правка на месте и загрузка файлов.',
      'Inputs, masks, time, selects, dates, calendar, toggles, slider, tags, verification codes, inline editing and file upload.',
    ),
    icon: TextCursorInput,
  },
  data: {
    label: bi('Данные', 'Data'),
    description: bi(
      'Таблица с фильтрами, показатели, лента событий, доступность, бейджи, прогресс и копирование.',
      'Filterable table, metrics, event feed, uptime, badges, progress and copy to clipboard.',
    ),
    icon: Table2,
  },
  content: {
    label: bi('Контент', 'Content'),
    description: bi(
      'Баннеры, блоки кода, подсветка совпадений, относительное время и сворачиваемый текст.',
      'Banners, code blocks, match highlighting, relative time and collapsible text.',
    ),
    icon: FileText,
  },
  feedback: {
    label: bi('Состояния и окна', 'Feedback and overlays'),
    description: bi(
      'Плашки, уведомления, окна, шторки, пустые состояния и загрузка.',
      'Alerts, toasts, dialogs, drawers, empty states and loading.',
    ),
    icon: MessageSquareWarning,
  },
  charts: {
    label: bi('Графики', 'Charts'),
    description: bi(
      'Столбцы, линии, области, стопки, доли, тепловые карты, кольца, шкалы и мини-графики на токенах палитры.',
      'Bar, line, area, stacked, share, heatmap, donut, gauge and sparkline charts built on palette tokens.',
    ),
    icon: ChartColumn,
  },
  crm: {
    label: bi('CRM', 'CRM'),
    description: bi(
      'Заготовки для CRM: карточка записи, канбан, таймеры SLA, права, настройки, уведомления, чат, контекстное меню и строка состояния.',
      'CRM building blocks: record page, kanban, SLA timers, permissions, settings, notifications, chat, context menu and status bar.',
    ),
    icon: Briefcase,
  },
  layout: {
    label: bi('Каркас', 'Layout'),
    description: bi(
      'AppShell, шапка страницы, карточки, панели и утилиты раскладки.',
      'AppShell, page header, cards, panels and layout utilities.',
    ),
    icon: LayoutTemplate,
  },
}

export const LIBRARY_VERSION = '2.0.0'

/* ------------------------------------------------------------------ */
/* Блок кода                                                           */
/* ------------------------------------------------------------------ */

/** Фрагмент кода с подписью и кнопкой копирования. */
export function CodeBlock({ code, label }: { code: string; label?: ReactNode }) {
  const { t } = useT()
  return (
    <div className={s.code}>
      <div className={s.codeHead}>
        <span className="ev-truncate">{label ?? t('Код', 'Code')}</span>
        <CopyButton text={code} tooltip={t('Скопировать код', 'Copy code')} />
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
