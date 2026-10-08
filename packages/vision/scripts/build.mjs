// Сборка пакета: tsc (ESM + .d.ts, директивы 'use client' сохраняются в каждом файле),
// затем полные пути импортов (./Button -> ./Button.js) и копия стилей.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(pkgDir, 'dist')
const require = createRequire(import.meta.url)

rmSync(dist, { recursive: true, force: true })

execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', join(pkgDir, 'tsconfig.build.json')], {
  stdio: 'inherit',
})

// Относительные импорты без расширения -> с .js (или /index.js для каталога): Node ESM и любые бандлеры.
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.\.?\/[^'"]+)\2/g

function fullPath(fromFile, spec) {
  if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return spec
  const base = resolve(dirname(fromFile), spec)
  if (existsSync(`${base}.js`)) return `${spec}.js`
  if (existsSync(join(base, 'index.js'))) return `${spec}/index.js`
  throw new Error(`Не найден модуль ${spec} для ${fromFile}`)
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|d\.ts)$/.test(name)) {
      const src = readFileSync(p, 'utf8')
      const out = src.replace(SPECIFIER, (_m, kw, q, spec) => `${kw}${q}${fullPath(p, spec)}${q}`)
      if (out !== src) writeFileSync(p, out)
    }
  }
}

walk(dist)
cpSync(join(pkgDir, 'src', 'styles'), join(dist, 'styles'), { recursive: true })
console.log('endfield-vision: dist готов')
