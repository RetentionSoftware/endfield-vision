import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { OverviewScreen } from '@/components/screens/overview/OverviewScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('overview')

export default function Page() {
  return <OverviewScreen />
}
