import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

/*
 * Подсветка совпадений поиска в тексте. Без хуков и встроенных текстов -
 * годится и для серверных компонентов. Сравнение - как у normalizeSearch
 * (без регистра, ё = е), плюс без диакритики для латиницы (é = e); в выводе
 * остаются исходные символы.
 */

/** Отрезок совпадения в исходной строке: [start, end). */
export interface HighlightRange {
  start: number
  end: number
}

export interface HighlightOptions {
  /** Без учёта регистра (по умолчанию да). */
  ignoreCase?: boolean
}

const MARKS = /\p{M}/gu

/** Свёртка одного символа для сравнения. «й» остаётся «й»: это отдельная буква, не «и» с диакритикой. */
function foldChar(ch: string, ignoreCase: boolean): string {
  const c = ignoreCase ? ch.toLocaleLowerCase('ru-RU') : ch
  if (c === 'й' || c === 'Й') return c
  return c.normalize('NFD').replace(MARKS, '')
}

interface Folded {
  text: string
  /** Для каждой единицы свёрнутой строки - начало и конец исходного символа. */
  from: number[]
  to: number[]
}

function fold(s: string, ignoreCase: boolean): Folded {
  let text = ''
  const from: number[] = []
  const to: number[] = []
  let i = 0
  for (const ch of s) {
    const f = foldChar(ch, ignoreCase)
    const end = i + ch.length
    if (f === '' && to.length > 0) {
      // Отдельный комбинирующий знак (текст в NFD) - часть предыдущего символа.
      to[to.length - 1] = end
    } else {
      for (let k = 0; k < f.length; k++) {
        from.push(i)
        to.push(end)
      }
      text += f
    }
    i = end
  }
  // Знак, прицепленный к символу, удлиняет все единицы этого символа.
  for (let k = to.length - 2; k >= 0; k--) if (from[k] === from[k + 1]) to[k] = to[k + 1]!
  return { text, from, to }
}

/**
 * Отрезки совпадений одного или нескольких запросов. Пересекающиеся и
 * соседние отрезки сливаются; результат отсортирован. Пустые запросы
 * (после обрезки пробелов) пропускаются.
 */
export function highlightRanges(text: string, query: string | readonly string[], options: HighlightOptions = {}): HighlightRange[] {
  const ignoreCase = options.ignoreCase ?? true
  const queries = (typeof query === 'string' ? [query] : query)
    .map((q) => fold(q.trim(), ignoreCase).text)
    .filter((q) => q.length > 0)
  if (queries.length === 0 || text.length === 0) return []
  const src = fold(text, ignoreCase)
  const raw: HighlightRange[] = []
  for (const q of queries) {
    let at = src.text.indexOf(q)
    while (at !== -1) {
      raw.push({ start: src.from[at]!, end: src.to[at + q.length - 1]! })
      at = src.text.indexOf(q, at + 1)
    }
  }
  raw.sort((a, b) => a.start - b.start || a.end - b.end)
  const out: HighlightRange[] = []
  for (const r of raw) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push({ ...r })
  }
  return out
}

export interface HighlightProps extends HighlightOptions {
  text: string
  /** Строка поиска или несколько строк. */
  query: string | readonly string[]
  className?: string
}

/** Текст с подсвеченными совпадениями (<mark>). */
export function Highlight({ text, query, ignoreCase, className }: HighlightProps) {
  const ranges = highlightRanges(text, query, { ignoreCase })
  const parts: ReactNode[] = []
  let pos = 0
  for (const r of ranges) {
    if (r.start > pos) parts.push(text.slice(pos, r.start))
    parts.push(
      <mark key={r.start} className="ev-mark">
        {text.slice(r.start, r.end)}
      </mark>,
    )
    pos = r.end
  }
  if (pos < text.length) parts.push(text.slice(pos))
  return <span className={cx('ev-highlight', className)}>{parts}</span>
}
