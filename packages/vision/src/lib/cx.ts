/** Склейка классов: ложные значения отбрасываются. */
export function cx(...parts: Array<string | false | null | undefined | 0>): string {
  let out = ''
  for (const p of parts) {
    if (!p) continue
    out = out ? `${out} ${p}` : p
  }
  return out
}

/** Пустое значение в таблицах и списках. Одна константа на всё приложение. */
export const EMPTY_VALUE = '-'

/** Поиск без учёта регистра и «ё/е». */
export function normalizeSearch(s: string): string {
  return s.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}
