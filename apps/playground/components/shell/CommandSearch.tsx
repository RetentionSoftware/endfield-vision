'use client'

import { CommandPalette, Kbd, setAccent, setTheme, useAppShell, type CommandItem } from 'endfield-vision'
import { Languages, Moon, Palette, Plus, Search, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useLang, useT } from '@/lib/i18n'
import { NAV } from '@/lib/nav'

/** Поиск по разделам и быстрые команды: кнопка в шапке и Ctrl+K (палитра команд библиотеки). */
export function CommandSearch() {
  const router = useRouter()
  const { mobile } = useAppShell()
  const { t, tx } = useT()
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)

  const items = useMemo<CommandItem[]>(() => {
    const sections = t('Разделы', 'Sections')
    const appearance = t('Оформление', 'Appearance')
    const language = t('Язык', 'Language')
    return [
      ...NAV.flatMap((g) =>
        g.items.map((s) => {
          const Icon = s.icon
          return {
            id: `nav-${s.key}`,
            label: tx(s.label),
            group: g.title ? `${sections} - ${tx(g.title)}` : sections,
            icon: <Icon size={16} />,
            // Поиск находит раздел по названию на любом языке.
            keywords: [s.label.ru, s.label.en],
            onSelect: () => router.push(s.href),
          }
        }),
      ),
      {
        id: 'new-task',
        label: t('Создать задачу', 'Create task'),
        group: t('Действия', 'Actions'),
        icon: <Plus size={16} />,
        keywords: ['задача', 'новая', 'task', 'new'],
        onSelect: () => router.push('/tasks'),
      },
      {
        id: 'lang-ru',
        label: 'Русский язык',
        hint: lang === 'ru' ? t('выбран', 'current') : undefined,
        group: language,
        icon: <Languages size={16} />,
        keywords: ['язык', 'russian', 'language', 'ru'],
        disabled: lang === 'ru',
        onSelect: () => setLang('ru'),
      },
      {
        id: 'lang-en',
        label: 'English',
        hint: lang === 'en' ? t('выбран', 'current') : undefined,
        group: language,
        icon: <Languages size={16} />,
        keywords: ['язык', 'английский', 'language', 'en'],
        disabled: lang === 'en',
        onSelect: () => setLang('en'),
      },
      { id: 'theme-dark', label: t('Тёмная тема', 'Dark theme'), group: appearance, icon: <Moon size={16} />, onSelect: () => setTheme('dark') },
      { id: 'theme-light', label: t('Светлая тема', 'Light theme'), group: appearance, icon: <Sun size={16} />, onSelect: () => setTheme('light') },
      {
        id: 'accent-amber',
        label: t('Акцент: янтарь', 'Accent: amber'),
        group: appearance,
        icon: <Palette size={16} />,
        keywords: ['цвет', 'amber', 'color'],
        onSelect: () => setAccent('amber'),
      },
      {
        id: 'accent-indigo',
        label: t('Акцент: индиго', 'Accent: indigo'),
        group: appearance,
        icon: <Palette size={16} />,
        keywords: ['цвет', 'indigo', 'color'],
        onSelect: () => setAccent('indigo'),
      },
    ]
  }, [router, t, tx, lang, setLang])

  const label = t('Поиск по разделам и командам', 'Search sections and commands')
  return (
    <>
      <button type="button" className="pg-search-trigger" onClick={() => setOpen(true)} aria-label={label}>
        <Search size={16} aria-hidden="true" />
        {!mobile ? (
          <>
            <span className="pg-search-trigger-text">{label}</span>
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
