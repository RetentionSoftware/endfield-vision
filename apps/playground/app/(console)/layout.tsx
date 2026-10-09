import { LoadingBlock } from 'endfield-vision'
import { Suspense, type ReactNode } from 'react'
import { ConsoleShell } from '@/components/shell/ConsoleShell'
import { getLang } from '@/lib/lang-server'

/** Зона консоли: каркас с меню. Suspense - для страниц с useSearchParams (вкладки в адресе). */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const en = (await getLang()) === 'en'
  return (
    <ConsoleShell>
      <Suspense fallback={<LoadingBlock label={en ? 'Loading' : 'Загрузка'} />}>{children}</Suspense>
    </ConsoleShell>
  )
}
