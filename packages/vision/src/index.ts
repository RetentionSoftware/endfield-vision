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
  PHONE_COUNTRY_CODES,
  formatByMask,
  phoneFieldValue,
  PLATE_RE,
  splitPhone,
  parseTime,
  isValidTime,
  formatTimeDigits,
  timeDigitsToValue,
  timeToDigits,
  type PhoneCountry,
  type PhoneCountryInfo,
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
  type PresenceStatus,
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
export { toast, Toaster, ToastProvider, useToast, type ToastAction, type ToastApi, type ToastOptions, type ToastTone } from './components/Toast'
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

// --- Контент и обратная связь
export { Banner, type BannerProps, type BannerTone } from './components/Banner'
export { CodeBlock, InlineCode, tokenizeCode, type CodeBlockProps, type CodeToken, type CodeTokenType, type InlineCodeProps } from './components/CodeBlock'
export { ExpandableText, type ExpandableTextProps } from './components/ExpandableText'
export { Highlight, highlightRanges, type HighlightOptions, type HighlightProps, type HighlightRange } from './components/Highlight'
export { RelativeTime, type RelativeTimeProps } from './components/RelativeTime'
export { formatRelativeTime, type DateInput } from './lib/relative-time'

// --- Визуализация
export { DonutChart, annularSectorPath, paddedSectorPath, polarPoint, donutArcs, groupSlices, type DonutChartProps, type DonutArc } from './components/charts/DonutChart'
export { Heatmap, HeatmapMatrix, heatLevel, HEAT_LEVELS, isoWeekday, buildCalendarGrid, resolveCalendarRange, type HeatmapProps, type HeatmapMatrixProps, type HeatmapDay, type CalendarGrid, type CalendarMonthLabel, type CalendarRange } from './components/charts/Heatmap'
export { Gauge, gaugeBands, gaugeFraction, gaugeTone, type GaugeProps, type GaugeThreshold, type GaugeBand } from './components/charts/Gauge'
export { RingProgress, ringSegments, type RingProgressProps, type RingSection, type RingSegment } from './components/RingProgress'

// --- Навигация и структура
export { CommandPalette, commandMatches, filterCommands, groupCommands, isCommandHotkey, nextEnabledCommand, type CommandGroup, type CommandItem, type CommandPaletteProps } from './components/CommandPalette'
export { focusStepIndex, resolveStepStatuses, Steps, type StepItem, type StepsProps, type StepStatus } from './components/Steps'
export { Accordion, Disclosure, expandableIds, toggleAccordionValue, type AccordionItem, type AccordionProps, type DisclosureProps } from './components/Accordion'
export { checkedIds, checkedLeafSet, flattenVisibleTree, indexTree, toggleTreeCheck, treeCheckState, TreeView, type FlatTreeNode, type TreeCheckState, type TreeNode, type TreeSelectionMode, type TreeViewProps } from './components/TreeView'

// --- Ввод
export { Slider, type SliderProps, type SliderMark, type SliderRange } from './components/Slider'
export { Chip, ChipGroup, type ChipProps, type ChipGroupProps } from './components/Chip'
export { TagInput, type TagInputProps } from './components/TagInput'
export { OtpInput, type OtpInputProps, type OtpMode } from './components/OtpInput'
export { InlineEdit, type InlineEditProps } from './components/InlineEdit'

// --- Анимация появления
export {
  easeOutCubic,
  formatNumericText,
  MotionProvider,
  parseNumericText,
  useCountUp,
  useEntranceMotion,
  useMotionProgress,
  useMotionSettings,
  useReducedMotion,
  type EntranceMotion,
  type MotionPhase,
  type MotionSettings,
  type NumericText,
} from './lib/motion'
export { AnimatedNumber, AnimatedText, type AnimatedNumberProps } from './components/AnimatedNumber'

// --- CRM: карточка записи
export { EditablePanel, type EditablePanelProps } from './components/EditablePanel'
export { RecordHeader, type RecordHeaderProps, type RecordIdentifier, type RecordStat } from './components/RecordHeader'
export { RecordLayout, type RecordLayoutProps } from './components/RecordLayout'
export {
  CompletenessBadge,
  completenessTone,
  type CompletenessBadgeProps,
  type CompletenessField,
  type CompletenessExpiringItem,
  type CompletenessSeverity,
  type CompletenessTone,
} from './components/CompletenessBadge'
export { BadgeStack, splitOverflow, type BadgeStackItem, type BadgeStackProps } from './components/BadgeStack'
export { AvatarGroup, type AvatarGroupItem, type AvatarGroupProps } from './components/AvatarGroup'

// --- CRM: каркас и взаимодействие
export {
  ContextMenu,
  ContextMenuProvider,
  useContextMenuProvider,
  compactMenuEntries,
  joinMenuSections,
  placeContextMenu,
  isContextMenuKey,
  isEditableTarget,
  findContextTarget,
  type ContextMenuProps,
  type ContextMenuProviderProps,
  type ContextMenuBuilder,
  type ContextMenuItems,
  type ContextMenuTargetInfo,
} from './components/ContextMenu'
export { StatusBar, StatusBarItem, StatusBarSeparator, StatusBarClock, type StatusBarProps, type StatusBarItemProps, type StatusBarClockProps } from './components/StatusBar'
export { WorkspaceSwitcher, filterWorkspaces, type WorkspaceItem, type WorkspaceSwitcherProps } from './components/WorkspaceSwitcher'
export { ScreenOverlay, isBlockingOverlay, type ScreenOverlayProps, type ScreenOverlayVariant } from './components/ScreenOverlay'
export {
  useUrlFilters,
  serializeFilters,
  parseFilters,
  countActiveFilters,
  filterValueEquals,
  hasFilterParams,
  mergeFilterSearch,
  URL_FILTERS_STORAGE_PREFIX,
  type FilterValue,
  type FilterValues,
  type UrlFiltersOptions,
  type UrlFiltersApi,
} from './lib/url-filters'

// --- CRM: рабочие процессы
export { KanbanBoard, KanbanCard, resolveKanbanDrop, type KanbanBoardProps, type KanbanCardProps, type KanbanColumn, type KanbanMoveHandler } from './components/KanbanBoard'
export { formatDuration, SlaTimer, timerTickInterval, timerTone, type FormatDurationOptions, type SlaTimerProps, type TimerKind, type TimerThresholds, type TimerTone } from './components/SlaTimer'
export {
  diffPermissions,
  PermissionMatrix,
  type PermissionChange,
  type PermissionColumn,
  type PermissionMatrixProps,
  type PermissionMode,
  type PermissionModeOption,
  type PermissionRow,
  type PermissionValue,
} from './components/PermissionMatrix'
export {
  isEqualValue,
  SaveBar,
  SettingRow,
  SettingsList,
  SettingsSection,
  useDirtyState,
  type DirtyState,
  type SaveBarProps,
  type SettingControlProps,
  type SettingRowProps,
  type SettingsListProps,
  type SettingsSectionProps,
} from './components/SettingsList'

// --- CRM: коммуникации
export {
  buildChatRows,
  ChatAttachments,
  ChatMessage,
  ChatThread,
  Composer,
  dayKey,
  formatDayLabel,
  groupByDay,
  type ChatAttachment,
  type ChatAttachmentsProps,
  type ChatAuthor,
  type ChatMessageData,
  type ChatMessageProps,
  type ChatMessageStatus,
  type ChatRow,
  type ChatRowsOptions,
  type ChatThreadProps,
  type ComposerPayload,
  type ComposerProps,
  type DayGroup,
  type DayLabelOptions,
} from './components/Chat'
export {
  countUnread,
  groupNotificationsByDay,
  NotificationCenter,
  NotificationList,
  type NotificationAction,
  type NotificationCenterProps,
  type NotificationItem,
  type NotificationListProps,
} from './components/NotificationCenter'
export { Lightbox, type LightboxImage, type LightboxProps } from './components/Lightbox'
export { ConnectionStatus, type ConnectionState, type ConnectionStatusProps } from './components/ConnectionStatus'
