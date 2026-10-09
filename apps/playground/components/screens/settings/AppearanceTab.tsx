'use client'

import {
  ACCENTS,
  Badge,
  Button,
  Card,
  DataTable,
  Progress,
  RadioGroup,
  SegmentedControl,
  StatusPill,
  Switch,
  toast,
  useTheme,
  type Column,
  type ThemePreference,
} from 'endfield-vision'
import { Check, Download, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ACCENT_LABELS, AccentDot, THEME_OPTIONS } from '@/components/shell/ThemeMenu'
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'
import s from './settings.module.css'

type Density = 'comfortable' | 'compact'

const THEME_HINTS: Record<ThemePreference, Bi> = {
  dark: bi('Для диспетчерских и работы ночью.', 'For control rooms and night shifts.'),
  light: bi('Для ярко освещённых помещений.', 'For brightly lit rooms.'),
  system: bi('Следует настройке операционной системы.', 'Follows the operating system setting.'),
}

interface PreviewRow {
  id: string
  code: string
  name: Bi
  load: number
  status: 'ok' | 'warn'
}

const PREVIEW_ROWS: PreviewRow[] = [
  { id: 'p1', code: 'VAL-01', name: bi('Долина-1', 'Valley-1'), load: 86, status: 'ok' },
  { id: 'p2', code: 'RDG-04', name: bi('Хребет', 'Ridge'), load: 54, status: 'warn' },
  { id: 'p3', code: 'PRT-07', name: bi('Порт Ясный', 'Clearwater Port'), load: 91, status: 'ok' },
]

function previewColumns({ t, tx }: Translator): Column<PreviewRow>[] {
  return [
    { key: 'code', header: t('Код', 'Code'), cell: (r) => <span className="ev-mono">{r.code}</span> },
    { key: 'name', header: t('Объект', 'Facility'), primary: true, cell: (r) => tx(r.name) },
    { key: 'load', header: t('Загрузка', 'Load'), numeric: true, cell: (r) => `${r.load}%` },
    {
      key: 'status',
      header: t('Статус', 'Status'),
      cell: (r) =>
        r.status === 'ok' ? (
          <StatusPill tone="success">{t('В работе', 'Operating')}</StatusPill>
        ) : (
          <StatusPill tone="warning">{t('С ограничениями', 'Limited')}</StatusPill>
        ),
    },
  ]
}

export function AppearanceTab() {
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  const tr = useT()
  const { t, tx } = tr
  const [density, setDensity] = useState<Density>('comfortable')
  const [previewSwitch, setPreviewSwitch] = useState(true)
  const compact = density === 'compact'
  const size = compact ? 'sm' : 'md'

  return (
    <div className="pg-split">
      <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
        <Card title={t('Тема', 'Theme')} description={t('Сохраняется в этом браузере и применяется сразу.', 'Saved in this browser and applied immediately.')}>
          <RadioGroup
            aria-label={t('Тема', 'Theme')}
            variant="card"
            direction="horizontal"
            value={preference}
            onChange={(v) => setTheme(v)}
            options={THEME_OPTIONS.map((o) => ({ value: o.value, label: tx(o.label), icon: o.icon, description: tx(THEME_HINTS[o.value]) }))}
          />
          {preference === 'system' ? (
            <p className={s.note}>
              {theme === 'dark'
                ? t('Сейчас действует тёмная тема.', 'The dark theme is active now.')
                : t('Сейчас действует светлая тема.', 'The light theme is active now.')}
            </p>
          ) : null}
        </Card>

        <Card
          title={t('Акцент', 'Accent')}
          description={t('Цвет кнопок, выделения, графиков и активных пунктов меню.', 'Color of buttons, selection, charts and active menu items.')}
        >
          <div className={s.swatches} role="group" aria-label={t('Цвет акцента', 'Accent color')}>
            {ACCENTS.map((a) => {
              const on = accent === a
              return (
                <button key={a} type="button" className={s.swatch} aria-pressed={on} data-active={on || undefined} onClick={() => setAccent(a)}>
                  <span className={s.swatchColor} style={{ background: `var(--ev-accent-swatch-${a})` }} aria-hidden="true">
                    {on ? <Check size={16} strokeWidth={3} /> : null}
                  </span>
                  <span className={s.swatchLabel}>{tx(ACCENT_LABELS[a])}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title={t('Плотность', 'Density')} description={t('Высота строк таблиц и размер контролов.', 'Table row height and control size.')}>
          <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-3)' }}>
            <SegmentedControl
              aria-label={t('Плотность', 'Density')}
              value={density}
              onChange={setDensity}
              options={[
                { value: 'comfortable', label: t('Обычная', 'Comfortable') },
                { value: 'compact', label: t('Компактная', 'Compact') },
              ]}
            />
            <p className={s.note}>
              {t(
                'Компактный режим показывает больше строк на экране: подходит для мониторов диспетчерской. Применяется к предпросмотру справа; в таблицах консоли - параметром dense.',
                'Compact mode fits more rows on screen, which suits control room monitors. It applies to the preview on the right; console tables use the dense prop.',
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card
        title={t('Предпросмотр', 'Preview')}
        description={
          <span className={s.previewDesc}>
            <AccentDot accent={accent} />
            {tx(ACCENT_LABELS[accent])}, {theme === 'dark' ? t('тёмная тема', 'dark theme') : t('светлая тема', 'light theme')}
          </span>
        }
      >
        <div className="ev-stack">
          <div className="ev-row">
            <Button size={size} variant="primary" icon={<Plus size={15} />} onClick={() => toast.success(t('Так выглядит основное действие', 'This is a primary action'))}>
              {t('Создать', 'Create')}
            </Button>
            <Button size={size} icon={<Download size={15} />} onClick={() => toast.info(t('Так выглядит второстепенное действие', 'This is a secondary action'))}>
              {t('Экспорт', 'Export')}
            </Button>
            <Button size={size} variant="ghost" onClick={() => toast.info(t('Так выглядит действие без фона', 'This is a ghost action'))}>
              {t('Отмена', 'Cancel')}
            </Button>
            <Button size={size} variant="danger" icon={<Trash2 size={15} />} onClick={() => toast.error(t('Так выглядит опасное действие', 'This is a destructive action'))}>
              {t('Удалить', 'Delete')}
            </Button>
          </div>
          <div className="ev-row">
            <Badge tone="accent">{t('Акцент', 'Accent')}</Badge>
            <Badge tone="success" dot>
              {t('В работе', 'Operating')}
            </Badge>
            <Badge tone="warning">{t('Внимание', 'Warning')}</Badge>
            <Badge tone="danger">{t('Авария', 'Failure')}</Badge>
            <Badge tone="info">{t('Справка', 'Info')}</Badge>
            <Badge tone="accent" solid>
              {t('Новое', 'New')}
            </Badge>
          </div>
          <Progress label={t('Выполнение плана', 'Plan completion')} value={72} showValue size={compact ? 'sm' : 'md'} />
          <Switch
            checked={previewSwitch}
            onChange={setPreviewSwitch}
            label={t('Уведомлять о сменах', 'Notify about shifts')}
            description={t('Пример переключателя в текущем акценте.', 'A sample switch in the current accent.')}
            size={size}
          />
          <div className={s.previewTable}>
            <DataTable aria-label={t('Пример таблицы', 'Sample table')} columns={previewColumns(tr)} rows={PREVIEW_ROWS} rowKey={(r) => r.id} dense={compact} />
          </div>
        </div>
      </Card>
    </div>
  )
}
