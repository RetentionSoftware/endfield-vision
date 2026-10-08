import type { Metadata } from 'next'
import { InventoryScreen } from '@/components/screens/inventory/InventoryScreen'

export const metadata: Metadata = { title: 'Склад' }

export default function Page() {
  return <InventoryScreen />
}
