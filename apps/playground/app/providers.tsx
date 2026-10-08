'use client'

import { LinkProvider, ModalsProvider, Toaster, type LinkComponent } from 'endfield-vision'
import NextLink from 'next/link'
import type { ReactNode } from 'react'

/** Ссылки библиотеки идут через next/link: клиентская навигация и basePath. */
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LinkProvider component={AppLink}>
      <ModalsProvider>
        {children}
        <Toaster />
      </ModalsProvider>
    </LinkProvider>
  )
}
