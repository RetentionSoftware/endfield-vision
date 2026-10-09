import {
  Activity,
  Boxes,
  ClipboardList,
  Factory,
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { bi, type Bi, type Lang } from './lang'

/*
 * Реестр разделов: меню, заголовки и хлебные крошки берут данные отсюда.
 * Новый раздел - сначала сюда, затем страница в app/(console).
 */

export interface NavSection {
  key: string
  label: Bi
  href: string
  icon: LucideIcon
  /** Счётчик в меню. */
  badge?: number
}

export interface NavGroup {
  title?: Bi
  items: NavSection[]
}

export const NAV: NavGroup[] = [
  {
    items: [{ key: 'overview', label: bi('Обзор', 'Overview'), href: '/overview', icon: LayoutDashboard }],
  },
  {
    title: bi('Операции', 'Operations'),
    items: [
      { key: 'facilities', label: bi('Объекты', 'Facilities'), href: '/facilities', icon: Factory },
      { key: 'tasks', label: bi('Задачи', 'Tasks'), href: '/tasks', icon: ClipboardList, badge: 12 },
      { key: 'inventory', label: bi('Склад', 'Inventory'), href: '/inventory', icon: Boxes },
      { key: 'team', label: bi('Команда', 'Team'), href: '/team', icon: Users },
    ],
  },
  {
    title: bi('Управление', 'Management'),
    items: [
      { key: 'finance', label: bi('Финансы', 'Finance'), href: '/finance', icon: Wallet },
      { key: 'inbox', label: bi('Входящие', 'Inbox'), href: '/inbox', icon: Inbox, badge: 3 },
      { key: 'audit', label: bi('Журнал', 'Audit log'), href: '/audit', icon: ScrollText },
      { key: 'settings', label: bi('Настройки', 'Settings'), href: '/settings', icon: Settings },
    ],
  },
  {
    title: bi('Библиотека', 'Library'),
    items: [
      { key: 'vision', label: bi('ENDFIELD Vision', 'ENDFIELD Vision'), href: '/vision', icon: Sparkles },
      { key: 'status', label: bi('Состояние систем', 'System status'), href: '/status', icon: Activity },
    ],
  },
]

const ALL = NAV.flatMap((g) => g.items)

export function section(key: string): NavSection {
  const s = ALL.find((x) => x.key === key)
  if (!s) throw new Error(`Нет раздела ${key}`)
  return s
}

/** Активный пункт: самый длинный href, с которого начинается путь. */
export function activeKey(pathname: string): string | null {
  let best: NavSection | null = null
  for (const s of ALL) {
    if (pathname === s.href || pathname.startsWith(`${s.href}/`)) {
      if (!best || s.href.length > best.href.length) best = s
    }
  }
  return best?.key ?? null
}

/** Хлебные крошки раздела: «Консоль / Раздел». В компонентах - useCrumbs() из lib/use-crumbs. */
export function crumbs(key: string, lang: Lang = 'ru', ...rest: Array<{ label: string; href?: string }>) {
  const s = section(key)
  return [{ label: lang === 'en' ? 'Console' : 'Консоль', href: '/overview' }, { label: s.label[lang], href: rest.length ? s.href : undefined }, ...rest]
}
