import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { FacilitiesScreen } from '@/components/screens/facilities/FacilitiesScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('facilities')

export default function Page() {
  return <FacilitiesScreen />
}
