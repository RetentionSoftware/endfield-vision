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
} from 'endfield-vision'
import { Check, Download, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ACCENT_LABELS, AccentDot, THEME_OPTIONS } from '@/components/shell/ThemeMenu'
import s from './settings.module.css'

type Density = 'comfortable' | 'compact'

const THEME_HINTS: Record<string, string> = {
  dark: 'Для диспетчерских и работы ночью.',
  light: 'Для ярко освещённых помещений.',
  system: 'Следует настройке операционной системы.',
}

interface PreviewRow {
  id: string
  code: string
  name: string
  load: number
  status: 'ok' | 'warn'
}

const PREVIEW_ROWS: PreviewRow[] = [
  { id: 'p1', code: 'VAL-01', name: 'Долина-1', load: 86, status: 'ok' },
  { id: 'p2', code: 'RDG-04', name: 'Хребет', load: 54, status: 'warn' },
  { id: 'p3', code: 'PRT-07', name: 'Порт Ясный', load: 91, status: 'ok' },
]

const PREVIEW_COLUMNS: Column<PreviewRow>[] = [
  { key: 'code', header: 'Код', cell: (r) => <span className="ev-mono">{r.code}</span> },
  { key: 'name', header: 'Объект', primary: true, cell: (r) => r.name },
  { key: 'load', header: 'Загрузка', numeric: true, cell: (r) => `${r.load}%` },
  {
    key: 'status',
    header: 'Статус',
    cell: (r) => (r.status === 'ok' ? <StatusPill tone="success">В работе</StatusPill> : <StatusPill tone="warning">С ограничениями</StatusPill>),
  },
]

export function AppearanceTab() {
  const { theme, preference, accent, setTheme, setAccent } = useTheme()
  const [density, setDensity] = useState<Density>('comfortable')
  const [previewSwitch, setPreviewSwitch] = useState(true)
  const compact = density === 'compact'
  const size = compact ? 'sm' : 'md'

  return (
    <div className="pg-split">
      <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
        <Card title="Тема" description="Сохраняется в этом браузере и применяется сразу.">
          <RadioGroup
            aria-label="Тема"
            variant="card"
            direction="horizontal"
            value={preference}
            onChange={(v) => setTheme(v)}
            options={THEME_OPTIONS.map((t) => ({ value: t.value, label: t.label, icon: t.icon, description: THEME_HINTS[t.value] }))}
          />
          {preference === 'system' ? (
            <p className={s.note}>Сейчас действует {theme === 'dark' ? 'тёмная' : 'светлая'} тема.</p>
          ) : null}
        </Card>

        <Card title="Акцент" description="Цвет кнопок, выделения, графиков и активных пунктов меню.">
          <div className={s.swatches} role="group" aria-label="Цвет акцента">
            {ACCENTS.map((a) => {
              const on = accent === a
              return (
                <button key={a} type="button" className={s.swatch} aria-pressed={on} data-active={on || undefined} onClick={() => setAccent(a)}>
                  <span className={s.swatchColor} style={{ background: `var(--ev-accent-swatch-${a})` }} aria-hidden="true">
                    {on ? <Check size={16} strokeWidth={3} /> : null}
                  </span>
                  <span className={s.swatchLabel}>{ACCENT_LABELS[a]}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Плотность" description="Высота строк таблиц и размер контролов.">
          <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-3)' }}>
            <SegmentedControl
              aria-label="Плотность"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'comfortable', label: 'Обычная' },
                { value: 'compact', label: 'Компактная' },
              ]}
            />
            <p className={s.note}>
              Компактный режим показывает больше строк на экране: подходит для мониторов диспетчерской. Применяется к предпросмотру справа; в
              таблицах консоли - параметром dense.
            </p>
          </div>
        </Card>
      </div>

      <Card
        title="Предпросмотр"
        description={
          <span className={s.previewDesc}>
            <AccentDot accent={accent} />
            {ACCENT_LABELS[accent]}, {theme === 'dark' ? 'тёмная' : 'светлая'} тема
          </span>
        }
      >
        <div className="ev-stack">
          <div className="ev-row">
            <Button size={size} variant="primary" icon={<Plus size={15} />} onClick={() => toast.success('Так выглядит основное действие')}>
              Создать
            </Button>
            <Button size={size} icon={<Download size={15} />} onClick={() => toast.info('Так выглядит второстепенное действие')}>
              Экспорт
            </Button>
            <Button size={size} variant="ghost" onClick={() => toast.info('Так выглядит действие без фона')}>
              Отмена
            </Button>
            <Button size={size} variant="danger" icon={<Trash2 size={15} />} onClick={() => toast.error('Так выглядит опасное действие')}>
              Удалить
            </Button>
          </div>
          <div className="ev-row">
            <Badge tone="accent">Акцент</Badge>
            <Badge tone="success" dot>
              В работе
            </Badge>
            <Badge tone="warning">Внимание</Badge>
            <Badge tone="danger">Авария</Badge>
            <Badge tone="info">Справка</Badge>
            <Badge tone="accent" solid>
              Новое
            </Badge>
          </div>
          <Progress label="Выполнение плана" value={72} showValue size={compact ? 'sm' : 'md'} />
          <Switch checked={previewSwitch} onChange={setPreviewSwitch} label="Уведомлять о сменах" description="Пример переключателя в текущем акценте." size={size} />
          <div className={s.previewTable}>
            <DataTable aria-label="Пример таблицы" columns={PREVIEW_COLUMNS} rows={PREVIEW_ROWS} rowKey={(r) => r.id} dense={compact} />
          </div>
        </div>
      </Card>
    </div>
  )
}
