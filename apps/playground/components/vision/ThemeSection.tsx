'use client'

import {
  ACCENT_STORAGE_KEY,
  ACCENTS,
  Badge,
  Button,
  Callout,
  Card,
  KeyValueList,
  Progress,
  RadioGroup,
  SegmentedControl,
  setAccent,
  setTheme,
  StatusPill,
  Switch,
  Tabs,
  THEME_STORAGE_KEY,
  themeBootstrap,
  useTheme,
  type Accent,
  type ThemePreference,
} from 'endfield-vision'
import { Plus, RotateCcw } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { ACCENT_LABELS, THEME_OPTIONS } from '@/components/shell/ThemeMenu'
import { CodeBlock } from './parts'
import s from './vision.module.css'

const THEME_LABEL: Record<ThemePreference, string> = { dark: 'Тёмная', light: 'Светлая', system: 'Как в системе' }

const RUNTIME = `'use client'
import { ACCENTS, useTheme } from 'endfield-vision'

export function AppearancePicker() {
  // theme - действующая тема, preference - выбор пользователя (может быть 'system')
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  return (
    <>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Сменить тему</button>
      {ACCENTS.map((a) => (
        <button key={a} aria-pressed={a === accent} onClick={() => setAccent(a)}>{a}</button>
      ))}
    </>
  )
}

// Вне React: setTheme('system'), setAccent('emerald', { persist: false })`

const SCRIPT = `// Скрипт для <head>: тема по умолчанию - по ОС, акцент - изумруд
<ThemeScript defaultTheme="system" defaultAccent="emerald" />`

const NONCE = `// app/layout.tsx - строгая CSP (script-src 'nonce-...')
import { headers } from 'next/headers'
import { ThemeScript } from 'endfield-vision'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // nonce кладёт в заголовок middleware, которое формирует Content-Security-Policy
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body>{children}</body>
    </html>
  )
}`

const CUSTOM_ACCENT = `/* app/globals.css - стили приложения вне слоёв сильнее ev.tokens */
:root {
  --ev-accent-rgb: 255, 122, 41;        /* ссылки, фокус, мягкие фоны */
  --ev-accent-text: #ff9a5c;            /* текст акцента: >= 4.5:1 к --ev-surface-1 */
  --ev-accent-strong: #d9480f;          /* заливка primary-кнопки */
  --ev-accent-strong-hover: #e8590c;
  --ev-text-on-accent: #ffffff;         /* текст на заливке: >= 4.5:1 */
}

:root[data-theme='light'] {
  --ev-accent-rgb: 217, 72, 15;
  --ev-accent-text: #b8380a;
  --ev-accent-strong: #d9480f;
  --ev-accent-strong-hover: #c2410c;
}`

const LAYERS = `/* app/globals.css: порядок слоёв объявляется до любых импортов */
@layer theme, base, ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities, components, utilities;

@import 'tailwindcss';
@import 'endfield-vision/styles.css';

/* Утилиты Tailwind (слой utilities) сильнее компонентов кита,
   а preflight (слой base) не перебивает стили ev.components. */`

const LAYER_ROWS: Array<{ name: string; text: string }> = [
  { name: 'ev.reset', text: 'Сброс: box-sizing, отступы, списки, кнопки и ссылки.' },
  { name: 'ev.tokens', text: 'Переменные --ev-*: тёмная тема, светлая и пресеты акцента.' },
  { name: 'ev.base', text: 'Типографика страницы, фокус, скроллбары, reduced-motion.' },
  { name: 'ev.components', text: 'Все компоненты: кнопки, поля, таблицы, окна, графики.' },
  { name: 'ev.shell', text: 'Каркас: AppShell, Sidebar, Topbar.' },
  { name: 'ev.utilities', text: 'Утилиты ev-stack, ev-row, ev-grid, ev-mono, ev-truncate...' },
  { name: 'вне слоёв', text: 'Стили приложения и CSS Modules - сильнее любого слоя кита.' },
]

/** Мини-набор компонентов: на нём видно, что меняет акцент. */
function AccentPreview() {
  const [on, setOn] = useState(true)
  const [view, setView] = useState('all')
  return (
    <div className={s.preview}>
      <div className={s.row}>
        <Button variant="primary" icon={<Plus size={15} />}>
          Новая задача
        </Button>
        <Button>Экспорт</Button>
        <Button variant="ghost">Отмена</Button>
      </div>
      <Tabs
        aria-label="Пример вкладок"
        variant="pill"
        value={view}
        onChange={setView}
        items={[
          { value: 'all', label: 'Все', count: 48 },
          { value: 'mine', label: 'Мои', count: 7 },
          { value: 'overdue', label: 'Просрочены', count: 3 },
        ]}
      />
      <div className={s.row}>
        <Badge tone="accent">Акцент</Badge>
        <StatusPill tone="success">В работе</StatusPill>
        <a className="ev-link" href="#theme-preview">
          Ссылка в тексте
        </a>
      </div>
      <Switch checked={on} onChange={setOn} label="Уведомлять ответственного" />
      <Progress value={68} label="План смены" showValue />
      <Callout tone="info" icon={false}>
        Семантические цвета (успех, ошибка, предупреждение) от акцента не зависят.
      </Callout>
    </div>
  )
}

export function ThemeSection() {
  const { theme, preference, accent, setTheme: setThemePref, setAccent: setAccentPreset } = useTheme()
  return (
    <div className={s.section}>
      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="Оформление" description="Выбор сохраняется в localStorage и применяется ко всей консоли. useTheme() подписан на изменения: меню в шапке обновится тоже.">
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
            <div className="ev-stack">
              <span className="ev-secondary">Тема</span>
              <SegmentedControl<ThemePreference>
                aria-label="Тема"
                value={preference}
                onChange={(v) => setThemePref(v)}
                options={THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
              />
            </div>
            <RadioGroup<Accent>
              aria-label="Акцент"
              variant="card"
              direction="horizontal"
              value={accent}
              onChange={(a) => setAccentPreset(a)}
              options={ACCENTS.map((a) => ({
                value: a,
                label: ACCENT_LABELS[a],
                description: <code>{a}</code>,
                icon: <span className={s.accentDot} style={{ background: `var(--ev-accent-swatch-${a})` }} aria-hidden="true" />,
              }))}
            />
            <KeyValueList
              labelWidth={180}
              items={[
                { key: 'theme', label: 'Действующая тема', value: theme === 'dark' ? 'Тёмная' : 'Светлая', hint: 'data-theme на <html>' },
                { key: 'pref', label: 'Выбор пользователя', value: THEME_LABEL[preference], hint: 'data-theme-pref на <html>' },
                { key: 'accent', label: 'Акцент', value: `${ACCENT_LABELS[accent]} (${accent})`, hint: 'data-accent на <html>; indigo - без атрибута' },
                { key: 'keys', label: 'Ключи localStorage', value: `${THEME_STORAGE_KEY}, ${ACCENT_STORAGE_KEY}`, mono: true },
              ]}
            />
            <div>
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={14} />}
                onClick={() => {
                  // Функции без хука: работают и вне React-компонентов.
                  setTheme('dark')
                  setAccent('indigo')
                }}
              >
                Вернуть по умолчанию
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Предпросмотр" description="Акцент меняет только акцентные токены: заливку primary, активные вкладки, ссылки, фокус и прогресс." id="theme-preview">
          <AccentPreview />
        </Card>
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="Тема во время работы" description="useTheme() - состояние и сеттеры; setTheme / setAccent доступны и как функции модуля.">
          <div className="ev-stack">
            <CodeBlock label="AppearancePicker.tsx" code={RUNTIME} />
            <CodeBlock label="app/layout.tsx" code={SCRIPT} />
            <p className={s.text}>
              <code>ThemeScript</code> вставляет строку из <code>themeBootstrap()</code> - её можно отдать и в свой скрипт. Длина для
              настроек по умолчанию - {themeBootstrap().length} символов. При строгой CSP передайте <code>nonce</code> - тот же, что у
              остальных скриптов страницы.
            </p>
            <CodeBlock label="app/layout.tsx со строгой CSP" code={NONCE} />
          </div>
        </Card>

        <Card title="Свой акцент" description="Пресет не нужен: достаточно переопределить пять переменных на :root в стилях приложения.">
          <div className="ev-stack">
            <CodeBlock label="globals.css" code={CUSTOM_ACCENT} />
            <Callout tone="warning" title="Проверьте контраст">
              --ev-accent-text к --ev-surface-1 и --ev-text-on-accent к --ev-accent-strong - не ниже 4.5:1 в обеих темах.
            </Callout>
          </div>
        </Card>
      </div>

      <Card title="Каскадные слои" description="Стили библиотеки лежат в шести слоях. Порядок задаёт приоритет, а не специфичность селекторов.">
        <div className={`${s.grid} ${s.gridWide}`}>
          <ol className={s.layers}>
            {LAYER_ROWS.map((l, i) => (
              <li key={l.name} className={s.layer}>
                <span className="ev-num">{i + 1}</span>
                <code>{l.name}</code>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
          <div className="ev-stack">
            <CodeBlock label="globals.css с Tailwind CSS v4" code={LAYERS} />
            <p className={s.text}>
              Без Tailwind порядок слоёв уже объявлен в <code>styles.css</code>. Свои слои приложения ставьте после{' '}
              <code>ev.utilities</code>, а точечные правки экрана держите в CSS Modules - они вне слоёв и всегда сильнее.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
