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
import { useMotionPref } from '@/lib/motion-pref'

/** Язык встроенных текстов библиотеки - русский; ссылки идут через next/link (клиентская навигация и basePath). */
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }: { children: ReactNode }) {
  // Анимация появления чисел и графиков - для всей консоли; переключатель - в меню оформления.
  const motion = useMotionPref()
  return (
    <LocaleProvider locale="ru">
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
