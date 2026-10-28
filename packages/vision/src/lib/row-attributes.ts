/*
 * Свои атрибуты строки от приложения (строка таблицы, сообщение ленты):
 * только data-* и aria-*, для контекстного меню, тестов, аналитики.
 * Без хуков - годится для серверных компонентов.
 */

/** Атрибуты строки от приложения: только data-* и aria-*. */
export type RowAttributes = Partial<Record<`data-${string}` | `aria-${string}`, string | number | boolean | undefined>>

/** Атрибуты строки от приложения: всё, кроме data-* и aria-*, отбрасывается. */
export function pickRowAttributes(attrs: RowAttributes | undefined): RowAttributes {
  const out: RowAttributes = {}
  if (!attrs) return out
  for (const [k, v] of Object.entries(attrs) as [keyof RowAttributes, RowAttributes[keyof RowAttributes]][]) {
    if (v !== undefined && /^(data|aria)-[\w-]+$/.test(k)) out[k] = v
  }
  return out
}
