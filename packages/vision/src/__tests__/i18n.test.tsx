import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppShell, en, LocaleProvider, Pagination, resolveMessages, ru, Sidebar, StatTile, Topbar } from '../index'

/** Все ключи словаря с путями: ветки, массивы и функции сравниваются по форме. */
function shape(obj: unknown, path = ''): string[] {
  if (typeof obj === 'function') return [`${path}()`]
  if (Array.isArray(obj)) return [`${path}[${obj.length}]`]
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
  return [path]
}

describe('словари', () => {
  it('ru и en совпадают по ключам, длине массивов и функциям', () => {
    expect(shape(en).sort()).toEqual(shape(ru).sort())
  })

  it('нет пустых строк', () => {
    for (const dict of [ru, en]) {
      const empty = shape(dict).filter((p) => {
        const v = p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict)
        return typeof v === 'string' && v.trim() === ''
      })
      expect(empty).toEqual([])
    }
  })

  it('переопределение сливается с базовым словарём', () => {
    const m = resolveMessages('en', { table: { empty: 'Nothing here yet' } })
    expect(m.table.empty).toBe('Nothing here yet')
    expect(m.table.selectRow).toBe(en.table.selectRow)
    expect(m.common).toBe(en.common)
  })
})

describe('язык компонентов', () => {
  const shell = (
    <AppShell sidebar={<Sidebar>{null}</Sidebar>} topbar={<Topbar />}>
      <p>x</p>
    </AppShell>
  )

  it('без провайдера - английский', () => {
    const out = renderToString(shell)
    expect(out).toContain('Skip to content')
    expect(out).toContain('aria-label="Main navigation"')
  })

  it('русский через LocaleProvider', () => {
    const out = renderToString(<LocaleProvider locale="ru">{shell}</LocaleProvider>)
    expect(out).toContain('Перейти к содержимому')
  })

  it('числа по языку: разделитель разрядов и дробной части', () => {
    const pag = (locale: 'ru' | 'en') =>
      renderToString(
        <LocaleProvider locale={locale}>
          <Pagination page={2} pageSize={1000} total={12345} onPageChange={() => undefined} />
        </LocaleProvider>,
      ).replace(/<!-- -->/g, '')
    expect(pag('en')).toContain('1,001-2,000 of 12,345')
    expect(pag('ru')).toMatch(/1\s001-2\s000 из 12\s345/)

    const tile = renderToString(
      <LocaleProvider locale="ru">
        <StatTile label="x" value="1" delta={4.5} />
      </LocaleProvider>,
    )
    expect(tile).toContain('+4,5%')
  })

  it('вложенный провайдер и свои формулировки', () => {
    const out = renderToString(
      <LocaleProvider locale="ru">
        <LocaleProvider locale="en" messages={{ shell: { skipToContent: 'Jump to main' } }}>
          {shell}
        </LocaleProvider>
      </LocaleProvider>,
    )
    expect(out).toContain('Jump to main')
    expect(out).toContain('aria-label="Main navigation"')
  })
})
