import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, IconButton, LinkButton } from '../components/Button'
import { SegmentedControl } from '../components/Choice'
import { DataTable, nextSort } from '../components/DataTable'
import { Field } from '../components/Field'
import { MaskedDigitsInput, TimeInput } from '../components/MaskedInput'
import { findTypeaheadMatch } from '../components/Menu'
import { Popover } from '../components/Popover'
import { TabPanel } from '../components/Tabs'
import { LocaleProvider } from '../lib/i18n'
import { formatTimeDigits, isValidTime, parseTime, timeDigitsToValue, timeToDigits } from '../lib/masks'
import { ThemeScript } from '../lib/theme-script'

const noop = () => {}

describe('Button variant="link"', () => {
  it('кнопка-ссылка: класс кнопки и вариант link', () => {
    const out = renderToString(<Button variant="link">Забыли пароль?</Button>)
    expect(out).toContain('class="ev-btn"')
    expect(out).toContain('data-variant="link"')
    expect(out).toContain('type="button"')
    expect(out).toContain('Забыли пароль?')
  })

  it('LinkButton с вариантом link - ссылка', () => {
    const out = renderToString(
      <LinkButton variant="link" href="/restore">
        Восстановить
      </LinkButton>,
    )
    expect(out).toMatch(/^<a /)
    expect(out).toContain('href="/restore"')
    expect(out).toContain('data-variant="link"')
  })

  it('IconButton не принимает вариант link', () => {
    // @ts-expect-error link исключён из вариантов IconButton
    const el = <IconButton label="Удалить" icon={null} variant="link" />
    expect(el).toBeTruthy()
  })
})

describe('TabPanel keepMounted', () => {
  it('неактивная панель остаётся в DOM скрытой', () => {
    const out = renderToString(
      <>
        <TabPanel idBase="t" value="a" activeValue="a" keepMounted>
          Первая
        </TabPanel>
        <TabPanel idBase="t" value="b" activeValue="a" keepMounted>
          <input defaultValue="черновик" />
        </TabPanel>
      </>,
    )
    expect(out).toContain('id="t-panel-a"')
    expect(out).toContain('id="t-panel-b"')
    expect(out).toMatch(/id="t-panel-b" aria-labelledby="t-tab-b" tabindex="-1" hidden=""/)
    expect(out).not.toMatch(/id="t-panel-a"[^>]*hidden/)
    expect(out).toContain('value="черновик"')
  })

  it('без keepMounted неактивная панель не рендерится', () => {
    const out = renderToString(
      <TabPanel idBase="t" value="b" activeValue="a">
        Вторая
      </TabPanel>,
    )
    expect(out).toBe('')
  })

  it('без activeValue панель активна, как раньше', () => {
    const out = renderToString(
      <TabPanel idBase="t" value="a">
        Первая
      </TabPanel>,
    )
    expect(out).toContain('role="tabpanel"')
    expect(out).toContain('tabindex="0"')
    expect(out).not.toContain('hidden')
  })
})

describe('Popover padded', () => {
  it('принимает padded; на сервере рендерится только якорь', () => {
    const out = renderToString(
      <Popover open padded onOpenChange={noop} trigger={<button type="button">Фильтры</button>}>
        Содержимое
      </Popover>,
    )
    expect(out).toContain('aria-haspopup="dialog"')
    expect(out).toContain('aria-expanded="true"')
    // Окно в портале монтируется только в браузере.
    expect(out).not.toContain('ev-popover')
  })
})

describe('SegmentedControl', () => {
  it('сегменты-иконки: aria-label и признак data-icon-only', () => {
    const out = renderToString(
      <SegmentedControl
        aria-label="Вид"
        value="grid"
        onChange={noop}
        options={[
          { value: 'grid', icon: <svg data-icon="grid" />, 'aria-label': 'Сетка' },
          { value: 'table', icon: <svg data-icon="table" />, 'aria-label': 'Таблица' },
          { value: 'list', label: 'Список' },
        ]}
      />,
    )
    expect(out).toContain('aria-label="Сетка"')
    expect(out).toContain('aria-label="Таблица"')
    expect(out.match(/data-icon-only="true"/g)).toHaveLength(2)
    expect(out).toContain('aria-checked="true"')
    expect(out).toContain('<span class="ev-segmented-icon" aria-hidden="true">')
    expect(out).toContain('<span>Список</span>')
  })
})

describe('ThemeScript', () => {
  it('nonce попадает в тег script', () => {
    expect(renderToString(<ThemeScript nonce="r4nd0m" defaultTheme="light" />)).toContain('<script nonce="r4nd0m">')
    expect(renderToString(<ThemeScript />)).toContain('<script>')
  })
})

describe('MaskedDigitsInput в Field', () => {
  it('берёт id, aria-invalid, aria-describedby и required из контекста', () => {
    const out = renderToString(
      <Field id="inn" label="ИНН" error="Неверный ИНН" required>
        <MaskedDigitsInput digits="12" onDigits={noop} format={(d) => d} maxDigits={12} />
      </Field>,
    )
    expect(out).toContain('id="inn"')
    expect(out).toContain('aria-invalid="true"')
    expect(out).toContain('aria-describedby="inn-error"')
    expect(out).toMatch(/<input[^>]*required=""/)
  })

  it('явные пропсы важнее контекста', () => {
    const out = renderToString(
      <Field id="inn" error="Ошибка" disabled>
        <MaskedDigitsInput id="own" aria-invalid={false} disabled={false} digits="" onDigits={noop} format={(d) => d} maxDigits={4} />
      </Field>,
    )
    expect(out).toContain('id="own"')
    expect(out).not.toContain('aria-invalid')
    expect(out).not.toMatch(/<input[^>]*disabled/)
  })
})

describe('TimeInput', () => {
  it('значение с маской, плейсхолдер из словаря', () => {
    const out = renderToString(<TimeInput value="09:30" onChange={noop} aria-label="Начало смены" />)
    expect(out).toContain('value="09:30"')
    expect(out).toContain('placeholder="hh:mm"')
    expect(out).toContain('inputMode="numeric"')
    expect(out).toContain('data-size="md"')
  })

  it('русский плейсхолдер и контекст Field', () => {
    const out = renderToString(
      <LocaleProvider locale="ru">
        <Field id="start" label="Начало" hint="По местному времени">
          <TimeInput value="" onChange={noop} size="sm" />
        </Field>
      </LocaleProvider>,
    )
    expect(out).toContain('placeholder="чч:мм"')
    expect(out).toContain('id="start"')
    expect(out).toContain('aria-describedby="start-hint"')
    expect(out).toContain('data-size="sm"')
  })

  it('неверное значение снаружи - пустое поле', () => {
    const out = renderToString(<TimeInput value="25:00" onChange={noop} />)
    expect(out).toContain('value=""')
  })
})

describe('разбор времени', () => {
  it('parseTime и isValidTime: 00-23 часа, 00-59 минут', () => {
    expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 })
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
    expect(parseTime('9:30')).toBeNull()
    expect(parseTime('')).toBeNull()
    expect(parseTime(null)).toBeNull()
    expect(isValidTime('07:05')).toBe(true)
    expect(isValidTime('7:05')).toBe(false)
  })

  it('цифры поля <-> значение', () => {
    expect(formatTimeDigits('')).toBe('')
    expect(formatTimeDigits('1')).toBe('1')
    expect(formatTimeDigits('12')).toBe('12')
    expect(formatTimeDigits('123')).toBe('12:3')
    expect(formatTimeDigits('1234')).toBe('12:34')
    expect(timeDigitsToValue('0930')).toBe('09:30')
    expect(timeDigitsToValue('093')).toBeNull()
    expect(timeDigitsToValue('2460')).toBeNull()
    expect(timeToDigits('18:45')).toBe('1845')
    expect(timeToDigits('18:4')).toBe('')
  })
})

describe('сортировка DataTable', () => {
  it('по умолчанию: asc -> desc -> нет', () => {
    const a = nextSort(null, 'name')
    expect(a).toEqual({ key: 'name', dir: 'asc' })
    const d = nextSort(a, 'name')
    expect(d).toEqual({ key: 'name', dir: 'desc' })
    expect(nextSort(d, 'name')).toBeNull()
  })

  it('sortClearable=false: asc <-> desc', () => {
    expect(nextSort({ key: 'name', dir: 'desc' }, 'name', false)).toEqual({ key: 'name', dir: 'asc' })
    expect(nextSort({ key: 'name', dir: 'asc' }, 'name', false)).toEqual({ key: 'name', dir: 'desc' })
  })

  it('другая колонка начинает с asc', () => {
    expect(nextSort({ key: 'name', dir: 'desc' }, 'date', false)).toEqual({ key: 'date', dir: 'asc' })
  })

  it('DataTable принимает sortClearable', () => {
    const out = renderToString(
      <DataTable
        aria-label="Позиции"
        columns={[{ key: 'name', header: 'Название', sortable: true, cell: (r: { name: string }) => r.name }]}
        rows={[{ name: 'Болт' }]}
        rowKey={(r) => r.name}
        sort={{ key: 'name', dir: 'desc' }}
        onSortChange={noop}
        sortClearable={false}
      />,
    )
    expect(out).toContain('aria-sort="descending"')
  })
})

describe('Menu: поиск по первым буквам', () => {
  const labels = ['Открыть', null, 'Переименовать', 'Печать', 'Удалить', 'Перенести']
  const enabled = [0, 2, 3, 4]

  it('буква ведёт к следующему доступному пункту на неё', () => {
    expect(findTypeaheadMatch(labels, enabled, -1, 'п')).toBe(2)
    expect(findTypeaheadMatch(labels, enabled, 2, 'п')).toBe(3)
    // Повтор буквы перебирает пункты по кругу; «Перенести» недоступен.
    expect(findTypeaheadMatch(labels, enabled, 3, 'пп')).toBe(2)
  })

  it('несколько букв уточняют с текущего пункта, регистр не важен', () => {
    expect(findTypeaheadMatch(labels, enabled, 2, 'Пе')).toBe(2)
    expect(findTypeaheadMatch(labels, enabled, 2, 'печ')).toBe(3)
  })

  it('нет совпадения или пункт без строковой подписи - -1', () => {
    expect(findTypeaheadMatch(labels, enabled, 0, 'я')).toBe(-1)
    expect(findTypeaheadMatch([null, null], [0, 1], -1, 'а')).toBe(-1)
  })
})
