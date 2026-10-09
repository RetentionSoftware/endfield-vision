'use client'

import { ACCENTS, IconButton, Menu, useTheme, type Accent, type ThemePreference } from 'endfield-vision'
import { Monitor, Moon, Palette, Sparkles, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { setMotionPref, useMotionPref } from '@/lib/motion-pref'

export const ACCENT_LABELS: Record<Accent, string> = {
  indigo: 'Индиго',
  amber: 'Янтарь',
  emerald: 'Изумруд',
  cyan: 'Циан',
  rose: 'Роза',
  violet: 'Фиалка',
}

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'dark', label: 'Тёмная', icon: <Moon size={15} /> },
  { value: 'light', label: 'Светлая', icon: <Sun size={15} /> },
  { value: 'system', label: 'Как в системе', icon: <Monitor size={15} /> },
]

/** Образец акцента: токен --ev-accent-swatch-<имя>. */
export function AccentDot({ accent }: { accent: Accent }) {
  return <span className="pg-accent-dot" style={{ background: `var(--ev-accent-swatch-${accent})` }} aria-hidden="true" />
}

/** Тема и акцент в шапке. */
export function ThemeMenu() {
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  const motion = useMotionPref()
  return (
    <Menu
      label="Оформление"
      placement="bottom-end"
      minWidth={220}
      trigger={<IconButton label="Оформление" icon={theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />} />}
      items={[
        { type: 'label', id: 'theme', label: 'Тема' },
        ...THEME_OPTIONS.map((t) => ({
          id: `t-${t.value}`,
          label: t.label,
          icon: t.icon,
          checked: preference === t.value,
          onSelect: () => setTheme(t.value),
        })),
        { type: 'separator' as const, id: 's' },
        { type: 'label' as const, id: 'accent', label: 'Акцент' },
        ...ACCENTS.map((a) => ({
          id: `a-${a}`,
          label: ACCENT_LABELS[a],
          icon: <AccentDot accent={a} />,
          checked: accent === a,
          onSelect: () => setAccent(a),
        })),
        { type: 'separator' as const, id: 's2' },
        {
          id: 'motion',
          label: 'Анимация появления',
          hint: 'числа и графики',
          icon: <Sparkles size={15} />,
          checked: motion,
          onSelect: () => setMotionPref(!motion),
        },
        { id: 'more', label: 'Все настройки оформления', icon: <Palette size={15} />, href: '/settings?tab=appearance' },
      ]}
    />
  )
}
