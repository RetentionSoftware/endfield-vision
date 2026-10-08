import type { Metadata } from 'next'
import { OverviewScreen } from '@/components/screens/overview/OverviewScreen'

export const metadata: Metadata = { title: 'Обзор' }

export default function Page() {
  return <OverviewScreen />
}
