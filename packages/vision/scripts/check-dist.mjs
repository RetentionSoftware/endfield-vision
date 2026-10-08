// Проверка собранного пакета так, как его увидит потребитель: импорт по имени
// пакета через exports (Node ESM, полные пути), наличие стилей и типов.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))

const lib = await import('endfield-vision')
const required = ['Button', 'DataTable', 'AppShell', 'Progress', 'ThemeScript', 'useTheme', 'toast', 'cx']
const missing = required.filter((n) => !(n in lib))
if (missing.length) throw new Error(`В dist нет экспортов: ${missing.join(', ')}`)

for (const [key, target] of Object.entries(pkg.exports)) {
  const files = typeof target === 'string' ? [target] : Object.values(target)
  for (const f of files) {
    if (!existsSync(join(pkgDir, f))) throw new Error(`exports["${key}"] указывает на несуществующий ${f}`)
  }
}

const client = readFileSync(join(pkgDir, 'dist/components/Button.js'), 'utf8')
if (!client.startsWith("'use client'")) throw new Error("dist/components/Button.js потерял директиву 'use client'")

console.log(`endfield-vision: dist в порядке (${Object.keys(lib).length} экспортов)`)
