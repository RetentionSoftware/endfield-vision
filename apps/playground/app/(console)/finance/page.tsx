import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { FinanceScreen } from '@/components/screens/finance/FinanceScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('finance')

export default function Page() {
  return <FinanceScreen />
}
