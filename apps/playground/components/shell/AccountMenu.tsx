'use client'

import { Avatar, Menu, toast, useModals } from 'endfield-vision'
import { ChevronDown, LifeBuoy, LogOut, Settings, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

/** Меню учётной записи в шапке: профиль, настройки, выход с подтверждением. */
export function AccountMenu() {
  const modals = useModals()
  const router = useRouter()

  const askLogout = async () => {
    const ok = await modals.confirm({
      title: 'Выйти из консоли?',
      message: 'Сессия на этом устройстве будет завершена.',
      okLabel: 'Выйти',
      okVariant: 'danger',
      okIcon: <LogOut size={15} />,
    })
    if (ok) router.push('/login')
  }

  return (
    <Menu
      label="Учётная запись"
      placement="bottom-end"
      minWidth={240}
      trigger={
        <button type="button" className="pg-account-btn">
          <Avatar name="Алина Воронцова" size={30} />
          <span className="pg-account-text">
            <span className="pg-account-name">Алина Воронцова</span>
            <span className="pg-account-role">Администратор</span>
          </span>
          <ChevronDown size={14} className="pg-account-caret" aria-hidden="true" />
        </button>
      }
      items={[
        { type: 'label', id: 'who', label: 'a.vorontsova@endfield.dev' },
        { id: 'profile', label: 'Профиль', icon: <UserRound size={15} />, href: '/settings' },
        { id: 'settings', label: 'Оформление', icon: <Settings size={15} />, href: '/settings?tab=appearance' },
        {
          id: 'help',
          label: 'Поддержка',
          icon: <LifeBuoy size={15} />,
          onSelect: () => toast.info('Обращение создано', { description: 'Номер обращения: 4821' }),
        },
        { type: 'separator', id: 's1' },
        { id: 'logout', label: 'Выход', icon: <LogOut size={15} />, danger: true, onSelect: () => void askLogout() },
      ]}
    />
  )
}
