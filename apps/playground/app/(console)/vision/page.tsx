import type { Metadata } from 'next'
import { VisionScreen } from '@/components/vision/VisionScreen'

export const metadata: Metadata = { title: 'ENDFIELD Vision' }

export default function Page() {
  return <VisionScreen />
}
