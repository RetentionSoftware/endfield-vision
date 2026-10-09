import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KanbanBoard, KanbanCard, resolveKanbanDrop, type KanbanColumn } from '../components/KanbanBoard'
import { diffPermissions, PermissionMatrix, type PermissionValue } from '../components/PermissionMatrix'
import { isEqualValue, SaveBar, SettingRow, SettingsList, SettingsSection } from '../components/SettingsList'
import { formatDuration, SlaTimer, timerTickInterval, timerTone } from '../components/SlaTimer'
import { LocaleProvider } from '../lib/i18n'
import { en as enMessages, ru as ruMessages } from '../lib/i18n-messages'

/*
 * Рабочие блоки CRM: канбан, таймер SLA, матрица прав, список настроек.
 * Серверный рендер без браузера: разметка, ARIA, тексты словаря, чистые функции.
 */

const clean = (s: string) => s.replace(/<!-- -->/g, '')
const ru = (el: ReactElement) => clean(renderToString(<LocaleProvider locale="ru">{el}</LocaleProvider>))
const en = (el: ReactElement) => clean(renderToString(el))
const count = (html: string, needle: string) => html.split(needle).length - 1
const noop = () => undefined

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/* ------------------------------------------------------------------ */
/* SlaTimer                                                            */
/* ------------------------------------------------------------------ */

describe('formatDuration', () => {
  it('русские единицы, ведущий ноль у младшей единицы', () => {
    expect(formatDuration(45 * SEC, ruMessages)).toBe('45 с')
    expect(formatDuration(12 * MIN + 5 * SEC, ruMessages)).toBe('12 мин 05 с')
    expect(formatDuration(HOUR + 5 * MIN, ruMessages)).toBe('1 ч 05 мин')
    expect(formatDuration(2 * DAY + 3 * HOUR + 10 * MIN, ruMessages)).toBe('2 д 3 ч')
    expect(formatDuration(3 * DAY, ruMessages)).toBe('3 д')
    expect(formatDuration(0, ruMessages)).toBe('0 с')
  })

  it('английские единицы', () => {
    expect(formatDuration(HOUR + 5 * MIN, enMessages)).toBe('1 h 05 min')
    expect(formatDuration(30 * SEC, enMessages)).toBe('30 s')
    expect(formatDuration(DAY + HOUR, enMessages)).toBe('1 d 1 h')
  })

  it('по модулю, одна единица, некорректное значение', () => {
    expect(formatDuration(-(HOUR + 5 * MIN), ruMessages)).toBe('1 ч 05 мин')
    expect(formatDuration(HOUR + 5 * MIN, ruMessages, { parts: 1 })).toBe('1 ч')
    expect(formatDuration(Number.NaN, ruMessages)).toBe('-')
  })
})

describe('timerTone', () => {
  const th = { warnAfter: 30 * MIN, dangerAfter: HOUR, warnBefore: 15 * MIN }

  it('прошедшее время: пороги warnAfter и dangerAfter включительно', () => {
    expect(timerTone('elapsed', 10 * MIN, th)).toBe('neutral')
    expect(timerTone('elapsed', 30 * MIN, th)).toBe('warning')
    expect(timerTone('elapsed', 59 * MIN, th)).toBe('warning')
    expect(timerTone('elapsed', HOUR, th)).toBe('danger')
    expect(timerTone('elapsed', 5 * HOUR)).toBe('neutral')
  })

  it('обратный отсчёт: warnBefore, dangerBefore, просрочка', () => {
    expect(timerTone('countdown', HOUR, th)).toBe('neutral')
    expect(timerTone('countdown', 15 * MIN, th)).toBe('warning')
    expect(timerTone('countdown', 0, th)).toBe('warning')
    expect(timerTone('countdown', -1, th)).toBe('danger')
    expect(timerTone('countdown', 4 * MIN, { dangerBefore: 5 * MIN })).toBe('danger')
  })

  it('период обновления: меньше часа - секунда, дальше - 30 секунд', () => {
    expect(timerTickInterval(59 * MIN)).toBe(SEC)
    expect(timerTickInterval(-10 * MIN)).toBe(SEC)
    expect(timerTickInterval(HOUR)).toBe(30 * SEC)
  })
})

describe('SlaTimer', () => {
  const now = '2026-10-09T12:00:00Z'

  it('прошедшее время от now: role=timer, тон по порогам', () => {
    const out = ru(<SlaTimer since="2026-10-09T10:55:00Z" now={now} warnAfter={30 * MIN} dangerAfter={2 * HOUR} />)
    expect(out).toContain('role="timer"')
    expect(out).toContain('data-kind="elapsed"')
    expect(out).toContain('data-tone="warning"')
    expect(out).toContain('1 ч 05 мин')
    expect(out).not.toContain('title=')
  })

  it('обратный отсчёт: «осталось» и просрочка', () => {
    const left = ru(<SlaTimer deadline="2026-10-09T12:10:00Z" now={now} warnBefore={15 * MIN} />)
    expect(left).toContain('data-kind="countdown"')
    expect(left).toContain('data-tone="warning"')
    expect(left).toContain('осталось 10 мин 00 с')

    const late = ru(<SlaTimer deadline="2026-10-09T11:00:00Z" now={now} />)
    expect(late).toContain('data-overdue="true"')
    expect(late).toContain('data-tone="danger"')
    expect(late).toContain('просрочено на 1 ч 00 мин')

    const lateEn = en(<SlaTimer deadline="2026-10-09T11:00:00Z" now={now} />)
    expect(lateEn).toContain('overdue by 1 h 00 min')
  })

  it('компактный вид: длительность, полная фраза в aria-label', () => {
    const out = ru(<SlaTimer deadline="2026-10-09T13:30:00Z" now={now} compact />)
    expect(out).toContain('data-compact="true"')
    expect(out).toContain('aria-label="осталось 1 ч 30 мин"')
    expect(out).toContain('>1 ч 30 мин<')
  })

  it('без now до гидрации - дефис, без начала отсчёта - дефис', () => {
    expect(ru(<SlaTimer since="2026-10-09T10:00:00Z" />)).toContain('<span class="ev-timer-text ev-num">-</span>')
    expect(ru(<SlaTimer now={now} />)).toContain('<span class="ev-timer-text ev-num">-</span>')
  })
})

/* ------------------------------------------------------------------ */
/* KanbanBoard                                                         */
/* ------------------------------------------------------------------ */

interface Task {
  id: string
  title: string
}

const COLUMNS: KanbanColumn<Task>[] = [
  { id: 'new', title: 'Новые', tone: 'info', items: [{ id: 't1', title: 'Замена фильтра' }, { id: 't2', title: 'Поверка датчика' }], total: 12, onLoadMore: noop },
  { id: 'work', title: 'В работе', tone: 'warning', items: [{ id: 't3', title: 'Ремонт насоса' }] },
  { id: 'done', title: 'Готово', items: [] },
]

const renderTask = (task: Task) => <KanbanCard title={task.title} meta="НР-104" />

describe('KanbanBoard', () => {
  it('колонки, счётчики, пустая колонка и «Показать ещё»', () => {
    const out = ru(<KanbanBoard aria-label="Наряды" columns={COLUMNS} getId={(x) => x.id} renderCard={renderTask} pageSize={5} />)
    expect(out).toContain('role="region"')
    expect(out).toContain('aria-label="Наряды"')
    expect(count(out, 'class="ev-kanban-col ev-corners"')).toBe(3)
    expect(out).toContain('>2 из 12<')
    expect(out).toContain('<span class="ev-kanban-count ev-num">1</span>')
    expect(out).toContain('<div class="ev-kanban-empty">Пусто</div>')
    expect(out).toContain('Показать ещё 5')
    expect(count(out, 'data-kanban-item=')).toBe(3)
    expect(out).toContain('data-tone="info"')
    // Без onMove карточки не перетаскиваются и меню переноса нет.
    expect(out).not.toContain('draggable')
    expect(out).not.toContain('ev-kanban-move')
  })

  it('«Показать ещё»: остаток меньше порции, без total - размер порции', () => {
    const cols: KanbanColumn<Task>[] = [
      { id: 'a', title: 'A', items: [{ id: '1', title: 'x' }], total: 3, onLoadMore: noop },
      { id: 'b', title: 'B', items: [{ id: '2', title: 'y' }], hasMore: true, onLoadMore: noop },
      { id: 'c', title: 'C', items: [{ id: '3', title: 'z' }], hasMore: true },
    ]
    const out = en(<KanbanBoard columns={cols} getId={(x) => x.id} renderCard={renderTask} pageSize={10} />)
    expect(out).toContain('Show 2 more')
    expect(out).toContain('Show 10 more')
    // Без onLoadMore кнопки нет.
    expect(count(out, 'ev-kanban-more')).toBe(2)
  })

  it('с onMove: перетаскивание и меню переноса с подписью', () => {
    const out = ru(
      <KanbanBoard columns={COLUMNS} getId={(x) => x.id} renderCard={renderTask} onMove={noop} moveLabel={(task) => `Переместить: ${task.title}`} />,
    )
    expect(count(out, 'draggable="true"')).toBe(3)
    expect(count(out, 'class="ev-btn ev-btn-iconic ev-kanban-move"')).toBe(3)
    expect(out).toContain('aria-label="Переместить: Замена фильтра"')
    expect(out).toContain('aria-haspopup="menu"')
  })

  it('загрузка пустой колонки - скелетоны, кнопка занята', () => {
    const cols: KanbanColumn<Task>[] = [{ id: 'a', title: 'A', items: [], total: 4, loading: true, onLoadMore: noop }]
    const out = ru(<KanbanBoard columns={cols} getId={(x) => x.id} renderCard={renderTask} />)
    expect(out).toContain('aria-busy="true"')
    expect(out).toContain('ev-kanban-skeleton')
    expect(out).not.toContain('ev-kanban-empty')
  })

  it('позиция после переноса внутри колонки и между колонками', () => {
    const d = { id: 't1', from: 'new', fromIndex: 0 }
    expect(resolveKanbanDrop(d, { columnId: 'new', index: 0 })).toBeNull()
    expect(resolveKanbanDrop(d, { columnId: 'new', index: 1 })).toBeNull()
    expect(resolveKanbanDrop(d, { columnId: 'new', index: 2 })).toBe(1)
    expect(resolveKanbanDrop({ ...d, fromIndex: 2 }, { columnId: 'new', index: 0 })).toBe(0)
    expect(resolveKanbanDrop(d, { columnId: 'work', index: 1 })).toBe(1)
  })
})

describe('KanbanCard', () => {
  it('ссылка на всю карточку, тон - уголок, без тона - уголки скрыты', () => {
    const out = ru(<KanbanCard title="Ремонт насоса" href="/orders/1" tone="danger" footer={<span>f</span>} />)
    expect(out).toContain('<a href="/orders/1" class="ev-kanban-card-link" draggable="false">Ремонт насоса</a>')
    expect(out).toContain('data-tone="danger"')
    expect(out).toContain('data-interactive=""')
    expect(out).not.toContain('data-corners')
    expect(ru(<KanbanCard title="x" />)).toContain('data-corners="off"')
    expect(ru(<KanbanCard title="x" selected onClick={noop} />)).toContain('data-corners="frame"')
  })
})

/* ------------------------------------------------------------------ */
/* PermissionMatrix                                                    */
/* ------------------------------------------------------------------ */

const ROWS = [
  { id: 'orders', label: 'Наряды', group: 'Операции' },
  { id: 'stock', label: 'Склад', group: 'Операции' },
  { id: 'users', label: 'Пользователи', description: 'Учётные записи', group: 'Администрирование' },
]
const ROLES = [
  { id: 'admin', label: 'Администратор', locked: true },
  { id: 'dispatcher', label: 'Диспетчер' },
  { id: 'viewer', label: 'Наблюдатель' },
]
const BASE: PermissionValue = {
  orders: { admin: 'full', dispatcher: 'full', viewer: 'view' },
  stock: { admin: 'full', dispatcher: 'view', viewer: 'none' },
  users: { admin: 'full', dispatcher: 'none', viewer: 'none' },
}

describe('diffPermissions', () => {
  it('без изменений - пусто', () => {
    expect(diffPermissions(BASE, structuredClone(BASE))).toEqual([])
  })

  it('изменённые, добавленные и удалённые ячейки', () => {
    const next: PermissionValue = {
      ...BASE,
      stock: { ...BASE.stock, dispatcher: 'full' },
      users: { admin: 'full', dispatcher: 'none' },
      reports: { viewer: 'view' },
    }
    expect(diffPermissions(BASE, next)).toEqual([
      { rowId: 'stock', columnId: 'dispatcher', from: 'view', to: 'full' },
      { rowId: 'users', columnId: 'viewer', from: 'none', to: undefined },
      { rowId: 'reports', columnId: 'viewer', from: undefined, to: 'view' },
    ])
  })
})

describe('PermissionMatrix', () => {
  it('сетка: шапка, группы, один tab-stop, тоны режимов', () => {
    const out = ru(<PermissionMatrix aria-label="Права ролей" rows={ROWS} columns={ROLES} value={BASE} onChange={noop} />)
    expect(out).toContain('role="grid"')
    expect(out).toContain('aria-label="Права ролей"')
    expect(out).toContain('>Раздел</th>')
    expect(count(out, 'scope="rowgroup"')).toBe(2)
    expect(count(out, 'role="gridcell"')).toBe(9)
    expect(count(out, 'tabindex="0"')).toBe(1)
    expect(count(out, 'tabindex="-1"')).toBe(8)
    expect(out).toContain('data-tone="success" data-mode="full"')
    expect(out).toContain('data-tone="info" data-mode="view"')
    expect(out).toContain('data-tone="neutral" data-mode="none"')
    expect(out).toContain('Полный доступ')
    expect(out).toContain('Нет доступа')
    // Роль с замком: ячейки только для чтения, меню массовой установки нет.
    expect(count(out, 'aria-disabled="true"')).toBe(3)
    expect(count(out, 'aria-haspopup="menu"')).toBe(2)
    // Без baseline - ни счётчика, ни сброса.
    expect(out).not.toContain('ev-perm-foot')
  })

  it('с baseline: отмеченные ячейки, счётчик и сброс', () => {
    const value: PermissionValue = { ...BASE, stock: { ...BASE.stock, dispatcher: 'full', viewer: 'view' } }
    const out = ru(<PermissionMatrix rows={ROWS} columns={ROLES} value={value} baseline={BASE} onChange={noop} />)
    expect(count(out, 'data-changed="true"')).toBe(2)
    expect(count(out, 'data-corners="diagonal"')).toBe(2)
    expect(out).toContain('Изменений: 2')
    expect(out).toContain('Сбросить изменения')
    expect(out).toContain('role="status"')
  })

  it('с baseline без изменений - только пустой статус', () => {
    const out = ru(<PermissionMatrix rows={ROWS} columns={ROLES} value={BASE} baseline={BASE} onChange={noop} />)
    expect(out).toContain('<span class="ev-visually-hidden" role="status"></span>')
    expect(out).not.toContain('ev-perm-foot')
  })

  it('английские подписи и только чтение', () => {
    const out = en(<PermissionMatrix rows={ROWS} columns={ROLES} value={BASE} onChange={noop} readOnly />)
    expect(out).toContain('>Section</th>')
    expect(out).toContain('Full access')
    expect(count(out, 'aria-disabled="true"')).toBe(9)
    expect(out).not.toContain('aria-haspopup')
  })
})

/* ------------------------------------------------------------------ */
/* SettingsList, SettingRow, SaveBar                                   */
/* ------------------------------------------------------------------ */

describe('SettingsList', () => {
  it('секция с заголовком, строка связывает подпись и контрол', () => {
    const out = ru(
      <SettingsList>
        <SettingsSection title="Уведомления" description="Каналы и частота">
          <SettingRow
            controlId="digest"
            label="Ежедневная сводка"
            description="Письмо в 9:00"
            hint="Изменено вчера"
            badge={<span>Бета</span>}
            control={<input type="checkbox" />}
            changed
          />
          <SettingRow label="Порог" control={(p) => <input type="number" {...p} />} />
        </SettingsSection>
      </SettingsList>,
    )
    expect(out).toContain('class="ev-settings"')
    expect(out).toMatch(/<section class="ev-settings-section" aria-labelledby="[^"]+">/)
    expect(out).toContain('<h3 id=')
    expect(out).toContain('<label id="digest-label" class="ev-setting-label" for="digest">Ежедневная сводка</label>')
    expect(out).toContain('<p id="digest-desc" class="ev-setting-desc">Письмо в 9:00</p>')
    expect(out).toContain('class="ev-setting ev-corners" data-changed="true"')
    expect(out).toContain('ev-setting-hint')
    // Функция-контрол получает id и aria-атрибуты.
    expect(out).toMatch(/<input type="number" id="([^"]+)" aria-labelledby="\1-label"\/>/)
  })
})

describe('SaveBar', () => {
  it('без изменений не рендерится', () => {
    expect(ru(<SaveBar dirty={false} onSave={noop} onDiscard={noop} />)).toBe('')
  })

  it('с изменениями: текст, кнопки, сохранение занято', () => {
    const out = ru(<SaveBar dirty onSave={noop} onDiscard={noop} />)
    expect(out).toContain('class="ev-savebar"')
    expect(out).toContain('role="region"')
    expect(out).toContain('aria-label="Есть несохранённые изменения"')
    expect(out).toContain('role="status"')
    expect(out).toContain('>Отменить<')
    expect(out).toContain('>Сохранить<')

    const saving = ru(<SaveBar dirty saving onSave={noop} onDiscard={noop} />)
    expect(saving).toContain('aria-busy="true"')

    expect(en(<SaveBar dirty onSave={noop} />)).toContain('>Save changes<')
  })
})

describe('isEqualValue', () => {
  it('структурное сравнение', () => {
    expect(isEqualValue({ a: 1, b: [1, 2], c: { d: 'x' } }, { a: 1, b: [1, 2], c: { d: 'x' } })).toBe(true)
    expect(isEqualValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(isEqualValue([1, 2], [1, 2, 3])).toBe(false)
    expect(isEqualValue({ a: undefined }, {})).toBe(false)
    expect(isEqualValue(new Date(5), new Date(5))).toBe(true)
  })
})
