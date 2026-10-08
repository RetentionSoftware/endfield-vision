'use client'

import { Button, Card, DataTable, Divider, Tooltip, type Column } from 'endfield-vision'
import { Play } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Subhead, TokenValue } from './parts'
import s from './vision.module.css'

const COLOR_GROUPS: Array<{ title: string; description: string; tokens: string[] }> = [
  {
    title: 'Поверхности',
    description: 'От самой глубокой к самой высокой. --ev-surface-nested - блок внутри карточки, окна или шторки.',
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
    title: 'Тинты и состояния',
    description: 'Полупрозрачные слои одной «высоты» в обеих темах: наведение, нажатие, подложки счётчиков.',
    tokens: ['--ev-tint-1', '--ev-tint-2', '--ev-tint-3', '--ev-tint-4', '--ev-hover', '--ev-active'],
  },
  {
    title: 'Рамки',
    description: 'Рамка - у полей и контролов (--ev-border-control, контраст 3:1). Карточки и таблицы - без рамки.',
    tokens: ['--ev-border-soft', '--ev-border', '--ev-border-strong', '--ev-border-control', '--ev-border-hover'],
  },
  {
    title: 'Текст',
    description: 'Основной, вторичный, приглушённый и недоступный. Знаки на заливке - --ev-text-on-accent и --ev-text-on-solid.',
    tokens: ['--ev-text', '--ev-text-secondary', '--ev-text-muted', '--ev-text-disabled', '--ev-text-on-accent', '--ev-text-on-solid'],
  },
  {
    title: 'Акцент',
    description: 'Бренд: ссылки, активные элементы, заливка primary. Меняется пресетом или своими значениями.',
    tokens: ['--ev-accent', '--ev-accent-text', '--ev-accent-strong', '--ev-accent-strong-hover', '--ev-accent-soft', '--ev-accent-softer', '--ev-accent-edge'],
  },
  {
    title: 'Семантика',
    description: 'Не зависит от акцента. У каждого тона - основной, мягкий фон и кромка.',
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
    title: 'Графики',
    description: 'Категориальная палитра проверена на цветовую слепоту и контраст к --ev-surface-1. Сетка, оси и перекрестие - отдельно.',
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
  { token: '--ev-dur-fast', use: 'Наведение, цвет, мелкие переходы' },
  { token: '--ev-dur', use: 'Раскрытие меню, сворачивание панели' },
  { token: '--ev-dur-slow', use: 'Окна, шторки, крупные блоки' },
]

interface TokenRow {
  token: string
  use: string
}

const Z_LAYERS: TokenRow[] = [
  { token: '--ev-z-sticky', use: 'Липкая шапка таблицы' },
  { token: '--ev-z-topbar', use: 'Шапка приложения' },
  { token: '--ev-z-sidebar', use: 'Боковое меню' },
  { token: '--ev-z-drawer', use: 'Шторка' },
  { token: '--ev-z-modal', use: 'Окно' },
  { token: '--ev-z-dropdown', use: 'Выпадающий список, меню, поповер' },
  { token: '--ev-z-toast', use: 'Уведомления' },
  { token: '--ev-z-tooltip', use: 'Подсказка - выше всех списков' },
  { token: '--ev-z-overlay', use: 'Ссылка «Перейти к содержимому»' },
]

const SIZES: TokenRow[] = [
  { token: '--ev-control-h-sm', use: 'Компактный контрол (size="sm")' },
  { token: '--ev-control-h', use: 'Поле и кнопка по умолчанию' },
  { token: '--ev-control-h-lg', use: 'Крупный контрол (size="lg")' },
  { token: '--ev-topbar-h', use: 'Высота шапки' },
  { token: '--ev-sidebar-w', use: 'Ширина меню' },
  { token: '--ev-sidebar-w-collapsed', use: 'Ширина свёрнутого меню' },
  { token: '--ev-content-max', use: 'Максимальная ширина содержимого' },
  { token: '--ev-page-gutter', use: 'Поля страницы (на узком экране меньше)' },
  { token: '--ev-ease', use: 'Кривая по умолчанию' },
  { token: '--ev-ease-out', use: 'Кривая появления' },
]

const TOKEN_COLUMNS: Column<TokenRow>[] = [
  { key: 'token', header: 'Токен', primary: true, cell: (r) => <code>{r.token}</code> },
  { key: 'value', header: 'Значение', cell: (r) => <TokenValue name={r.token} /> },
  { key: 'use', header: 'Где используется', wrap: true, cell: (r) => <span className="ev-secondary">{r.use}</span> },
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
              {d.use}
            </span>
          </div>
          <div className={s.motionTrack} data-on={on || undefined}>
            <span className={s.motionDot} style={{ transitionDuration: `var(${d.token})`, transitionTimingFunction: 'var(--ev-ease)' }} />
          </div>
        </div>
      ))}
      <div>
        <Button size="sm" icon={<Play size={14} />} onClick={() => setOn((v) => !v)}>
          Проиграть
        </Button>
      </div>
    </div>
  )
}

export function TokensSection() {
  return (
    <div className={s.section}>
      <p className={s.text}>
        Все значения - CSS-переменные с префиксом <code>--ev-</code>. Под каждым образцом - значение в текущей теме: переключите
        тему или акцент, и цифры обновятся. Компоненты и экраны используют только эти переменные.
      </p>

      {COLOR_GROUPS.map((g) => (
        <Card key={g.title} title={g.title} description={g.description}>
          <Swatches tokens={g.tokens} />
        </Card>
      ))}

      <div className={s.grid}>
        <Card title="Типографика" description="Inter для интерфейса, JetBrains Mono для кодов, артикулов и чисел. Цифры в таблицах - моноширинные по ширине (ev-num).">
          <div className="ev-stack">
            {FONT_SIZES.map((t) => (
              <div key={t} className={s.typeRow}>
                <code>{t}</code>
                <span style={{ fontSize: `var(${t})`, lineHeight: 'var(--ev-lh-tight)' }}>Склад Долина-1</span>
              </div>
            ))}
            <Divider />
            {FONT_WEIGHTS.map((t) => (
              <div key={t} className={s.typeRow}>
                <code>{t}</code>
                <span style={{ fontWeight: `var(${t})` }}>Отгрузка SHP-20418</span>
              </div>
            ))}
            <Divider />
            <div className={s.typeRow}>
              <code>--ev-font-sans</code>
              <span>Объекты, задачи, команда, склад</span>
            </div>
            <div className={s.typeRow}>
              <code>--ev-font-mono</code>
              <span className="ev-mono">VAL-01 · SKU-40217 · SHP-20418</span>
            </div>
            <div className={s.typeRow}>
              <code>--ev-tracking-caps</code>
              <span style={{ letterSpacing: 'var(--ev-tracking-caps)', textTransform: 'uppercase', fontSize: 'var(--ev-fs-2xs)' }}>
                Заголовок группы
              </span>
            </div>
          </div>
        </Card>

        <Card title="Отступы" description="Шкала отступов: внутри контролов - 1-4, между элементами - 3-6, между блоками - 6-9.">
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            {SPACES.map((t) => (
              <div key={t} className={s.space}>
                <code>{t}</code>
                <span className={s.spaceBar} style={{ width: `var(${t})` }} />
                <TokenValue name={t} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Радиусы и тени" description="Радиус карточки - --ev-radius-lg, контрола - --ev-radius. В тёмной теме --ev-shadow-card пустая: поверхность отделяет сама.">
        <Subhead>Радиусы</Subhead>
        <div className={s.shapes}>
          {RADII.map((r) => (
            <div key={r} className={s.shape}>
              <div className={s.shapeBox} style={{ borderRadius: `var(${r})` }} />
              <code>{r}</code>
            </div>
          ))}
        </div>
        <Divider />
        <Subhead>Тени и фокус</Subhead>
        <div className={s.shadowStage}>
          <div className={s.shapes}>
            {SHADOWS.map((t) => (
              <Tooltip key={t} content={<TokenValue name={t} />}>
                <div className={s.shape} tabIndex={0}>
                  <div className={s.shadowBox} style={{ boxShadow: `var(${t})` }} />
                  <code>{t}</code>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </Card>

      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="Слои (z-index)" description="Подсказка выше выпадающих списков, список выше окна: вложенные слои не прячутся друг под друга." flush>
          <DataTable aria-label="Слои" columns={TOKEN_COLUMNS} rows={Z_LAYERS} rowKey={(r) => r.token} dense mobile="scroll" />
        </Card>
        <Card title="Движение" description="Три длительности и две кривые. При prefers-reduced-motion анимации отключаются в base.css.">
          <MotionDemo />
        </Card>
      </div>

      <Card title="Размеры и каркас" description="Высоты контролов, размеры шапки и меню, поля страницы и кривые анимации." flush>
        <DataTable aria-label="Размеры и каркас" columns={TOKEN_COLUMNS} rows={SIZES} rowKey={(r) => r.token} dense mobile="scroll" />
      </Card>
    </div>
  )
}
