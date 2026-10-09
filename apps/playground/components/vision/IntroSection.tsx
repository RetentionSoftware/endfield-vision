'use client'

import * as lib from 'endfield-vision'
import { ACCENTS, Card, LinkButton, SectionTitle, StatTile } from 'endfield-vision'
import { Accessibility, ArrowRight, Blocks, Component, Languages, Layers, Palette, SquareStack, SwatchBook } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { bi, useT, type Bi, type Lang } from '@/lib/i18n'
import { CodeBlock, LIBRARY_VERSION, VISION_TAB_META, VISION_TABS } from './parts'
import s from './vision.module.css'

/*
 * Счётчики считаются по экспортам пакета: компоненты - экспорты-функции
 * с именем в PascalCase (React-компоненты), хуки - функции use*. Токены из JS
 * не видны: это число уникальных переменных --ev-* в tokens.css и accents.css.
 */
const EXPORTS = Object.entries(lib as Record<string, unknown>)
const isComponent = ([name, v]: [string, unknown]) =>
  /^[A-Z][a-z]/.test(name) && (typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v))
const COMPONENTS_COUNT = EXPORTS.filter(isComponent).length
const HOOKS_COUNT = EXPORTS.filter(([name, v]) => /^use[A-Z]/.test(name) && typeof v === 'function').length
// Уникальные переменные --ev-* в tokens.css и accents.css (CSS не импортируется в JS - число задано вручную).
const TOKENS_COUNT = 149

const INSTALL = `npm i endfield-vision`

const rootLayout = (en: boolean) => `// app/layout.tsx - ${en ? 'server component' : 'серверный компонент'}
import 'endfield-vision/styles.css'
import { ThemeScript } from 'endfield-vision'
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* ${en ? 'Theme and accent before first paint - no flash' : 'Тема и акцент до первой отрисовки - без вспышки'} */}
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}`

const providers = (en: boolean) => `// app/providers.tsx
'use client'

import { LinkProvider, LocaleProvider, ModalsProvider, Toaster, type LinkComponent } from 'endfield-vision'
import NextLink from 'next/link'

// ${en ? 'Library links go through next/link: client-side navigation and basePath.' : 'Ссылки библиотеки идут через next/link: клиентская навигация и basePath.'}
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ${en ? 'Language of built-in strings; English without a provider.' : 'Язык встроенных текстов; без провайдера - английский.'}
    <LocaleProvider locale="ru">
      <LinkProvider component={AppLink}>
        <ModalsProvider>
          {children}
          <Toaster />
        </ModalsProvider>
      </LinkProvider>
    </LocaleProvider>
  )
}`

const usage = (en: boolean) => `import { Button, Card, StatusPill, toast } from 'endfield-vision'

export function FacilityCard() {
  return (
    <Card title="${en ? 'Valley-1' : 'Долина-1'}" actions={<StatusPill tone="success">${en ? 'Operating' : 'В работе'}</StatusPill>}>
      <Button variant="primary" onClick={() => toast.success('${en ? 'Shift opened' : 'Смена открыта'}')}>
        ${en ? 'Open shift' : 'Открыть смену'}
      </Button>
    </Card>
  )
}`

const PRINCIPLES: Array<{ icon: ReactNode; title: Bi; text: Record<Lang, ReactNode> }> = [
  {
    icon: <SwatchBook size={18} />,
    title: bi('Только токены', 'Tokens only'),
    text: {
      ru: (
        <>
          Цвета, отступы, радиусы, тени и слои - через <code>var(--ev-*)</code>. Литералы цвета живут только в{' '}
          <code>tokens.css</code> и <code>accents.css</code>, поэтому тема и акцент меняются без правок компонентов.
        </>
      ),
      en: (
        <>
          Color, spacing, radii, shadows and layers all go through <code>var(--ev-*)</code>. Color literals live only in{' '}
          <code>tokens.css</code> and <code>accents.css</code>, so themes and accents change without touching components.
        </>
      ),
    },
  },
  {
    icon: <Layers size={18} />,
    title: bi('Каскадные слои ev.*', 'ev.* cascade layers'),
    text: {
      ru: (
        <>
          Стили кита лежат в <code>@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities</code>. Стили
          приложения вне слоёв всегда сильнее - без <code>!important</code> и гонки специфичности.
        </>
      ),
      en: (
        <>
          Kit styles live in <code>@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities</code>. Unlayered
          app styles always win - no <code>!important</code> and no specificity wars.
        </>
      ),
    },
  },
  {
    icon: <SquareStack size={18} />,
    title: bi('Поверхности вместо рамок', 'Surfaces, not borders'),
    text: {
      ru: (
        <>
          Карточки, панели, плитки и таблицы - без рамки: их отделяет поверхность, в светлой теме ещё{' '}
          <code>--ev-shadow-card</code>. Блок внутри карточки или окна - на <code>--ev-surface-nested</code>. Рамка есть только у
          полей и контролов.
        </>
      ),
      en: (
        <>
          Cards, panels, tiles and tables have no border: the surface sets them apart, plus <code>--ev-shadow-card</code> in the
          light theme. A block inside a card or dialog sits on <code>--ev-surface-nested</code>. Only inputs and controls get a
          border.
        </>
      ),
    },
  },
  {
    icon: <Accessibility size={18} />,
    title: bi('Доступность по умолчанию', 'Accessible by default'),
    text: {
      ru: (
        <>
          Клавиатура и фокус по WAI-ARIA, связка подписи и ошибки с полем, ловушка фокуса в окнах, контраст текста не ниже
          4.5:1, у контролов - 3:1. Цвет никогда не единственный носитель смысла.
        </>
      ),
      en: (
        <>
          Keyboard and focus handling per WAI-ARIA, labels and errors wired to their fields, focus trapping in dialogs, text
          contrast of at least 4.5:1 and 3:1 for controls. Color is never the only carrier of meaning.
        </>
      ),
    },
  },
  {
    icon: <Component size={18} />,
    title: bi('Без сторонних UI-зависимостей', 'No third-party UI dependencies'),
    text: {
      ru: (
        <>
          Только React 19 и иконки lucide-react. Выпадающие списки, календарь, окна, подсказки и графики написаны внутри
          библиотеки и разделяют одни токены.
        </>
      ),
      en: (
        <>
          Just React 19 and lucide-react icons. Selects, the calendar, dialogs, tooltips and charts are built in-house and share
          the same tokens.
        </>
      ),
    },
  },
  {
    icon: <Languages size={18} />,
    title: bi('Два языка', 'Two languages'),
    text: {
      ru: (
        <>
          Встроенные тексты - подписи, aria-label, пустые состояния, календарь - на русском и английском через{' '}
          <code>LocaleProvider</code>. Любую строку можно переопределить, числа форматируются по правилам языка.
        </>
      ),
      en: (
        <>
          Built-in strings - labels, aria-label, empty states, the calendar - ship in Russian and English via{' '}
          <code>LocaleProvider</code>. Any string can be overridden, and numbers follow the formatting rules of the language.
        </>
      ),
    },
  },
  {
    icon: <Blocks size={18} />,
    title: bi('Серверные компоненты', 'Server components'),
    text: {
      ru: (
        <>
          Модули без хуков (<code>Display</code>, <code>ThemeScript</code>, <code>cx</code>) работают в серверных
          компонентах. Интерактивные помечены <code>&apos;use client&apos;</code> и рендерятся на сервере без расхождений при
          гидрации.
        </>
      ),
      en: (
        <>
          Hook-free modules (<code>Display</code>, <code>ThemeScript</code>, <code>cx</code>) work in server components.
          Interactive ones are marked <code>&apos;use client&apos;</code> and render on the server with no hydration
          mismatches.
        </>
      ),
    },
  },
]

export function IntroSection() {
  const { t, tx, lang } = useT()
  const en = lang === 'en'
  return (
    <div className={s.section}>
      <div className={s.hero}>
        <span className={s.heroKicker}>endfield-vision v{LIBRARY_VERSION}</span>
        <h2 className={s.heroTitle}>
          {t('Дизайн-система для рабочих консолей на React и Next.js', 'A design system for operational consoles in React and Next.js')}
        </h2>
        <p className={s.heroText}>
          {t(
            'Токены на CSS-переменных, тёмная тема по умолчанию и светлая, шесть пресетов акцента, доступные компоненты и каркас приложения. Плотный деловой интерфейс для операционных систем: таблицы, формы, отчёты и мониторинг.',
            'CSS variable tokens, a dark theme by default plus a light one, six accent presets, accessible components and an app shell. A dense, businesslike interface for operational systems: tables, forms, reports and monitoring.',
          )}
        </p>
        <div className={s.row}>
          <LinkButton href="/vision?tab=forms" variant="primary" iconRight={<ArrowRight size={15} />}>
            {t('К компонентам', 'Browse components')}
          </LinkButton>
          <LinkButton href="/vision?tab=tokens" variant="ghost">
            {t('Токены', 'Tokens')}
          </LinkButton>
        </div>
      </div>

      <div className="ev-grid" style={{ '--ev-grid-min': '200px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile
          label={t('Компонентов', 'Components')}
          value={COMPONENTS_COUNT}
          icon={<Component size={16} />}
          hint={t('Формы, данные, окна, графики, каркас', 'Forms, data, dialogs, charts, app shell')}
        />
        <StatTile
          label={t('Токенов', 'Tokens')}
          value={TOKENS_COUNT}
          icon={<SwatchBook size={16} />}
          tone="info"
          hint={t('Переменные --ev-* в двух темах', '--ev-* variables across two themes')}
        />
        <StatTile label={t('Пресетов акцента', 'Accent presets')} value={ACCENTS.length} icon={<Palette size={16} />} tone="violet" hint={ACCENTS.join(', ')} />
        <StatTile
          label={t('Хуков', 'Hooks')}
          value={HOOKS_COUNT}
          icon={<Blocks size={16} />}
          tone="success"
          hint={t('Тема, язык, оверлеи, медиа-запросы, формы', 'Theme, language, overlays, media queries, forms')}
        />
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card
          title={t('Подключение', 'Getting started')}
          description={t(
            'Четыре шага: пакет, стили, скрипт темы и провайдеры в корне приложения.',
            'Four steps: the package, styles, the theme script and providers at the app root.',
          )}
        >
          <ol className={s.steps}>
            <li className={s.step}>
              <span className={s.stepTitle}>{t('Установить пакет', 'Install the package')}</span>
              <span className={s.text}>{t('Зависимости: React 19 и lucide-react.', 'Dependencies: React 19 and lucide-react.')}</span>
              <CodeBlock label={t('Терминал', 'Terminal')} code={INSTALL} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>{t('Стили и скрипт темы', 'Styles and theme script')}</span>
              <span className={s.text}>
                {en ? (
                  <>
                    Import <code>styles.css</code> once. <code>ThemeScript</code> in <code>&lt;head&gt;</code> sets{' '}
                    <code>data-theme</code> and <code>data-accent</code> before first paint; under a strict CSP, pass it a{' '}
                    <code>nonce</code>.
                  </>
                ) : (
                  <>
                    <code>styles.css</code> подключается один раз. <code>ThemeScript</code> в <code>&lt;head&gt;</code> ставит{' '}
                    <code>data-theme</code> и <code>data-accent</code> до отрисовки; при строгой CSP ему передаётся{' '}
                    <code>nonce</code>.
                  </>
                )}
              </span>
              <CodeBlock label="app/layout.tsx" code={rootLayout(en)} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>{t('Провайдеры', 'Providers')}</span>
              <span className={s.text}>
                {en ? (
                  <>
                    <code>LocaleProvider</code> for the language of built-in strings, <code>LinkProvider</code> with next/link,{' '}
                    <code>ModalsProvider</code> for <code>useModals()</code> and <code>Toaster</code> for toasts.
                  </>
                ) : (
                  <>
                    <code>LocaleProvider</code> - язык встроенных текстов, <code>LinkProvider</code> с next/link,{' '}
                    <code>ModalsProvider</code> для <code>useModals()</code> и <code>Toaster</code> для уведомлений.
                  </>
                )}
              </span>
              <CodeBlock label="app/providers.tsx" code={providers(en)} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>{t('Собирать экраны из компонентов', 'Build screens from components')}</span>
              <span className={s.text}>
                {t('Свои стили экрана - CSS Modules на токенах.', 'Screen-specific styles are CSS Modules built on tokens.')}
              </span>
              <CodeBlock label="FacilityCard.tsx" code={usage(en)} />
            </li>
          </ol>
        </Card>

        <Card
          title={t('Принципы', 'Principles')}
          description={t('Правила, на которых держатся все компоненты и экраны.', 'The rules every component and screen is built on.')}
        >
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
            {PRINCIPLES.map((p) => (
              <div key={p.title.ru} className={s.principle}>
                <span className={s.principleIcon} aria-hidden="true">
                  {p.icon}
                </span>
                <div className={s.principleBody}>
                  <span className={s.principleTitle}>{tx(p.title)}</span>
                  <span className={s.text}>{p.text[lang]}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SectionTitle>{t('Разделы витрины', 'Showcase sections')}</SectionTitle>
      <div className={s.grid}>
        {VISION_TABS.filter((key) => key !== 'intro').map((key) => {
          const meta = VISION_TAB_META[key]
          const Icon = meta.icon
          return (
            <Card key={key} as="article" title={tx(meta.label)} icon={<Icon size={17} />}>
              <div className={s.linkCard}>
                <span className={s.text}>{tx(meta.description)}</span>
                <LinkButton href={`/vision?tab=${key}`} size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
                  {t('Открыть', 'Open')}
                </LinkButton>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
