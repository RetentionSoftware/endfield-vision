import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Sparkline } from '../components/charts/Charts'
import { Avatar, Card, Progress } from '../components/Display'
import { PageHeader } from '../components/Page'
import { Timeline, type TimelineItem } from '../components/Timeline'
import { UptimeBar, type UptimeDay } from '../components/UptimeBar'
import { renderRu } from './render-ru'

/* Доработки компонентов отображения и новые Timeline, UptimeBar: серверный рендер на обоих языках. */

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('Sparkline', () => {
  it('width="auto": обёртка во всю ширину, на сервере - запасная ширина 120', () => {
    const out = renderToString(<Sparkline values={[1, 3, 2, 5]} width="auto" height={28} />)
    expect(out).toContain('class="ev-sparkline-fluid"')
    expect(out).toContain('height:28px')
    expect(out).toContain('width="120"')
  })

  it('по умолчанию - svg шириной 120 без обёртки', () => {
    const out = renderToString(<Sparkline values={[1, 2]} />)
    expect(out.startsWith('<svg')).toBe(true)
    expect(out).toContain('width="120"')
  })

  it('auto без данных: обёртка резервирует высоту, графика нет', () => {
    const out = renderToString(<Sparkline values={[1]} width="auto" />)
    expect(out).toContain('ev-sparkline-fluid')
    expect(out).not.toContain('<svg')
  })
})

describe('Progress: превышение', () => {
  it('тон превышения, полная полоса, реальный процент', () => {
    const out = renderToString(<Progress value={112} tone="success" showValue aria-label="План" />)
    expect(out).toContain('data-tone="danger"')
    expect(out).toContain('data-over="true"')
    expect(out).toContain('width:100%')
    expect(out).toContain('>112%<')
    expect(out).toContain('aria-valuenow="100"')
    expect(out).toContain('aria-valuetext="112%"')
  })

  it('свой тон превышения и реальное значение в формате', () => {
    const out = renderToString(<Progress value={9} max={8} overTone="warning" showValue={(v, m) => `${v} / ${m}`} aria-label="Шаги" />)
    expect(out).toContain('data-tone="warning"')
    expect(out).toContain('9 / 8')
  })

  it('в пределах max - без data-over и aria-valuetext', () => {
    const out = renderToString(<Progress value={40} tone="success" aria-label="План" />)
    expect(out).toContain('data-tone="success"')
    expect(out).not.toContain('data-over')
    expect(out).not.toContain('aria-valuetext')
  })
})

describe('Avatar', () => {
  it('с фото: img внутри круга, декоративный без alt', () => {
    const out = renderToString(<Avatar name="Иванов Пётр" src="/u/1.jpg" />)
    expect(out).toContain('<img')
    expect(out).toContain('src="/u/1.jpg"')
    expect(out).toContain('class="ev-avatar-img"')
    expect(out).toContain('aria-hidden="true"')
    expect(out).not.toContain('ИП')
  })

  it('с alt: role="img" и подпись', () => {
    const out = renderToString(<Avatar name="Иванов Пётр" src="/u/1.jpg" alt="Иванов Пётр" />)
    expect(out).toContain('role="img"')
    expect(out).toContain('aria-label="Иванов Пётр"')
    expect(out).not.toContain('aria-hidden')
  })

  it('без фото - инициалы', () => {
    const out = renderToString(<Avatar name="Иванов Пётр" />)
    expect(out).toContain('ИП')
    expect(out).not.toContain('<img')
  })
})

describe('Card toolbar', () => {
  it('строка между шапкой и телом', () => {
    const out = renderToString(
      <Card title="Заказы" toolbar={<span>фильтры</span>} flush>
        <div>тело</div>
      </Card>,
    )
    expect(out).toContain('class="ev-card-toolbar"')
    const head = out.indexOf('ev-card-head')
    const bar = out.indexOf('ev-card-toolbar')
    const body = out.indexOf('ev-card-body')
    expect(head).toBeLessThan(bar)
    expect(bar).toBeLessThan(body)
  })

  it('без toolbar - разметка прежняя', () => {
    expect(renderToString(<Card title="Заказы">x</Card>)).not.toContain('ev-card-toolbar')
  })
})

describe('PageHeader headingLevel', () => {
  it('по умолчанию h1, по запросу h2 и h3 с тем же классом', () => {
    expect(renderToString(<PageHeader title="Склад" />)).toContain('<h1 class="ev-page-title">')
    expect(renderToString(<PageHeader title="Склад" headingLevel={2} />)).toContain('<h2 class="ev-page-title">')
    expect(renderToString(<PageHeader title="Склад" headingLevel={3} />)).toContain('<h3 class="ev-page-title">')
  })
})

const EVENTS: TimelineItem[] = [
  { id: 'a', title: 'Отгружено', time: '10:20', tone: 'success', description: 'Склад А' },
  { id: 'b', title: 'В пути', time: '12:00', tone: 'accent', meta: <span>рейс 12</span> },
  { id: 'c', title: 'Таможня', pending: true },
  { id: 'd', title: 'Доставлено', pending: true, icon: <svg /> },
]

describe('Timeline', () => {
  it('список событий: ol role="list", тон и признак будущего шага', () => {
    const out = renderToString(<Timeline items={EVENTS} />)
    expect(out).toContain('<ol role="list"')
    expect(out).toContain('aria-label="Activity"')
    expect(count(out, '<li ')).toBe(4)
    expect(out).toContain('data-tone="success"')
    expect(count(out, 'data-pending="true"')).toBe(2)
    // Линия к будущему шагу - пунктир: у «В пути» следующий шаг pending.
    expect(out).toContain('data-next-pending="true"')
    expect(out).toContain('class="ev-timeline-icon"')
    expect(out).toContain('Склад А')
    expect(out).toContain('рейс 12')
    expect(out).not.toContain('ev-timeline-more')
  })

  it('maxItems: часть событий и кнопка «Show N more» (en по умолчанию)', () => {
    const out = renderToString(<Timeline items={EVENTS} maxItems={2} variant="compact" />)
    expect(count(out, '<li ')).toBe(2)
    expect(out).toContain('data-variant="compact"')
    expect(out).toContain('Show 2 more')
    expect(out).toContain('aria-expanded="false"')
  })

  it('maxItems на русском и своя подпись списка', () => {
    const out = renderRu(<Timeline items={EVENTS} maxItems={1} />)
    expect(out).toContain('Показать ещё 3')
    expect(out).toContain('aria-label="Лента событий"')
    expect(renderRu(<Timeline items={EVENTS} aria-label="Журнал объекта" />)).toContain('aria-label="Журнал объекта"')
  })

  it('maxItems не меньше числа событий - без кнопки', () => {
    expect(renderToString(<Timeline items={EVENTS} maxItems={4} />)).not.toContain('ev-timeline-more')
  })
})

const DAYS: UptimeDay[] = [
  { date: '2026-10-01', status: 'operational' },
  { date: '2026-10-02', status: 'degraded', note: 'Задержки API' },
  { date: '2026-10-03', status: 'outage' },
  { date: '2026-10-04', status: 'maintenance' },
  { date: '2026-10-05', status: 'none' },
]

describe('UptimeBar', () => {
  it('сегмент на каждый день, подписи и одна остановка Tab (en)', () => {
    const out = renderToString(<UptimeBar days={DAYS} showRange showLegend />)
    expect(count(out, 'class="ev-uptime-day"')).toBe(5)
    expect(out).toContain('role="group"')
    expect(out).toContain('aria-label="Uptime over the last 5 days"')
    expect(out).toContain('aria-label="02.10.2026: Degraded"')
    expect(out).toContain('aria-label="05.10.2026: No data"')
    expect(count(out, 'tabindex="0"')).toBe(1)
    expect(count(out, 'tabindex="-1"')).toBe(4)
    // Активный по умолчанию - последний день.
    expect(out).toMatch(/aria-label="05\.10\.2026: No data" tabindex="0"/)
    expect(out).toContain('4 days ago')
    expect(out).toContain('Today')
    expect(out).toContain('Maintenance')
  })

  it('на русском', () => {
    const out = renderRu(<UptimeBar days={DAYS} showRange />)
    expect(out).toContain('aria-label="Доступность за 5 дней"')
    expect(out).toContain('aria-label="03.10.2026: Сбой"')
    expect(out).toContain('4 дня назад')
    expect(out).toContain('Сегодня')
  })

  it('высота полосы и статусы сегментов', () => {
    const out = renderToString(<UptimeBar days={DAYS} height={20} />)
    expect(out).toContain('height:20px')
    expect(out).toContain('data-status="operational"')
    expect(out).toContain('data-status="none"')
    expect(out).not.toContain('ev-uptime-legend')
    expect(out).not.toContain('ev-uptime-range')
  })
})
