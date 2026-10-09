import type { Metadata } from 'next'
import { titleMetadata } from '@/lib/lang-server'
import { LoginScreen } from '@/components/screens/auth/LoginScreen'

export const generateMetadata = (): Promise<Metadata> => titleMetadata('Вход', 'Sign in')

export default function Page() {
  return <LoginScreen />
}
