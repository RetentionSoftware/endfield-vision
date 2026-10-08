'use client'

import { CommandPalette, Kbd, setAccent, setTheme, useAppShell, type CommandItem } from 'endfield-vision'
import { Moon, Palette, Plus, Search, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { NAV } from '@/lib/nav'

/** Поиск по разделам и быстрые команды: кнопка в шапке и Ctrl+K (палитра команд библиотеки). */
export function CommandSearch() {
  const router = useRouter()
  const { mobile } = useAppShell()
  const [open, setOpen] = useState(false)

  const items = useMemo<CommandItem[]>(
    () => [
      ...NAV.flatMap((g) =>
        g.items.map((s) => {
          const Icon = s.icon
          return {
            id: `nav-${s.key}`,
            label: s.label,
            group: g.title ? `Разделы - ${g.title}` : 'Разделы',
            icon: <Icon size={16} />,
            onSelect: () => router.push(s.href),
          }
        }),
      ),
      {
        id: 'new-task',
        label: 'Создать задачу',
        group: 'Действия',
        icon: <Plus size={16} />,
        keywords: ['задача', 'новая'],
        onSelect: () => router.push('/tasks'),
      },
      { id: 'theme-dark', label: 'Тёмная тема', group: 'Оформление', icon: <Moon size={16} />, onSelect: () => setTheme('dark') },
      { id: 'theme-light', label: 'Светлая тема', group: 'Оформление', icon: <Sun size={16} />, onSelect: () => setTheme('light') },
      {
        id: 'accent-amber',
        label: 'Акцент: янтарь',
        group: 'Оформление',
        icon: <Palette size={16} />,
        keywords: ['цвет', 'amber'],
        onSelect: () => setAccent('amber'),
      },
      {
        id: 'accent-indigo',
        label: 'Акцент: индиго',
        group: 'Оформление',
        icon: <Palette size={16} />,
        keywords: ['цвет', 'indigo'],
        onSelect: () => setAccent('indigo'),
      },
    ],
    [router],
  )

  return (
    <>
      <button type="button" className="pg-search-trigger" onClick={() => setOpen(true)} aria-label="Поиск по разделам и командам">
        <Search size={16} aria-hidden="true" />
        {!mobile ? (
          <>
            <span className="pg-search-trigger-text">Поиск по разделам и командам</span>
            <span className="pg-search-trigger-kbd">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </>
        ) : null}
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </>
  )
}
