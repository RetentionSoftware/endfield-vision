import type { Metadata } from 'next'
import { LoginScreen } from '@/components/screens/auth/LoginScreen'

export const metadata: Metadata = { title: 'Вход' }

export default function Page() {
  return <LoginScreen />
}
