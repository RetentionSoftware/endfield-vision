'use client'

import { ACCENTS, IconButton, Menu, useTheme, type Accent, type ThemePreference } from 'endfield-vision'
import { Monitor, Moon, Palette, Sparkles, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'
import { setMotionPref, useMotionPref } from '@/lib/motion-pref'

/** Названия акцентов. В компоненте - tx(ACCENT_LABELS[a]). */
export const ACCENT_LABELS: Record<Accent, Bi> = {
  indigo: bi('Индиго', 'Indigo'),
  amber: bi('Янтарь', 'Amber'),
  emerald: bi('Изумруд', 'Emerald'),
  cyan: bi('Циан', 'Cyan'),
  rose: bi('Роза', 'Rose'),
  violet: bi('Фиалка', 'Violet'),
}

/** Варианты темы. В компоненте - tx(option.label). */
export const THEME_OPTIONS: Array<{ value: ThemePreference; label: Bi; icon: ReactNode }> = [
  { value: 'dark', label: bi('Тёмная', 'Dark'), icon: <Moon size={15} /> },
  { value: 'light', label: bi('Светлая', 'Light'), icon: <Sun size={15} /> },
  { value: 'system', label: bi('Как в системе', 'System'), icon: <Monitor size={15} /> },
]

/** Образец акцента: токен --ev-accent-swatch-<имя>. */
export function AccentDot({ accent }: { accent: Accent }) {
  return <span className="pg-accent-dot" style={{ background: `var(--ev-accent-swatch-${accent})` }} aria-hidden="true" />
}

/** Тема и акцент в шапке. */
export function ThemeMenu() {
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  const { t, tx } = useT()
  const motion = useMotionPref()
  return (
    <Menu
      label={t('Оформление', 'Appearance')}
      placement="bottom-end"
      minWidth={220}
      trigger={<IconButton label={t('Оформление', 'Appearance')} icon={theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />} />}
      items={[
        { type: 'label', id: 'theme', label: t('Тема', 'Theme') },
        ...THEME_OPTIONS.map((o) => ({
          id: `t-${o.value}`,
          label: tx(o.label),
          icon: o.icon,
          checked: preference === o.value,
          onSelect: () => setTheme(o.value),
        })),
        { type: 'separator' as const, id: 's' },
        { type: 'label' as const, id: 'accent', label: t('Акцент', 'Accent') },
        ...ACCENTS.map((a) => ({
          id: `a-${a}`,
          label: tx(ACCENT_LABELS[a]),
          icon: <AccentDot accent={a} />,
          checked: accent === a,
          onSelect: () => setAccent(a),
        })),
        { type: 'separator' as const, id: 's2' },
        {
          id: 'motion',
          label: t('Анимация появления', 'Entrance animation'),
          hint: t('числа и графики', 'numbers and charts'),
          icon: <Sparkles size={15} />,
          checked: motion,
          onSelect: () => setMotionPref(!motion),
        },
        { id: 'more', label: t('Все настройки оформления', 'All appearance settings'), icon: <Palette size={15} />, href: '/settings?tab=appearance' },
      ]}
    />
  )
}
