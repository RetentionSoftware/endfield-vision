'use client'

import {
  Banner,
  Button,
  Card,
  CodeBlock,
  EmptyState,
  ExpandableText,
  Highlight,
  highlightRanges,
  InlineCode,
  LocaleProvider,
  RelativeTime,
  SearchInput,
} from 'endfield-vision'
import { useState, type CSSProperties } from 'react'

/* ------------------------------------------------------------------ */
/* Баннеры                                                             */
/* ------------------------------------------------------------------ */

function BannersCard() {
  // Новый ключ - новый экземпляр: баннер заново читает localStorage.
  const [round, setRound] = useState(0)
  const reset = () => {
    try {
      window.localStorage.removeItem('pg-banner-maintenance')
    } catch {
      // хранилище недоступно - баннер и так вернётся после перезагрузки
    }
    setRound((r) => r + 1)
  }
  return (
    <Card
      title="Banner"
      description="Объявление на всю ширину: вверху страницы или над шапкой раздела. Для событий, которые касаются всей системы (работы, сбой связи, новая версия); сообщение про блок на странице - Callout. Скрытие можно запомнить в localStorage через storageKey."
      actions={
        <Button size="sm" variant="ghost" onClick={reset}>
          Вернуть скрытый
        </Button>
      }
    >
      <div className="ev-stack">
        <Banner
          key={round}
          tone="info"
          title="Плановые работы 10 октября"
          dismissible
          storageKey="pg-banner-maintenance"
          actions={
            <Button size="sm" variant="secondary">
              Расписание
            </Button>
          }
        >
          С 02:00 до 04:00 склад Застава работает только на приёмку. Отгрузки переносятся на утро.
        </Banner>
        <Banner tone="success" title="Связь с узлом Хребет восстановлена">
          Данные телеметрии за последние 6 часов догружены.
        </Banner>
        <Banner tone="warning" title="Заполнено 92% мест хранения" actions={<Button size="sm">Перераспределить</Button>}>
          Склад Долина-1 скоро перестанет принимать поставки.
        </Banner>
        <Banner tone="danger" title="Линия Л-3 остановлена" dismissible>
          Аварийный останов в 11:42. Бригада ремонта направлена.
        </Banner>
        <Banner tone="accent" title="Новая версия диспетчерской">
          Журнал смен теперь фильтруется по оборудованию.
        </Banner>
        <Banner tone="neutral" icon={false}>
          Нейтральный баннер без иконки - для справочных объявлений.
        </Banner>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Код                                                                 */
/* ------------------------------------------------------------------ */

const TSX_SAMPLE = `import { Banner, LocaleProvider } from 'endfield-vision'
import 'endfield-vision/styles.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="ru">
      <Banner tone="warning" title="Работы на линии Л-3" dismissible storageKey="line-3">
        Отгрузки задерживаются на 2 часа.
      </Banner>
      {children}
    </LocaleProvider>
  )
}
`

const BASH_SAMPLE = `# пакет и иконки
npm install endfield-vision lucide-react
npm run dev -- --port 3200`

const JSON_SAMPLE = `{
  "facility": "Склад Застава",
  "zones": 14,
  "telemetry": {
    "intervalSec": 30,
    "retentionDays": 90,
    "sensors": ["temperature", "humidity", "door"],
    "alerts": { "temperatureMax": 8.5, "humidityMax": 70, "notifyShiftLead": true }
  },
  "gates": [
    { "id": "G-1", "mode": "inbound" },
    { "id": "G-2", "mode": "outbound" },
    { "id": "G-3", "mode": null }
  ],
  "comment": "Длинная строка конфигурации, чтобы показать перенос: ворота G-3 закрыты на ремонт до конца квартала, приёмка идёт через G-1"
}`

function CodeCard() {
  return (
    <Card
      title="CodeBlock и InlineCode"
      description="Примеры кода в документации, настройках интеграций и журналах. Раскраска без зависимостей для ts, tsx, js, json, css, bash и html; длинный код сворачивается, перенос строк - переключателем."
    >
      <div className="ev-stack">
        <p>
          Код в тексте - <InlineCode>InlineCode</InlineCode>: ключ <InlineCode>storageKey</InlineCode> запоминает скрытый баннер, команда{' '}
          <InlineCode>npm test</InlineCode> запускает проверки.
        </p>
        <CodeBlock code={TSX_SAMPLE} language="tsx" title="app/layout.tsx" showLineNumbers highlightLines={[7, 8, 9]} />
        <CodeBlock code={BASH_SAMPLE} language="bash" />
        <CodeBlock code={JSON_SAMPLE} language="json" title="facility.config.json" showLineNumbers maxLines={8} wrapToggle />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Подсветка совпадений                                                */
/* ------------------------------------------------------------------ */

const EQUIPMENT = [
  'Насосная станция НС-2',
  'Компрессор К-12, цех сборки',
  'Ёмкость хранения Е-4',
  'Склад Застава, зона приёмки',
  'Конвейер Л-3, участок упаковки',
  'Котельная Хребет',
  'Трансформаторная подстанция ТП-7',
  'Холодильная камера Долина-1',
]

function HighlightCard() {
  const [query, setQuery] = useState('ем')
  const items = query.trim() ? EQUIPMENT.filter((name) => highlightRanges(name, query).length > 0) : EQUIPMENT
  return (
    <Card
      title="Highlight"
      description="Подсветка совпадений в результатах поиска: списки объектов, оборудование, журналы. Без учёта регистра, ё = е; в тексте остаются исходные буквы."
      toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Объект или оборудование" aria-label="Поиск объекта" />}
    >
      {items.length > 0 ? (
        <ul className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
          {items.map((name) => (
            <li key={name}>
              <Highlight text={name} query={query} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="Ничего не найдено" description="Проверьте написание или очистите поиск." />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Относительное время                                                 */
/* ------------------------------------------------------------------ */

/** «Сейчас» витрины: серверный и клиентский рендер совпадают. */
const DEMO_NOW = new Date('2026-10-08T12:00:00')

const EVENTS = [
  { id: 'e1', label: 'Показания датчика Е-4', date: '2026-10-08T11:59:40' },
  { id: 'e2', label: 'Смена принята', date: '2026-10-08T11:35:00' },
  { id: 'e3', label: 'Отгрузка SHP-20418', date: '2026-10-08T08:10:00' },
  { id: 'e4', label: 'Поверка весов', date: '2026-10-07T16:00:00' },
  { id: 'e5', label: 'Инвентаризация Долина-1', date: '2026-09-24T09:00:00' },
  { id: 'e6', label: 'Замена фильтров К-12', date: '2026-10-08T15:30:00' },
  { id: 'e7', label: 'Плановые работы на линии Л-3', date: '2026-10-10T02:00:00' },
  { id: 'e8', label: 'Аттестация котельной', date: '2027-03-15T10:00:00' },
]

function EventTimes() {
  return (
    <ul className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
      {EVENTS.map((e) => (
        <li key={e.id} className="ev-row" style={{ justifyContent: 'space-between' }}>
          <span>{e.label}</span>
          <span className="ev-secondary">
            <RelativeTime date={e.date} now={DEMO_NOW} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function RelativeTimeCard() {
  return (
    <Card
      title="RelativeTime"
      description="Время событий в журналах и лентах: «5 минут назад», «через 2 дня». Полная дата - в подсказке по наведению и фокусу. С now вывод детерминированный; без now до гидрации показывается полная дата, после - относительное время. updateInterval включает живое обновление."
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '280px' } as CSSProperties}>
        <EventTimes />
        <LocaleProvider locale="en">
          <EventTimes />
        </LocaleProvider>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Сворачиваемый текст                                                 */
/* ------------------------------------------------------------------ */

function ExpandableCard() {
  return (
    <Card
      title="ExpandableText"
      description="Длинное описание в карточке инцидента, заявке или комментарии: первые строки и кнопка «Показать полностью». Кнопка появляется, только если текст не помещается."
    >
      <div className="ev-stack">
        <ExpandableText lines={3}>
          08.10 в 11:42 на конвейере Л-3 сработал аварийный останов: датчик натяжения ленты на участке упаковки показал превышение на 18%.
          Оператор смены остановил подачу с участка сборки, продукция в работе перемещена в буферную зону. Осмотр показал износ
          натяжного ролика и смещение ленты на 12 мм. Бригада ремонта заменила ролик и провела регулировку; пробный пуск без нагрузки
          прошёл штатно. Линия возвращена в работу в 13:05, потери - 1 час 23 минуты, 46 упаковок отправлены на повторный контроль.
          Следующий осмотр натяжных роликов перенесён с ноября на 15.10.
        </ExpandableText>
        <ExpandableText lines={3}>Короткое описание помещается целиком - кнопки нет.</ExpandableText>
      </div>
    </Card>
  )
}

/** Витрина группы «Содержимое и обратная связь». */
export function ContentCards() {
  return (
    <div className="ev-stack">
      <BannersCard />
      <CodeCard />
      <HighlightCard />
      <RelativeTimeCard />
      <ExpandableCard />
    </div>
  )
}
