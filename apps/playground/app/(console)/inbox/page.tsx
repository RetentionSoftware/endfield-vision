import type { Metadata } from 'next'
import { InboxScreen } from '@/components/screens/inbox/InboxScreen'

export const metadata: Metadata = { title: 'Входящие' }

export default function Page() {
  return <InboxScreen />
}
