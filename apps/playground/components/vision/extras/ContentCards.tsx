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
import { bi, useT, type Bi, type Translator } from '@/lib/i18n'

/* ------------------------------------------------------------------ */
/* Баннеры                                                             */
/* ------------------------------------------------------------------ */

function BannersCard() {
  const { t } = useT()
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
      description={t(
        'Объявление на всю ширину: вверху страницы или над шапкой раздела. Для событий, которые касаются всей системы (работы, сбой связи, новая версия); сообщение про блок на странице - Callout. Скрытие можно запомнить в localStorage через storageKey.',
        'A full-width announcement at the top of the page or above a section header. Use it for events that affect the whole system (maintenance, a connectivity outage, a new release); for a message about a block on the page, use Callout. Dismissal can be remembered in localStorage via storageKey.',
      )}
      actions={
        <Button size="sm" variant="ghost" onClick={reset}>
          {t('Вернуть скрытый', 'Restore dismissed')}
        </Button>
      }
    >
      <div className="ev-stack">
        <Banner
          key={round}
          tone="info"
          title={t('Плановые работы 10 октября', 'Scheduled maintenance on October 10')}
          dismissible
          storageKey="pg-banner-maintenance"
          actions={
            <Button size="sm" variant="secondary">
              {t('Расписание', 'Schedule')}
            </Button>
          }
        >
          {t(
            'С 02:00 до 04:00 склад Застава работает только на приёмку. Отгрузки переносятся на утро.',
            'From 02:00 to 04:00, Outpost warehouse handles receiving only. Shipments are moved to the morning.',
          )}
        </Banner>
        <Banner tone="success" title={t('Связь с узлом Хребет восстановлена', 'Connection to the Ridge node restored')}>
          {t('Данные телеметрии за последние 6 часов догружены.', 'Telemetry for the last 6 hours has been backfilled.')}
        </Banner>
        <Banner
          tone="warning"
          title={t('Заполнено 92% мест хранения', '92% of storage capacity in use')}
          actions={<Button size="sm">{t('Перераспределить', 'Rebalance')}</Button>}
        >
          {t('Склад Долина-1 скоро перестанет принимать поставки.', 'Valley-1 warehouse will soon stop accepting deliveries.')}
        </Banner>
        <Banner tone="danger" title={t('Линия Л-3 остановлена', 'Line L-3 stopped')} dismissible>
          {t('Аварийный останов в 11:42. Бригада ремонта направлена.', 'Emergency stop at 11:42. A repair crew has been dispatched.')}
        </Banner>
        <Banner tone="accent" title={t('Новая версия диспетчерской', 'New dispatch console release')}>
          {t('Журнал смен теперь фильтруется по оборудованию.', 'The shift log can now be filtered by equipment.')}
        </Banner>
        <Banner tone="neutral" icon={false}>
          {t('Нейтральный баннер без иконки - для справочных объявлений.', 'A neutral banner without an icon, for informational announcements.')}
        </Banner>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Код                                                                 */
/* ------------------------------------------------------------------ */

/** Примеры кода: строки интерфейса и комментарии - на языке витрины, сам код тот же. */
function tsxSample({ t }: Translator): string {
  return `import { Banner, LocaleProvider } from 'endfield-vision'
import 'endfield-vision/styles.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="${t('ru', 'en')}">
      <Banner tone="warning" title="${t('Работы на линии Л-3', 'Maintenance on line L-3')}" dismissible storageKey="line-3">
        ${t('Отгрузки задерживаются на 2 часа.', 'Shipments are delayed by 2 hours.')}
      </Banner>
      {children}
    </LocaleProvider>
  )
}
`
}

function bashSample({ t }: Translator): string {
  return `# ${t('пакет и иконки', 'package and icons')}
npm install endfield-vision lucide-react
npm run dev -- --port 3200`
}

function jsonSample({ t }: Translator): string {
  return `{
  "facility": "${t('Склад Застава', 'Outpost warehouse')}",
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
  "comment": "${t(
    'Длинная строка конфигурации, чтобы показать перенос: ворота G-3 закрыты на ремонт до конца квартала, приёмка идёт через G-1',
    'A long configuration string to show wrapping: gate G-3 is closed for repairs until the end of the quarter, receiving goes through G-1',
  )}"
}`
}

function CodeCard() {
  const tr = useT()
  const { t } = tr
  return (
    <Card
      title={t('CodeBlock и InlineCode', 'CodeBlock and InlineCode')}
      description={t(
        'Примеры кода в документации, настройках интеграций и журналах. Раскраска без зависимостей для ts, tsx, js, json, css, bash и html; длинный код сворачивается, перенос строк - переключателем.',
        'Code samples in documentation, integration settings and logs. Dependency-free syntax highlighting for ts, tsx, js, json, css, bash and html; long code collapses, and line wrapping has its own toggle.',
      )}
    >
      <div className="ev-stack">
        <p>
          {t('Код в тексте - ', 'Code within text uses ')}
          <InlineCode>InlineCode</InlineCode>
          {t(': ключ ', ': the ')}
          <InlineCode>storageKey</InlineCode>
          {t(' запоминает скрытый баннер, команда', ' prop remembers a dismissed banner, and the')} <InlineCode>npm test</InlineCode>
          {t(' запускает проверки.', ' command runs the checks.')}
        </p>
        <CodeBlock code={tsxSample(tr)} language="tsx" title="app/layout.tsx" showLineNumbers highlightLines={[7, 8, 9]} />
        <CodeBlock code={bashSample(tr)} language="bash" />
        <CodeBlock code={jsonSample(tr)} language="json" title="facility.config.json" showLineNumbers maxLines={8} wrapToggle />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Подсветка совпадений                                                */
/* ------------------------------------------------------------------ */

const EQUIPMENT: Bi[] = [
  bi('Насосная станция НС-2', 'Pump station PS-2'),
  bi('Компрессор К-12, цех сборки', 'Compressor K-12, assembly shop'),
  bi('Ёмкость хранения Е-4', 'Storage tank E-4'),
  bi('Склад Застава, зона приёмки', 'Outpost warehouse, receiving area'),
  bi('Конвейер Л-3, участок упаковки', 'Conveyor L-3, packing section'),
  bi('Котельная Хребет', 'Ridge boiler house'),
  bi('Трансформаторная подстанция ТП-7', 'Transformer substation TS-7'),
  bi('Холодильная камера Долина-1', 'Valley-1 cold room'),
]

/** Начальный запрос - на языке витрины; при смене языка карточка пересоздаётся (key). */
function HighlightCard() {
  const { t, tx } = useT()
  // «ем» находит и «Ёмкость»: ё = е. В английском примере «co» - без учёта регистра.
  const [query, setQuery] = useState(() => t('ем', 'co'))
  const equipment = EQUIPMENT.map((e) => tx(e))
  const items = query.trim() ? equipment.filter((name) => highlightRanges(name, query).length > 0) : equipment
  return (
    <Card
      title="Highlight"
      description={t(
        'Подсветка совпадений в результатах поиска: списки объектов, оборудование, журналы. Без учёта регистра, ё = е; в тексте остаются исходные буквы.',
        'Highlights matches in search results: facility lists, equipment, logs. Matching is case-insensitive and treats ё as е in Russian text; the original letters stay in the output.',
      )}
      toolbar={
        <SearchInput value={query} onChange={setQuery} placeholder={t('Объект или оборудование', 'Facility or equipment')} aria-label={t('Поиск объекта', 'Search facilities')} />
      }
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
        <EmptyState compact title={t('Ничего не найдено', 'Nothing found')} description={t('Проверьте написание или очистите поиск.', 'Check the spelling or clear the search.')} />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Относительное время                                                 */
/* ------------------------------------------------------------------ */

/** «Сейчас» витрины: серверный и клиентский рендер совпадают. */
const DEMO_NOW = new Date('2026-10-08T12:00:00')

const EVENTS: Array<{ id: string; label: Bi; date: string }> = [
  { id: 'e1', label: bi('Показания датчика Е-4', 'Sensor E-4 reading'), date: '2026-10-08T11:59:40' },
  { id: 'e2', label: bi('Смена принята', 'Shift taken over'), date: '2026-10-08T11:35:00' },
  { id: 'e3', label: bi('Отгрузка SHP-20418', 'Shipment SHP-20418'), date: '2026-10-08T08:10:00' },
  { id: 'e4', label: bi('Поверка весов', 'Scale calibration'), date: '2026-10-07T16:00:00' },
  { id: 'e5', label: bi('Инвентаризация Долина-1', 'Valley-1 stocktake'), date: '2026-09-24T09:00:00' },
  { id: 'e6', label: bi('Замена фильтров К-12', 'K-12 filter replacement'), date: '2026-10-08T15:30:00' },
  { id: 'e7', label: bi('Плановые работы на линии Л-3', 'Scheduled maintenance on line L-3'), date: '2026-10-10T02:00:00' },
  { id: 'e8', label: bi('Аттестация котельной', 'Boiler house certification'), date: '2027-03-15T10:00:00' },
]

function EventTimes() {
  const { tx } = useT()
  return (
    <ul className="ev-stack" style={{ '--ev-gap': 'var(--ev-space-2)' } as CSSProperties}>
      {EVENTS.map((e) => (
        <li key={e.id} className="ev-row" style={{ justifyContent: 'space-between' }}>
          <span>{tx(e.label)}</span>
          <span className="ev-secondary">
            <RelativeTime date={e.date} now={DEMO_NOW} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function RelativeTimeCard() {
  const { t, lang } = useT()
  return (
    <Card
      title="RelativeTime"
      description={t(
        'Время событий в журналах и лентах: «5 минут назад», «через 2 дня». Полная дата - в подсказке по наведению и фокусу. С now вывод детерминированный; без now до гидрации показывается полная дата, после - относительное время. updateInterval включает живое обновление.',
        'Event times in logs and feeds: "5 minutes ago", "in 2 days". The full date appears in a tooltip on hover and focus. With now, the output is deterministic; without it, the full date is shown until hydration and the relative time after. updateInterval enables live updates. The right column renders the same events under LocaleProvider locale="ru".',
      )}
    >
      <div className="ev-grid" style={{ '--ev-grid-min': '280px' } as CSSProperties}>
        <EventTimes />
        {/* Вторая колонка - те же события в другой локали библиотеки. */}
        <LocaleProvider locale={lang === 'en' ? 'ru' : 'en'}>
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
  const { t } = useT()
  return (
    <Card
      title="ExpandableText"
      description={t(
        'Длинное описание в карточке инцидента, заявке или комментарии: первые строки и кнопка «Показать полностью». Кнопка появляется, только если текст не помещается.',
        'Long descriptions in incident cards, requests or comments: the first few lines and a "Show more" button. The button appears only when the text does not fit.',
      )}
    >
      <div className="ev-stack">
        <ExpandableText lines={3}>
          {t(
            '08.10 в 11:42 на конвейере Л-3 сработал аварийный останов: датчик натяжения ленты на участке упаковки показал превышение на 18%. Оператор смены остановил подачу с участка сборки, продукция в работе перемещена в буферную зону. Осмотр показал износ натяжного ролика и смещение ленты на 12 мм. Бригада ремонта заменила ролик и провела регулировку; пробный пуск без нагрузки прошёл штатно. Линия возвращена в работу в 13:05, потери - 1 час 23 минуты, 46 упаковок отправлены на повторный контроль. Следующий осмотр натяжных роликов перенесён с ноября на 15.10.',
            'On 08.10 at 11:42, conveyor L-3 triggered an emergency stop: the belt tension sensor in the packing section reported a reading 18% above the limit. The shift operator stopped the feed from the assembly section, and work in progress was moved to the buffer zone. Inspection found a worn tension roller and a 12 mm belt misalignment. The repair crew replaced the roller and adjusted the belt; a no-load test run went as expected. The line returned to service at 13:05 after 1 hour 23 minutes of downtime, and 46 packages were sent for re-inspection. The next tension roller inspection has been moved from November to 15.10.',
          )}
        </ExpandableText>
        <ExpandableText lines={3}>{t('Короткое описание помещается целиком - кнопки нет.', 'A short description fits entirely, so there is no button.')}</ExpandableText>
      </div>
    </Card>
  )
}

/** Витрина группы «Содержимое и обратная связь». */
export function ContentCards() {
  const { lang } = useT()
  return (
    <div className="ev-stack">
      <BannersCard />
      <CodeCard />
      <HighlightCard key={lang} />
      <RelativeTimeCard />
      <ExpandableCard />
    </div>
  )
}
