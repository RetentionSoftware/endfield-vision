import type { Messages } from './i18n-messages'

/*
 * Файлы: подпись размера и проверка по accept. Общие для FileDrop и Composer.
 * Без 'use client': пригоден для серверных компонентов.
 */

/** Размер файла с единицами текущего языка: «512 Б», «12 КБ», «3,4 МБ». */
export function formatSize(bytes: number, t: Pick<Messages, 'intl' | 'file'>): string {
  const { b, kb, mb } = t.file.units
  if (bytes < 1024) return `${bytes} ${b}`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString(t.intl)} ${kb}`
  return `${(bytes / 1024 / 1024).toLocaleString(t.intl, { maximumFractionDigits: 1 })} ${mb}`
}

/** Подходит ли файл под accept ('image/*', '.pdf', 'application/json'); пустой accept - любой. */
export function acceptMatches(file: Pick<File, 'name' | 'type'>, accept?: string): boolean {
  if (!accept) return true
  const rules = accept
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some((r) => {
    if (r.startsWith('.')) return name.endsWith(r)
    if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1))
    return type === r
  })
}
