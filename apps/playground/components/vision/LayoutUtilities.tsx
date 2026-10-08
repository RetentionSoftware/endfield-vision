'use client'

import { Card, DataTable, Divider, KeyValueList, UiLink, useElementWidth, useMediaQuery, useMounted, type Column } from 'endfield-vision'
import { useRef, type CSSProperties } from 'react'
import { Subhead } from './parts'
import s from './vision.module.css'

interface HookRow {
  name: string
  text: string
}

const LOW_LEVEL: HookRow[] = [
  { name: 'useControllable', text: 'Управляемое или внутреннее состояние компонента' },
  { name: 'useEventCallback', text: 'Стабильный обработчик со свежим замыканием' },
  { name: 'useIsoLayoutEffect', text: 'useLayoutEffect в браузере, useEffect на сервере' },
  { name: 'useOutsideClick', text: 'Клик вне элементов с учётом вложенных слоёв' },
  { name: 'useDebouncedValue', text: 'Значение с задержкой для поиска (пример - на вкладке «Формы»)' },
  { name: 'Portal', text: 'Рендер в document.body после гидрации' },
  { name: 'useFloating', text: 'Позиция всплывающего слоя у якоря с переворотом у края' },
  { name: 'useFocusTrap', text: 'Ловушка фокуса окна с возвратом на инициатора' },
  { name: 'useScrollLock', text: 'Блокировка прокрутки страницы под окном' },
  { name: 'useEscapeLayer', text: 'Escape закрывает только верхний слой' },
  { name: 'UiLink / useLinkComponent', text: 'Ссылка через компонент из LinkProvider (next/link)' },
  { name: 'useFieldContext / useFieldProps', text: 'Связка своего контрола с Field (пример - «Код партии»)' },
]

const HOOK_COLUMNS: Column<HookRow>[] = [
  { key: 'name', header: 'Экспорт', primary: true, cell: (r) => <code>{r.name}</code> },
  { key: 'text', header: 'Назначение', wrap: true, cell: (r) => <span className="ev-secondary">{r.text}</span> },
]


export function HooksCard() {
  const narrow = useMediaQuery('(max-width: 1023px)')
  const mounted = useMounted()
  const ref = useRef<HTMLDivElement | null>(null)
  const width = useElementWidth(ref)
  return (
    <Card title="Хуки и низкоуровневое API" description="То, на чём построены компоненты: пригодится для своих контролов и оверлеев." flush>
      <div className="ev-stack" style={{ padding: 'var(--ev-space-6)' }}>
        <KeyValueList
          labelWidth={200}
          items={[
            { key: 'mq', label: 'useMediaQuery', value: narrow ? 'Узкий экран (меню - шторкой)' : 'Широкий экран (меню закреплено)', hint: '(max-width: 1023px), на сервере - false' },
            { key: 'mounted', label: 'useMounted', value: mounted ? 'Клиент, после гидрации' : 'Серверный рендер' },
            { key: 'width', label: 'useElementWidth', value: `${Math.round(width)} px`, hint: 'Ширина блока ниже: потяните за правый нижний угол' },
          ]}
        />
        <div ref={ref} className={s.resizable}>
          ResizeObserver следит за этим блоком.
        </div>
      </div>
      <DataTable aria-label="Низкоуровневые экспорты" columns={HOOK_COLUMNS} rows={LOW_LEVEL} rowKey={(r) => r.name} dense mobile="scroll" />
    </Card>
  )
}

export function UtilitiesCard() {
  return (
    <Card title="Утилиты" description="Классы ev-* в слое ev.utilities: раскладка без своих стилей. Отступ задаётся переменной --ev-gap, минимальная ширина колонки сетки - --ev-grid-min.">
      <div className={s.cols}>
        <div className="ev-stack">
          <Subhead>ev-stack</Subhead>
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
            <span className={s.demoBox}>Первый</span>
            <span className={s.demoBox}>Второй</span>
            <span className={s.demoBox}>--ev-gap: var(--ev-space-2)</span>
          </div>
        </div>
        <div className="ev-stack">
          <Subhead>ev-row и ev-spacer</Subhead>
          <div className="ev-row">
            <span className={s.demoBox}>Слева</span>
            <span className={s.demoBox}>Рядом</span>
            <span className="ev-spacer" />
            <span className={s.demoBox}>Справа</span>
          </div>
          <div className="ev-row" data-nowrap="">
            <span className={`${s.demoBox} ev-truncate`}>data-nowrap: ряд не переносится, длинный текст обрезается</span>
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
      <Divider label="Текст" />
      <KeyValueList
        labelWidth={170}
        items={[
          { key: 'mono', label: <code>ev-mono</code>, value: <span className="ev-mono">SKU-40217 · VAL-01</span> },
          { key: 'num', label: <code>ev-num</code>, value: <span className="ev-num">1 111 111 / 8 808 808</span>, hint: 'Цифры одной ширины: колонки чисел не пляшут' },
          { key: 'muted', label: <code>ev-muted</code>, value: <span className="ev-muted">Обновлено 5 минут назад</span> },
          { key: 'secondary', label: <code>ev-secondary</code>, value: <span className="ev-secondary">Вторичный текст</span> },
          {
            key: 'truncate',
            label: <code>ev-truncate</code>,
            value: <span className={`ev-truncate ${s.truncateBox}`}>Фильтр гидравлический высокого давления, партия 3, стеллаж B-14</span>,
          },
          {
            key: 'link',
            label: <code>ev-link</code>,
            value: (
              <UiLink href="/team" className="ev-link">
                Команда объекта
              </UiLink>
            ),
            hint: 'UiLink - ссылка через next/link из LinkProvider',
          },
          { key: 'empty', label: <code>ev-empty-value</code>, value: <span className="ev-empty-value">-</span> },
          {
            key: 'vh',
            label: <code>ev-visually-hidden</code>,
            value: (
              <span>
                Иконка без подписи
                <span className="ev-visually-hidden"> (текст только для скринридера)</span>
              </span>
            ),
          },
        ]}
      />
    </Card>
  )
}
