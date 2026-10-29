# endfield-vision

[English](https://github.com/RetentionSoftware/endfield-vision/blob/main/packages/vision/README.md) | **Русский**

Дизайн-система для React 19 и Next.js (App Router). Токены на CSS-переменных, тёмная тема по умолчанию, светлая и «как в системе», два стиля оформления, пресеты акцента, доступные компоненты без сторонних UI-библиотек (зависимость одна - `lucide-react` для иконок).

Живой каталог - раздел **ENDFIELD Vision** в плейграунде [репозитория](https://github.com/RetentionSoftware/endfield-vision) (`npm run dev`, затем `/vision`).

## Установка

```bash
npm i endfield-vision
```

Без реестра npm: к каждому релизу на GitHub приложена та же сборка архивом.

```bash
npm i https://github.com/RetentionSoftware/endfield-vision/releases/download/v2.2.7/endfield-vision-2.2.7.tgz
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

## Тема, стиль и акцент

Три независимые настройки на `<html>`:

- **Тема** - `data-theme="dark|light"`.
- **Стиль** - `data-style="slim"` (без атрибута - `default`). Стиль меняет подачу элементов, а не размеры: высоты контролов, отступы и кегль те же, поэтому переключение не ломает раскладку.
  - `default` («Стандартный») - контрастный, выделение акцентом, уголки видоискателя, подписи разделов капсом.
  - `slim` («Утончённый») - плоский и спокойный: мягкие нейтрали, ничего не светится, выбранное - нейтральным тоном, вторичная и опасная кнопки контуром, подписи без капса, фокус - чёткая линия вместо мягкого ореола.
- **Акцент** - `data-accent="amber|emerald|cyan|rose|violet|ink"` (без атрибута - indigo). `ink` («Чернила») - нейтральный акцент: основная кнопка чернильная, цвет остаётся только в статусах. У каждого пресета свои значения для каждого стиля и темы; контраст проверяют тесты.

`ThemeScript` ставит все три до отрисовки. Опции: `defaultTheme` (`'dark' | 'light' | 'system'`), `defaultStyle`, `defaultAccent`, `accents` (свои пресеты), `themeKey`, `styleKey`, `accentKey`, `nonce` (для CSP).

```tsx
<ThemeScript defaultTheme="system" defaultStyle="slim" defaultAccent="ink" />

// в клиентском коде
const { theme, preference, style, accent, setTheme, setStyle, setAccent } = useTheme()
```

`STYLES` и `ACCENTS` - списки доступных значений; `setTheme`, `setStyle` и `setAccent` работают и вне React.

Свой пресет акцента: имя и значения для тёмной и светлой темы (и, по желанию, для Slim). После регистрации в `ThemeScript` он работает как встроенный: в `data-accent`, `defaultAccent`, `setAccent` и `useTheme`, а образец для переключателей - `--ev-accent-swatch-<имя>`.

```tsx
// lib/accents.ts - без 'use client': его читает серверный layout
import type { AccentPreset } from 'endfield-vision'

export const BRAND: AccentPreset = {
  name: 'brand',
  dark: { accent: '#2dd4bf', text: '#5eead4', strong: '#0f766e', strongHover: '#118479', onStrong: '#ffffff' },
  light: { accent: '#0d9488', text: '#0f766e', strong: '#0f766e', strongHover: '#0b5f59', onStrong: '#ffffff' },
  slim: { dark: { /* ... */ } }, // по желанию; без него в Slim те же значения
}

// app/layout.tsx
<ThemeScript accents={[BRAND]} defaultAccent="brand" />

// в клиентском коде: тип акцента включает свой пресет
const { accent, setAccent } = useTheme<Accent | 'brand'>()
```

Контраст - на вас, как у встроенных пресетов: `text` к `--ev-surface-1` и `onStrong` к `strong` - не ниже 4.5:1 в каждой теме и стиле. `accentPresetCss()` отдаёт тот же CSS строкой, `AccentStyles` - отдельным `<style>`.

Разовый вариант без пресета - переопределите токены в стилях приложения (вне слоёв они сильнее):

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

- Все стили библиотеки - в каскадных слоях `@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.styles, ev.utilities`. В `ev.styles` - правила компонентов для стилей вроде `slim`. Стили приложения вне слоёв всегда сильнее, специфичность бороться не нужно.
- Классы - `ev-*`, переменные - `--ev-*`: не пересекаются с Tailwind и стилями приложения. С Tailwind v4 порядок задаётся одной строкой до импортов: `@layer theme, base, ev, components, utilities;`.
- Только токены: `endfield-vision/tokens.css` (+ `accents.css`) подключает переменные без компонентов и сброса.

## Правила

- Выпадающий список - `Select`/`MultiSelect`, не `<select>`; подсказка - `Tooltip` (у `IconButton` встроена через `label`), не атрибут `title=`.
- Цвета, отступы, радиусы, тени, слои - только `var(--ev-...)`.
- Пустое значение в таблицах и карточках - `EMPTY_VALUE` (дефис), `DataTable` и `KeyValueList` подставляют его сами.
- Карточки, панели, плитки, таблицы - без рамки: их отделяет поверхность, в светлой теме ещё `--ev-shadow-card`. Блок внутри карточки, окна или шторки - на `--ev-surface-nested`. Рамка - у полей ввода и контролов.
- Акцент тона на панели - **уголки видоискателя**, а не цветная полоса по краю: `<div className="ev-corners" data-corners="diagonal" data-tone="warning">`. Варианты `data-corners`: без значения (уголок сверху слева), `diagonal`, `frame` (четыре уголка), `off`. Размер, толщина и отступ - токены `--ev-corner-size`, `--ev-corner-width`, `--ev-corner-inset`, цвет - тон элемента или `--ev-corner-color`. Стиль `slim` уголки скрывает, поэтому выделяйте элемент ещё и тоном фона.
- Выбранное и текущее (пункт меню, вкладка, страница, строка, опция) - через токены `--ev-selected-*`, а не напрямую акцентом: в `default` они акцентные, в `slim` - нейтральные.
- `Card flush` - таблица от края до края; остальные прямые дети тела (фильтры, плашки, пагинация) получают отступ карточки сами.

## Токены (главное)

| Группа | Токены |
|---|---|
| Поверхности | `--ev-bg`, `--ev-surface-1` (карточки), `--ev-surface-2` (поповеры, шапка таблицы), `--ev-surface-3` (кнопки), `--ev-surface-nested`, `--ev-surface-input`, `--ev-hover`, `--ev-active`, `--ev-tint-1..4` |
| Тени | `--ev-shadow-card`, `--ev-shadow-sm`, `--ev-shadow`, `--ev-shadow-pop`, `--ev-shadow-modal`, `--ev-shadow-primary` |
| Рамки | `--ev-border-soft`, `--ev-border`, `--ev-border-strong`, `--ev-border-control` (поля, 3:1), `--ev-border-hover` |
| Текст | `--ev-text`, `--ev-text-secondary`, `--ev-text-muted` (>= 4.5:1), `--ev-text-disabled`, `--ev-text-on-accent` |
| Акцент | `--ev-accent`, `--ev-accent-text`, `--ev-accent-strong`, `--ev-accent-soft`, `--ev-accent-edge`, `--ev-accent-rgb`, `--ev-accent-swatch-<пресет>` |
| Выделение | `--ev-selected-bg`, `--ev-selected-bg-subtle`, `--ev-selected-edge`, `--ev-selected-text`, `--ev-selected-indicator` |
| Фокус | `--ev-focus-ring` (кнопки и другие контролы), `--ev-focus-ring-inset` (элементы без рамки: пункты меню, вкладки), `--ev-focus-field` и `--ev-focus-field-invalid` (поля с рамкой; в `slim` рамка только меняет цвет) |
| Семантика | `--ev-success`, `--ev-warning`, `--ev-danger`, `--ev-info`, `--ev-violet` (+ `-soft`, `-edge`, `-strong`) - не зависят от акцента |
| Графики | `--ev-chart-1..8`, `--ev-chart-grid`, `--ev-chart-axis` |
| Геометрия | `--ev-radius-xs..xl`, `--ev-space-0..11` (2..56px), `--ev-control-h-sm/-h/-h-lg` (28/34/40) |
| Типографика | `--ev-fs-2xs..3xl` (11..30px, база 14px), `--ev-fw-*`, `--ev-fw-title`, `--ev-lh`; подписи разделов: `--ev-caps-transform`, `--ev-caps-size`, `--ev-caps-weight`, `--ev-tracking-caps` |
| Слои | `--ev-z-sticky` < `--ev-z-topbar` < `--ev-z-drawer` < `--ev-z-modal` < `--ev-z-dropdown` < `--ev-z-toast` < `--ev-z-tooltip` |
| Движение | `--ev-dur-fast/-dur/-dur-slow`, `--ev-ease`, `--ev-ease-out`; `prefers-reduced-motion` учтён глобально |

Тон компонента (`Badge`, `StatusPill`, `Callout`, `StatTile`, `Avatar`, `Progress`) - проп `tone`: `neutral | accent | success | warning | danger | info | violet`.

## Компоненты

- **Действия:** `Button` (`primary | secondary | ghost | danger | danger-ghost | link`, `sm | md | lg`, `loading`, `icon`, `iconRight`, `block`), `LinkButton`, `IconButton` (обязательный `label` = aria-label + подсказка), `Menu`, `Popover`.
- **Формы:** `Field` (подпись, подсказка, ошибка; сам связывает `id`, `aria-invalid`, `aria-describedby`; `span="full"` - строка секции целиком), `FormSection` (`columns`, `minColumn`; `FormSection.Row` - не-поле на всю строку), `Input`, `SearchInput`, `PasswordInput`, `Textarea` (`autoResize`), `NumberInput` (`min/max/step`, `decimals`, `unit`, `stepper`), `MoneyInput` (значение в копейках), `PhoneInput` (22 страны с выбором из списка, распознавание кода при вставке, E.164), `SnilsInput`, `PlateInput`, `DigitsInput`, `MaskedDigitsInput`, `TimeInput` (`ЧЧ:ММ`, `min/max`), `ColorField`. `width` у `Input`, `NumberInput`, `MoneyInput`, `Select` и `Slider`: `xs | sm | md | lg` (токены `--ev-control-w-*`: короткое число, сумма, дата, текст), px или CSS-длина; без него поле на всю ширину.
- **Выбор:** `Select` (поиск при > 7 опций, группы, `clearable`, серверный поиск `onSearch`, `defaultOpen` - раскрыть при монтировании), `MultiSelect`, `DateField` (`YYYY-MM-DD`), `DateRangePicker`, `Calendar`, `Checkbox` (`indeterminate`), `Switch`, `RadioGroup` (`variant="card"`), `SegmentedControl` (`value={null}` - ещё не выбрано, по Tab доступен; `variant="plain"` - без рамки, выбранный - тонированной плашкой, как у вкладок-плашек; не влезшие сегменты прокручиваются внутри: затухающий край и стрелка до следующего, колёсико мыши тоже прокручивает), `Tabs` (кнопки или ссылки `href`; не влезшие вкладки - затухающий край со стрелкой прокрутки, выбранная прокручивается в вид), `TabPanel`.
- **Данные:** `DataTable` (колонки конфигом, сортировка, выбор строк, `loading`, `fetching`, `error` + `onRetry`, `empty`, `maxHeight`, на узком экране - карточки; у строки - `rowTone`, `rowAttributes` (свои `data-*` и `aria-*`, например для `ContextMenuProvider`), `rowClassName`, `rowMuted`; раскрывающиеся строки `renderExpanded` с `expanded` / `onExpandedChange`; итоговая строка из `footerCell` колонок; `stickyHeader` - шапка липнет к верху страницы без `maxHeight`), `Pagination` и `FilterBar` (`size` - для плотной строки), `KeyValueList`, `StatTile`, `Badge`, `StatusPill`, `Avatar` (инициалы или фото), `Progress` (в том числе перерасход), `Timeline` (лента событий, будущие шаги, «показать ещё»), `UptimeBar` (доступность по дням с подсказками), `CopyButton`, `CopyValue`.
- **Графики:** `BarChart` (рядом или `stacked`), `LineChart`, `AreaChart`, `Sparkline`, `DonutChart` (доли, «Прочее», легенда), `Heatmap` (календарь активности) и `HeatmapMatrix` (матрица «строка x столбец»), `RingProgress` (кольцо, секции, перерасход), `Gauge` (шкала-полукруг с зонами). Подсказка по наведению и стрелками, легенда при 2+ сериях, скрытая таблица для скринридера.
- **Состояния и окна:** `Callout`, `EmptyState`, `ErrorState`, `Skeleton`, `SkeletonText`, `Spinner`, `LoadingBlock`, `Modal` (`submitOnEnter` - Enter нажимает главную кнопку подвала), `useModals()` (`open`, `confirm` - у `danger` фокус сначала на «Отмена», `alert`, `prompt` - окно с полем ввода и проверкой), `Drawer` (`modal={false}` - без подложки, страница под панелью работает; `onInteractOutside`), `toast.*` / `useToast()` (вызов и вне React; `onClick` - клик по всей карточке), `FileDrop`.
- **Навигация и структура:** `CommandPalette` (Ctrl+K, группы, поиск по словам; поиск с сервера: `query` / `onQueryChange`, `loading`, `alwaysShow` у пунктов или `filter={false}`, `highlight`), `Steps` (шаги мастера, горизонтально и вертикально), `Accordion` и `Disclosure`, `TreeView` (выбор одного или нескольких с частичным состоянием, клавиатура WAI-ARIA, обрезанная подпись целиком - в подсказке).
- **Ввод (дополнительно):** `Slider` (значение и диапазон, метки), `TagInput` (метки, подсказки, лимит, проверка), `Autocomplete` (свободный ввод с подсказками: подсказка только подставляет текст), `Chip` и `ChipGroup` (фильтры и метки), `OtpInput` (код подтверждения, вставка целиком), `InlineEdit` (правка на месте с асинхронным сохранением).
- **Контент:** `Banner` (объявление на всю ширину, скрытие запоминается), `CodeBlock` и `InlineCode` (номера строк, подсветка строк и синтаксиса без зависимостей, сворачивание), `Highlight` (совпадения поиска, ё = е), `RelativeTime` («5 минут назад» на обоих языках), `ExpandableText` («Показать полностью»).
- **Каркас:** `AppShell` (слот `statusBar`, его высота - токен `--ev-statusbar-h`, а `--ev-shell-statusbar-h` без строки состояния равен 0; `fill` или `AppShellFill` вокруг одной страницы - содержимое ровно между шапкой и строкой состояния, последний ребёнок прокручивается сам: чат, редактор), `Topbar`, `Sidebar`, `SidebarSection`, `SidebarItem`, `SidebarCollapseButton`, `useAppShell()`, `PageHeader`, `Breadcrumbs`, `SectionTitle` (без отступа сверху первым в контейнере или с `flush`), `Card`, `Panel`, `Divider`, `Kbd`, `StatusBar` (`StatusBarItem`, `StatusBarClock`), `WorkspaceSwitcher`, `ScreenOverlay` (техработы, новая версия), `ContextMenu` и `ContextMenuProvider` (правый клик, реестр по `data-ctx-kind`).
- **CRM - карточка записи:** `RecordHeader` (шапка: аватар, идентификаторы с копированием, показатели, действия), `RecordLayout` (основная и боковая колонки; `sidePosition="start"` - боковая слева), `EditablePanel` (секция с режимом правки и асинхронным сохранением), `CompletenessBadge` (что блокирует запись, что просрочено и истекает, что не заполнено; свои `tone` и `label`, бейдж-ссылка `href`), `BadgeStack` и `AvatarGroup` (+N), присутствие у `Avatar` (`status`, `lastSeen`), `missing` у строк `KeyValueList`.
- **CRM - процессы:** `KanbanBoard` и `KanbanCard` (колонки со счётчиками и «показать ещё», перетаскивание и перенос с клавиатуры), `SlaTimer` (прошло / осталось, тоны по порогам, `formatDuration`), `PermissionMatrix` (разделы × роли, режимы, изменения против сохранённого), `SettingsList`, `SettingRow` (`layout="stacked"` - широкий контрол под подписью), `SaveBar`, `useDirtyState`.
- **CRM - коммуникации:** `NotificationCenter` и `NotificationList` (история, прочитано, действия), `toast` с несколькими действиями, `ChatThread` (догрузка ранних сообщений сверху без скачка ленты: `hasMore`, `onLoadMore`; `messageAttributes` - контекстное меню по всему пузырю), `ChatMessage` (статусы вплоть до `read` - прочитано), `Composer` (вложения, вставка скриншотов, перетаскивание), `Lightbox` (изображения и видео), `Thumbnail` и `ThumbnailGrid` (миниатюры с пропорциями, подписью, значком, загрузкой и ошибкой; `kind="video"` - немой первый кадр со значком «Видео»; сетка открывает `Lightbox`, `fill="auto-fit"` - несколько плиток делят всю ширину), `VideoPlayer` (родные элементы управления, ширина по контейнеру, высота не больше 72vh, адрес или blob URL), `ConnectionStatus`.
- **Фильтры в адресе:** `useUrlFilters` - синхронизация с URL и память по области.
- **Язык:** `LocaleProvider`, `useMessages`, `useLocale`, `useNumberFormat`, словари `ru`, `en`.
- **Тема:** `ThemeScript` (`nonce` для CSP, `accents`), `themeBootstrap`, `useTheme`, `setTheme`, `setStyle`, `setAccent`, `ACCENTS`, `STYLES`, `AccentPreset`, `accentPresetCss`, `AccentStyles`.
- **Утилиты:** `cx`, `normalizeSearch`, `formatPhone`, `isCompletePhone`, `normalizePlate`, `normalizeHexColor`, `useMediaQuery`, `useDebouncedValue`, `useControllable`, `LinkProvider`. Классы раскладки: `ev-stack`, `ev-row`, `ev-grid` (`--ev-gap`, `--ev-grid-min`), `ev-mono`, `ev-num`, `ev-muted`, `ev-truncate`, `ev-link`, `ev-visually-hidden`.

## Доработка под себя

Пакет публикует и сборку (`dist/`), и исходники (`src/`). Три уровня настройки:

1. **Токены** - переопределите `--ev-*` в своих стилях: цвета, радиусы, плотность (`--ev-control-h`), шрифты.
2. **Стили компонентов** - классы `ev-*` и data-атрибуты (`data-variant`, `data-size`, `data-tone`) стабильны; ваши правила вне слоёв перекрывают библиотеку.
3. **Код** - скопируйте нужный компонент из `node_modules/endfield-vision/src/components` в проект и правьте как свой.

## Лицензия

[MIT](LICENSE)
