import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACCENTS, STYLES } from '../index'

/*
 * Контраст токенов во всех сочетаниях стиля, темы и акцента (WCAG 2.1).
 * CSS разбирается упрощённо: блоки :root[...] { --ev-x: #hex; } из tokens.css
 * и accents.css, порядок применения - по числу условий в селекторе, затем по месту в файле.
 */

const styles = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles')
const css = ['tokens.css', 'accents.css']
  .map((f) => readFileSync(join(styles, f), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')

interface Block {
  index: number
  req: [string, string][]
  not: string[]
  vars: Record<string, string>
}

const blocks: Block[] = [...css.matchAll(/:root((?:\[[^\]]+\]|:not\(\[[^\]]+\]\))*)\s*\{([^}]*)\}/g)].map((m, index) => ({
  index,
  req: [...m[1]!.replace(/:not\(\[[^\]]+\]\)/g, '').matchAll(/\[data-([\w-]+)='([^']+)'\]/g)].map((x) => [x[1]!, x[2]!]),
  not: [...m[1]!.matchAll(/:not\(\[data-([\w-]+)\]\)/g)].map((x) => x[1]!),
  vars: Object.fromEntries([...m[2]!.matchAll(/(--ev-[\w-]+):\s*([^;]+);/g)].map((x) => [x[1]!, x[2]!.trim()])),
}))

function resolve(attrs: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  blocks
    .filter((b) => b.req.every(([k, v]) => attrs[k] === v) && b.not.every((k) => !attrs[k]))
    .sort((a, b) => a.req.length + a.not.length - (b.req.length + b.not.length) || a.index - b.index)
    .forEach((b) => Object.assign(out, b.vars))
  return out
}

function luminance(hex: string): number {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const combos = STYLES.flatMap((style) =>
  (['dark', 'light'] as const).flatMap((theme) => ACCENTS.map((accent) => ({ style, theme, accent }))),
)

describe('контраст токенов', () => {
  it.each(combos)('$style / $theme / $accent: текст акцента и текст на кнопке', ({ style, theme, accent }) => {
    const v = resolve({
      style: style === 'default' ? undefined : style,
      theme: theme === 'dark' ? undefined : theme,
      accent: accent === 'indigo' ? undefined : accent,
    })
    expect(contrast(v['--ev-accent-text']!, v['--ev-surface-1']!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(v['--ev-text-on-accent']!, v['--ev-accent-strong']!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(STYLES.flatMap((style) => (['dark', 'light'] as const).map((theme) => ({ style, theme }))))(
    '$style / $theme: текст, приглушённый текст и рамка поля',
    ({ style, theme }) => {
      const v = resolve({ style: style === 'default' ? undefined : style, theme: theme === 'dark' ? undefined : theme })
      expect(contrast(v['--ev-text']!, v['--ev-surface-1']!)).toBeGreaterThanOrEqual(7)
      expect(contrast(v['--ev-text-secondary']!, v['--ev-surface-1']!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(v['--ev-text-muted']!, v['--ev-surface-1']!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(v['--ev-border-control']!, v['--ev-surface-input']!)).toBeGreaterThanOrEqual(3)
      expect(contrast(v['--ev-danger-strong']!, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    },
  )
})
