# endfield-vision

**English** | [Русский](https://github.com/RetentionSoftware/endfield-vision/blob/main/packages/vision/README.ru.md)

A design system for React 19 and Next.js (App Router). Tokens on CSS variables, a dark theme by default plus light and "follow the system", accent presets, and accessible components with no third-party UI kit underneath (the only dependency is `lucide-react` for icons).

The live catalog is the **ENDFIELD Vision** section of the playground in the [repository](https://github.com/RetentionSoftware/endfield-vision) (`npm run dev`, then open `/vision`).

## Installation

```bash
npm i endfield-vision
```

Requires `react` and `react-dom` 19.

## Setup (Next.js App Router)

```tsx
// app/layout.tsx
import 'endfield-vision/styles.css'
import { ThemeScript } from 'endfield-vision'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-jetbrains-mono' })

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript /> {/* theme and accent before the first paint, no flash */}
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

The library does not depend on Next.js: without `LinkProvider` links are plain `<a>` elements, and everything else works in any React app (Vite and others). Components are marked `'use client'` file by file, so you can render them from Server Components, and utilities (`cx`, `formatIsoDate`, masks, `themeBootstrap`) can be imported on the server too.

## Language

Built-in texts (button labels, aria-labels, empty states, pagination, the calendar) ship in English and Russian. Without a provider the library speaks English.

```tsx
import { LocaleProvider } from 'endfield-vision'

<LocaleProvider locale="ru">{children}</LocaleProvider>

// Your own wording on top of the dictionary - any branch, any string:
<LocaleProvider locale="en" messages={{ table: { empty: 'Nothing here yet' }, common: { retry: 'Reload' } }}>
```

- `useMessages()` returns the current dictionary (for your own components in the same style), `useLocale()` returns `'ru' | 'en'`, `useNumberFormat()` formats numbers by the language rules.
- Providers can be nested: part of a page can use another language.
- The dictionaries are exported (`ru`, `en`): use one as the base for a third language, and the `Messages` type will list every key.
- Date fields use `dd.mm.yyyy` in both languages; weeks start on Monday.

Fonts come from the app (`--font-inter`, `--font-jetbrains-mono`); without them the system fonts are used.

## Theme and accent

- `<html data-theme="dark|light">` sets the theme, `<html data-accent="amber|emerald|cyan|rose|violet">` sets the accent preset (no attribute means indigo).
- `ThemeScript` sets both attributes from `localStorage` before rendering. Options: `defaultTheme` (`'dark' | 'light' | 'system'`), `defaultAccent`, `themeKey`, `accentKey`, `nonce` (for CSP).
- In client code: `const { theme, preference, accent, setTheme, setAccent } = useTheme()`.

Your own accent: override the tokens in your app styles (unlayered styles always win):

```css
:root {
  --ev-accent-rgb: 255, 122, 69;
  --ev-accent-text: #ff9a70;
  --ev-accent-strong: #d9480f; /* primary button fill */
  --ev-accent-strong-hover: #e8590c;
  --ev-text-on-accent: #ffffff;
}
```

## Entrance motion

Numbers count up and charts draw themselves the first time an element scrolls into view. Off by default.

```tsx
import { MotionProvider, StatTile, BarChart } from 'endfield-vision'

<MotionProvider>{children}</MotionProvider>                  // for the whole app (duration in ms)
<StatTile label="Stock" value="$12,845,000" animate />        // or for a single component
<BarChart animate={false} ... />                              // the prop wins over the provider
```

- Supported by `StatTile` (the number is found inside the value string and its format is kept), `AnimatedNumber`, `Progress`, `BarChart`, `LineChart`, `AreaChart`, `Sparkline`, `DonutChart`, `Heatmap`, `HeatmapMatrix`, `RingProgress`, `Gauge`, `UptimeBar`. Use `animationDuration` for a custom duration.
- The animation plays once; when data updates, numbers glide to the new value and charts are not redrawn from scratch.
- `prefers-reduced-motion` turns it off. Server markup is the final state, and screen readers always get the final values.
- For your own components: `useEntranceMotion(ref, animate)` (phases `static` / `idle` / `run`, plus a `data-ev-motion` attribute for CSS), `useMotionProgress`, `useCountUp`.

## Layers and prefixes

- All library styles live in cascade layers `@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities`. Your unlayered styles always win, no specificity battles needed.
- Classes use `ev-*` and variables use `--ev-*`, so they never collide with Tailwind or your app styles. With Tailwind v4, set the order with one line before the imports: `@layer theme, base, ev, components, utilities;`.
- Tokens only: `endfield-vision/tokens.css` (+ `accents.css`) brings the variables without components or the reset.

## Rules

- For dropdowns use `Select` / `MultiSelect`, not `<select>`; for hints use `Tooltip` (built into `IconButton` through `label`), not the `title=` attribute.
- Colors, spacing, radii, shadows and layers come only from `var(--ev-...)`.
- An empty value in tables and cards is `EMPTY_VALUE` (a hyphen); `DataTable` and `KeyValueList` insert it themselves.
- Cards, panels, tiles and tables have no border: the surface separates them, plus `--ev-shadow-card` in the light theme. A block inside a card, dialog or drawer sits on `--ev-surface-nested`. Borders belong to inputs and controls.
- To mark a panel's tone, use **viewfinder corners** instead of a colored edge stripe: `<div className="ev-corners" data-corners="diagonal" data-tone="warning">`. `data-corners` variants: no value (top-left corner), `diagonal`, `frame` (all four corners), `off`. Size, width and inset are the `--ev-corner-size`, `--ev-corner-width` and `--ev-corner-inset` tokens; the color is the element tone or `--ev-corner-color`.
- `Card flush` renders a table edge to edge; other direct children of the body (filters, notices, pagination) get the card padding on their own.

## Tokens

| Group | Tokens |
|---|---|
| Surfaces | `--ev-bg`, `--ev-surface-1` (cards), `--ev-surface-2` (popovers, table header), `--ev-surface-3` (buttons), `--ev-surface-nested`, `--ev-surface-input`, `--ev-hover`, `--ev-active`, `--ev-tint-1..4` |
| Shadows | `--ev-shadow-card`, `--ev-shadow-sm`, `--ev-shadow`, `--ev-shadow-pop`, `--ev-shadow-modal`, `--ev-shadow-primary` |
| Borders | `--ev-border-soft`, `--ev-border`, `--ev-border-strong`, `--ev-border-control` (inputs, 3:1), `--ev-border-hover` |
| Text | `--ev-text`, `--ev-text-secondary`, `--ev-text-muted` (>= 4.5:1), `--ev-text-disabled`, `--ev-text-on-accent` |
| Accent | `--ev-accent`, `--ev-accent-text`, `--ev-accent-strong`, `--ev-accent-soft`, `--ev-accent-edge`, `--ev-accent-rgb`, `--ev-accent-swatch-<preset>` |
| Semantic | `--ev-success`, `--ev-warning`, `--ev-danger`, `--ev-info`, `--ev-violet` (+ `-soft`, `-edge`, `-strong`), independent of the accent |
| Charts | `--ev-chart-1..8`, `--ev-chart-grid`, `--ev-chart-axis` |
| Geometry | `--ev-radius-xs..xl`, `--ev-space-0..11` (2..56px), `--ev-control-h-sm/-h/-h-lg` (28/34/40) |
| Typography | `--ev-fs-2xs..3xl` (11..30px, 14px base), `--ev-fw-*`, `--ev-lh` |
| Layers | `--ev-z-sticky` < `--ev-z-topbar` < `--ev-z-drawer` < `--ev-z-modal` < `--ev-z-dropdown` < `--ev-z-toast` < `--ev-z-tooltip` |
| Motion | `--ev-dur-fast/-dur/-dur-slow`, `--ev-ease`, `--ev-ease-out`; `prefers-reduced-motion` is handled globally |

Component tone (`Badge`, `StatusPill`, `Callout`, `StatTile`, `Avatar`, `Progress`) is the `tone` prop: `neutral | accent | success | warning | danger | info | violet`.

## Components

- **Actions:** `Button` (`primary | secondary | ghost | danger | danger-ghost | link`, `sm | md | lg`, `loading`, `icon`, `iconRight`, `block`), `LinkButton`, `IconButton` (required `label` = aria-label + tooltip), `Menu`, `Popover`.
- **Forms:** `Field` (label, hint, error; wires up `id`, `aria-invalid` and `aria-describedby` itself), `FormSection`, `Input`, `SearchInput`, `PasswordInput`, `Textarea` (`autoResize`), `NumberInput` (`min/max/step`, `decimals`, `unit`, `stepper`), `MoneyInput` (value in minor units), `PhoneInput` (22 countries with a picker, country code detection on paste, E.164), `SnilsInput`, `PlateInput`, `DigitsInput`, `MaskedDigitsInput`, `TimeInput` (`HH:MM`, `min/max`), `ColorField`.
- **Choice:** `Select` (search with more than 7 options, groups, `clearable`, server search via `onSearch`), `MultiSelect`, `DateField` (`YYYY-MM-DD`), `DateRangePicker`, `Calendar`, `Checkbox` (`indeterminate`), `Switch`, `RadioGroup` (`variant="card"`), `SegmentedControl`, `Tabs` (buttons or `href` links), `TabPanel`.
- **Data:** `DataTable` (column config, sorting, row selection, `loading`, `fetching`, `error` + `onRetry`, `empty`, `maxHeight`, cards on narrow screens), `Pagination`, `FilterBar`, `KeyValueList`, `StatTile`, `Badge`, `StatusPill`, `Avatar` (initials or photo), `Progress` (including overrun), `Timeline` (event feed, upcoming steps, "show more"), `UptimeBar` (daily availability with tooltips), `CopyButton`, `CopyValue`.
- **Charts:** `BarChart` (grouped or `stacked`), `LineChart`, `AreaChart`, `Sparkline`, `DonutChart` (shares, "Other", legend), `Heatmap` (activity calendar) and `HeatmapMatrix` ("row x column" matrix), `RingProgress` (ring, segments, overrun), `Gauge` (half-circle scale with zones). Tooltips on hover and arrow keys, a legend for 2+ series, a hidden table for screen readers.
- **Feedback and overlays:** `Callout`, `EmptyState`, `ErrorState`, `Skeleton`, `SkeletonText`, `Spinner`, `LoadingBlock`, `Modal`, `useModals()` (`open`, `confirm`, `alert`), `Drawer`, `toast.*` / `useToast()` (callable outside React too), `FileDrop`.
- **Navigation and structure:** `CommandPalette` (Ctrl+K, groups, word search), `Steps` (wizard steps, horizontal and vertical), `Accordion` and `Disclosure`, `TreeView` (single or multiple selection with a partial state, WAI-ARIA keyboard).
- **More inputs:** `Slider` (value and range, marks), `TagInput` (tags, suggestions, limit, validation), `Chip` and `ChipGroup` (filters and tags), `OtpInput` (verification code, paste as a whole), `InlineEdit` (edit in place with async save).
- **Content:** `Banner` (full-width announcement, dismissal is remembered), `CodeBlock` and `InlineCode` (line numbers, line and syntax highlighting with no dependencies, collapsing), `Highlight` (search matches), `RelativeTime` ("5 minutes ago" in both languages), `ExpandableText` ("Show more").
- **App shell:** `AppShell` (`statusBar` slot), `Topbar`, `Sidebar`, `SidebarSection`, `SidebarItem`, `SidebarCollapseButton`, `useAppShell()`, `PageHeader`, `Breadcrumbs`, `SectionTitle`, `Card`, `Panel`, `Divider`, `Kbd`, `StatusBar` (`StatusBarItem`, `StatusBarClock`), `WorkspaceSwitcher`, `ScreenOverlay` (maintenance, new version), `ContextMenu` and `ContextMenuProvider` (right click, registry by `data-ctx-kind`).
- **CRM, record card:** `RecordHeader` (header with avatar, copyable identifiers, metrics, actions), `RecordLayout` (main and side columns), `EditablePanel` (section with an edit mode and async save), `CompletenessBadge` (what is missing and what expires), `BadgeStack` and `AvatarGroup` (+N), presence on `Avatar` (`status`, `lastSeen`), `missing` on `KeyValueList` rows.
- **CRM, workflows:** `KanbanBoard` and `KanbanCard` (columns with counters and "show more", drag and drop plus keyboard moves), `SlaTimer` (elapsed / remaining, tones by threshold, `formatDuration`), `PermissionMatrix` (sections x roles, modes, changes against the saved state), `SettingsList`, `SettingRow`, `SaveBar`, `useDirtyState`.
- **CRM, communication:** `NotificationCenter` and `NotificationList` (history, read state, actions), `toast` with several actions, `ChatThread`, `ChatMessage`, `Composer` (attachments, pasted screenshots, drag and drop), `Lightbox`, `ConnectionStatus`.
- **Filters in the URL:** `useUrlFilters` syncs filters with the address and remembers them per scope.
- **Language:** `LocaleProvider`, `useMessages`, `useLocale`, `useNumberFormat`, dictionaries `ru`, `en`.
- **Theme:** `ThemeScript` (`nonce` for CSP), `themeBootstrap`, `useTheme`, `setTheme`, `setAccent`, `ACCENTS`.
- **Utilities:** `cx`, `normalizeSearch`, `formatPhone`, `isCompletePhone`, `normalizePlate`, `normalizeHexColor`, `useMediaQuery`, `useDebouncedValue`, `useControllable`, `LinkProvider`. Layout classes: `ev-stack`, `ev-row`, `ev-grid` (`--ev-gap`, `--ev-grid-min`), `ev-mono`, `ev-num`, `ev-muted`, `ev-truncate`, `ev-link`, `ev-visually-hidden`.

## Making it yours

The package publishes both the build (`dist/`) and the source (`src/`). Three levels of customization:

1. **Tokens.** Override `--ev-*` in your styles: colors, radii, density (`--ev-control-h`), fonts.
2. **Component styles.** The `ev-*` classes and data attributes (`data-variant`, `data-size`, `data-tone`) are stable; your unlayered rules override the library.
3. **Code.** Copy a component from `node_modules/endfield-vision/src/components` into your project and edit it as your own.

## License

[MIT](LICENSE)
