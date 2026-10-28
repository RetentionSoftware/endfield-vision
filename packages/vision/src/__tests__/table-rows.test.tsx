import { describe, expect, it } from 'vitest'
import { DataTable, pickRowAttributes, stickyHeadShift, type Column } from '../components/DataTable'
import { modals } from '../components/Modal'
import { renderRu } from './render-ru'

/* DataTable: свойства строки, раскрытие, итоги, шапка у верха страницы. Серверный рендер (широкий экран). */

type Driver = { id: string; name: string; trips: number; overdue?: boolean }

const ROWS: Driver[] = [
  { id: 'd1', name: 'Иванов', trips: 12, overdue: true },
  { id: 'd 2', name: 'Петров', trips: 5 },
]

const COLUMNS: Column<Driver>[] = [
  { key: 'name', header: 'Водитель', cell: (r) => r.name, primary: true, footerCell: 'Итого' },
  { key: 'trips', header: 'Рейсы', cell: (r) => r.trips, numeric: true, footerCell: (rows) => rows.reduce((s, r) => s + r.trips, 0) },
]

function rowTag(html: string, text: string): string {
  const at = html.indexOf(text)
  const start = html.lastIndexOf('<tr', at)
  return html.slice(start, html.indexOf('>', start) + 1)
}

describe('DataTable: свойства строки', () => {
  it('rowAttributes: data-* и aria-* на <tr>, прочее отбрасывается', () => {
    const out = renderRu(
      <DataTable
        columns={COLUMNS.map((c) => ({ ...c, footerCell: undefined }))}
        rows={ROWS}
        rowKey={(r) => r.id}
        rowAttributes={(r) => ({ 'data-ctx-kind': 'driver', 'data-ctx-id': r.id, 'aria-describedby': undefined })}
      />,
    )
    const tr = rowTag(out, 'Иванов')
    expect(tr).toContain('data-ctx-kind="driver"')
    expect(tr).toContain('data-ctx-id="d1"')
    expect(tr).not.toContain('aria-describedby')
  })

  it('служебные атрибуты таблицы важнее своих', () => {
    const out = renderRu(
      <DataTable
        columns={[COLUMNS[0]!]}
        rows={ROWS}
        rowKey={(r) => r.id}
        selected={['d1']}
        onSelectedChange={() => undefined}
        rowAttributes={() => ({ 'data-selected': 'no' })}
      />,
    )
    expect(rowTag(out, 'Иванов')).toContain('data-selected="true"')
  })

  it('pickRowAttributes пропускает только data-* и aria-*', () => {
    const picked = pickRowAttributes({ 'data-a': '1', 'aria-label': 'x', onclick: 'alert(1)' } as never)
    expect(picked).toEqual({ 'data-a': '1', 'aria-label': 'x' })
  })

  it('rowTone - data-tone, rowClassName - класс строки', () => {
    const out = renderRu(
      <DataTable
        columns={[COLUMNS[0]!]}
        rows={ROWS}
        rowKey={(r) => r.id}
        rowTone={(r) => (r.overdue ? 'danger' : undefined)}
        rowClassName={(r) => (r.overdue ? 'is-overdue' : undefined)}
      />,
    )
    expect(rowTag(out, 'Иванов')).toContain('data-tone="danger"')
    expect(rowTag(out, 'Иванов')).toContain('class="is-overdue"')
    expect(rowTag(out, 'Петров')).not.toContain('data-tone')
    expect(rowTag(out, 'Петров')).not.toContain('class=')
  })
})

describe('DataTable: раскрывающиеся строки', () => {
  const render = (props: { expanded?: string[]; defaultExpanded?: string[]; onRowClick?: () => void }) =>
    renderRu(
      <DataTable
        columns={[COLUMNS[0]!]}
        rows={ROWS}
        rowKey={(r) => r.id}
        renderExpanded={(r) => <p>Рейсы водителя {r.name}</p>}
        rowExpandable={(r) => r.trips > 1}
        {...props}
      />,
    )

  it('свёрнутые: кнопка с aria-expanded=false, клик по строке раскрывает', () => {
    const out = render({})
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('aria-label="Раскрыть строку"')
    expect(out).not.toContain('ev-table-detail-row')
    expect(rowTag(out, 'Иванов')).toContain('data-clickable')
  })

  it('раскрытая строка: содержимое под ней на всю ширину, кнопка ссылается на него', () => {
    const out = render({ defaultExpanded: ['d 2'] })
    expect(out).toContain('aria-expanded="true"')
    expect(out).toContain('aria-label="Свернуть строку"')
    const controls = /aria-controls="([^"]+)"/.exec(out)?.[1]
    expect(controls).toBeTruthy()
    expect(controls).not.toContain(' ')
    expect(out).toMatch(new RegExp(`<tr class="ev-table-detail-row" id="${controls}"><td colSpan="2">`))
    expect(out).toContain('Рейсы водителя <!-- -->Петров')
    expect(out.indexOf('Петров</td>')).toBeLessThan(out.indexOf('ev-table-detail-row'))
  })

  it('управляемое раскрытие и rowExpandable', () => {
    const out = renderRu(
      <DataTable
        columns={[COLUMNS[0]!]}
        rows={[...ROWS, { id: 'd3', name: 'Сидоров', trips: 0 }]}
        rowKey={(r) => r.id}
        renderExpanded={() => 'детали'}
        rowExpandable={(r) => r.trips > 0}
        expanded={['d1']}
        onExpandedChange={() => undefined}
      />,
    )
    expect(rowTag(out, 'Иванов')).toContain('data-expanded="true"')
    expect((out.match(/ev-table-expand-btn/g) ?? []).length).toBe(2)
    expect(rowTag(out, 'Сидоров')).not.toContain('data-clickable')
  })

  it('при onRowClick клик по строке открывает её, а не раскрывает', () => {
    const out = render({ onRowClick: () => undefined })
    expect(rowTag(out, 'Иванов')).toContain('data-clickable')
    expect(out).toContain('ev-table-expand-btn')
  })
})

describe('DataTable: итоговая строка', () => {
  it('footerCell - <tfoot>, функция получает строки', () => {
    const out = renderRu(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />)
    const foot = out.slice(out.indexOf('<tfoot>'), out.indexOf('</tfoot>'))
    expect(foot).toContain('>Итого</td>')
    expect(foot).toContain('>17</td>')
    expect(foot).toContain('data-align="right"')
  })

  it('без строк итогов нет; без footerCell - нет tfoot', () => {
    expect(renderRu(<DataTable columns={COLUMNS} rows={[]} rowKey={(r) => r.id} />)).not.toContain('<tfoot>')
    expect(renderRu(<DataTable columns={[{ key: 'n', header: 'Н', cell: (r: Driver) => r.name }]} rows={ROWS} rowKey={(r) => r.id} />)).not.toContain(
      '<tfoot>',
    )
  })
})

describe('DataTable: шапка у верха страницы', () => {
  it('stickyHeader помечает таблицу; с maxHeight шапка липнет внутри области', () => {
    const page = renderRu(<DataTable columns={[COLUMNS[0]!]} rows={ROWS} rowKey={(r) => r.id} stickyHeader />)
    expect(page).toContain('data-sticky-page="true"')
    const inner = renderRu(<DataTable columns={[COLUMNS[0]!]} rows={ROWS} rowKey={(r) => r.id} stickyHeader maxHeight={300} />)
    expect(inner).not.toContain('data-sticky-page')
    expect(renderRu(<DataTable columns={[COLUMNS[0]!]} rows={ROWS} rowKey={(r) => r.id} />)).not.toContain('data-sticky-page')
  })

  it('stickyHeadShift: сдвиг от границы, не дальше конца таблицы', () => {
    // Граница 56 (шапка приложения), таблица 600 высотой, шапка таблицы 40, итоги 40.
    expect(stickyHeadShift(56, 100, 600, 40, 40)).toBe(0)
    expect(stickyHeadShift(56, 0, 600, 40, 40)).toBe(56)
    expect(stickyHeadShift(56, -400, 600, 40, 40)).toBe(456)
    expect(stickyHeadShift(56, -2000, 600, 40, 40)).toBe(520)
    expect(stickyHeadShift(0, -10, 30, 40)).toBe(0)
  })
})

describe('modals.prompt', () => {
  it('без ModalsProvider - null, как confirm без провайдера - false', async () => {
    await expect(modals.prompt({ title: 'Причина' })).resolves.toBeNull()
  })
})
