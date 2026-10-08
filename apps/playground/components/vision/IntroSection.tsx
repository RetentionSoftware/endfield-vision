'use client'

import * as lib from 'endfield-vision'
import { ACCENTS, Card, LinkButton, SectionTitle, StatTile } from 'endfield-vision'
import { Accessibility, ArrowRight, Blocks, Component, Languages, Layers, Palette, SquareStack, SwatchBook } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
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

const ROOT_LAYOUT = `// app/layout.tsx - серверный компонент
import 'endfield-vision/styles.css'
import { ThemeScript } from 'endfield-vision'
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Тема и акцент до первой отрисовки - без вспышки */}
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}`

const PROVIDERS = `// app/providers.tsx
'use client'

import { LinkProvider, LocaleProvider, ModalsProvider, Toaster, type LinkComponent } from 'endfield-vision'
import NextLink from 'next/link'

// Ссылки библиотеки идут через next/link: клиентская навигация и basePath.
const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Язык встроенных текстов; без провайдера - английский.
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

const USAGE = `import { Button, Card, StatusPill, toast } from 'endfield-vision'

export function FacilityCard() {
  return (
    <Card title="Долина-1" actions={<StatusPill tone="success">В работе</StatusPill>}>
      <Button variant="primary" onClick={() => toast.success('Смена открыта')}>
        Открыть смену
      </Button>
    </Card>
  )
}`

const PRINCIPLES: Array<{ icon: ReactNode; title: string; text: ReactNode }> = [
  {
    icon: <SwatchBook size={18} />,
    title: 'Только токены',
    text: (
      <>
        Цвета, отступы, радиусы, тени и слои - через <code>var(--ev-*)</code>. Литералы цвета живут только в{' '}
        <code>tokens.css</code> и <code>accents.css</code>, поэтому тема и акцент меняются без правок компонентов.
      </>
    ),
  },
  {
    icon: <Layers size={18} />,
    title: 'Каскадные слои ev.*',
    text: (
      <>
        Стили кита лежат в <code>@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities</code>. Стили
        приложения вне слоёв всегда сильнее - без <code>!important</code> и гонки специфичности.
      </>
    ),
  },
  {
    icon: <SquareStack size={18} />,
    title: 'Поверхности вместо рамок',
    text: (
      <>
        Карточки, панели, плитки и таблицы - без рамки: их отделяет поверхность, в светлой теме ещё{' '}
        <code>--ev-shadow-card</code>. Блок внутри карточки или окна - на <code>--ev-surface-nested</code>. Рамка есть только у
        полей и контролов.
      </>
    ),
  },
  {
    icon: <Accessibility size={18} />,
    title: 'Доступность по умолчанию',
    text: (
      <>
        Клавиатура и фокус по WAI-ARIA, связка подписи и ошибки с полем, ловушка фокуса в окнах, контраст текста не ниже
        4.5:1, у контролов - 3:1. Цвет никогда не единственный носитель смысла.
      </>
    ),
  },
  {
    icon: <Component size={18} />,
    title: 'Без сторонних UI-зависимостей',
    text: (
      <>
        Только React 19 и иконки lucide-react. Выпадающие списки, календарь, окна, подсказки и графики написаны внутри
        библиотеки и разделяют одни токены.
      </>
    ),
  },
  {
    icon: <Languages size={18} />,
    title: 'Два языка',
    text: (
      <>
        Встроенные тексты - подписи, aria-label, пустые состояния, календарь - на русском и английском через{' '}
        <code>LocaleProvider</code>. Любую строку можно переопределить, числа форматируются по правилам языка.
      </>
    ),
  },
  {
    icon: <Blocks size={18} />,
    title: 'Серверные компоненты',
    text: (
      <>
        Модули без хуков (<code>Display</code>, <code>ThemeScript</code>, <code>cx</code>) работают в серверных
        компонентах. Интерактивные помечены <code>&apos;use client&apos;</code> и рендерятся на сервере без расхождений при
        гидрации.
      </>
    ),
  },
]

export function IntroSection() {
  return (
    <div className={s.section}>
      <div className={s.hero}>
        <span className={s.heroKicker}>endfield-vision v{LIBRARY_VERSION}</span>
        <h2 className={s.heroTitle}>Дизайн-система для рабочих консолей на React и Next.js</h2>
        <p className={s.heroText}>
          Токены на CSS-переменных, тёмная тема по умолчанию и светлая, шесть пресетов акцента, доступные компоненты и каркас
          приложения. Плотный деловой интерфейс для операционных систем: таблицы, формы, отчёты и мониторинг.
        </p>
        <div className={s.row}>
          <LinkButton href="/vision?tab=forms" variant="primary" iconRight={<ArrowRight size={15} />}>
            К компонентам
          </LinkButton>
          <LinkButton href="/vision?tab=tokens" variant="ghost">
            Токены
          </LinkButton>
        </div>
      </div>

      <div className="ev-grid" style={{ '--ev-grid-min': '200px', '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <StatTile label="Компонентов" value={COMPONENTS_COUNT} icon={<Component size={16} />} hint="Формы, данные, окна, графики, каркас" />
        <StatTile label="Токенов" value={TOKENS_COUNT} icon={<SwatchBook size={16} />} tone="info" hint="Переменные --ev-* в двух темах" />
        <StatTile label="Пресетов акцента" value={ACCENTS.length} icon={<Palette size={16} />} tone="violet" hint={ACCENTS.join(', ')} />
        <StatTile label="Хуков" value={HOOKS_COUNT} icon={<Blocks size={16} />} tone="success" hint="Тема, язык, оверлеи, медиа-запросы, формы" />
      </div>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="Подключение" description="Четыре шага: пакет, стили, скрипт темы и провайдеры в корне приложения.">
          <ol className={s.steps}>
            <li className={s.step}>
              <span className={s.stepTitle}>Установить пакет</span>
              <span className={s.text}>Зависимости: React 19 и lucide-react.</span>
              <CodeBlock label="Терминал" code={INSTALL} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>Стили и скрипт темы</span>
              <span className={s.text}>
                <code>styles.css</code> подключается один раз. <code>ThemeScript</code> в <code>&lt;head&gt;</code> ставит{' '}
                <code>data-theme</code> и <code>data-accent</code> до отрисовки; при строгой CSP ему передаётся <code>nonce</code>.
              </span>
              <CodeBlock label="app/layout.tsx" code={ROOT_LAYOUT} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>Провайдеры</span>
              <span className={s.text}>
                <code>LocaleProvider</code> - язык встроенных текстов, <code>LinkProvider</code> с next/link,{' '}
                <code>ModalsProvider</code> для <code>useModals()</code> и <code>Toaster</code> для уведомлений.
              </span>
              <CodeBlock label="app/providers.tsx" code={PROVIDERS} />
            </li>
            <li className={s.step}>
              <span className={s.stepTitle}>Собирать экраны из компонентов</span>
              <span className={s.text}>Свои стили экрана - CSS Modules на токенах.</span>
              <CodeBlock label="FacilityCard.tsx" code={USAGE} />
            </li>
          </ol>
        </Card>

        <Card title="Принципы" description="Правила, на которых держатся все компоненты и экраны.">
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-7)' } as CSSProperties}>
            {PRINCIPLES.map((p) => (
              <div key={p.title} className={s.principle}>
                <span className={s.principleIcon} aria-hidden="true">
                  {p.icon}
                </span>
                <div className={s.principleBody}>
                  <span className={s.principleTitle}>{p.title}</span>
                  <span className={s.text}>{p.text}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SectionTitle>Разделы витрины</SectionTitle>
      <div className={s.grid}>
        {VISION_TABS.filter((t) => t !== 'intro').map((t) => {
          const meta = VISION_TAB_META[t]
          const Icon = meta.icon
          return (
            <Card key={t} as="article" title={meta.label} icon={<Icon size={17} />}>
              <div className={s.linkCard}>
                <span className={s.text}>{meta.description}</span>
                <LinkButton href={`/vision?tab=${t}`} size="sm" variant="ghost" iconRight={<ArrowRight size={14} />}>
                  Открыть
                </LinkButton>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
