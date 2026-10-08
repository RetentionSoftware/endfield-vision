'use client'

import { WrapText } from 'lucide-react'
import { useId, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useMessages } from '../lib/i18n'
import { Button, IconButton } from './Button'
import { CopyButton } from './Utility'

/*
 * Блок кода без зависимостей: строки, номера, подсвеченные строки,
 * сворачивание длинного кода, перенос строк, копирование. Раскраска -
 * простой сканер строк, комментариев, чисел и ключевых слов; результат -
 * React-узлы, HTML из кода никогда не вставляется.
 */

export type CodeTokenType = 'plain' | 'comment' | 'string' | 'number' | 'keyword'

export interface CodeToken {
  type: CodeTokenType
  text: string
}

type Family = 'js' | 'json' | 'css' | 'bash' | 'html'

const LANGUAGE_FAMILY: Record<string, Family> = {
  ts: 'js',
  tsx: 'js',
  js: 'js',
  jsx: 'js',
  mjs: 'js',
  cjs: 'js',
  typescript: 'js',
  javascript: 'js',
  json: 'json',
  jsonc: 'json',
  css: 'css',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  html: 'html',
  xml: 'html',
  svg: 'html',
}

/** Семейство языка для раскраски; неизвестный язык - null (простой текст). */
function familyOf(language: string | undefined): Family | null {
  if (!language) return null
  return LANGUAGE_FAMILY[language.toLowerCase()] ?? null
}

const JS_KEYWORDS = new Set(
  (
    'as async await break case catch class const continue debugger default delete do else enum export extends false finally for from ' +
    'function if implements import in instanceof interface let new null of private protected public readonly return satisfies static ' +
    'super switch this throw true try type typeof undefined var void while with yield'
  ).split(' '),
)
const JSON_KEYWORDS = new Set(['true', 'false', 'null'])
const BASH_KEYWORDS = new Set(
  'if then else elif fi for in do done case esac while until function return local export source alias unset readonly'.split(' '),
)

interface Rule {
  type: CodeTokenType | 'ident'
  re: RegExp
}

// Все выражения - «липкие» (y): проверяются строго с текущей позиции.
const STR_DQ = /"(?:[^"\\\n]|\\.)*"?/y
const STR_SQ = /'(?:[^'\\\n]|\\.)*'?/y
const STR_TPL = /`(?:[^`\\]|\\[\s\S])*`?/y
const BLOCK_COMMENT = /\/\*[\s\S]*?(?:\*\/|$)/y
const NUMBER = /(?:0[xX][\da-fA-F_]+|(?:\d[\d_]*\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)n?/y

const RULES: Record<Family, Rule[]> = {
  js: [
    { type: 'comment', re: /\/\/[^\n]*/y },
    { type: 'comment', re: BLOCK_COMMENT },
    { type: 'string', re: STR_DQ },
    { type: 'string', re: STR_SQ },
    { type: 'string', re: STR_TPL },
    { type: 'ident', re: /[A-Za-z_$][\w$]*/y },
    { type: 'number', re: NUMBER },
  ],
  json: [
    { type: 'comment', re: /\/\/[^\n]*/y },
    { type: 'comment', re: BLOCK_COMMENT },
    { type: 'string', re: STR_DQ },
    { type: 'ident', re: /[A-Za-z_$][\w$]*/y },
    { type: 'number', re: /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y },
  ],
  css: [
    { type: 'comment', re: BLOCK_COMMENT },
    { type: 'string', re: STR_DQ },
    { type: 'string', re: STR_SQ },
    { type: 'keyword', re: /@[\w-]+|!important/y },
    { type: 'plain', re: /-{0,2}[A-Za-z_][\w-]*/y },
    { type: 'number', re: /(?:\d+\.?\d*|\.\d+)/y },
  ],
  bash: [
    { type: 'comment', re: /#[^\n]*/y },
    { type: 'string', re: STR_DQ },
    { type: 'string', re: STR_SQ },
    { type: 'ident', re: /[A-Za-z_][\w-]*/y },
    { type: 'plain', re: /-[\w-]+|\$\w+/y },
    { type: 'number', re: /\d+(?:\.\d+)*/y },
  ],
  html: [
    { type: 'comment', re: /<!--[\s\S]*?(?:-->|$)/y },
    { type: 'keyword', re: /<\/?[A-Za-z][\w:.-]*|\/?>/y },
    { type: 'string', re: STR_DQ },
    { type: 'string', re: STR_SQ },
  ],
}

const KEYWORDS: Partial<Record<Family, Set<string>>> = { js: JS_KEYWORDS, json: JSON_KEYWORDS, bash: BASH_KEYWORDS }

/** В bash «#» - комментарий только в начале слова: echo a#b - не комментарий. */
function commentAllowed(family: Family, code: string, pos: number): boolean {
  if (family !== 'bash') return true
  const prev = code[pos - 1]
  return prev === undefined || /\s/.test(prev)
}

/**
 * Разбор кода на токены для раскраски. Неизвестный язык - один простой
 * токен. Склейка всех token.text всегда равна исходному коду.
 */
export function tokenizeCode(code: string, language?: string): CodeToken[] {
  const family = familyOf(language)
  if (!family || code === '') return code === '' ? [] : [{ type: 'plain', text: code }]
  const rules = RULES[family]
  const keywords = KEYWORDS[family]
  const out: CodeToken[] = []
  const push = (type: CodeTokenType, text: string) => {
    const last = out[out.length - 1]
    if (last && last.type === type) last.text += text
    else out.push({ type, text })
  }
  let pos = 0
  while (pos < code.length) {
    let matched = false
    for (const rule of rules) {
      if (rule.type === 'comment' && !commentAllowed(family, code, pos)) continue
      rule.re.lastIndex = pos
      const m = rule.re.exec(code)
      if (!m || m[0].length === 0) continue
      const text = m[0]
      const type: CodeTokenType = rule.type === 'ident' ? (keywords?.has(text) ? 'keyword' : 'plain') : rule.type
      push(type, text)
      pos += text.length
      matched = true
      break
    }
    if (!matched) {
      push('plain', code[pos]!)
      pos += 1
    }
  }
  return out
}

/** Токены по строкам: многострочные строки и комментарии режутся на части. */
function splitLines(tokens: CodeToken[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]]
  for (const tok of tokens) {
    const parts = tok.text.split('\n')
    parts.forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines[lines.length - 1]!.push({ type: tok.type, text: part })
    })
  }
  return lines
}

export interface CodeBlockProps {
  code: string
  /** Язык: подпись в шапке и раскраска (ts, tsx, js, jsx, json, css, bash, html). */
  language?: string
  /** Имя файла или заголовок в шапке; он же - имя области для скринридера. */
  title?: ReactNode
  showLineNumbers?: boolean
  /** Номера подсвеченных строк (с 1). */
  highlightLines?: readonly number[]
  /** Сколько строк показать до разворота; длиннее - свёрнуто с кнопкой «Показать весь код». */
  maxLines?: number
  /** Переносить длинные строки (начальное состояние, если есть переключатель). */
  wrap?: boolean
  /** Кнопка-переключатель переноса строк в шапке. */
  wrapToggle?: boolean
  /** Кнопка копирования (по умолчанию да). */
  copyable?: boolean
  /** Раскраска токенов. По умолчанию - для известных языков. */
  highlight?: boolean
  className?: string
}

/** Блок кода с шапкой: имя файла, язык, перенос строк, копирование. */
export function CodeBlock({
  code,
  language,
  title,
  showLineNumbers = false,
  highlightLines,
  maxLines,
  wrap: wrapProp = false,
  wrapToggle = false,
  copyable = true,
  highlight,
  className,
}: CodeBlockProps) {
  const t = useMessages()
  const titleId = useId()
  const preId = useId()
  const [wrap, setWrap] = useState(wrapProp)
  const [expanded, setExpanded] = useState(false)

  // Один перевод строки в конце (шаблонные строки, файлы) - не пустая строка кода.
  const shown = code.replace(/\r\n?/g, '\n').replace(/\n$/, '')
  const colorize = (highlight ?? true) && familyOf(language) !== null
  const lines = useMemo(
    () => splitLines(colorize ? tokenizeCode(shown, language) : shown ? [{ type: 'plain', text: shown }] : []),
    [shown, language, colorize],
  )
  const marked = useMemo(() => new Set(highlightLines ?? []), [highlightLines])

  const collapsible = maxLines !== undefined && maxLines > 0 && lines.length > maxLines
  const collapsed = collapsible && !expanded
  const visible = collapsed ? lines.slice(0, maxLines) : lines
  const label = title ? undefined : language ? `${t.codeBlock.label}: ${language}` : t.codeBlock.label
  const digits = String(lines.length).length

  return (
    <div
      className={cx('ev-codeblock', className)}
      role="region"
      aria-label={label}
      aria-labelledby={title ? titleId : undefined}
      data-wrap={wrap || undefined}
      data-collapsed={collapsed || undefined}
    >
      <div className="ev-codeblock-head">
        {title ? (
          <span id={titleId} className="ev-codeblock-title">
            {title}
          </span>
        ) : null}
        {language ? <span className="ev-codeblock-lang">{language}</span> : null}
        <span className="ev-codeblock-actions">
          {wrapToggle ? (
            <IconButton size="sm" label={t.codeBlock.wrap} icon={<WrapText size={14} />} pressed={wrap} onClick={() => setWrap((w) => !w)} />
          ) : null}
          {copyable ? <CopyButton text={code} /> : null}
        </span>
      </div>
      <pre id={preId} className="ev-codeblock-pre" tabIndex={0}>
        <code className="ev-codeblock-code" data-language={language} style={showLineNumbers ? ({ '--ev-code-digits': digits } as CSSProperties) : undefined}>
          {visible.map((tokens, i) => {
            const n = i + 1
            const last = i === visible.length - 1
            return (
              <span key={n} className="ev-codeblock-line" data-highlighted={marked.has(n) || undefined}>
                {showLineNumbers ? (
                  <span className="ev-codeblock-ln" aria-hidden="true">
                    {n}
                  </span>
                ) : null}
                <span className="ev-codeblock-text">
                  {tokens.map((tok, k) =>
                    tok.type === 'plain' ? (
                      tok.text
                    ) : (
                      <span key={k} className="ev-code-tok" data-token={tok.type}>
                        {tok.text}
                      </span>
                    ),
                  )}
                  {last ? null : '\n'}
                </span>
              </span>
            )
          })}
        </code>
      </pre>
      {collapsible ? (
        <div className="ev-codeblock-foot">
          <Button variant="link" size="sm" aria-expanded={expanded} aria-controls={preId} onClick={() => setExpanded((v) => !v)}>
            {expanded ? t.codeBlock.collapse : t.codeBlock.expand(lines.length)}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export type InlineCodeProps = HTMLAttributes<HTMLElement>

/** Код внутри текста: имя функции, команда, путь. */
export function InlineCode({ className, ...rest }: InlineCodeProps) {
  return <code className={cx('ev-inline-code', className)} {...rest} />
}
