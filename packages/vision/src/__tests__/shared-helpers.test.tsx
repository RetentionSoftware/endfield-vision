import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as chat from '../components/Chat'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { ScreenNoticeView, ScreenOverlayView } from '../components/ScreenOverlay'
import { dayKey, formatDayLabel, groupByDay, shiftDayKey } from '../lib/dates'
import { acceptMatches, formatSize } from '../lib/files'
import { en, ru } from '../lib/i18n-messages'
import { topEscapeLayer, type EscapeLayer } from '../lib/overlay'
import { renderRu } from './render-ru'

/*
 * Общие помощники и доступность: дни (lib/dates), файлы (lib/files), стек
 * Escape (lib/overlay), связь Field с внешним описанием, подписи и живая
 * область ScreenOverlay. Чистые функции и серверный рендер.
 */

describe('lib/dates: дни', () => {
  it('Chat реэкспортирует помощники из lib/dates (публичный API прежний)', () => {
    expect(chat.dayKey).toBe(dayKey)
    expect(chat.formatDayLabel).toBe(formatDayLabel)
    expect(chat.groupByDay).toBe(groupByDay)
    expect(typeof chat.useReferenceNow).toBe('function')
  })

  it('сдвиг ключа дня через границы месяца и года', () => {
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDayKey('2028-03-01', -1)).toBe('2028-02-29')
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('подпись дня: вчера в заданном поясе, другой год - с годом', () => {
    const opts = { now: '2026-01-01T10:00:00+03:00', intl: 'ru-RU', today: 'Сегодня', yesterday: 'Вчера', timeZone: 'Europe/Moscow' }
    expect(formatDayLabel('2025-12-31T23:00:00+03:00', opts)).toBe('Вчера')
    expect(formatDayLabel('2025-12-20T12:00:00+03:00', opts)).toMatch(/2025/)
  })
})

describe('lib/files', () => {
  it('размер с единицами языка', () => {
    expect(formatSize(512, ru)).toBe('512 Б')
    expect(formatSize(245_760, ru)).toBe('240 КБ')
    expect(formatSize(3.4 * 1024 * 1024, en)).toBe('3.4 MB')
  })

  it('accept: расширение, маска типа, точный тип, пустой - любой', () => {
    const png = { name: 'Scan.PNG', type: 'image/png' }
    expect(acceptMatches(png)).toBe(true)
    expect(acceptMatches(png, '.png')).toBe(true)
    expect(acceptMatches(png, 'image/*')).toBe(true)
    expect(acceptMatches(png, '.pdf, application/json')).toBe(false)
    expect(acceptMatches({ name: 'a.json', type: 'application/json' }, '.pdf, application/json')).toBe(true)
  })
})

describe('стек Escape', () => {
  const layer = (id: number, claims?: () => boolean): EscapeLayer => ({ id, cb: () => undefined, claims })

  it('Escape получает верхний слой', () => {
    expect(topEscapeLayer([layer(1), layer(2)])?.id).toBe(2)
    expect(topEscapeLayer([])).toBeUndefined()
  })

  it('правка блока в модалке: фокус в блоке - Escape отменяет правку, модалка остаётся', () => {
    const stack = [layer(1) /* модалка */, layer(2, () => true) /* правка */]
    expect(topEscapeLayer(stack)?.id).toBe(2)
  })

  it('фокус вне блока - Escape уходит слою ниже (модалке)', () => {
    const stack = [layer(1), layer(2, () => false)]
    expect(topEscapeLayer(stack)?.id).toBe(1)
    expect(topEscapeLayer([layer(2, () => false)])).toBeUndefined()
  })

  it('открытый список поверх правки забирает Escape первым', () => {
    const stack = [layer(1), layer(2, () => true), layer(3)]
    expect(topEscapeLayer(stack)?.id).toBe(3)
  })
})

describe('Field: внешнее описание', () => {
  it('describedBy идёт перед подсказкой', () => {
    const out = renderRu(
      <Field id="mail" hint="Латиница" describedBy="row-desc">
        <Input value="" onChange={() => undefined} />
      </Field>,
    )
    expect(out).toContain('aria-describedby="row-desc mail-hint"')
  })

  it('с ошибкой - описание и ошибка; без подсказки - только описание', () => {
    const withError = renderRu(
      <Field id="mail" error="Неверный адрес" describedBy="row-desc">
        <Input value="" onChange={() => undefined} />
      </Field>,
    )
    expect(withError).toContain('aria-describedby="row-desc mail-error"')
    const bare = renderRu(
      <Field id="mail" describedBy="row-desc">
        <Input value="" onChange={() => undefined} />
      </Field>,
    )
    expect(bare).toContain('aria-describedby="row-desc"')
  })

  it('без describedBy - как раньше', () => {
    const out = renderRu(
      <Field id="mail">
        <Input value="" onChange={() => undefined} />
      </Field>,
    )
    expect(out).not.toContain('aria-describedby')
  })
})

describe('ScreenOverlay: подписи и живая область', () => {
  const maintenance = (untilLabel?: null) => (
    <ScreenOverlayView
      variant="maintenance"
      titleId="t"
      textId="d"
      heading="H"
      body={null}
      mark={null}
      until="14:30"
      untilLabel={untilLabel}
      closeLabel="x"
    />
  )

  it('подпись срока по умолчанию - из словаря ru и en; null - срок без подписи', () => {
    expect(renderRu(maintenance())).toContain(
      '<span class="ev-screen-overlay-until-label">Ориентировочное окончание</span>',
    )
    expect(renderToString(maintenance())).toContain('<span class="ev-screen-overlay-until-label">Expected to end</span>')
    const bare = renderRu(maintenance(null))
    expect(bare).not.toContain('ev-screen-overlay-until-label')
    expect(bare).toContain('14:30')
  })

  it('окно обновления - внутри вежливой живой области, без перехвата фокуса', () => {
    const html = renderRu(
      <ScreenNoticeView variant="update" titleId="t" textId="d" heading="Доступна новая версия" body="Обновите страницу." mark={null} />,
    )
    expect(html).toMatch(
      /^<div class="ev-screen-notice-live" role="status" aria-live="polite" aria-atomic="true"><section role="dialog" aria-modal="false"/,
    )
    expect(html).not.toContain('data-autofocus')
    expect(html).not.toContain('tabindex')
  })

  it('до готовности живая область пустая: содержимое появляется следующим кадром', () => {
    const html = renderRu(
      <ScreenNoticeView ready={false} variant="update" titleId="t" textId="d" heading="H" body="B" mark={null} />,
    )
    expect(html).toBe('<div class="ev-screen-notice-live" role="status" aria-live="polite" aria-atomic="true"></div>')
  })
})
