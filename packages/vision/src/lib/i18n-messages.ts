/*
 * Словари встроенных текстов библиотеки: подписи кнопок, aria-label,
 * пустые состояния, названия месяцев. Модуль без 'use client' - чистые данные.
 * Приложение выбирает язык через <LocaleProvider locale="en"> и может
 * переопределить отдельные строки (messages={{ table: { empty: '...' } }}).
 */

export type Locale = 'ru' | 'en'

export interface Messages {
  locale: Locale
  /** Локаль Intl для чисел (разделители разрядов и дробной части). */
  intl: string
  common: {
    close: string
    cancel: string
    confirm: string
    ok: string
    clear: string
    apply: string
    reset: string
    retry: string
    search: string
    loading: string
    inProgress: string
    nothingFound: string
  }
  shell: {
    skipToContent: string
    menu: string
    openMenu: string
    navigation: string
    collapse: string
    expand: string
  }
  breadcrumbs: string
  errorState: { title: string }
  calendar: {
    prevYear: string
    nextYear: string
    prevYears: string
    nextYears: string
    prevMonth: string
    nextMonth: string
    months: readonly string[]
    monthsShort: readonly string[]
    /** С понедельника. */
    weekdaysShort: readonly string[]
  }
  date: {
    placeholder: string
    openCalendar: string
    dialog: string
    today: string
    rangePlaceholder: string
    rangeDialog: string
    presets: string
    rangeStart: string
    rangeEnd: string
    presetLabels: {
      today: string
      last7: string
      last30: string
      thisMonth: string
      lastMonth: string
      thisYear: string
    }
  }
  color: {
    name: string
    palette: (name: string) => string
    pickFromPalette: (name: string) => string
    mixed: string
    formatHint: string
    paletteGroup: string
  }
  table: {
    empty: string
    selectAllOnPage: string
    selectRow: string
    selectAllRows: string
  }
  pagination: {
    noRecords: string
    range: (from: string, to: string, total: string) => string
    rows: string
    rowsPerPage: string
    pages: string
    first: string
    prev: string
    next: string
    last: string
    page: (n: number) => string
  }
  filters: { filters: string }
  input: {
    showPassword: string
    hidePassword: string
    decrease: string
    increase: string
  }
  phone: {
    countryCode: string
    countryCodeValue: (dial: string) => string
    countries: { RU: string; UZ: string; TJ: string }
  }
  modal: { actionFailed: string }
  select: {
    placeholder: string
    multiPlaceholder: string
    clearSelection: string
    selectAll: string
  }
  toast: {
    dismiss: string
    more: (n: number) => string
    dismissAll: string
  }
  copy: {
    copy: string
    copied: string
    failed: string
    open: string
  }
  file: {
    units: { b: string; kb: string; mb: string }
    dropTitle: string
    wrongType: (name: string) => string
    tooBig: (name: string, size: string) => string
    remove: string
  }
  charts: {
    period: string
    empty: string
  }
}

export const ru: Messages = {
  locale: 'ru',
  intl: 'ru-RU',
  common: {
    close: 'Закрыть',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    ok: 'Понятно',
    clear: 'Очистить',
    apply: 'Применить',
    reset: 'Сбросить',
    retry: 'Повторить',
    search: 'Поиск',
    loading: 'Загрузка',
    inProgress: 'Выполняется',
    nothingFound: 'Ничего не найдено',
  },
  shell: {
    skipToContent: 'Перейти к содержимому',
    menu: 'Меню',
    openMenu: 'Открыть меню',
    navigation: 'Разделы',
    collapse: 'Свернуть меню',
    expand: 'Развернуть меню',
  },
  breadcrumbs: 'Навигационная цепочка',
  errorState: { title: 'Не удалось загрузить данные' },
  calendar: {
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    prevYears: 'Предыдущие годы',
    nextYears: 'Следующие годы',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
  date: {
    placeholder: 'дд.мм.гггг',
    openCalendar: 'Открыть календарь',
    dialog: 'Выбор даты',
    today: 'Сегодня',
    rangePlaceholder: 'Весь период',
    rangeDialog: 'Выбор периода',
    presets: 'Готовые периоды',
    rangeStart: 'Начало периода',
    rangeEnd: 'Конец периода',
    presetLabels: {
      today: 'Сегодня',
      last7: 'Последние 7 дней',
      last30: 'Последние 30 дней',
      thisMonth: 'Этот месяц',
      lastMonth: 'Прошлый месяц',
      thisYear: 'Этот год',
    },
  },
  color: {
    name: 'Цвет',
    palette: (name) => `${name}: палитра`,
    pickFromPalette: (name) => `${name}: выбрать из палитры`,
    mixed: 'Разные',
    formatHint: 'Цвет в формате #RRGGBB, например #1A2B3C',
    paletteGroup: 'Палитра цветов',
  },
  table: {
    empty: 'Записей нет',
    selectAllOnPage: 'Выбрать все на странице',
    selectRow: 'Выбрать строку',
    selectAllRows: 'Выбрать все строки на странице',
  },
  pagination: {
    noRecords: 'Нет записей',
    range: (from, to, total) => `${from}-${to} из ${total}`,
    rows: 'Строк',
    rowsPerPage: 'Строк на странице',
    pages: 'Страницы',
    first: 'Первая страница',
    prev: 'Предыдущая страница',
    next: 'Следующая страница',
    last: 'Последняя страница',
    page: (n) => `Страница ${n}`,
  },
  filters: { filters: 'Фильтры' },
  input: {
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    decrease: 'Уменьшить',
    increase: 'Увеличить',
  },
  phone: {
    countryCode: 'Код страны',
    countryCodeValue: (dial) => `Код страны: +${dial}`,
    countries: { RU: 'Россия', UZ: 'Узбекистан', TJ: 'Таджикистан' },
  },
  modal: { actionFailed: 'Не удалось выполнить действие' },
  select: {
    placeholder: 'Выберите',
    multiPlaceholder: 'Не выбрано',
    clearSelection: 'Очистить выбор',
    selectAll: 'Выбрать все',
  },
  toast: {
    dismiss: 'Закрыть уведомление',
    more: (n) => `И ещё ${n}`,
    dismissAll: 'Убрать все',
  },
  copy: {
    copy: 'Скопировать',
    copied: 'Скопировано',
    failed: 'Не удалось скопировать',
    open: 'Открыть',
  },
  file: {
    units: { b: 'Б', kb: 'КБ', mb: 'МБ' },
    dropTitle: 'Перетащите файл сюда или выберите на компьютере',
    wrongType: (name) => `Файл «${name}» не подходит по типу`,
    tooBig: (name, size) => `Файл «${name}» больше ${size}`,
    remove: 'Убрать файл',
  },
  charts: {
    period: 'Период',
    empty: 'Нет данных за период',
  },
}

export const en: Messages = {
  locale: 'en',
  intl: 'en-US',
  common: {
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    ok: 'OK',
    clear: 'Clear',
    apply: 'Apply',
    reset: 'Reset',
    retry: 'Try again',
    search: 'Search',
    loading: 'Loading',
    inProgress: 'In progress',
    nothingFound: 'No matches',
  },
  shell: {
    skipToContent: 'Skip to content',
    menu: 'Menu',
    openMenu: 'Open menu',
    navigation: 'Main navigation',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
  },
  breadcrumbs: 'Breadcrumb',
  errorState: { title: 'Couldn’t load data' },
  calendar: {
    prevYear: 'Previous year',
    nextYear: 'Next year',
    prevYears: 'Previous years',
    nextYears: 'Next years',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdaysShort: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  },
  date: {
    placeholder: 'dd.mm.yyyy',
    openCalendar: 'Open calendar',
    dialog: 'Choose a date',
    today: 'Today',
    rangePlaceholder: 'All time',
    rangeDialog: 'Choose a period',
    presets: 'Quick ranges',
    rangeStart: 'Start date',
    rangeEnd: 'End date',
    presetLabels: {
      today: 'Today',
      last7: 'Last 7 days',
      last30: 'Last 30 days',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      thisYear: 'This year',
    },
  },
  color: {
    name: 'Color',
    palette: (name) => `${name}: palette`,
    pickFromPalette: (name) => `${name}: choose from palette`,
    mixed: 'Mixed',
    formatHint: 'Use the #RRGGBB format, for example #1A2B3C',
    paletteGroup: 'Color palette',
  },
  table: {
    empty: 'No records',
    selectAllOnPage: 'Select all on this page',
    selectRow: 'Select row',
    selectAllRows: 'Select all rows on this page',
  },
  pagination: {
    noRecords: 'No records',
    range: (from, to, total) => `${from}-${to} of ${total}`,
    rows: 'Rows',
    rowsPerPage: 'Rows per page',
    pages: 'Pagination',
    first: 'First page',
    prev: 'Previous page',
    next: 'Next page',
    last: 'Last page',
    page: (n) => `Page ${n}`,
  },
  filters: { filters: 'Filters' },
  input: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    decrease: 'Decrease',
    increase: 'Increase',
  },
  phone: {
    countryCode: 'Country code',
    countryCodeValue: (dial) => `Country code: +${dial}`,
    countries: { RU: 'Russia', UZ: 'Uzbekistan', TJ: 'Tajikistan' },
  },
  modal: { actionFailed: 'The action failed' },
  select: {
    placeholder: 'Select',
    multiPlaceholder: 'None selected',
    clearSelection: 'Clear selection',
    selectAll: 'Select all',
  },
  toast: {
    dismiss: 'Dismiss notification',
    more: (n) => `${n} more`,
    dismissAll: 'Dismiss all',
  },
  copy: {
    copy: 'Copy',
    copied: 'Copied',
    failed: 'Couldn’t copy',
    open: 'Open',
  },
  file: {
    units: { b: 'B', kb: 'KB', mb: 'MB' },
    dropTitle: 'Drop a file here or browse your computer',
    wrongType: (name) => `“${name}” is not a supported file type`,
    tooBig: (name, size) => `“${name}” is larger than ${size}`,
    remove: 'Remove file',
  },
  charts: {
    period: 'Period',
    empty: 'No data for this period',
  },
}

export const MESSAGES: Record<Locale, Messages> = { ru, en }

/** Частичное переопределение словаря: любые ветки и строки. */
export type MessagesOverride = {
  [K in keyof Messages]?: Messages[K] extends readonly unknown[] | string | ((...args: never[]) => unknown)
    ? Messages[K]
    : Messages[K] extends object
      ? Partial<Messages[K]>
      : Messages[K]
}

/** Словарь языка с переопределениями (слияние на два уровня). */
export function resolveMessages(locale: Locale, override?: MessagesOverride): Messages {
  const base = MESSAGES[locale]
  if (!override) return base
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(override)) {
    const b = (base as unknown as Record<string, unknown>)[k]
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)
        ? { ...(b as object), ...(v as object) }
        : v
  }
  return out as unknown as Messages
}
