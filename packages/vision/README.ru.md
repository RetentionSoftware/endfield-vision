# endfield-vision

[English](https://github.com/RetentionSoftware/endfield-vision/blob/main/packages/vision/README.md) | **Русский**

Дизайн-система для React 19 и Next.js (App Router). Токены на CSS-переменных, тёмная тема по умолчанию, светлая и «как в системе», пресеты акцента, доступные компоненты без сторонних UI-библиотек (зависимость одна - `lucide-react` для иконок).

Живой каталог - раздел **ENDFIELD Vision** в плейграунде [репозитория](https://github.com/RetentionSoftware/endfield-vision) (`npm run dev`, затем `/vision`).

## Установка

```bash
npm i endfield-vision
```

Нужны `react` и `react-dom` 19.

## Подключение (Next.js App Router)

```tsx
// app/layout.tsx
import 'endfield-vision/styles.css'
import { ThemeScript } from 'endfield-vision'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-jetbrains-mono' })

export default function RootLayout({ children }) {
  return (
    <html lang="ru" data-theme="dark" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript /> {/* тема и акцент до первой отрисовки, без вспышки */}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

```tsx
// app/providers.tsx
'use client'
import { LinkProvider, ModalsProvider, Toaster, type LinkComponent } from 'endfield-vision'
import NextLink from 'next/link'

const AppLink: LinkComponent = ({ href, ...rest }) => <NextLink href={href} {...rest} />

export function Providers({ children }) {
  return (
    <LinkProvider component={AppLink}>
      <ModalsProvider>
        {children}
        <Toaster />
      </ModalsProvider>
    </LinkProvider>
  )
}
```

Библиотека не зависит от Next.js: без `LinkProvider` ссылки - обычные `<a>`, остальное работает в любом React-приложении (Vite и т. п.). Компоненты помечены `'use client'` пофайлово: их можно рендерить из серверных компонентов, а утилиты (`cx`, `formatIsoDate`, маски, `themeBootstrap`) импортируются и на сервере.

## Язык

Встроенные тексты (подписи кнопок, aria-label, пустые состояния, пагинация, календарь) есть на английском и русском. Без провайдера - английский.

```tsx
import { LocaleProvider } from 'endfield-vision'

<LocaleProvider locale="ru">{children}</LocaleProvider>

// Свои формулировки поверх словаря - любые ветки и строки:
<LocaleProvider locale="en" messages={{ table: { empty: 'Nothing here yet' }, common: { retry: 'Reload' } }}>
```

- `useMessages()` - словарь текущего языка (для своих компонентов в том же стиле), `useLocale()` - `'ru' | 'en'`, `useNumberFormat()` - числа по правилам языка.
- Провайдеры можно вкладывать: часть страницы на другом языке.
- Словари экспортируются (`ru`, `en`): их можно взять за основу третьего языка - тип `Messages` подскажет все ключи.
- Формат дат в полях - `дд.мм.гггг` на обоих языках, неделя начинается с понедельника.

Шрифты задаёт приложение (`--font-inter`, `--font-jetbrains-mono`); без них - системные.

## Тема и акцент

- `<html data-theme="dark|light">` - тема, `<html data-accent="amber|emerald|cyan|rose|violet">` - пресет акцента (без атрибута - indigo).
- `ThemeScript` ставит оба атрибута из `localStorage` до отрисовки. Опции: `defaultTheme` (`'dark' | 'light' | 'system'`), `defaultAccent`, `themeKey`, `accentKey`.
- В клиентском коде: `const { theme, preference, accent, setTheme, setAccent } = useTheme()`.

Свой акцент - переопределите токены в стилях приложения (вне слоёв они сильнее):

```css
:root {
  --ev-accent-rgb: 255, 122, 69;
  --ev-accent-text: #ff9a70;
  --ev-accent-strong: #d9480f; /* заливка primary-кнопки */
  --ev-accent-strong-hover: #e8590c;
  --ev-text-on-accent: #ffffff;
}
```

## Анимация появления

Числа набираются, графики строятся, когда элемент впервые попадает в видимую область. По умолчанию выключено.

```tsx
import { MotionProvider, StatTile, BarChart } from 'endfield-vision'

<MotionProvider>{children}</MotionProvider>                  // для всего приложения (duration - длительность, мс)
<StatTile label="Запасы" value="12 845 000 ₽" animate />      // или на отдельном компоненте
<BarChart animate={false} ... />                              // проп сильнее провайдера
```

- Поддерживают: `StatTile` (число ищется в строке значения, формат сохраняется), `AnimatedNumber`, `Progress`, `BarChart`, `LineChart`, `AreaChart`, `Sparkline`, `DonutChart`, `Heatmap`, `HeatmapMatrix`, `RingProgress`, `Gauge`, `UptimeBar`. Проп `animationDuration` - своя длительность.
- Анимация проигрывается один раз; при обновлении данных числа плавно переходят к новому значению, графики не перерисовываются заново.
- `prefers-reduced-motion` выключает анимацию. Серверная разметка - итоговое состояние; скринридер всегда получает итоговые значения.
- Для своих компонентов: `useEntranceMotion(ref, animate)` (фазы `static` / `idle` / `run`, атрибут `data-ev-motion` для CSS), `useMotionProgress`, `useCountUp`.

## Слои и префиксы

- Все стили библиотеки - в каскадных слоях `@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities`. Стили приложения вне слоёв всегда сильнее, специфичность бороться не нужно.
- Классы - `ev-*`, переменные - `--ev-*`: не пересекаются с Tailwind и стилями приложения. С Tailwind v4 порядок задаётся одной строкой до импортов: `@layer theme, base, ev, components, utilities;`.
- Только токены: `endfield-vision/tokens.css` (+ `accents.css`) подключает переменные без компонентов и сброса.

## Правила

- Выпадающий список - `Select`/`MultiSelect`, не `<select>`; подсказка - `Tooltip` (у `IconButton` встроена через `label`), не атрибут `title=`.
- Цвета, отступы, радиусы, тени, слои - только `var(--ev-...)`.
- Пустое значение в таблицах и карточках - `EMPTY_VALUE` (дефис), `DataTable` и `KeyValueList` подставляют его сами.
- Карточки, панели, плитки, таблицы - без рамки: их отделяет поверхность, в светлой теме ещё `--ev-shadow-card`. Блок внутри карточки, окна или шторки - на `--ev-surface-nested`. Рамка - у полей ввода и контролов.
- Акцент тона на панели - **уголки видоискателя**, а не цветная полоса по краю: `<div className="ev-corners" data-corners="diagonal" data-tone="warning">`. Варианты `data-corners`: без значения (уголок сверху слева), `diagonal`, `frame` (четыре уголка), `off`. Размер, толщина и отступ - токены `--ev-corner-size`, `--ev-corner-width`, `--ev-corner-inset`, цвет - тон элемента или `--ev-corner-color`.
- `Card flush` - таблица от края до края; остальные прямые дети тела (фильтры, плашки, пагинация) получают отступ карточки сами.

## Токены (главное)

| Группа | Токены |
|---|---|
| Поверхности | `--ev-bg`, `--ev-surface-1` (карточки), `--ev-surface-2` (поповеры, шапка таблицы), `--ev-surface-3` (кнопки), `--ev-surface-nested`, `--ev-surface-input`, `--ev-hover`, `--ev-active`, `--ev-tint-1..4` |
| Тени | `--ev-shadow-card`, `--ev-shadow-sm`, `--ev-shadow`, `--ev-shadow-pop`, `--ev-shadow-modal`, `--ev-shadow-primary` |
| Рамки | `--ev-border-soft`, `--ev-border`, `--ev-border-strong`, `--ev-border-control` (поля, 3:1), `--ev-border-hover` |
| Текст | `--ev-text`, `--ev-text-secondary`, `--ev-text-muted` (>= 4.5:1), `--ev-text-disabled`, `--ev-text-on-accent` |
| Акцент | `--ev-accent`, `--ev-accent-text`, `--ev-accent-strong`, `--ev-accent-soft`, `--ev-accent-edge`, `--ev-accent-rgb`, `--ev-accent-swatch-<пресет>` |
| Семантика | `--ev-success`, `--ev-warning`, `--ev-danger`, `--ev-info`, `--ev-violet` (+ `-soft`, `-edge`, `-strong`) - не зависят от акцента |
| Графики | `--ev-chart-1..8`, `--ev-chart-grid`, `--ev-chart-axis` |
| Геометрия | `--ev-radius-xs..xl`, `--ev-space-0..11` (2..56px), `--ev-control-h-sm/-h/-h-lg` (28/34/40) |
| Типографика | `--ev-fs-2xs..3xl` (11..30px, база 14px), `--ev-fw-*`, `--ev-lh` |
| Слои | `--ev-z-sticky` < `--ev-z-topbar` < `--ev-z-drawer` < `--ev-z-modal` < `--ev-z-dropdown` < `--ev-z-toast` < `--ev-z-tooltip` |
| Движение | `--ev-dur-fast/-dur/-dur-slow`, `--ev-ease`, `--ev-ease-out`; `prefers-reduced-motion` учтён глобально |

Тон компонента (`Badge`, `StatusPill`, `Callout`, `StatTile`, `Avatar`, `Progress`) - проп `tone`: `neutral | accent | success | warning | danger | info | violet`.

## Компоненты

- **Действия:** `Button` (`primary | secondary | ghost | danger | danger-ghost | link`, `sm | md | lg`, `loading`, `icon`, `iconRight`, `block`), `LinkButton`, `IconButton` (обязательный `label` = aria-label + подсказка), `Menu`, `Popover`.
- **Формы:** `Field` (подпись, подсказка, ошибка; сам связывает `id`, `aria-invalid`, `aria-describedby`), `FormSection`, `Input`, `SearchInput`, `PasswordInput`, `Textarea` (`autoResize`), `NumberInput` (`min/max/step`, `decimals`, `unit`, `stepper`), `MoneyInput` (значение в копейках), `PhoneInput` (22 страны с выбором из списка, распознавание кода при вставке, E.164), `SnilsInput`, `PlateInput`, `DigitsInput`, `MaskedDigitsInput`, `TimeInput` (`ЧЧ:ММ`, `min/max`), `ColorField`.
- **Выбор:** `Select` (поиск при > 7 опций, группы, `clearable`, серверный поиск `onSearch`), `MultiSelect`, `DateField` (`YYYY-MM-DD`), `DateRangePicker`, `Calendar`, `Checkbox` (`indeterminate`), `Switch`, `RadioGroup` (`variant="card"`), `SegmentedControl`, `Tabs` (кнопки или ссылки `href`), `TabPanel`.
- **Данные:** `DataTable` (колонки конфигом, сортировка, выбор строк, `loading`, `fetching`, `error` + `onRetry`, `empty`, `maxHeight`, на узком экране - карточки), `Pagination`, `FilterBar`, `KeyValueList`, `StatTile`, `Badge`, `StatusPill`, `Avatar` (инициалы или фото), `Progress` (в том числе перерасход), `Timeline` (лента событий, будущие шаги, «показать ещё»), `UptimeBar` (доступность по дням с подсказками), `CopyButton`, `CopyValue`.
- **Графики:** `BarChart` (рядом или `stacked`), `LineChart`, `AreaChart`, `Sparkline`, `DonutChart` (доли, «Прочее», легенда), `Heatmap` (календарь активности) и `HeatmapMatrix` (матрица «строка x столбец»), `RingProgress` (кольцо, секции, перерасход), `Gauge` (шкала-полукруг с зонами). Подсказка по наведению и стрелками, легенда при 2+ сериях, скрытая таблица для скринридера.
- **Состояния и окна:** `Callout`, `EmptyState`, `ErrorState`, `Skeleton`, `SkeletonText`, `Spinner`, `LoadingBlock`, `Modal`, `useModals()` (`open`, `confirm`, `alert`), `Drawer`, `toast.*` / `useToast()` (вызов и вне React), `FileDrop`.
- **Навигация и структура:** `CommandPalette` (Ctrl+K, группы, поиск по словам), `Steps` (шаги мастера, горизонтально и вертикально), `Accordion` и `Disclosure`, `TreeView` (выбор одного или нескольких с частичным состоянием, клавиатура WAI-ARIA).
- **Ввод (дополнительно):** `Slider` (значение и диапазон, метки), `TagInput` (метки, подсказки, лимит, проверка), `Chip` и `ChipGroup` (фильтры и метки), `OtpInput` (код подтверждения, вставка целиком), `InlineEdit` (правка на месте с асинхронным сохранением).
- **Контент:** `Banner` (объявление на всю ширину, скрытие запоминается), `CodeBlock` и `InlineCode` (номера строк, подсветка строк и синтаксиса без зависимостей, сворачивание), `Highlight` (совпадения поиска, ё = е), `RelativeTime` («5 минут назад» на обоих языках), `ExpandableText` («Показать полностью»).
- **Каркас:** `AppShell` (слот `statusBar`), `Topbar`, `Sidebar`, `SidebarSection`, `SidebarItem`, `SidebarCollapseButton`, `useAppShell()`, `PageHeader`, `Breadcrumbs`, `SectionTitle`, `Card`, `Panel`, `Divider`, `Kbd`, `StatusBar` (`StatusBarItem`, `StatusBarClock`), `WorkspaceSwitcher`, `ScreenOverlay` (техработы, новая версия), `ContextMenu` и `ContextMenuProvider` (правый клик, реестр по `data-ctx-kind`).
- **CRM - карточка записи:** `RecordHeader` (шапка: аватар, идентификаторы с копированием, показатели, действия), `RecordLayout` (основная и боковая колонки), `EditablePanel` (секция с режимом правки и асинхронным сохранением), `CompletenessBadge` (что не заполнено и что истекает), `BadgeStack` и `AvatarGroup` (+N), присутствие у `Avatar` (`status`, `lastSeen`), `missing` у строк `KeyValueList`.
- **CRM - процессы:** `KanbanBoard` и `KanbanCard` (колонки со счётчиками и «показать ещё», перетаскивание и перенос с клавиатуры), `SlaTimer` (прошло / осталось, тоны по порогам, `formatDuration`), `PermissionMatrix` (разделы × роли, режимы, изменения против сохранённого), `SettingsList`, `SettingRow`, `SaveBar`, `useDirtyState`.
- **CRM - коммуникации:** `NotificationCenter` и `NotificationList` (история, прочитано, действия), `toast` с несколькими действиями, `ChatThread`, `ChatMessage`, `Composer` (вложения, вставка скриншотов, перетаскивание), `Lightbox`, `ConnectionStatus`.
- **Фильтры в адресе:** `useUrlFilters` - синхронизация с URL и память по области.
- **Язык:** `LocaleProvider`, `useMessages`, `useLocale`, `useNumberFormat`, словари `ru`, `en`.
- **Тема:** `ThemeScript` (`nonce` для CSP), `themeBootstrap`, `useTheme`, `setTheme`, `setAccent`, `ACCENTS`.
- **Утилиты:** `cx`, `normalizeSearch`, `formatPhone`, `isCompletePhone`, `normalizePlate`, `normalizeHexColor`, `useMediaQuery`, `useDebouncedValue`, `useControllable`, `LinkProvider`. Классы раскладки: `ev-stack`, `ev-row`, `ev-grid` (`--ev-gap`, `--ev-grid-min`), `ev-mono`, `ev-num`, `ev-muted`, `ev-truncate`, `ev-link`, `ev-visually-hidden`.

## Доработка под себя

Пакет публикует и сборку (`dist/`), и исходники (`src/`). Три уровня настройки:

1. **Токены** - переопределите `--ev-*` в своих стилях: цвета, радиусы, плотность (`--ev-control-h`), шрифты.
2. **Стили компонентов** - классы `ev-*` и data-атрибуты (`data-variant`, `data-size`, `data-tone`) стабильны; ваши правила вне слоёв перекрывают библиотеку.
3. **Код** - скопируйте нужный компонент из `node_modules/endfield-vision/src/components` в проект и правьте как свой.

## Лицензия

[MIT](LICENSE)
