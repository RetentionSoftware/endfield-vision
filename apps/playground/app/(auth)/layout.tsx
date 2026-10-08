import { Suspense, type ReactNode } from 'react'
import s from '@/components/screens/auth/auth.module.css'

/** Версия демо в подвале экранов входа. */
const VERSION = '0.1.0'

/** Экраны входа: без каркаса консоли, карточка по центру на свечении акцента. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={s.auth}>
      <Suspense>{children}</Suspense>
      <p className={s.foot}>ENDFIELD Vision {VERSION} - демо-консоль. Данные вымышленные.</p>
    </main>
  )
}
