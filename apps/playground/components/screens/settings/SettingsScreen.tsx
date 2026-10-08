'use client'

import { Badge, PageHeader, TabPanel, Tabs } from 'endfield-vision'
import { Bell, KeyRound, OctagonAlert, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { WORKSPACE_NAME } from '@/lib/demo/settings'
import { crumbs } from '@/lib/nav'
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

  return (
    <>
      <PageHeader
        title="Настройки"
        subtitle="Профиль, оформление, уведомления и доступ к рабочему пространству."
        breadcrumbs={crumbs('settings')}
        meta={
          <Badge tone="neutral" className="ev-mono">
            {WORKSPACE_NAME}
          </Badge>
        }
      >
        <Tabs
          aria-label="Разделы настроек"
          idBase={ID_BASE}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'profile', label: 'Профиль', icon: <UserRound size={15} /> },
            { value: 'appearance', label: 'Оформление', icon: <Palette size={15} /> },
            { value: 'notifications', label: 'Уведомления', icon: <Bell size={15} /> },
            { value: 'security', label: 'Безопасность', icon: <ShieldCheck size={15} /> },
            { value: 'api', label: 'API-ключи', icon: <KeyRound size={15} /> },
            { value: 'danger', label: 'Опасная зона', icon: <OctagonAlert size={15} /> },
          ]}
        />
      </PageHeader>

      {/* Все разделы смонтированы: несохранённый ввод и изменения не теряются при переключении вкладок. */}
      <TabPanel idBase={ID_BASE} value={tab}>
        <div hidden={tab !== 'profile'}>
          <ProfileTab />
        </div>
        <div hidden={tab !== 'appearance'}>
          <AppearanceTab />
        </div>
        <div hidden={tab !== 'notifications'}>
          <NotificationsTab />
        </div>
        <div hidden={tab !== 'security'}>
          <SecurityTab />
        </div>
        <div hidden={tab !== 'api'}>
          <ApiKeysTab />
        </div>
        <div hidden={tab !== 'danger'}>
          <DangerTab />
        </div>
      </TabPanel>
    </>
  )
}
