'use client'

import {
  Badge,
  Button,
  CopyValue,
  PageHeader,
  TabPanel,
  Tabs,
  useMotionSettings,
  type TabItem,
} from 'endfield-vision'
import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCrumbs, useT } from '@/lib/i18n'
import { useUrlTab } from '@/lib/use-url-state'
import { ActionsSection } from './ActionsSection'
import { ChartsSection } from './ChartsSection'
import { DataSection } from './DataSection'
import { CommunicationCards } from './extras/CommunicationCards'
import { RecordCards } from './extras/RecordCards'
import { ShellCards } from './extras/ShellCards'
import { WorkflowCards } from './extras/WorkflowCards'
import { ChartCards } from './extras/ChartCards'
import { ContentCards } from './extras/ContentCards'
import { InputCards } from './extras/InputCards'
import { NavigationCards } from './extras/NavigationCards'
import { FeedbackSection } from './FeedbackSection'
import { FormsSection } from './FormsSection'
import { I18nSection } from './I18nSection'
import { IntroSection } from './IntroSection'
import { LayoutSection } from './LayoutSection'
import { LIBRARY_VERSION, VISION_TAB_META, VISION_TABS, type VisionTab } from './parts'
import { ThemeSection } from './ThemeSection'
import { TokensSection } from './TokensSection'

const ID_BASE = 'vision'

/** ENDFIELD Vision: живая витрина всех элементов библиотеки. Вкладка - в адресе (?tab=). */
export function VisionScreen() {
  const { t, tx } = useT()
  const breadcrumbs = useCrumbs('vision')
  const tabItems = useMemo<TabItem<VisionTab>[]>(
    () =>
      VISION_TABS.map((value) => {
        const Icon = VISION_TAB_META[value].icon
        return { value, label: tx(VISION_TAB_META[value].label), icon: <Icon size={15} /> }
      }),
    [tx],
  )
  const [tab, setTab] = useUrlTab<VisionTab>(VISION_TABS, 'intro')
  // Перезапуск анимации появления: новый ключ пересоздаёт содержимое вкладки.
  const [replay, setReplay] = useState(0)
  const { animate } = useMotionSettings()
  const animatedTab = tab === 'data' || tab === 'charts'
  return (
    <>
      <PageHeader
        title="ENDFIELD Vision"
        subtitle={t(
          'Дизайн-система консоли: токены, темы, компоненты и каркас. Каждый пример на странице - живой компонент библиотеки endfield-vision.',
          'The console design system: tokens, themes, components and app shell. Every example on this page is a live endfield-vision component.',
        )}
        breadcrumbs={breadcrumbs}
        meta={
          <>
            <Badge tone="accent">v{LIBRARY_VERSION}</Badge>
            <Badge>React 19</Badge>
          </>
        }
        actions={<CopyValue value="npm i endfield-vision" label={t('Скопировать команду установки', 'Copy install command')} />}
      >
        <Tabs aria-label={t('Разделы витрины', 'Showcase sections')} idBase={ID_BASE} value={tab} onChange={setTab} items={tabItems} />
      </PageHeader>
      <TabPanel idBase={ID_BASE} value={tab}>
        {animatedTab && animate ? (
          <div className="ev-row" style={{ justifyContent: 'flex-end', marginBottom: 'var(--ev-space-5)' }}>
            <span className="ev-muted" style={{ fontSize: 'var(--ev-fs-sm)' }}>
              {t(
                'Числа и графики анимируются при появлении (MotionProvider). Выключить - меню оформления в шапке.',
                'Numbers and charts animate on entry (MotionProvider). Turn it off in the appearance menu in the header.',
              )}
            </span>
            <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => setReplay((n) => n + 1)}>
              {t('Повторить анимацию', 'Replay animation')}
            </Button>
          </div>
        ) : null}
        <div key={replay}>
          {tab === 'intro' ? <IntroSection /> : null}
          {tab === 'tokens' ? <TokensSection /> : null}
          {tab === 'theme' ? <ThemeSection /> : null}
          {tab === 'i18n' ? <I18nSection /> : null}
          {tab === 'actions' ? <ActionsSection /> : null}
          {tab === 'navigation' ? <NavigationCards /> : null}
          {tab === 'forms' ? (
            <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
              <FormsSection />
              <InputCards />
            </div>
          ) : null}
          {tab === 'data' ? <DataSection /> : null}
          {tab === 'content' ? <ContentCards /> : null}
          {tab === 'feedback' ? <FeedbackSection /> : null}
          {tab === 'charts' ? (
            <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
              <ChartsSection />
              <ChartCards />
            </div>
          ) : null}
          {tab === 'crm' ? (
            <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-8)' }}>
              <RecordCards />
              <WorkflowCards />
              <CommunicationCards />
              <ShellCards />
            </div>
          ) : null}
          {tab === 'layout' ? <LayoutSection /> : null}
        </div>
      </TabPanel>
    </>
  )
}
