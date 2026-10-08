import type { Metadata } from 'next'
import { SectionPlaceholder } from '@/components/screens/SectionPlaceholder'

export const metadata: Metadata = { title: 'Объекты' }

export default function Page() {
  return <SectionPlaceholder sectionKey="facilities" />
}
