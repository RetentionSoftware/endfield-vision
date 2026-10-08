'use client'

import { createContext, createElement, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode, type Ref } from 'react'

/**
 * Компонент ссылки приложения. Библиотека не зависит от Next.js: приложение передаёт
 * next/link через LinkProvider, и навигация учитывает basePath и клиентский
 * роутинг. Без провайдера - обычный <a>.
 */
export type LinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement>; children?: ReactNode }
>

const LinkContext = createContext<LinkComponent | null>(null)

export function LinkProvider({ component, children }: { component: LinkComponent; children: ReactNode }) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>
}

function PlainLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} />
}

export function useLinkComponent(): LinkComponent {
  return useContext(LinkContext) ?? PlainLink
}

/** Ссылка через компонент приложения. */
export function UiLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> }) {
  // createElement: компонент ссылки приходит из контекста и стабилен между рендерами.
  return createElement(useLinkComponent(), props)
}
