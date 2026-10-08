import { EmptyState, PageHeader } from 'endfield-vision'
import { Hammer } from 'lucide-react'
import { crumbs, section } from '@/lib/nav'

/** Заглушка раздела: шапка и пустое состояние. Заменяется экраном целиком. */
export function SectionPlaceholder({ sectionKey }: { sectionKey: string }) {
  const s = section(sectionKey)
  return (
    <>
      <PageHeader title={s.label} breadcrumbs={crumbs(sectionKey)} />
      <EmptyState icon={<Hammer size={28} />} title="Раздел в разработке" description="Экран появится в следующей версии демо." />
    </>
  )
}
