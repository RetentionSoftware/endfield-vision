import type { Metadata } from 'next'
import { SectionPlaceholder } from '@/components/screens/SectionPlaceholder'

export const metadata: Metadata = { title: 'Склад' }

export default function Page() {
  return <SectionPlaceholder sectionKey="inventory" />
}
