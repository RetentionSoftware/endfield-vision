/*
 * Endfield Vision - дизайн-система для React / Next.js: токены (тёмная тема
 * по умолчанию, светлая и пресеты акцента), базовые стили и компоненты.
 * Стили подключаются один раз в корне приложения: import 'endfield-vision/styles.css'.
 */

export { cx, EMPTY_VALUE, normalizeSearch } from './lib/cx'
export {
  useControllable,
  useDebouncedValue,
  useElementWidth,
  useEventCallback,
  useIsoLayoutEffect,
  useMediaQuery,
  useMounted,
  useOutsideClick,
} from './lib/hooks'
export { Portal, useEscapeLayer, useFloating, useFocusTrap, useScrollLock, type Placement } from './lib/overlay'
export {
  ACCENTS,
  ACCENT_STORAGE_KEY,
  THEME_STORAGE_KEY,
  themeBootstrap,
  ThemeScript,
  type Accent,
  type Theme,
  type ThemePreference,
  type ThemeScriptOptions,
  type ThemeScriptProps,
} from './lib/theme-script'
export { setAccent, setTheme, useTheme, type ThemeState } from './lib/theme'
export { LocaleProvider, useLocale, useMessages, useNumberFormat, type LocaleProviderProps } from './lib/i18n'
export { en, MESSAGES, resolveMessages, ru, type Locale, type Messages, type MessagesOverride } from './lib/i18n-messages'
export { LinkProvider, UiLink, useLinkComponent, type LinkComponent } from './lib/link'
export { hexInputState, isHexColor, isLightHex, normalizeHexColor, type HexInputState } from './lib/color'
export {
  addDaysIso,
  dateToIso,
  DEFAULT_RANGE_PRESETS,
  formatIsoDate,
  formatIsoRu,
  parseIso,
  todayIso,
  toIso,
  type DateRange,
  type DateRangePreset,
} from './lib/dates'
export {
  formatPhone,
  formatPhoneNational,
  formatSnils,
  isCompletePhone,
  joinPhone,
  normalizePlate,
  PHONE_COUNTRIES,
  phoneFieldValue,
  PLATE_RE,
  splitPhone,
  parseTime,
  isValidTime,
  formatTimeDigits,
  timeDigitsToValue,
  timeToDigits,
  type PhoneCountry,
} from './lib/masks'

export { Button, IconButton, LinkButton, type ButtonProps, type ButtonSize, type ButtonVariant, type IconButtonProps, type LinkButtonProps } from './components/Button'
export { Spinner, LoadingBlock } from './components/Spinner'
export { Tooltip, type TooltipPlacement, type TooltipProps } from './components/Tooltip'
export { Field, FormSection, useFieldContext, useFieldProps, type FieldProps } from './components/Field'
export {
  Input,
  MoneyInput,
  NumberInput,
  PasswordInput,
  SearchInput,
  Textarea,
  type ControlSize,
  type InputProps,
  type MoneyInputProps,
  type NumberInputProps,
  type SearchInputProps,
  type TextareaProps,
} from './components/Input'
export {
  DigitsInput,
  MaskedDigitsInput,
  PhoneInput,
  PlateInput,
  SnilsInput,
  TimeInput,
  type DigitsInputProps,
  type PhoneInputProps,
  type PlateInputProps,
  type SnilsInputProps,
  type TimeInputProps,
} from './components/MaskedInput'
export { MultiSelect, Select, type MultiSelectProps, type SelectOption, type SelectProps } from './components/Select'
export { Calendar, type CalendarProps } from './components/Calendar'
export { ColorField, type ColorFieldProps, type ColorSwatch } from './components/ColorField'
export { DateField, DateRangePicker, type DateFieldProps, type DateRangePickerProps } from './components/DateField'
export {
  Checkbox,
  RadioGroup,
  SegmentedControl,
  Switch,
  type CheckboxProps,
  type ChoiceOption,
  type RadioGroupProps,
  type SegmentedControlProps,
  type SegmentedOption,
  type SwitchProps,
} from './components/Choice'
export { TabPanel, Tabs, type TabItem, type TabPanelProps, type TabsProps } from './components/Tabs'
export {
  Avatar,
  Badge,
  Callout,
  Card,
  Divider,
  initials,
  Kbd,
  KeyValueList,
  Panel,
  Progress,
  Skeleton,
  SkeletonText,
  StatTile,
  StatusPill,
  type AvatarProps,
  type BadgeProps,
  type CalloutProps,
  type CardProps,
  type KeyValueItem,
  type ProgressProps,
  type StatTileProps,
  type Tone,
} from './components/Display'
export {
  Breadcrumbs,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionTitle,
  type Crumb,
  type EmptyStateProps,
  type ErrorStateProps,
  type PageHeaderProps,
} from './components/Page'
export {
  DataTable,
  FilterBar,
  nextSort,
  Pagination,
  type Column,
  type DataTableProps,
  type FilterBarProps,
  type PaginationProps,
  type SortDir,
  type SortState,
} from './components/DataTable'
export {
  Drawer,
  Modal,
  modals,
  ModalsProvider,
  useModals,
  type AlertOptions,
  type ConfirmOptions,
  type DrawerProps,
  type ModalButton,
  type ModalHandle,
  type ModalOptions,
  type ModalProps,
  type ModalsApi,
  type ModalSize,
} from './components/Modal'
export { toast, Toaster, ToastProvider, useToast, type ToastApi, type ToastOptions, type ToastTone } from './components/Toast'
export { Timeline, type TimelineItem, type TimelineProps } from './components/Timeline'
export { UptimeBar, type UptimeBarProps, type UptimeDay, type UptimeStatus } from './components/UptimeBar'
export { findTypeaheadMatch, Menu, type MenuEntry, type MenuProps } from './components/Menu'
export { Popover, type PopoverProps } from './components/Popover'
export {
  CopyButton,
  copyText,
  CopyValue,
  FileDrop,
  type CopyButtonProps,
  type CopyValueProps,
  type FileDropProps,
} from './components/Utility'
export {
  allIntegerValues,
  AreaChart,
  BarChart,
  LineChart,
  niceScale,
  scaleTicks,
  Sparkline,
  type BarChartProps,
  type ChartSeries,
  type LineChartProps,
  type SparklineProps,
} from './components/charts/Charts'
export {
  AppShell,
  AppShellMenuButton,
  Sidebar,
  SidebarCollapseButton,
  SidebarItem,
  SidebarSection,
  Topbar,
  useAppShell,
  type AppShellProps,
  type SidebarItemProps,
} from './components/AppShell'
