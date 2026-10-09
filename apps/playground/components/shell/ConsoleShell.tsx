'use client'

import {
  AppShell,
  Sidebar,
  SidebarCollapseButton,
  SidebarItem,
  SidebarSection,
  Topbar,
  useAppShell,
} from 'endfield-vision'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore, type ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { useT } from '@/lib/i18n'
import { activeKey, NAV } from '@/lib/nav'
import { AccountMenu } from './AccountMenu'
import { CommandSearch } from './CommandSearch'
import { ThemeMenu } from './ThemeMenu'

const COLLAPSE_KEY = 'ev-playground-sidebar'
const listeners = new Set<() => void>()

/* Свёрнутое меню - настройка браузера; на сервере и при гидрации меню развёрнуто. */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(c: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, c ? '1' : '0')
  } catch {
    // Приватный режим: состояние не сохраняется.
  }
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function SidebarBrand() {
  const { collapsed } = useAppShell()
  const { t } = useT()
  return <Brand compact={collapsed} subtitle={t('Демо-консоль', 'Demo console')} />
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false)
  const active = activeKey(pathname)
  const { tx } = useT()

  const sidebar = (
    <Sidebar header={<SidebarBrand />} footer={<SidebarCollapseButton />}>
      {NAV.map((g, i) => (
        <SidebarSection key={g.title?.ru ?? `g${i}`} title={g.title ? tx(g.title) : undefined}>
          {g.items.map((s) => {
            const Icon = s.icon
            return (
              <SidebarItem
                key={s.key}
                href={s.href}
                label={tx(s.label)}
                icon={<Icon size={18} />}
                badge={s.badge}
                active={s.key === active}
              />
            )
          })}
        </SidebarSection>
      ))}
    </Sidebar>
  )

  return (
    <AppShell
      collapsed={collapsed}
      onCollapsedChange={writeCollapsed}
      sidebar={sidebar}
      topbar={
        <Topbar
          left={<CommandSearch />}
          right={
            <>
              <ThemeMenu />
              <AccountMenu />
            </>
          }
        />
      }
    >
      {children}
    </AppShell>
  )
}
