'use client'

import { Button, Card, DataTable, Divider, Tooltip, type Column } from 'endfield-vision'
import { Play } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'
import { Subhead, TokenValue } from './parts'
import s from './vision.module.css'

const COLOR_GROUPS: Array<{ title: Bi; description: Bi; tokens: string[] }> = [
  {
    title: bi('Поверхности', 'Surfaces'),
    description: bi(
      'От самой глубокой к самой высокой. --ev-surface-nested - блок внутри карточки, окна или шторки.',
      'From the deepest to the highest. --ev-surface-nested is for a block inside a card, dialog or drawer.',
    ),
    tokens: [
      '--ev-bg',
      '--ev-surface-1',
      '--ev-surface-2',
      '--ev-surface-3',
      '--ev-surface-nested',
      '--ev-surface-input',
      '--ev-surface-tooltip',
      '--ev-surface-overlay',
    ],
  },
  {
    title: bi('Тинты и состояния', 'Tints and states'),
    description: bi(
      'Полупрозрачные слои одной «высоты» в обеих темах: наведение, нажатие, подложки счётчиков.',
      'Translucent layers of the same "elevation" in both themes: hover, press, counter backgrounds.',
    ),
    tokens: ['--ev-tint-1', '--ev-tint-2', '--ev-tint-3', '--ev-tint-4', '--ev-hover', '--ev-active'],
  },
  {
    title: bi('Рамки', 'Borders'),
    description: bi(
      'Рамка - у полей и контролов (--ev-border-control, контраст 3:1). Карточки и таблицы - без рамки.',
      'Borders belong to inputs and controls (--ev-border-control, 3:1 contrast). Cards and tables have none.',
    ),
    tokens: ['--ev-border-soft', '--ev-border', '--ev-border-strong', '--ev-border-control', '--ev-border-hover'],
  },
  {
    title: bi('Текст', 'Text'),
    description: bi(
      'Основной, вторичный, приглушённый и недоступный. Знаки на заливке - --ev-text-on-accent (акцент), --ev-text-on-danger (danger) и --ev-text-on-solid.',
      'Primary, secondary, muted and disabled. Text on fills uses --ev-text-on-accent (accent), --ev-text-on-danger (danger) and --ev-text-on-solid.',
    ),
    tokens: ['--ev-text', '--ev-text-secondary', '--ev-text-muted', '--ev-text-disabled', '--ev-text-on-accent', '--ev-text-on-danger', '--ev-text-on-solid'],
  },
  {
    title: bi('Акцент', 'Accent'),
    description: bi(
      'Бренд: ссылки, активные элементы, заливка primary. Меняется пресетом или своими значениями.',
      'The brand color: links, active elements, the primary fill. Set it with a preset or your own values.',
    ),
    tokens: ['--ev-accent', '--ev-accent-text', '--ev-accent-strong', '--ev-accent-strong-hover', '--ev-accent-soft', '--ev-accent-softer', '--ev-accent-edge'],
  },
  {
    title: bi('Семантика', 'Semantic'),
    description: bi(
      'Не зависит от акцента. У каждого тона - основной, мягкий фон и кромка.',
      'Independent of the accent. Each tone has a base color, a soft background and an edge.',
    ),
    tokens: [
      '--ev-success',
      '--ev-success-strong',
      '--ev-success-soft',
      '--ev-success-edge',
      '--ev-warning',
      '--ev-warning-strong',
      '--ev-warning-soft',
      '--ev-warning-edge',
      '--ev-danger',
      '--ev-danger-strong',
      '--ev-danger-soft',
      '--ev-danger-edge',
      '--ev-info',
      '--ev-info-soft',
      '--ev-info-edge',
      '--ev-violet',
      '--ev-violet-soft',
      '--ev-violet-edge',
      '--ev-neutral',
      '--ev-neutral-soft',
      '--ev-neutral-edge',
    ],
  },
  {
    title: bi('Графики', 'Charts'),
    description: bi(
      'Категориальная палитра проверена на цветовую слепоту и контраст к --ev-surface-1. Сетка, оси и перекрестие - отдельно.',
      'The categorical palette is checked for color blindness and contrast against --ev-surface-1. Grid, axes and crosshair have their own tokens.',
    ),
    tokens: [
      '--ev-chart-1',
      '--ev-chart-2',
      '--ev-chart-3',
      '--ev-chart-4',
      '--ev-chart-5',
      '--ev-chart-6',
      '--ev-chart-7',
      '--ev-chart-8',
      '--ev-chart-grid',
      '--ev-chart-axis',
      '--ev-chart-crosshair',
    ],
  },
]

const FONT_SIZES = ['--ev-fs-3xl', '--ev-fs-2xl', '--ev-fs-xl', '--ev-fs-lg', '--ev-fs-md', '--ev-fs-base', '--ev-fs-sm', '--ev-fs-xs', '--ev-fs-2xs']
const FONT_WEIGHTS = ['--ev-fw-regular', '--ev-fw-medium', '--ev-fw-semibold', '--ev-fw-bold']
const SPACES = Array.from({ length: 12 }, (_, i) => `--ev-space-${i}`)
const RADII = ['--ev-radius-xs', '--ev-radius-sm', '--ev-radius', '--ev-radius-md', '--ev-radius-lg', '--ev-radius-xl', '--ev-radius-pill']
const SHADOWS = ['--ev-shadow-card', '--ev-shadow-sm', '--ev-shadow', '--ev-shadow-pop', '--ev-shadow-modal', '--ev-shadow-primary', '--ev-focus-ring']
const DURATIONS = [
  { token: '--ev-dur-fast', use: bi('Наведение, цвет, мелкие переходы', 'Hover, color, small transitions') },
  { token: '--ev-dur', use: bi('Раскрытие меню, сворачивание панели', 'Opening menus, collapsing panels') },
  { token: '--ev-dur-slow', use: bi('Окна, шторки, крупные блоки', 'Dialogs, drawers, large blocks') },
]

interface TokenRow {
  token: string
  use: Bi
}

const Z_LAYERS: TokenRow[] = [
  { token: '--ev-z-sticky', use: bi('Липкая шапка таблицы', 'Sticky table header') },
  { token: '--ev-z-topbar', use: bi('Шапка приложения', 'App header') },
  { token: '--ev-z-sidebar', use: bi('Боковое меню', 'Sidebar') },
  { token: '--ev-z-drawer', use: bi('Шторка', 'Drawer') },
  { token: '--ev-z-modal', use: bi('Окно', 'Dialog') },
  { token: '--ev-z-dropdown', use: bi('Выпадающий список, меню, поповер', 'Select, menu, popover') },
  { token: '--ev-z-toast', use: bi('Уведомления', 'Toasts') },
  { token: '--ev-z-tooltip', use: bi('Подсказка - выше всех списков', 'Tooltip - above every dropdown') },
  { token: '--ev-z-overlay', use: bi('Ссылка «Перейти к содержимому»', 'The "Skip to content" link') },
]

const SIZES: TokenRow[] = [
  { token: '--ev-control-h-sm', use: bi('Компактный контрол (size="sm")', 'Compact control (size="sm")') },
  { token: '--ev-control-h', use: bi('Поле и кнопка по умолчанию', 'Default input and button') },
  { token: '--ev-control-h-lg', use: bi('Крупный контрол (size="lg")', 'Large control (size="lg")') },
  { token: '--ev-topbar-h', use: bi('Высота шапки', 'Header height') },
  { token: '--ev-sidebar-w', use: bi('Ширина меню', 'Sidebar width') },
  { token: '--ev-sidebar-w-collapsed', use: bi('Ширина свёрнутого меню', 'Collapsed sidebar width') },
  { token: '--ev-content-max', use: bi('Максимальная ширина содержимого', 'Maximum content width') },
  { token: '--ev-page-gutter', use: bi('Поля страницы (на узком экране меньше)', 'Page gutter (smaller on narrow screens)') },
  { token: '--ev-ease', use: bi('Кривая по умолчанию', 'Default easing') },
  { token: '--ev-ease-out', use: bi('Кривая появления', 'Entrance easing') },
]

function Swatches({ tokens }: { tokens: string[] }) {
  return (
    <div className={s.swatches}>
      {tokens.map((t) => (
        <div key={t} className={s.swatch}>
          <div className={s.swatchChip} style={{ background: `var(${t})` }} />
          <code className={s.swatchName}>{t}</code>
          <TokenValue name={t} />
        </div>
      ))}
    </div>
  )
}

function MotionDemo() {
  const { t, tx } = useT()
  const [on, setOn] = useState(false)
  return (
    <div className="ev-stack">
      {DURATIONS.map((d) => (
        <div key={d.token} className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
          <div className="ev-row">
            <code>{d.token}</code>
            <TokenValue name={d.token} />
            <span className="ev-spacer" />
            <span className="ev-muted" style={{ fontSize: 'var(--ev-fs-xs)' }}>
              {tx(d.use)}
            </span>
          </div>
          <div className={s.motionTrack} data-on={on || undefined}>
            <span className={s.motionDot} style={{ transitionDuration: `var(${d.token})`, transitionTimingFunction: 'var(--ev-ease)' }} />
          </div>
        </div>
      ))}
      <div>
        <Button size="sm" icon={<Play size={14} />} onClick={() => setOn((v) => !v)}>
          {t('Проиграть', 'Play')}
        </Button>
      </div>
    </div>
  )
}

export function TokensSection() {
  const { t, tx, lang } = useT()
  const columns = useMemo<Column<TokenRow>[]>(
    () => [
      { key: 'token', header: t('Токен', 'Token'), primary: true, cell: (r) => <code>{r.token}</code> },
      { key: 'value', header: t('Значение', 'Value'), cell: (r) => <TokenValue name={r.token} /> },
      { key: 'use', header: t('Где используется', 'Used for'), wrap: true, cell: (r) => <span className="ev-secondary">{tx(r.use)}</span> },
    ],
    [t, tx],
  )
  return (
    <div className={s.section}>
      <p className={s.text}>
        {lang === 'en' ? (
          <>
            Every value is a CSS variable prefixed with <code>--ev-</code>. Each sample shows its value in the current theme: switch
            the theme or accent and the numbers update. Components and screens use these variables only.
          </>
        ) : (
          <>
            Все значения - CSS-переменные с префиксом <code>--ev-</code>. Под каждым образцом - значение в текущей теме: переключите
            тему или акцент, и цифры обновятся. Компоненты и экраны используют только эти переменные.
          </>
        )}
      </p>

      {COLOR_GROUPS.map((g) => (
        <Card key={g.title.ru} title={tx(g.title)} description={tx(g.description)}>
          <Swatches tokens={g.tokens} />
        </Card>
      ))}

      <div className={s.grid}>
        <Card
          title={t('Типографика', 'Typography')}
          description={t(
            'Inter для интерфейса, JetBrains Mono для кодов, артикулов и чисел. Цифры в таблицах - моноширинные по ширине (ev-num).',
            'Inter for the interface, JetBrains Mono for codes, SKUs and numbers. Table figures use tabular widths (ev-num).',
          )}
        >
          <div className="ev-stack">
            {FONT_SIZES.map((token) => (
              <div key={token} className={s.typeRow}>
                <code>{token}</code>
                <span style={{ fontSize: `var(${token})`, lineHeight: 'var(--ev-lh-tight)' }}>
                  {t('Склад Долина-1', 'Valley-1 warehouse')}
                </span>
              </div>
            ))}
            <Divider />
            {FONT_WEIGHTS.map((token) => (
              <div key={token} className={s.typeRow}>
                <code>{token}</code>
                <span style={{ fontWeight: `var(${token})` }}>{t('Отгрузка SHP-20418', 'Shipment SHP-20418')}</span>
              </div>
            ))}
            <Divider />
            <div className={s.typeRow}>
              <code>--ev-font-sans</code>
              <span>{t('Объекты, задачи, команда, склад', 'Facilities, tasks, team, inventory')}</span>
            </div>
            <div className={s.typeRow}>
              <code>--ev-font-mono</code>
              <span className="ev-mono">VAL-01 · SKU-40217 · SHP-20418</span>
            </div>
            <div className={s.typeRow}>
              <code>--ev-tracking-caps</code>
              <span style={{ letterSpacing: 'var(--ev-tracking-caps)', textTransform: 'uppercase', fontSize: 'var(--ev-fs-2xs)' }}>
                {t('Заголовок группы', 'Group heading')}
              </span>
            </div>
          </div>
        </Card>

        <Card
          title={t('Отступы', 'Spacing')}
          description={t(
            'Шкала отступов: внутри контролов - 1-4, между элементами - 3-6, между блоками - 6-9.',
            'The spacing scale: 1-4 inside controls, 3-6 between elements, 6-9 between blocks.',
          )}
        >
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            {SPACES.map((token) => (
              <div key={token} className={s.space}>
                <code>{token}</code>
                <span className={s.spaceBar} style={{ width: `var(${token})` }} />
                <TokenValue name={token} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title={t('Радиусы и тени', 'Radii and shadows')}
        description={t(
          'Радиус карточки - --ev-radius-lg, контрола - --ev-radius. В тёмной теме --ev-shadow-card пустая: поверхность отделяет сама.',
          'Cards use --ev-radius-lg, controls use --ev-radius. In the dark theme --ev-shadow-card is empty: the surface does the separating.',
        )}
      >
        <Subhead>{t('Радиусы', 'Radii')}</Subhead>
        <div className={s.shapes}>
          {RADII.map((r) => (
            <div key={r} className={s.shape}>
              <div className={s.shapeBox} style={{ borderRadius: `var(${r})` }} />
              <code>{r}</code>
            </div>
          ))}
        </div>
        <Divider />
        <Subhead>{t('Тени и фокус', 'Shadows and focus')}</Subhead>
        <div className={s.shadowStage}>
          <div className={s.shapes}>
            {SHADOWS.map((token) => (
              <Tooltip key={token} content={<TokenValue name={token} />}>
                <div className={s.shape} tabIndex={0}>
                  <div className={s.shadowBox} style={{ boxShadow: `var(${token})` }} />
                  <code>{token}</code>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </Card>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card
          title={t('Слои (z-index)', 'Layers (z-index)')}
          description={t(
            'Подсказка выше выпадающих списков, список выше окна: вложенные слои не прячутся друг под друга.',
            'Tooltips sit above dropdowns, dropdowns above dialogs: nested layers never hide beneath each other.',
          )}
          flush
        >
          <DataTable aria-label={t('Слои', 'Layers')} columns={columns} rows={Z_LAYERS} rowKey={(r) => r.token} dense mobile="scroll" />
        </Card>
        <Card
          title={t('Движение', 'Motion')}
          description={t(
            'Три длительности и две кривые. При prefers-reduced-motion анимации отключаются в base.css.',
            'Three durations and two easing curves. With prefers-reduced-motion, base.css turns animations off.',
          )}
        >
          <MotionDemo />
        </Card>
      </div>

      <Card
        title={t('Размеры и каркас', 'Sizes and shell')}
        description={t(
          'Высоты контролов, размеры шапки и меню, поля страницы и кривые анимации.',
          'Control heights, header and sidebar sizes, page gutters and easing curves.',
        )}
        flush
      >
        <DataTable
          aria-label={t('Размеры и каркас', 'Sizes and shell')}
          columns={columns}
          rows={SIZES}
          rowKey={(r) => r.token}
          dense
          mobile="scroll"
        />
      </Card>
    </div>
  )
}
