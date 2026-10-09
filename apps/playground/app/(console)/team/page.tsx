import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { TeamScreen } from '@/components/screens/team/TeamScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('team')

export default function Page() {
  return <TeamScreen />
}
