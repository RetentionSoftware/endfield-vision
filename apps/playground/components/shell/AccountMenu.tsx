'use client'

import { Avatar, Menu, toast, useModals } from 'endfield-vision'
import { ChevronDown, LifeBuoy, LogOut, Settings, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'

/** Меню учётной записи в шапке: профиль, настройки, выход с подтверждением. */
export function AccountMenu() {
  const modals = useModals()
  const router = useRouter()
  const { t } = useT()
  const name = t('Алина Воронцова', 'Alina Vorontsova')

  const askLogout = async () => {
    const ok = await modals.confirm({
      title: t('Выйти из консоли?', 'Sign out of the console?'),
      message: t('Сессия на этом устройстве будет завершена.', 'Your session on this device will end.'),
      okLabel: t('Выйти', 'Sign out'),
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
    })
    if (ok) router.push('/login')
  }

  return (
    <Menu
      label={t('Учётная запись', 'Account')}
      placement="bottom-end"
      minWidth={240}
      trigger={
        <button type="button" className="pg-account-btn">
          <Avatar name={name} size={30} />
          <span className="pg-account-text">
            <span className="pg-account-name">{name}</span>
            <span className="pg-account-role">{t('Администратор', 'Administrator')}</span>
          </span>
          <ChevronDown size={14} className="pg-account-caret" aria-hidden="true" />
        </button>
      }
      items={[
        { type: 'label', id: 'who', label: 'a.vorontsova@endfield.dev' },
        { id: 'profile', label: t('Профиль', 'Profile'), icon: <UserRound size={15} />, href: '/settings' },
        { id: 'settings', label: t('Оформление', 'Appearance'), icon: <Settings size={15} />, href: '/settings?tab=appearance' },
        {
          id: 'help',
          label: t('Поддержка', 'Support'),
          icon: <LifeBuoy size={15} />,
          onSelect: () => toast.info(t('Обращение создано', 'Support request created'), { description: t('Номер обращения: 4821', 'Request number: 4821') }),
        },
        { type: 'separator', id: 's1' },
        { id: 'logout', label: t('Выход', 'Sign out'), icon: <LogOut size={15} />, danger: true, onSelect: () => void askLogout() },
      ]}
    />
  )
}
