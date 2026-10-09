import type { Metadata } from 'next'
import { sectionMetadata } from '@/lib/lang-server'
import { TasksScreen } from '@/components/screens/tasks/TasksScreen'

export const generateMetadata = (): Promise<Metadata> => sectionMetadata('tasks')

export default function Page() {
  return <TasksScreen />
}
