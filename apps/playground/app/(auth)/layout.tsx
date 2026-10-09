import { Suspense, type ReactNode } from 'react'
import s from '@/components/screens/auth/auth.module.css'
import { getLang } from '@/lib/lang-server'

/** Версия демо в подвале экранов входа. */
const VERSION = '2.0.0'

/** Экраны входа: без каркаса консоли, карточка по центру на свечении акцента. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const en = (await getLang()) === 'en'
  return (
    <main className={s.auth}>
      <Suspense>{children}</Suspense>
      <p className={s.foot}>
        ENDFIELD Vision {VERSION} - {en ? 'demo console. All data is fictional.' : 'демо-консоль. Данные вымышленные.'}
      </p>
    </main>
  )
}
