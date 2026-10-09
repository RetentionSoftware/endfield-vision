// Числа для бейджей README и витрины: компоненты, хуки, токены, версия, тесты.
// Заодно - версия библиотеки в плейграунде (витрина, экраны входа).
//
//   node scripts/readme-stats.mjs          - пересчитать и записать (тесты прогоняются)
//   node scripts/readme-stats.mjs --check  - сверить без записи, тесты не трогать (для CI)
//
// Компоненты и хуки считаются по экспортам собранного пакета так же, как на витрине
// (apps/playground/components/vision/IntroSection.tsx), поэтому сначала нужен build:lib.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = join(root, 'packages/vision')
const check = process.argv.includes('--check')

const READMES = ['README.md', 'README.ru.md']
const INTRO = 'apps/playground/components/vision/IntroSection.tsx'
const VERSIONED = ['apps/playground/components/vision/parts.tsx', 'apps/playground/app/(auth)/layout.tsx']

const dist = join(pkgDir, 'dist/index.js')
if (!existsSync(dist)) {
  console.error('dist/index.js not found - run `npm run build:lib` first')
  process.exit(1)
}

const lib = await import(pathToFileURL(dist).href)
const exportsList = Object.entries(lib)
const isComponent = ([name, v]) =>
  /^[A-Z][a-z]/.test(name) && (typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v))
const components = exportsList.filter(isComponent).length
const hooks = exportsList.filter(([name, v]) => /^use[A-Z]/.test(name) && typeof v === 'function').length

const css = ['tokens.css', 'accents.css'].map((f) => readFileSync(join(pkgDir, 'src/styles', f), 'utf8')).join('\n')
const tokens = new Set([...css.matchAll(/(--ev-[\w-]+)\s*:/g)].map((m) => m[1])).size

const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version

function countTests() {
  const dir = mkdtempSync(join(tmpdir(), 'ev-stats-'))
  const out = join(dir, 'vitest.json')
  try {
    const vitest = join(root, 'node_modules/vitest/vitest.mjs')
    execFileSync(process.execPath, [vitest, 'run', '--reporter=json', `--outputFile=${out}`], { cwd: pkgDir, stdio: 'ignore' })
    const report = JSON.parse(readFileSync(out, 'utf8'))
    return report.numPassedTests
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const stats = { components, hooks, tokens, version: version.replaceAll('-', '--') }
if (!check) stats.tests = countTests()

// Бейдж shields.io: .../badge/<label>-<value>-<color>
const badge = (label) => new RegExp(`(img\\.shields\\.io/badge/${label}-)([^-?]+(?:--[^-?]+)*)(-)`, 'g')

const stale = []
function update(file, transform) {
  const path = join(root, file)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after === before) return
  if (check) stale.push(file)
  else writeFileSync(path, after)
}

for (const file of READMES) {
  update(file, (text) => {
    let next = text
    for (const [label, value] of Object.entries(stats)) {
      if (!badge(label).test(next)) throw new Error(`${file}: badge "${label}" not found`)
      next = next.replace(badge(label), `$1${value}$3`)
    }
    return next
  })
}
update(INTRO, (text) => text.replace(/(const TOKENS_COUNT = )\d+/, `$1${tokens}`))
// Версия на витрине и на экранах входа плейграунда - из package.json библиотеки.
for (const file of VERSIONED) update(file, (text) => text.replace(/((?:LIBRARY_)?VERSION = ')[^']+(')/, `$1${version}$2`))

console.log(Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', '))
if (stale.length) {
  console.error(`Out of date: ${stale.join(', ')} - run \`npm run stats\``)
  process.exit(1)
}
