import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { InboxScreen } from '@/components/screens/inbox/InboxScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('inbox')

export default function Page() {
  return <InboxScreen />
}
