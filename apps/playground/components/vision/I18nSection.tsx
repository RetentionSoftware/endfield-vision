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
import { useMemo, useState, type CSSProperties } from 'react'
import { useT, type Translator } from '@/lib/i18n'
import { I18nDemo } from './I18nDemo'
import { CodeBlock, Subhead } from './parts'
import s from './vision.module.css'

/* Примеры кода: комментарии - на языке консоли, сам код не меняется. */
const L = (en: boolean, ru: string, eng: string) => (en ? eng : ru)

const provider = (en: boolean) => `// app/providers.tsx
'use client'
import { LinkProvider, LocaleProvider, ModalsProvider, Toaster } from 'endfield-vision'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ${L(en, 'Без провайдера встроенные тексты - на английском.', 'Without a provider, built-in strings are in English.')}
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

/** Переопределения для живого примера: модульные константы - стабильные ссылки. Язык - как у консоли. */
const OVERRIDE: Record<Locale, MessagesOverride> = {
  ru: {
    table: { empty: 'Позиций пока нет' },
    common: { retry: 'Загрузить снова' },
    errorState: { title: 'Склад не ответил' },
  },
  en: {
    table: { empty: 'No items yet' },
    common: { retry: 'Load again' },
    errorState: { title: 'The warehouse did not respond' },
  },
}

const overrideCode = (locale: Locale) => {
  const m = OVERRIDE[locale]
  const en = locale === 'en'
  return `import { LocaleProvider, type MessagesOverride } from 'endfield-vision'

// ${L(en, 'Объект - вне компонента: стабильная ссылка, словарь не пересобирается.', 'Keep the object outside the component: a stable reference, so the dictionary is not rebuilt.')}
const MESSAGES: MessagesOverride = {
  table: { empty: '${m.table?.empty ?? ''}' },
  common: { retry: '${m.common?.retry ?? ''}' },
  errorState: { title: '${m.errorState?.title ?? ''}' },
}

<LocaleProvider locale="${locale}" messages={MESSAGES}>{children}</LocaleProvider>`
}

const ownCode = (en: boolean) => `'use client'
import { useLocale, useMessages, useNumberFormat } from 'endfield-vision'

export function StockTotal({ qty }: { qty: number | null }) {
  const t = useMessages()        // ${L(en, 'словарь текущего языка', 'dictionary for the current language')}
  const locale = useLocale()     // 'ru' | 'en'
  const fmt = useNumberFormat()  // ${L(en, 'разряды по правилам языка', 'digit grouping per language rules')}
  if (qty === null) return <span className="ev-muted">{t.common.loading}</span>
  return <span className="ev-num">{fmt(qty)} {locale === 'ru' ? 'шт.' : 'pcs'}</span>
}`

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

function dictColumns(t: Translator['t']): Column<DictRow>[] {
  return [
    { key: 'section', header: t('Раздел', 'Section'), primary: true, cell: (r) => <code>{r.section}</code> },
    { key: 'keys', header: t('Ключей', 'Keys'), numeric: true, hideOnMobile: true, cell: (r) => r.keys },
    { key: 'sample', header: t('Пример ключа', 'Sample key'), hideOnMobile: true, cell: (r) => <code className="ev-secondary">{r.sample}</code> },
    { key: 'ru', header: 'ru', wrap: true, cell: (r) => r.ru },
    { key: 'en', header: 'en', wrap: true, cell: (r) => r.en },
  ]
}

function OverrideCard({ columns }: { columns: Column<DictRow>[] }) {
  const { t, lang } = useT()
  const [on, setOn] = useState(true)
  return (
    <Card
      title={t('Свои формулировки', 'Custom wording')}
      description={t(
        'messages - частичное переопределение поверх словаря языка: любые разделы и строки, остальное берётся из словаря. Слияние - на два уровня.',
        'messages is a partial override on top of the language dictionary: any sections and strings, with the rest taken from the dictionary. Merging goes two levels deep.',
      )}
      actions={<Switch size="sm" checked={on} onChange={setOn} label={t('Переопределение', 'Override')} />}
    >
      <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
        <LocaleProvider locale={lang} messages={on ? OVERRIDE[lang] : undefined}>
          <div className={s.cols}>
            <div className="ev-stack">
              <Subhead>table.empty</Subhead>
              <DataTable
                aria-label={t('Пример пустой таблицы', 'Empty table example')}
                columns={columns.slice(0, 2)}
                rows={[]}
                rowKey={(r) => r.section}
                dense
              />
            </div>
            <div className="ev-stack">
              <Subhead>{t('errorState.title и common.retry', 'errorState.title and common.retry')}</Subhead>
              <ErrorState compact onRetry={() => undefined} />
            </div>
          </div>
        </LocaleProvider>
        <CodeBlock label={t('Переопределение', 'Override')} code={overrideCode(lang)} />
      </div>
    </Card>
  )
}

export function I18nSection() {
  const { t, lang: consoleLang } = useT()
  const en = consoleLang === 'en'
  const root = useLocale()
  // Корневой провайдер следует языку консоли; пример по умолчанию - на другом языке, чтобы разница была видна сразу.
  const [lang, setLang] = useState<Locale>(root === 'ru' ? 'en' : 'ru')
  const columns = useMemo(() => dictColumns(t), [t])
  return (
    <div className={s.section}>
      <div className={`${s.grid} ${s.gridWide}`}>
        <Card
          title="LocaleProvider"
          description={t(
            'Язык встроенных текстов библиотеки: подписи кнопок, aria-label, плейсхолдеры, пустые состояния, пагинация, календарь.',
            'The language of the library built-in strings: button labels, aria-label, placeholders, empty states, pagination, the calendar.',
          )}
        >
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
            <KeyValueList
              labelWidth={190}
              items={[
                {
                  key: 'default',
                  label: t('Без провайдера', 'Without a provider'),
                  value: t('Английский (en)', 'English (en)'),
                  hint: t('Библиотека не угадывает язык по браузеру', 'The library does not guess the language from the browser'),
                },
                {
                  key: 'root',
                  label: t('Эта консоль', 'This console'),
                  value: <code>{`<LocaleProvider locale="${root}">`}</code>,
                  hint: t(
                    'В корне, рядом с LinkProvider. Следует языку консоли: переключатель - в профиле и в палитре команд',
                    'At the root, next to LinkProvider. Follows the console language: switch it in the profile or the command palette',
                  ),
                },
                { key: 'nested', label: t('Вложенный провайдер', 'Nested provider'), value: t('Меняет язык для части страницы', 'Changes the language for part of the page') },
                {
                  key: 'dicts',
                  label: t('Словари', 'Dictionaries'),
                  value: <code>ru, en</code>,
                  hint: t(
                    `Разделов: ${DICT_ROWS.length}, ключей: ${DICT_TOTAL}. Тип Messages - основа для третьего языка`,
                    `${DICT_ROWS.length} sections, ${DICT_TOTAL} keys. The Messages type is the basis for a third language`,
                  ),
                },
                {
                  key: 'dates',
                  label: t('Даты', 'Dates'),
                  value: t('дд.мм.гггг на обоих языках', 'dd.mm.yyyy in both languages'),
                  hint: t('Неделя начинается с понедельника', 'Weeks start on Monday'),
                },
              ]}
            />
            <CodeBlock label="app/providers.tsx" code={provider(en)} />
          </div>
        </Card>
        <Card
          title={t('Хуки для своих компонентов', 'Hooks for your own components')}
          description={t(
            'Свои компоненты в том же стиле берут тексты и формат чисел из того же провайдера.',
            'Your own components in the same style take strings and number formatting from the same provider.',
          )}
        >
          <div className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
            <KeyValueList
              labelWidth={190}
              items={[
                { key: 'm', label: <code>useMessages()</code>, value: t('Словарь текущего языка (тип Messages)', 'Dictionary for the current language (Messages type)') },
                { key: 'l', label: <code>useLocale()</code>, value: <code>&apos;ru&apos; | &apos;en&apos;</code> },
                {
                  key: 'n',
                  label: <code>useNumberFormat()</code>,
                  value: t('Числа по правилам языка: разряды и дробная часть', 'Numbers per language rules: digit grouping and decimals'),
                },
                { key: 'r', label: <code>resolveMessages()</code>, value: t('Словарь с переопределениями вне React', 'Dictionary with overrides, outside React') },
              ]}
            />
            <CodeBlock label="StockTotal.tsx" code={ownCode(en)} />
          </div>
        </Card>
      </div>

      <Card
        title={t('Живой пример', 'Live example')}
        description={t(
          'Область ниже обёрнута во вложенный LocaleProvider: переключатель меняет язык встроенных текстов только в ней. Подписи полей и колонок - текст приложения, он выбирается по useLocale().',
          'The area below is wrapped in a nested LocaleProvider: the switch changes the language of built-in strings inside it only. Field and column labels are app text, picked with useLocale().',
        )}
        actions={
          <SegmentedControl<Locale>
            aria-label={t('Язык примера', 'Example language')}
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
            {t(
              `Окна useModals() рисует ModalsProvider в корне приложения, поэтому подписи кнопок confirm и alert по умолчанию следуют языку корневого провайдера (${root}), а не вложенного. Для окна на языке фрагмента - свой Modal внутри провайдера или okLabel и cancelLabel из useMessages().`,
              `useModals() dialogs are rendered by ModalsProvider at the app root, so confirm and alert button labels follow the root provider language (${root}) by default, not the nested one. For a dialog in the fragment language, render your own Modal inside the provider or pass okLabel and cancelLabel from useMessages().`,
            )}
          </Callout>
          <LocaleProvider locale={lang}>
            <I18nDemo />
          </LocaleProvider>
        </div>
      </Card>

      <OverrideCard columns={columns} />

      <Card
        title={t('Словари', 'Dictionaries')}
        description={t(
          'Разделы словарей: число ключей и первая строка раздела на обоих языках. Таблица собрана из экспортов ru и en на этой странице.',
          'Dictionary sections: key count and the first string of each section in both languages. The table is built from the ru and en exports right on this page.',
        )}
        flush
      >
        <DataTable aria-label={t('Разделы словарей', 'Dictionary sections')} columns={columns} rows={DICT_ROWS} rowKey={(r) => r.section} dense mobile="scroll" />
      </Card>
    </div>
  )
}
