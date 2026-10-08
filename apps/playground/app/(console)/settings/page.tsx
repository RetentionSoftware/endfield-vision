import type { Metadata } from 'next'
import { SettingsScreen } from '@/components/screens/settings/SettingsScreen'

export const metadata: Metadata = { title: 'Настройки' }

export default function Page() {
  return <SettingsScreen />
}
