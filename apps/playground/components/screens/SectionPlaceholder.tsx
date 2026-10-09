'use client'

import { EmptyState, PageHeader } from 'endfield-vision'
import { Hammer } from 'lucide-react'
import { useCrumbs, useT } from '@/lib/i18n'
import { section } from '@/lib/nav'

/** Заглушка раздела: шапка и пустое состояние. Заменяется экраном целиком. */
export function SectionPlaceholder({ sectionKey }: { sectionKey: string }) {
  const { t, tx } = useT()
  const crumbs = useCrumbs(sectionKey)
  return (
    <>
      <PageHeader title={tx(section(sectionKey).label)} breadcrumbs={crumbs} />
      <EmptyState
        icon={<Hammer size={28} />}
        title={t('Раздел в разработке', 'Section in progress')}
        description={t('Экран появится в следующей версии демо.', 'This screen arrives in the next demo version.')}
      />
    </>
  )
}
