import type { Metadata } from 'next'
import { FacilitiesScreen } from '@/components/screens/facilities/FacilitiesScreen'

export const metadata: Metadata = { title: 'Объекты' }

export default function Page() {
  return <FacilitiesScreen />
}
