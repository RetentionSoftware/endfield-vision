import type { Metadata } from 'next'
import { StatusScreen } from '@/components/screens/status/StatusScreen'

export const metadata: Metadata = { title: 'Состояние систем' }

export default function Page() {
  return <StatusScreen />
}
