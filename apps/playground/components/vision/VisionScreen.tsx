'use client'

import { Badge, CopyValue, PageHeader, TabPanel, Tabs, type TabItem } from 'endfield-vision'
import { crumbs } from '@/lib/nav'
import { useUrlTab } from '@/lib/use-url-state'
import { ActionsSection } from './ActionsSection'
import { ChartsSection } from './ChartsSection'
import { DataSection } from './DataSection'
import { FeedbackSection } from './FeedbackSection'
import { FormsSection } from './FormsSection'
import { IntroSection } from './IntroSection'
import { LayoutSection } from './LayoutSection'
import { LIBRARY_VERSION, VISION_TAB_META, VISION_TABS, type VisionTab } from './parts'
import { ThemeSection } from './ThemeSection'
import { TokensSection } from './TokensSection'

const TAB_ITEMS: TabItem<VisionTab>[] = VISION_TABS.map((value) => {
  const Icon = VISION_TAB_META[value].icon
  return { value, label: VISION_TAB_META[value].label, icon: <Icon size={15} /> }
})

const ID_BASE = 'vision'

/** ENDFIELD Vision: живая витрина всех элементов библиотеки. Вкладка - в адресе (?tab=). */
export function VisionScreen() {
  const [tab, setTab] = useUrlTab<VisionTab>(VISION_TABS, 'intro')
  return (
    <>
      <PageHeader
        title="ENDFIELD Vision"
        subtitle="Дизайн-система консоли: токены, темы, компоненты и каркас. Каждый пример на странице - живой компонент библиотеки endfield-vision."
        breadcrumbs={crumbs('vision')}
        meta={
          <>
            <Badge tone="accent">v{LIBRARY_VERSION}</Badge>
            <Badge>React 19</Badge>
          </>
        }
        actions={<CopyValue value="npm i endfield-vision" label="Скопировать команду установки" />}
      >
        <Tabs aria-label="Разделы витрины" idBase={ID_BASE} value={tab} onChange={setTab} items={TAB_ITEMS} />
      </PageHeader>
      <TabPanel idBase={ID_BASE} value={tab}>
        {tab === 'intro' ? <IntroSection /> : null}
        {tab === 'tokens' ? <TokensSection /> : null}
        {tab === 'theme' ? <ThemeSection /> : null}
        {tab === 'actions' ? <ActionsSection /> : null}
        {tab === 'forms' ? <FormsSection /> : null}
        {tab === 'data' ? <DataSection /> : null}
        {tab === 'feedback' ? <FeedbackSection /> : null}
        {tab === 'charts' ? <ChartsSection /> : null}
        {tab === 'layout' ? <LayoutSection /> : null}
      </TabPanel>
    </>
  )
}
