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
import { bi, useT, type Bi } from '@/lib/i18n'
import { CodeBlock } from './parts'
import s from './vision.module.css'

const THEME_LABEL: Record<ThemePreference, Bi> = {
  dark: bi('Тёмная', 'Dark'),
  light: bi('Светлая', 'Light'),
  system: bi('Как в системе', 'System'),
}

/* Примеры кода: комментарии и подписи - на языке консоли, сам код не меняется. */
const L = (en: boolean, ru: string, eng: string) => (en ? eng : ru)

const runtime = (en: boolean) => `'use client'
import { ACCENTS, useTheme } from 'endfield-vision'

export function AppearancePicker() {
  // ${L(en, "theme - действующая тема, preference - выбор пользователя (может быть 'system')", "theme is the active theme, preference is the user's choice (can be 'system')")}
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  return (
    <>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>${L(en, 'Сменить тему', 'Toggle theme')}</button>
      {ACCENTS.map((a) => (
        <button key={a} aria-pressed={a === accent} onClick={() => setAccent(a)}>{a}</button>
      ))}
    </>
  )
}

// ${L(en, 'Вне React', 'Outside React')}: setTheme('system'), setAccent('emerald', { persist: false })`

const script = (en: boolean) => `// ${L(en, 'Скрипт для <head>: тема по умолчанию - по ОС, акцент - изумруд', 'Script for <head>: theme follows the OS by default, accent is emerald')}
<ThemeScript defaultTheme="system" defaultAccent="emerald" />`

const nonceCode = (en: boolean) => `// app/layout.tsx - ${L(en, 'строгая CSP', 'strict CSP')} (script-src 'nonce-...')
import { headers } from 'next/headers'
import { ThemeScript } from 'endfield-vision'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ${L(en, 'nonce кладёт в заголовок middleware, которое формирует Content-Security-Policy', 'nonce is put in a header by the middleware that builds the Content-Security-Policy')}
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

const customAccent = (en: boolean) => `/* app/globals.css - ${L(en, 'стили приложения вне слоёв сильнее ev.tokens', 'unlayered app styles beat ev.tokens')} */
:root {
  --ev-accent-rgb: 255, 122, 41;        /* ${L(en, 'ссылки, фокус, мягкие фоны', 'links, focus, soft backgrounds')} */
  --ev-accent-text: #ff9a5c;            /* ${L(en, 'текст акцента: >= 4.5:1 к --ev-surface-1', 'accent text: >= 4.5:1 against --ev-surface-1')} */
  --ev-accent-strong: #d9480f;          /* ${L(en, 'заливка primary-кнопки', 'primary button fill')} */
  --ev-accent-strong-hover: #e8590c;
  --ev-text-on-accent: #ffffff;         /* ${L(en, 'текст на заливке: >= 4.5:1', 'text on the fill: >= 4.5:1')} */
}

:root[data-theme='light'] {
  --ev-accent-rgb: 217, 72, 15;
  --ev-accent-text: #b8380a;
  --ev-accent-strong: #d9480f;
  --ev-accent-strong-hover: #c2410c;
}`

const layersCode = (en: boolean) => `/* app/globals.css: ${L(en, 'порядок слоёв объявляется до любых импортов', 'declare the layer order before any imports')} */
@layer theme, base, ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities, components, utilities;

@import 'tailwindcss';
@import 'endfield-vision/styles.css';

/* ${L(en, 'Утилиты Tailwind (слой utilities) сильнее компонентов кита,', 'Tailwind utilities (the utilities layer) beat kit components,')}
   ${L(en, 'а preflight (слой base) не перебивает стили ev.components.', 'and preflight (the base layer) does not override ev.components.')} */`

const LAYER_ROWS: Array<{ name: Bi; text: Bi }> = [
  { name: bi('ev.reset', 'ev.reset'), text: bi('Сброс: box-sizing, отступы, списки, кнопки и ссылки.', 'Reset: box-sizing, margins, lists, buttons and links.') },
  {
    name: bi('ev.tokens', 'ev.tokens'),
    text: bi('Переменные --ev-*: тёмная тема, светлая и пресеты акцента.', '--ev-* variables: dark theme, light theme and accent presets.'),
  },
  {
    name: bi('ev.base', 'ev.base'),
    text: bi('Типографика страницы, фокус, скроллбары, reduced-motion.', 'Page typography, focus, scrollbars, reduced motion.'),
  },
  {
    name: bi('ev.components', 'ev.components'),
    text: bi('Все компоненты: кнопки, поля, таблицы, окна, графики.', 'All components: buttons, inputs, tables, dialogs, charts.'),
  },
  { name: bi('ev.shell', 'ev.shell'), text: bi('Каркас: AppShell, Sidebar, Topbar.', 'App shell: AppShell, Sidebar, Topbar.') },
  {
    name: bi('ev.utilities', 'ev.utilities'),
    text: bi('Утилиты ev-stack, ev-row, ev-grid, ev-mono, ev-truncate...', 'Utilities: ev-stack, ev-row, ev-grid, ev-mono, ev-truncate...'),
  },
  {
    name: bi('вне слоёв', 'unlayered'),
    text: bi('Стили приложения и CSS Modules - сильнее любого слоя кита.', 'App styles and CSS Modules - stronger than any kit layer.'),
  },
]

/** Мини-набор компонентов: на нём видно, что меняет акцент. */
function AccentPreview() {
  const { t } = useT()
  const [on, setOn] = useState(true)
  const [view, setView] = useState('all')
  return (
    <div className={s.preview}>
      <div className={s.row}>
        <Button variant="primary" icon={<Plus size={15} />}>
          {t('Новая задача', 'New task')}
        </Button>
        <Button>{t('Экспорт', 'Export')}</Button>
        <Button variant="ghost">{t('Отмена', 'Cancel')}</Button>
      </div>
      <Tabs
        aria-label={t('Пример вкладок', 'Tabs example')}
        variant="pill"
        value={view}
        onChange={setView}
        items={[
          { value: 'all', label: t('Все', 'All'), count: 48 },
          { value: 'mine', label: t('Мои', 'Mine'), count: 7 },
          { value: 'overdue', label: t('Просрочены', 'Overdue'), count: 3 },
        ]}
      />
      <div className={s.row}>
        <Badge tone="accent">{t('Акцент', 'Accent')}</Badge>
        <StatusPill tone="success">{t('В работе', 'Operating')}</StatusPill>
        <a className="ev-link" href="#theme-preview">
          {t('Ссылка в тексте', 'Inline link')}
        </a>
      </div>
      <Switch checked={on} onChange={setOn} label={t('Уведомлять ответственного', 'Notify the assignee')} />
      <Progress value={68} label={t('План смены', 'Shift plan')} showValue />
      <Callout tone="info" icon={false}>
        {t(
          'Семантические цвета (успех, ошибка, предупреждение) от акцента не зависят.',
          'Semantic colors (success, error, warning) do not depend on the accent.',
        )}
      </Callout>
    </div>
  )
}

export function ThemeSection() {
  const { theme, preference, accent, setTheme: setThemePref, setAccent: setAccentPreset } = useTheme()
  const { t, tx, lang } = useT()
  const en = lang === 'en'
  return (
    <div className={s.section}>
      <div className={`${s.grid} ${s.gridWide}`}>
        <Card
          title={t('Оформление', 'Appearance')}
          description={t(
            'Выбор сохраняется в localStorage и применяется ко всей консоли. useTheme() подписан на изменения: меню в шапке обновится тоже.',
            'The choice is saved to localStorage and applies to the whole console. useTheme() subscribes to changes, so the header menu updates too.',
          )}
        >
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
            <div className="ev-stack">
              <span className="ev-secondary">{t('Тема', 'Theme')}</span>
              <SegmentedControl<ThemePreference>
                aria-label={t('Тема', 'Theme')}
                value={preference}
                onChange={(v) => setThemePref(v)}
                options={THEME_OPTIONS.map((o) => ({ value: o.value, label: tx(THEME_LABEL[o.value]), icon: o.icon }))}
              />
            </div>
            <RadioGroup<Accent>
              aria-label={t('Акцент', 'Accent')}
              variant="card"
              direction="horizontal"
              value={accent}
              onChange={(a) => setAccentPreset(a)}
              options={ACCENTS.map((a) => ({
                value: a,
                label: tx(ACCENT_LABELS[a]),
                description: <code>{a}</code>,
                icon: <span className={s.accentDot} style={{ background: `var(--ev-accent-swatch-${a})` }} aria-hidden="true" />,
              }))}
            />
            <KeyValueList
              labelWidth={180}
              items={[
                {
                  key: 'theme',
                  label: t('Действующая тема', 'Active theme'),
                  value: tx(THEME_LABEL[theme]),
                  hint: t('data-theme на <html>', 'data-theme on <html>'),
                },
                {
                  key: 'pref',
                  label: t('Выбор пользователя', "User's choice"),
                  value: tx(THEME_LABEL[preference]),
                  hint: t('data-theme-pref на <html>', 'data-theme-pref on <html>'),
                },
                {
                  key: 'accent',
                  label: t('Акцент', 'Accent'),
                  value: `${tx(ACCENT_LABELS[accent])} (${accent})`,
                  hint: t('data-accent на <html>; indigo - без атрибута', 'data-accent on <html>; indigo has no attribute'),
                },
                { key: 'keys', label: t('Ключи localStorage', 'localStorage keys'), value: `${THEME_STORAGE_KEY}, ${ACCENT_STORAGE_KEY}`, mono: true },
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
                {t('Вернуть по умолчанию', 'Reset to default')}
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title={t('Предпросмотр', 'Preview')}
          description={t(
            'Акцент меняет только акцентные токены: заливку primary, активные вкладки, ссылки, фокус и прогресс.',
            'The accent changes accent tokens only: the primary fill, active tabs, links, focus and progress.',
          )}
          id="theme-preview"
        >
          <AccentPreview />
        </Card>
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card
          title={t('Тема во время работы', 'Theme at runtime')}
          description={t(
            'useTheme() - состояние и сеттеры; setTheme / setAccent доступны и как функции модуля.',
            'useTheme() returns state and setters; setTheme / setAccent are also available as module functions.',
          )}
        >
          <div className="ev-stack">
            <CodeBlock label="AppearancePicker.tsx" code={runtime(en)} />
            <CodeBlock label="app/layout.tsx" code={script(en)} />
            <p className={s.text}>
              {en ? (
                <>
                  <code>ThemeScript</code> inlines the string from <code>themeBootstrap()</code> - you can also pass it to your own
                  script. With default settings it is {themeBootstrap().length} characters long. Under a strict CSP, pass a{' '}
                  <code>nonce</code> - the same one the page&apos;s other scripts use.
                </>
              ) : (
                <>
                  <code>ThemeScript</code> вставляет строку из <code>themeBootstrap()</code> - её можно отдать и в свой скрипт. Длина
                  для настроек по умолчанию - {themeBootstrap().length} символов. При строгой CSP передайте <code>nonce</code> - тот
                  же, что у остальных скриптов страницы.
                </>
              )}
            </p>
            <CodeBlock label={t('app/layout.tsx со строгой CSP', 'app/layout.tsx with a strict CSP')} code={nonceCode(en)} />
          </div>
        </Card>

        <Card
          title={t('Свой акцент', 'Custom accent')}
          description={t(
            'Пресет не нужен: достаточно переопределить пять переменных на :root в стилях приложения.',
            'No preset needed: override five variables on :root in your app styles.',
          )}
        >
          <div className="ev-stack">
            <CodeBlock label="globals.css" code={customAccent(en)} />
            <Callout tone="warning" title={t('Проверьте контраст', 'Check the contrast')}>
              {t(
                '--ev-accent-text к --ev-surface-1 и --ev-text-on-accent к --ev-accent-strong - не ниже 4.5:1 в обеих темах.',
                '--ev-accent-text against --ev-surface-1 and --ev-text-on-accent against --ev-accent-strong must be at least 4.5:1 in both themes.',
              )}
            </Callout>
          </div>
        </Card>
      </div>

      <Card
        title={t('Каскадные слои', 'Cascade layers')}
        description={t(
          'Стили библиотеки лежат в шести слоях. Порядок задаёт приоритет, а не специфичность селекторов.',
          'Library styles live in six layers. Their order sets priority, not selector specificity.',
        )}
      >
        <div className={`${s.grid} ${s.gridWide}`}>
          <ol className={s.layers}>
            {LAYER_ROWS.map((l, i) => (
              <li key={l.name.ru} className={s.layer}>
                <span className="ev-num">{i + 1}</span>
                <code>{tx(l.name)}</code>
                <span>{tx(l.text)}</span>
              </li>
            ))}
          </ol>
          <div className="ev-stack">
            <CodeBlock label={t('globals.css с Tailwind CSS v4', 'globals.css with Tailwind CSS v4')} code={layersCode(en)} />
            <p className={s.text}>
              {en ? (
                <>
                  Without Tailwind, the layer order is already declared in <code>styles.css</code>. Put your own app layers after{' '}
                  <code>ev.utilities</code>, and keep one-off screen tweaks in CSS Modules - they are unlayered and always win.
                </>
              ) : (
                <>
                  Без Tailwind порядок слоёв уже объявлен в <code>styles.css</code>. Свои слои приложения ставьте после{' '}
                  <code>ev.utilities</code>, а точечные правки экрана держите в CSS Modules - они вне слоёв и всегда сильнее.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
