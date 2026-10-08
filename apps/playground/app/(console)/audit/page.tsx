import type { Metadata } from 'next'
import { AuditScreen } from '@/components/screens/audit/AuditScreen'

export const metadata: Metadata = { title: 'Журнал' }

export default function Page() {
  return <AuditScreen />
}
