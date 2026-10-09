import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { StatusScreen } from '@/components/screens/status/StatusScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('status')

export default function Page() {
  return <StatusScreen />
}
