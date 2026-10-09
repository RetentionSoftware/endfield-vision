import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { InventoryScreen } from '@/components/screens/inventory/InventoryScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('inventory')

export default function Page() {
  return <InventoryScreen />
}
