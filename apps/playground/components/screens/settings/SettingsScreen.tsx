'use client'

import { Badge, PageHeader, TabPanel, Tabs } from 'endfield-vision'
import { Bell, KeyRound, OctagonAlert, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { WORKSPACE_NAME } from '@/lib/demo/settings'
import { useCrumbs, useT } from '@/lib/i18n'
import { useUrlTab } from '@/lib/use-url-state'
import { ApiKeysTab } from './ApiKeysTab'
import { AppearanceTab } from './AppearanceTab'
import { DangerTab } from './DangerTab'
import { NotificationsTab } from './NotificationsTab'
import { ProfileTab } from './ProfileTab'
import { SecurityTab } from './SecurityTab'

const TABS = ['profile', 'appearance', 'notifications', 'security', 'api', 'danger'] as const
type SettingsTab = (typeof TABS)[number]

const ID_BASE = 'settings'

export function SettingsScreen() {
  const [tab, setTab] = useUrlTab<SettingsTab>(TABS, 'profile')
  const { t } = useT()
  const breadcrumbs = useCrumbs('settings')

  return (
    <>
      <PageHeader
        title={t('Настройки', 'Settings')}
        subtitle={t('Профиль, оформление, уведомления и доступ к рабочему пространству.', 'Profile, appearance, notifications and workspace access.')}
        breadcrumbs={breadcrumbs}
        meta={
          <Badge tone="neutral" className="ev-mono">
            {WORKSPACE_NAME}
          </Badge>
        }
      >
        <Tabs
          aria-label={t('Разделы настроек', 'Settings sections')}
          idBase={ID_BASE}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'profile', label: t('Профиль', 'Profile'), icon: <UserRound size={15} /> },
            { value: 'appearance', label: t('Оформление', 'Appearance'), icon: <Palette size={15} /> },
            { value: 'notifications', label: t('Уведомления', 'Notifications'), icon: <Bell size={15} /> },
            { value: 'security', label: t('Безопасность', 'Security'), icon: <ShieldCheck size={15} /> },
            { value: 'api', label: t('API-ключи', 'API keys'), icon: <KeyRound size={15} /> },
            { value: 'danger', label: t('Опасная зона', 'Danger zone'), icon: <OctagonAlert size={15} /> },
          ]}
        />
      </PageHeader>

      {/* Все разделы смонтированы: несохранённый ввод и изменения не теряются при переключении вкладок. */}
      <TabPanel idBase={ID_BASE} value="profile" activeValue={tab} keepMounted>
        <ProfileTab />
      </TabPanel>
      <TabPanel idBase={ID_BASE} value="appearance" activeValue={tab} keepMounted>
        <AppearanceTab />
      </TabPanel>
      <TabPanel idBase={ID_BASE} value="notifications" activeValue={tab} keepMounted>
        <NotificationsTab />
      </TabPanel>
      <TabPanel idBase={ID_BASE} value="security" activeValue={tab} keepMounted>
        <SecurityTab />
      </TabPanel>
      <TabPanel idBase={ID_BASE} value="api" activeValue={tab} keepMounted>
        <ApiKeysTab />
      </TabPanel>
      <TabPanel idBase={ID_BASE} value="danger" activeValue={tab} keepMounted>
        <DangerTab />
      </TabPanel>
    </>
  )
}
