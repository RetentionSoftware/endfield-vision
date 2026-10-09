'use client'

import {
  LinkProvider,
  LocaleProvider,
  ModalsProvider,
  MotionProvider,
  Toaster,
  type LinkComponent,
} from 'endfield-vision'
import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { LangProvider, useLang } from '@/lib/i18n'
import type { Lang } from '@/lib/lang'
import { useMotionPref } from '@/lib/motion-pref'

/** Ссылки библиотеки идут через next/link (клиентская навигация и basePath). */
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <LangProvider initial={lang}>
      <LibraryProviders>{children}</LibraryProviders>
    </LangProvider>
  )
}

/** Провайдеры библиотеки: язык встроенных текстов следует языку консоли. */
function LibraryProviders({ children }: { children: ReactNode }) {
  const { lang } = useLang()
  // Анимация появления чисел и графиков - для всей консоли; переключатель - в меню оформления.
  const motion = useMotionPref()
  return (
    <LocaleProvider locale={lang}>
      <MotionProvider animate={motion}>
        <LinkProvider component={AppLink}>
          <ModalsProvider>
            {children}
            <Toaster />
          </ModalsProvider>
        </LinkProvider>
      </MotionProvider>
    </LocaleProvider>
  )
}
