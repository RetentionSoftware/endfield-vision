import { renderRu as renderToString } from './render-ru'
import { describe, expect, it } from 'vitest'
import * as ui from '../index'
import { CopyValue } from '../index'

/*
 * Копируемое значение: серверный рендер - кнопка с подписью для
 * скринридера, видимое значение, ссылка рядом. Само копирование (буфер,
 * тост, галочка) - общий с CopyButton хук useCopy; среды DOM в тестах кита
 * нет, клик проверяется вручную в панели.
 */

const html = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '')

describe('CopyValue', () => {
  it('экспортируется из кита', () => {
    expect(ui).toHaveProperty('CopyValue')
  })

  it('значение - кнопка с подписью и значением в aria-label, без title=', () => {
    const out = html(<CopyValue value="NRTH2345" label="Скопировать код" />)
    expect(out).toContain('type="button"')
    expect(out).toContain('class="ev-copyvalue-btn"')
    expect(out).toContain('aria-label="Скопировать код: NRTH2345"')
    expect(out).toContain('>NRTH2345</span>')
    expect(out).toContain('ev-copyvalue-mono')
    expect(out).not.toContain('title=')
  })

  it('показывает подпись вместо значения, копирует само значение', () => {
    const out = html(
      <CopyValue value="https://t.me/endfield_bot" label="Скопировать ссылку" mono={false}>
        @endfield_bot
      </CopyValue>,
    )
    expect(out).toContain('>@endfield_bot</span>')
    expect(out).toContain('aria-label="Скопировать ссылку: https://t.me/endfield_bot"')
    expect(out).not.toContain('ev-copyvalue-mono')
  })

  it('ссылка рядом открывается в новой вкладке', () => {
    const out = html(<CopyValue value="@endfield_bot" href="https://t.me/endfield_bot" hrefLabel="Открыть бота в Telegram" block />)
    expect(out).toContain('href="https://t.me/endfield_bot"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('aria-label="Открыть бота в Telegram"')
    expect(out).toContain('data-block="true"')
  })

  it('без ссылки - только кнопка копирования', () => {
    const out = html(<CopyValue value="NRTH2345" size="sm" />)
    expect(out).not.toContain('<a ')
    expect(out).toContain('data-size="sm"')
    expect(out).toContain('aria-label="Скопировать: NRTH2345"')
  })
})
