import type { Metadata } from 'next'
import { FinanceScreen } from '@/components/screens/finance/FinanceScreen'

export const metadata: Metadata = { title: 'Финансы' }

export default function Page() {
  return <FinanceScreen />
}
