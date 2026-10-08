'use client'

import {
  Callout,
  Card,
  DataTable,
  en,
  ErrorState,
  KeyValueList,
  LocaleProvider,
  ru,
  SegmentedControl,
  Switch,
  useLocale,
  type Column,
  type Locale,
  type MessagesOverride,
} from 'endfield-vision'
import { useState, type CSSProperties } from 'react'
import { I18nDemo } from './I18nDemo'
import { CodeBlock, Subhead } from './parts'
import s from './vision.module.css'

const PROVIDER = `// app/providers.tsx
'use client'
import { LinkProvider, LocaleProvider, ModalsProvider, Toaster } from 'endfield-vision'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Без провайдера встроенные тексты - на английском.
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

const OVERRIDE_CODE = `import { LocaleProvider, type MessagesOverride } from 'endfield-vision'

// Объект - вне компонента: стабильная ссылка, словарь не пересобирается.
const MESSAGES: MessagesOverride = {
  table: { empty: 'Позиций пока нет' },
  common: { retry: 'Загрузить снова' },
  errorState: { title: 'Склад не ответил' },
}

<LocaleProvider locale="ru" messages={MESSAGES}>{children}</LocaleProvider>`

const OWN_CODE = `'use client'
import { useLocale, useMessages, useNumberFormat } from 'endfield-vision'

export function StockTotal({ qty }: { qty: number | null }) {
  const t = useMessages()        // словарь текущего языка
  const locale = useLocale()     // 'ru' | 'en'
  const fmt = useNumberFormat()  // разряды по правилам языка
  if (qty === null) return <span className="ev-muted">{t.common.loading}</span>
  return <span className="ev-num">{fmt(qty)} {locale === 'ru' ? 'шт.' : 'pcs'}</span>
}`

/** Переопределение для живого примера: модульная константа - стабильная ссылка. */
const OVERRIDE: MessagesOverride = {
  table: { empty: 'Позиций пока нет' },
  common: { retry: 'Загрузить снова' },
  errorState: { title: 'Склад не ответил' },
}

/* ------------------------------------------------------------------ */
/* Таблица словарей: читается из объектов ru и en                      */
/* ------------------------------------------------------------------ */

interface DictRow {
  section: string
  keys: number
  sample: string
  ru: string
  en: string
}

type Tree = Record<string, unknown>

const isBranch = (v: unknown): v is Tree => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Число листьев: строки, функции, массивы. */
function countLeaves(v: unknown): number {
  return isBranch(v) ? Object.values(v).reduce<number>((n, x) => n + countLeaves(x), 0) : 1
}

/** Путь к первой строке ветки (в глубину). */
function firstStringPath(v: unknown, path: string[]): string[] | null {
  if (typeof v === 'string') return path
  if (!isBranch(v)) return null
  for (const [k, x] of Object.entries(v)) {
    const hit = firstStringPath(x, [...path, k])
    if (hit) return hit
  }
  return null
}

function pick(tree: Tree, path: string[]): string {
  const v = path.reduce<unknown>((acc, k) => (isBranch(acc) ? acc[k] : undefined), tree)
  return typeof v === 'string' ? v : ''
}

const RU = ru as unknown as Tree
const EN = en as unknown as Tree

const DICT_ROWS: DictRow[] = Object.keys(RU)
  .filter((k) => k !== 'locale' && k !== 'intl')
  .map((k) => {
    const path = firstStringPath(RU[k], [k]) ?? [k]
    return { section: k, keys: countLeaves(RU[k]), sample: path.join('.'), ru: pick(RU, path), en: pick(EN, path) }
  })

const DICT_TOTAL = DICT_ROWS.reduce((n, r) => n + r.keys, 0)

const DICT_COLUMNS: Column<DictRow>[] = [
  { key: 'section', header: 'Раздел', primary: true, cell: (r) => <code>{r.section}</code> },
  { key: 'keys', header: 'Ключей', numeric: true, hideOnMobile: true, cell: (r) => r.keys },
  { key: 'sample', header: 'Пример ключа', hideOnMobile: true, cell: (r) => <code className="ev-secondary">{r.sample}</code> },
  { key: 'ru', header: 'ru', wrap: true, cell: (r) => r.ru },
  { key: 'en', header: 'en', wrap: true, cell: (r) => r.en },
]

function OverrideCard() {
  const [on, setOn] = useState(true)
  return (
    <Card
      title="Свои формулировки"
      description="messages - частичное переопределение поверх словаря языка: любые разделы и строки, остальное берётся из словаря. Слияние - на два уровня."
      actions={<Switch size="sm" checked={on} onChange={setOn} label="Переопределение" />}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <LocaleProvider locale="ru" messages={on ? OVERRIDE : undefined}>
          <div className={s.cols}>
            <div className="ev-stack">
              <Subhead>table.empty</Subhead>
              <DataTable aria-label="Пример пустой таблицы" columns={DICT_COLUMNS.slice(0, 2)} rows={[]} rowKey={(r) => r.section} dense />
            </div>
            <div className="ev-stack">
              <Subhead>errorState.title и common.retry</Subhead>
              <ErrorState compact onRetry={() => undefined} />
            </div>
          </div>
        </LocaleProvider>
        <CodeBlock label="Переопределение" code={OVERRIDE_CODE} />
      </div>
    </Card>
  )
}

export function I18nSection() {
  const [lang, setLang] = useState<Locale>('en')
  const root = useLocale()
  return (
    <div className={s.section}>
      <div className={`${s.grid} ${s.gridWide}`}>
        <Card title="LocaleProvider" description="Язык встроенных текстов библиотеки: подписи кнопок, aria-label, плейсхолдеры, пустые состояния, пагинация, календарь.">
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
            <KeyValueList
              labelWidth={190}
              items={[
                { key: 'default', label: 'Без провайдера', value: 'Английский (en)', hint: 'Библиотека не угадывает язык по браузеру' },
                { key: 'root', label: 'Эта консоль', value: <code>{`<LocaleProvider locale="${root}">`}</code>, hint: 'В корне, рядом с LinkProvider' },
                { key: 'nested', label: 'Вложенный провайдер', value: 'Меняет язык для части страницы' },
                { key: 'dicts', label: 'Словари', value: <code>ru, en</code>, hint: `Разделов: ${DICT_ROWS.length}, ключей: ${DICT_TOTAL}. Тип Messages - основа для третьего языка` },
                { key: 'dates', label: 'Даты', value: 'дд.мм.гггг на обоих языках', hint: 'Неделя начинается с понедельника' },
              ]}
            />
            <CodeBlock label="app/providers.tsx" code={PROVIDER} />
          </div>
        </Card>
        <Card title="Хуки для своих компонентов" description="Свои компоненты в том же стиле берут тексты и формат чисел из того же провайдера.">
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
            <KeyValueList
              labelWidth={190}
              items={[
                { key: 'm', label: <code>useMessages()</code>, value: 'Словарь текущего языка (тип Messages)' },
                { key: 'l', label: <code>useLocale()</code>, value: <code>&apos;ru&apos; | &apos;en&apos;</code> },
                { key: 'n', label: <code>useNumberFormat()</code>, value: 'Числа по правилам языка: разряды и дробная часть' },
                { key: 'r', label: <code>resolveMessages()</code>, value: 'Словарь с переопределениями вне React' },
              ]}
            />
            <CodeBlock label="StockTotal.tsx" code={OWN_CODE} />
          </div>
        </Card>
      </div>

      <Card
        title="Живой пример"
        description="Область ниже обёрнута во вложенный LocaleProvider: переключатель меняет язык встроенных текстов только в ней. Подписи полей и колонок - текст приложения, он выбирается по useLocale()."
        actions={
          <SegmentedControl<Locale>
            aria-label="Язык примера"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
            ]}
          />
        }
      >
        <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          <Callout tone="info" icon={false}>
            Окна useModals() рисует ModalsProvider в корне приложения, поэтому подписи кнопок confirm и alert по умолчанию следуют языку
            корневого провайдера ({root}), а не вложенного. Для окна на языке фрагмента - свой Modal внутри провайдера или okLabel и
            cancelLabel из useMessages().
          </Callout>
          <LocaleProvider locale={lang}>
            <I18nDemo />
          </LocaleProvider>
        </div>
      </Card>

      <OverrideCard />

      <Card title="Словари" description="Разделы словарей: число ключей и первая строка раздела на обоих языках. Таблица собрана из экспортов ru и en на этой странице." flush>
        <DataTable aria-label="Разделы словарей" columns={DICT_COLUMNS} rows={DICT_ROWS} rowKey={(r) => r.section} dense mobile="scroll" />
      </Card>
    </div>
  )
}
