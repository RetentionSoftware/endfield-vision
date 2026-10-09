import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { VisionScreen } from '@/components/vision/VisionScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('vision')

export default function Page() {
  return <VisionScreen />
}
