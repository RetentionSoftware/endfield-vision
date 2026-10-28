import { ACCENTS, type AccentPreset } from 'endfield-vision'

/*
 * Свой пресет акцента консоли - пример AccentPreset: регистрируется в
 * ThemeScript accents (app/layout.tsx) и дальше работает как встроенный.
 * Модуль без 'use client': его читает серверный layout.
 *
 * Цвета - содержимое примера. Контраст проверен как у встроенных пресетов:
 * text к --ev-surface-1 от 6.2:1, onStrong к strong от 4.99:1 во всех
 * сочетаниях темы и стиля.
 */
export const COPPER: AccentPreset = {
  name: 'copper',
  dark: { accent: '#e8915a', text: '#f0a878', strong: '#b4532a', strongHover: '#a54b25', onStrong: '#ffffff' },
  light: { accent: '#b4532a', text: '#9a4521', strong: '#b4532a', strongHover: '#9e4722', onStrong: '#ffffff' },
  // Slim, тёмная тема: светлая заливка с тёмным текстом - как у нейтральных пресетов.
  slim: { dark: { accent: '#d99a70', text: '#e3ae8a', strong: '#e3ae8a', strongHover: '#ecbe9e', onStrong: '#181817' } },
}

export type AppAccent = (typeof ACCENTS)[number] | 'copper'

/** Акценты консоли: встроенные и свой. */
export const APP_ACCENTS: readonly AppAccent[] = [...ACCENTS, 'copper']
