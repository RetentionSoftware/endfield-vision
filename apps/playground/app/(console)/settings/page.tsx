import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { SettingsScreen } from '@/components/screens/settings/SettingsScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('settings')

export default function Page() {
  return <SettingsScreen />
}
