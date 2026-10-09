import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { AuditScreen } from '@/components/screens/audit/AuditScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('audit')

export default function Page() {
  return <AuditScreen />
}
