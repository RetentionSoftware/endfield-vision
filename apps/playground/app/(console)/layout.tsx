import { LoadingBlock } from 'endfield-vision'
import { Suspense, type ReactNode } from 'react'
import { ConsoleShell } from '@/components/shell/ConsoleShell'

/** Зона консоли: каркас с меню. Suspense - для страниц с useSearchParams (вкладки в адресе). */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleShell>
      <Suspense fallback={<LoadingBlock label="Загрузка" />}>{children}</Suspense>
    </ConsoleShell>
  )
}
