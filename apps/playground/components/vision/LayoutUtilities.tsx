'use client'

import { Card, DataTable, Divider, KeyValueList, UiLink, useElementWidth, useMediaQuery, useMounted, type Column } from 'endfield-vision'
import { useMemo, useRef, type CSSProperties } from 'react'
import { bi, useT, type Bi } from '@/lib/i18n'
import { Subhead } from './parts'
import s from './vision.module.css'

interface HookRow {
  name: string
  text: Bi
}

const LOW_LEVEL: HookRow[] = [
  { name: 'useControllable', text: bi('Управляемое или внутреннее состояние компонента', 'Controlled or internal component state') },
  { name: 'useEventCallback', text: bi('Стабильный обработчик со свежим замыканием', 'A stable handler that always sees the latest closure') },
  { name: 'useIsoLayoutEffect', text: bi('useLayoutEffect в браузере, useEffect на сервере', 'useLayoutEffect in the browser, useEffect on the server') },
  { name: 'useOutsideClick', text: bi('Клик вне элементов с учётом вложенных слоёв', 'Outside clicks, aware of nested layers') },
  {
    name: 'useDebouncedValue',
    text: bi('Значение с задержкой для поиска (пример - на вкладке «Формы»)', 'A debounced value for search (see the example on the Forms tab)'),
  },
  { name: 'Portal', text: bi('Рендер в document.body после гидрации', 'Renders into document.body after hydration') },
  { name: 'useFloating', text: bi('Позиция всплывающего слоя у якоря с переворотом у края', 'Positions a floating layer at its anchor and flips it near the edge') },
  { name: 'useFocusTrap', text: bi('Ловушка фокуса окна с возвратом на инициатора', 'Traps focus in a dialog and returns it to the trigger') },
  { name: 'useScrollLock', text: bi('Блокировка прокрутки страницы под окном', 'Locks page scrolling behind a dialog') },
  { name: 'useEscapeLayer', text: bi('Escape закрывает только верхний слой', 'Escape closes only the topmost layer') },
  { name: 'UiLink / useLinkComponent', text: bi('Ссылка через компонент из LinkProvider (next/link)', 'A link rendered through the LinkProvider component (next/link)') },
  {
    name: 'useFieldContext / useFieldProps',
    text: bi('Связка своего контрола с Field (пример - «Код партии»)', 'Connects a custom control to Field (see the "Batch code" example)'),
  },
]

export function HooksCard() {
  const { t, tx } = useT()
  const narrow = useMediaQuery('(max-width: 1023px)')
  const mounted = useMounted()
  const ref = useRef<HTMLDivElement | null>(null)
  const width = useElementWidth(ref)
  const columns = useMemo<Column<HookRow>[]>(
    () => [
      { key: 'name', header: t('Экспорт', 'Export'), primary: true, cell: (r) => <code>{r.name}</code> },
      { key: 'text', header: t('Назначение', 'Purpose'), wrap: true, cell: (r) => <span className="ev-secondary">{tx(r.text)}</span> },
    ],
    [t, tx],
  )
  return (
    <Card
      title={t('Хуки и низкоуровневое API', 'Hooks and low-level API')}
      description={t(
        'То, на чём построены компоненты: пригодится для своих контролов и оверлеев.',
        'The building blocks behind the components, useful for your own controls and overlays.',
      )}
      flush
    >
      <div className="ev-stack" style={{ padding: 'var(--ev-space-6)' }}>
        <KeyValueList
          labelWidth={200}
          items={[
            {
              key: 'mq',
              label: 'useMediaQuery',
              value: narrow ? t('Узкий экран (меню - шторкой)', 'Narrow screen (sidebar as a drawer)') : t('Широкий экран (меню закреплено)', 'Wide screen (sidebar pinned)'),
              hint: t('(max-width: 1023px), на сервере - false', '(max-width: 1023px), false on the server'),
            },
            { key: 'mounted', label: 'useMounted', value: mounted ? t('Клиент, после гидрации', 'Client, after hydration') : t('Серверный рендер', 'Server render') },
            {
              key: 'width',
              label: 'useElementWidth',
              value: `${Math.round(width)} px`,
              hint: t('Ширина блока ниже: потяните за правый нижний угол', 'Width of the box below: drag its bottom-right corner'),
            },
          ]}
        />
        <div ref={ref} className={s.resizable}>
          {t('ResizeObserver следит за этим блоком.', 'ResizeObserver is watching this box.')}
        </div>
      </div>
      <DataTable aria-label={t('Низкоуровневые экспорты', 'Low-level exports')} columns={columns} rows={LOW_LEVEL} rowKey={(r) => r.name} dense mobile="scroll" />
    </Card>
  )
}

export function UtilitiesCard() {
  const { t } = useT()
  return (
    <Card
      title={t('Утилиты', 'Utilities')}
      description={t(
        'Классы ev-* в слое ev.utilities: раскладка без своих стилей. Отступ задаётся переменной --ev-gap, минимальная ширина колонки сетки - --ev-grid-min.',
        'ev-* classes in the ev.utilities layer: layout without writing your own styles. The gap is set with the --ev-gap variable, and the minimum grid column width with --ev-grid-min.',
      )}
    >
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>ev-stack</Subhead>
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            <span className={s.demoBox}>{t('Первый', 'First')}</span>
            <span className={s.demoBox}>{t('Второй', 'Second')}</span>
            <span className={s.demoBox}>--ev-gap: var(--ev-space-2)</span>
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>{t('ev-row и ev-spacer', 'ev-row and ev-spacer')}</Subhead>
          <div className="ev-row">
            <span className={s.demoBox}>{t('Слева', 'Left')}</span>
            <span className={s.demoBox}>{t('Рядом', 'Next to it')}</span>
            <span className="ev-spacer" />
            <span className={s.demoBox}>{t('Справа', 'Right')}</span>
          </div>
          <div className="ev-row" data-nowrap="">
            <span className={`${s.demoBox} ev-truncate`}>
              {t('data-nowrap: ряд не переносится, длинный текст обрезается', 'data-nowrap: the row does not wrap and long text is truncated')}
            </span>
            <span className={s.demoBox}>OK</span>
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>ev-grid</Subhead>
          <div className="ev-grid" style={{ '--ev-grid-min': '90px', '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            {['A', 'B', 'C', 'D', 'E'].map((x) => (
              <span key={x} className={s.demoBox}>
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Divider label={t('Текст', 'Text')} />
      <KeyValueList
        labelWidth={170}
        items={[
          { key: 'mono', label: <code>ev-mono</code>, value: <span className="ev-mono">SKU-40217 · VAL-01</span> },
          {
            key: 'num',
            label: <code>ev-num</code>,
            value: <span className="ev-num">{t('1 111 111 / 8 808 808', '1,111,111 / 8,808,808')}</span>,
            hint: t('Цифры одной ширины: колонки чисел не пляшут', 'Tabular figures: number columns stay aligned'),
          },
          { key: 'muted', label: <code>ev-muted</code>, value: <span className="ev-muted">{t('Обновлено 5 минут назад', 'Updated 5 minutes ago')}</span> },
          { key: 'secondary', label: <code>ev-secondary</code>, value: <span className="ev-secondary">{t('Вторичный текст', 'Secondary text')}</span> },
          {
            key: 'truncate',
            label: <code>ev-truncate</code>,
            value: (
              <span className={`ev-truncate ${s.truncateBox}`}>
                {t('Фильтр гидравлический высокого давления, партия 3, стеллаж B-14', 'High-pressure hydraulic filter, batch 3, rack B-14')}
              </span>
            ),
          },
          {
            key: 'link',
            label: <code>ev-link</code>,
            value: (
              <UiLink href="/team" className="ev-link">
                {t('Команда объекта', 'Facility team')}
              </UiLink>
            ),
            hint: t('UiLink - ссылка через next/link из LinkProvider', 'UiLink renders through next/link from LinkProvider'),
          },
          { key: 'empty', label: <code>ev-empty-value</code>, value: <span className="ev-empty-value">-</span> },
          {
            key: 'vh',
            label: <code>ev-visually-hidden</code>,
            value: (
              <span>
                {t('Иконка без подписи', 'Icon without a label')}
                <span className="ev-visually-hidden">{t(' (текст только для скринридера)', ' (text for screen readers only)')}</span>
              </span>
            ),
          },
        ]}
      />
    </Card>
  )
}
