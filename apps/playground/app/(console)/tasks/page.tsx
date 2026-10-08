import type { Metadata } from 'next'
import { TasksScreen } from '@/components/screens/tasks/TasksScreen'

export const metadata: Metadata = { title: 'Задачи' }

export default function Page() {
  return <TasksScreen />
}
