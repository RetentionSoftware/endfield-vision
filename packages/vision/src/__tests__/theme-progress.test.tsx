import { renderToString } from 'react-dom/server'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ACCENTS, Progress, themeBootstrap, ThemeScript } from '../index'

/*
 * Скрипт темы выполняется в песочнице с поддельными document, localStorage
 * и matchMedia: проверяем атрибуты <html>, которые он ставит до отрисовки.
 */
function runBootstrap(code: string, stored: Record<string, string>, prefersLight = false) {
  const dataset: Record<string, string> = {}
  runInNewContext(code, {
    document: { documentElement: { dataset } },
    localStorage: { getItem: (k: string) => stored[k] ?? null },
    matchMedia: () => ({ matches: prefersLight }),
  })
  return dataset
}

describe('тема', () => {
  it('по умолчанию - тёмная тема без атрибута акцента', () => {
    const ds = runBootstrap(themeBootstrap(), {})
    expect(ds.theme).toBe('dark')
    expect(ds.themePref).toBe('dark')
    expect(ds.accent).toBeUndefined()
  })

  it('сохранённый выбор: светлая тема и акцент', () => {
    const ds = runBootstrap(themeBootstrap(), { 'ev-theme': 'light', 'ev-accent': 'amber' })
    expect(ds.theme).toBe('light')
    expect(ds.accent).toBe('amber')
  })

  it('system - по настройке ОС, выбор запоминается как system', () => {
    const ds = runBootstrap(themeBootstrap({ defaultTheme: 'system' }), {}, true)
    expect(ds.theme).toBe('light')
    expect(ds.themePref).toBe('system')
  })

  it('свои ключи хранилища', () => {
    const ds = runBootstrap(themeBootstrap({ themeKey: 'my-theme' }), { 'my-theme': 'light', 'ev-theme': 'dark' })
    expect(ds.theme).toBe('light')
  })

  it('ThemeScript рендерит inline-скрипт, пресеты акцента перечислены', () => {
    expect(renderToString(<ThemeScript />)).toContain('<script>')
    expect(ACCENTS).toContain('indigo')
    expect(ACCENTS).toContain('amber')
  })
})

describe('Progress', () => {
  it('роль progressbar, границы значения и подпись', () => {
    const out = renderToString(<Progress label="Загрузка" value={150} showValue />)
    expect(out).toContain('role="progressbar"')
    expect(out).toContain('aria-valuenow="100"')
    expect(out).toContain('aria-valuemax="100"')
    expect(out).toContain('100%')
    expect(out).toContain('aria-labelledby=')
  })

  it('неопределённый прогресс: без aria-valuenow', () => {
    const out = renderToString(<Progress value={null} aria-label="Синхронизация" />)
    expect(out).toContain('data-indeterminate="true"')
    expect(out).not.toContain('aria-valuenow')
    expect(out).toContain('aria-label="Синхронизация"')
  })

  it('свой формат значения', () => {
    const out = renderToString(<Progress value={3} max={8} showValue={(v, m) => `${v} из ${m}`} aria-label="Шаги" />)
    expect(out).toContain('3 из 8')
    expect(out).toContain('width:37.5%')
  })
})
