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

/*
 * Реестр разделов: меню, заголовки и хлебные крошки берут данные отсюда.
 * Новый раздел - сначала сюда, затем страница в app/(console).
 */

export interface NavSection {
  key: string
  label: string
  href: string
  icon: LucideIcon
  /** Счётчик в меню. */
  badge?: number
}

export interface NavGroup {
  title?: string
  items: NavSection[]
}

export const NAV: NavGroup[] = [
  {
    items: [{ key: 'overview', label: 'Обзор', href: '/overview', icon: LayoutDashboard }],
  },
  {
    title: 'Операции',
    items: [
      { key: 'facilities', label: 'Объекты', href: '/facilities', icon: Factory },
      { key: 'tasks', label: 'Задачи', href: '/tasks', icon: ClipboardList, badge: 12 },
      { key: 'inventory', label: 'Склад', href: '/inventory', icon: Boxes },
      { key: 'team', label: 'Команда', href: '/team', icon: Users },
    ],
  },
  {
    title: 'Управление',
    items: [
      { key: 'finance', label: 'Финансы', href: '/finance', icon: Wallet },
      { key: 'inbox', label: 'Входящие', href: '/inbox', icon: Inbox, badge: 3 },
      { key: 'audit', label: 'Журнал', href: '/audit', icon: ScrollText },
      { key: 'settings', label: 'Настройки', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'Библиотека',
    items: [
      { key: 'vision', label: 'ENDFIELD Vision', href: '/vision', icon: Sparkles },
      { key: 'status', label: 'Состояние систем', href: '/status', icon: Activity },
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

/** Хлебные крошки раздела: «Консоль / Раздел». */
export function crumbs(key: string, ...rest: Array<{ label: string; href?: string }>) {
  const s = section(key)
  return [{ label: 'Консоль', href: '/overview' }, { label: s.label, href: rest.length ? s.href : undefined }, ...rest]
}
