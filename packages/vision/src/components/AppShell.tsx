'use client'

import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMediaQuery } from '../lib/hooks'
import { UiLink } from '../lib/link'
import { IconButton } from './Button'
import { Drawer } from './Modal'
import { Tooltip } from './Tooltip'

/*
 * Каркас приложения: боковое меню, шапка, область содержимого.
 * От 1024px меню закреплено слева и сворачивается до иконок; уже - выезжает
 * панелью по кнопке в шапке и закрывается после перехода.
 */

interface ShellContextValue {
  /** Узкий экран: меню - выезжающая панель. */
  mobile: boolean
  navOpen: boolean
  setNavOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const ShellContext = createContext<ShellContextValue>({
  mobile: false,
  navOpen: false,
  setNavOpen: () => undefined,
  collapsed: false,
  setCollapsed: () => undefined,
})

export function useAppShell(): ShellContextValue {
  return useContext(ShellContext)
}

export interface AppShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
  /** Свёрнутое меню (управляемое); иначе состояние внутри. */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

export function AppShell({ sidebar, topbar, children, collapsed: collapsedProp, onCollapsedChange, className }: AppShellProps) {
  const mobile = useMediaQuery('(max-width: 1023px)')
  const [navOpen, setNavOpen] = useState(false)
  const [innerCollapsed, setInnerCollapsed] = useState(false)
  const collapsed = !mobile && (collapsedProp ?? innerCollapsed)
  const ctx = useMemo<ShellContextValue>(
    () => ({
      mobile,
      navOpen: mobile && navOpen,
      setNavOpen,
      collapsed,
      setCollapsed: (c) => {
        setInnerCollapsed(c)
        onCollapsedChange?.(c)
      },
    }),
    [mobile, navOpen, collapsed, onCollapsedChange],
  )
  return (
    <ShellContext.Provider value={ctx}>
      <div className={cx('ev-shell', className)} data-collapsed={collapsed || undefined}>
        <a href="#ev-main" className="ev-skip-link">
          Перейти к содержимому
        </a>
        {!mobile ? <aside className="ev-shell-sidebar">{sidebar}</aside> : null}
        <div className="ev-shell-main">
          <header className="ev-shell-topbar">{topbar}</header>
          <main id="ev-main" className="ev-shell-content" tabIndex={-1}>
            {children}
          </main>
        </div>
        {mobile ? (
          <Drawer open={navOpen} onClose={() => setNavOpen(false)} side="left" width={288} bare aria-label="Меню">
            <div className="ev-shell-drawer-nav">{sidebar}</div>
          </Drawer>
        ) : null}
      </div>
    </ShellContext.Provider>
  )
}

/** Кнопка меню в шапке: видна только на узком экране. */
export function AppShellMenuButton() {
  const { mobile, setNavOpen } = useAppShell()
  if (!mobile) return null
  return <IconButton label="Открыть меню" icon={<MenuIcon size={19} />} noTooltip onClick={() => setNavOpen(true)} />
}

export function Topbar({ left, right, children, className }: { left?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('ev-topbar', className)}>
      <div className="ev-topbar-left">
        <AppShellMenuButton />
        {left}
      </div>
      {children ? <div className="ev-topbar-center">{children}</div> : <div className="ev-spacer" />}
      {right ? <div className="ev-topbar-right">{right}</div> : null}
    </div>
  )
}

export function Sidebar({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('ev-sidebar', className)}>
      {header ? <div className="ev-sidebar-header">{header}</div> : null}
      <nav className="ev-sidebar-nav" aria-label="Разделы">
        {children}
      </nav>
      {footer ? <div className="ev-sidebar-footer">{footer}</div> : null}
    </div>
  )
}

export function SidebarSection({ title, children }: { title?: ReactNode; children: ReactNode }) {
  const { collapsed } = useAppShell()
  return (
    <div className="ev-sidebar-section">
      {title && !collapsed ? <div className="ev-sidebar-section-title">{title}</div> : null}
      {title && collapsed ? <div className="ev-sidebar-section-sep" aria-hidden="true" /> : null}
      <ul role="list" className="ev-sidebar-list">
        {children}
      </ul>
    </div>
  )
}

export interface SidebarItemProps {
  href: string
  label: string
  icon?: ReactNode
  active?: boolean
  /** Счётчик или метка справа. */
  badge?: ReactNode
  onClick?: () => void
}

export function SidebarItem({ href, label, icon, active = false, badge, onClick }: SidebarItemProps) {
  const { collapsed, setNavOpen } = useAppShell()
  const link = (
    <UiLink
      href={href}
      className="ev-sidebar-item"
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={() => {
        setNavOpen(false)
        onClick?.()
      }}
    >
      {icon ? (
        <span className="ev-sidebar-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {!collapsed ? <span className="ev-sidebar-item-label">{label}</span> : null}
      {!collapsed && badge !== undefined && badge !== null ? <span className="ev-sidebar-item-badge">{badge}</span> : null}
    </UiLink>
  )
  return <li>{collapsed ? <Tooltip content={label} placement="right">{link}</Tooltip> : link}</li>
}

/** Свернуть или развернуть меню (только на широком экране). */
export function SidebarCollapseButton() {
  const { collapsed, setCollapsed, mobile } = useAppShell()
  if (mobile) return null
  return (
    <IconButton
      label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      icon={collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
      tooltipPlacement="right"
      onClick={() => setCollapsed(!collapsed)}
    />
  )
}
