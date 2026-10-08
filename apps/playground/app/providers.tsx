'use client'

import { LinkProvider, LocaleProvider, ModalsProvider, Toaster, type LinkComponent } from 'endfield-vision'
import NextLink from 'next/link'
import type { ReactNode } from 'react'

/** Язык встроенных текстов библиотеки - русский; ссылки идут через next/link (клиентская навигация и basePath). */
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider locale="ru">
      <LinkProvider component={AppLink}>
        <ModalsProvider>
          {children}
          <Toaster />
        </ModalsProvider>
      </LinkProvider>
    </LocaleProvider>
  )
}
