import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Banner } from '../components/Banner'
import { CodeBlock, InlineCode, tokenizeCode } from '../components/CodeBlock'
import { ExpandableText } from '../components/ExpandableText'
import { Highlight, highlightRanges } from '../components/Highlight'
import { RelativeTime } from '../components/RelativeTime'
import { LocaleProvider } from '../lib/i18n'
import { formatRelativeTime } from '../lib/relative-time'

/*
 * Группа «Содержимое и обратная связь»: баннер, блок кода, подсветка
 * совпадений, относительное время, сворачиваемый текст. Серверный рендер,
 * без браузера: разметка, подписи из словаря, детерминированный вывод.
 */

const clean = (s: string) => s.replace(/<!-- -->/g, '')
const ru = (el: ReactElement) => clean(renderToString(<LocaleProvider locale="ru">{el}</LocaleProvider>))
const en = (el: ReactElement) => clean(renderToString(el))
/** Текст без тегов и номеров строк: то, что видит и копирует пользователь. */
const codeText = (html: string) =>
  html
    .replace(/<span class="ev-codeblock-ln"[^>]*>\d+<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')

describe('Banner', () => {
  it('роль status, тон и иконка по умолчанию', () => {
    const out = ru(<Banner title="Плановые работы">Склад Застава недоступен с 02:00 до 04:00.</Banner>)
    expect(out).toContain('class="ev-banner ev-corners"')
    expect(out).toContain('data-corners="diagonal"')
    expect(out).toContain('data-tone="info"')
    expect(out).toContain('role="status"')
    expect(out).toContain('class="ev-banner-icon"')
    expect(out).toContain('<div class="ev-banner-title">Плановые работы</div>')
    expect(out).not.toContain('title=')
  })

  it('ошибка - role=alert, все тоны рендерятся', () => {
    expect(ru(<Banner tone="danger">Нет связи</Banner>)).toContain('role="alert"')
    for (const tone of ['success', 'warning', 'accent', 'neutral'] as const) {
      const out = ru(<Banner tone={tone}>Текст</Banner>)
      expect(out).toContain(`data-tone="${tone}"`)
      expect(out).toContain('role="status"')
    }
  })

  it('кнопка «Скрыть» по словарю, sticky, без иконки', () => {
    const out = ru(
      <Banner dismissible storageKey="test-banner" sticky icon={false}>
        Текст
      </Banner>,
    )
    expect(out).toContain('aria-label="Скрыть"')
    expect(out).toContain('data-sticky="true"')
    expect(out).not.toContain('ev-banner-icon')
    expect(en(<Banner dismissible>Text</Banner>)).toContain('aria-label="Dismiss"')
  })

  it('кнопки действий - отдельным блоком', () => {
    const out = ru(<Banner actions={<button type="button">Подробнее</button>}>Текст</Banner>)
    expect(out).toContain('<div class="ev-banner-actions"><button type="button">Подробнее</button></div>')
  })
})

describe('CodeBlock', () => {
  const sample = 'const a = 1\nconst b = "x"\n\nexport { a, b }\n'

  it('строки, номера, подсвеченные строки', () => {
    const out = ru(<CodeBlock code={sample} language="ts" showLineNumbers highlightLines={[2]} />)
    expect(out.match(/class="ev-codeblock-line"/g)).toHaveLength(4)
    expect(out).toContain('<span class="ev-codeblock-ln" aria-hidden="true">4</span>')
    expect(out.match(/data-highlighted="true"/g)).toHaveLength(1)
    expect(out).toMatch(/data-highlighted="true"><span class="ev-codeblock-ln" aria-hidden="true">2<\/span>/)
    expect(out).toContain('role="region"')
    expect(out).toContain('aria-label="Код: ts"')
    expect(out).toContain('tabindex="0"')
    expect(out).toContain('aria-label="Скопировать"')
  })

  it('текст кода сохраняется в точности, HTML не вставляется', () => {
    const code = '<img src=x onerror="alert(1)">\n  // a & b\n\tif (x < 2) { return `${y}` }'
    for (const language of ['html', 'tsx', 'text']) {
      const out = ru(<CodeBlock code={code} language={language} showLineNumbers />)
      expect(out).not.toContain('<img')
      expect(codeText(out.slice(out.indexOf('<pre'), out.indexOf('</pre>')))).toBe(code)
    }
  })

  it('заголовок - имя области', () => {
    const out = ru(<CodeBlock code="npm i" title="install.sh" language="bash" />)
    expect(out).toMatch(/aria-labelledby="([^"]+)"/)
    const id = out.match(/aria-labelledby="([^"]+)"/)![1]
    expect(out).toContain(`id="${id}" class="ev-codeblock-title">install.sh</span>`)
    expect(out).not.toContain('aria-label="Код')
  })

  it('длинный код свёрнут до maxLines, кнопка с числом строк', () => {
    const code = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join('\n')
    const out = ru(<CodeBlock code={code} maxLines={5} />)
    expect(out.match(/class="ev-codeblock-line"/g)).toHaveLength(5)
    expect(out).toContain('data-collapsed="true"')
    expect(out).toContain('Показать весь код (12 строк)')
    expect(out).toContain('aria-expanded="false"')
    expect(en(<CodeBlock code={code} maxLines={5} />)).toContain('Show all code (12 lines)')
    expect(ru(<CodeBlock code={code} maxLines={12} />)).not.toContain('data-collapsed')
  })

  it('переключатель переноса строк', () => {
    const out = ru(<CodeBlock code="a" wrap wrapToggle copyable={false} />)
    expect(out).toContain('aria-label="Переносить строки"')
    expect(out).toContain('aria-pressed="true"')
    expect(out).toContain('data-wrap="true"')
    expect(out).not.toContain('aria-label="Скопировать"')
  })

  it('раскраска: только для известных языков и отключается', () => {
    expect(ru(<CodeBlock code="const a = 1" language="ts" />)).toContain('data-token="keyword"')
    expect(ru(<CodeBlock code="const a = 1" language="ts" highlight={false} />)).not.toContain('data-token')
    expect(ru(<CodeBlock code="const a = 1" language="python" />)).not.toContain('data-token')
  })

  it('InlineCode - стилизованный code', () => {
    expect(en(<InlineCode>npm test</InlineCode>)).toBe('<code class="ev-inline-code">npm test</code>')
  })
})

describe('tokenizeCode', () => {
  const kinds = (code: string, lang: string) => tokenizeCode(code, lang).filter((t) => t.type !== 'plain').map((t) => `${t.type}:${t.text}`)

  it('ts: ключевые слова, строки, числа, комментарии', () => {
    expect(kinds('const n = 42 // ответ\nlet s = \'a\\\'b\'', 'ts')).toEqual([
      'keyword:const',
      'number:42',
      'comment:// ответ',
      'keyword:let',
      "string:'a\\'b'",
    ])
  })

  it('слово внутри идентификатора - не ключевое, число внутри имени - не число', () => {
    expect(kinds('constant x1 classes', 'ts')).toEqual([])
  })

  it('json: строки, числа, литералы', () => {
    expect(kinds('{"limit": -1.5, "on": true, "x": null}', 'json')).toEqual([
      'string:"limit"',
      'number:-1.5',
      'string:"on"',
      'keyword:true',
      'string:"x"',
      'keyword:null',
    ])
  })

  it('bash: комментарий только с начала слова', () => {
    expect(kinds('npm i endfield-vision # пакет\necho a#b "x"', 'bash')).toEqual(['comment:# пакет', 'string:"x"'])
  })

  it('css и html', () => {
    expect(kinds('@layer x { a { margin: 4px !important } }', 'css')).toEqual(['keyword:@layer', 'number:4', 'keyword:!important'])
    expect(kinds('<!-- c --><a href="/">x</a>', 'html')).toEqual(['comment:<!-- c -->', 'keyword:<a', 'string:"/"', 'keyword:>', 'keyword:</a>'])
  })

  it('многострочный комментарий и склейка токенов равна коду', () => {
    const code = '/* a\n b */ const t = `x\n${y}`\n"open'
    const toks = tokenizeCode(code, 'tsx')
    expect(toks.map((t) => t.text).join('')).toBe(code)
    expect(toks[0]).toEqual({ type: 'comment', text: '/* a\n b */' })
    expect(tokenizeCode('plain text', 'python')).toEqual([{ type: 'plain', text: 'plain text' }])
    expect(tokenizeCode('', 'ts')).toEqual([])
  })
})

describe('highlightRanges', () => {
  it('без учёта регистра по умолчанию', () => {
    expect(highlightRanges('Насосная НС-2, насос', 'НАС')).toEqual([
      { start: 0, end: 3 },
      { start: 15, end: 18 },
    ])
    expect(highlightRanges('Насосная НС-2, насос', 'Нас', { ignoreCase: false })).toEqual([{ start: 0, end: 3 }])
  })

  it('ё = е в обе стороны, вывод - исходные символы', () => {
    expect(highlightRanges('Учёт ёмкостей', 'учет')).toEqual([{ start: 0, end: 4 }])
    expect(highlightRanges('Учет емкостей', 'ЁМК')).toEqual([{ start: 5, end: 8 }])
    expect(highlightRanges('Café Zürich', 'cafe zu')).toEqual([{ start: 0, end: 7 }])
    expect(highlightRanges('Й и И', 'й')).toEqual([{ start: 0, end: 1 }])
  })

  it('несколько запросов, пересечения сливаются, пустые пропускаются', () => {
    expect(highlightRanges('компрессор К-12', ['комп', 'прес', ' ', ''])).toEqual([{ start: 0, end: 7 }])
    expect(highlightRanges('aaa', 'aa')).toEqual([{ start: 0, end: 3 }])
    expect(highlightRanges('ab ab', ['ab', 'b a'])).toEqual([{ start: 0, end: 5 }])
    expect(highlightRanges('текст', '')).toEqual([])
  })

  it('комбинирующий знак (NFD) входит в совпадение', () => {
    const nfd = 'Ёмкость'
    expect(highlightRanges(nfd, 'ем')).toEqual([{ start: 0, end: 3 }])
  })

  it('Highlight оборачивает совпадения в mark', () => {
    expect(en(<Highlight text="Склад Застава" query="застава" />)).toBe('<span class="ev-highlight">Склад <mark class="ev-mark">Застава</mark></span>')
    expect(en(<Highlight text="<b>" query="b" />)).toBe('<span class="ev-highlight">&lt;<mark class="ev-mark">b</mark>&gt;</span>')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-08T12:00:00Z')
  const at = (ms: number) => new Date(now.getTime() + ms)
  const S = 1000
  const M = 60 * S
  const H = 60 * M
  const D = 24 * H
  const fmtRu = (ms: number) => formatRelativeTime(at(ms), now, 'ru-RU', 'только что')
  const fmtEn = (ms: number) => formatRelativeTime(at(ms), now, 'en-US', 'just now')

  it('пороги на русском', () => {
    expect(fmtRu(-30 * S)).toBe('только что')
    expect(fmtRu(44 * S)).toBe('только что')
    expect(fmtRu(-50 * S)).toBe('1 минуту назад')
    expect(fmtRu(-5 * M)).toBe('5 минут назад')
    expect(fmtRu(-50 * M)).toBe('1 час назад')
    expect(fmtRu(3 * H)).toBe('через 3 часа')
    expect(fmtRu(-23 * H)).toBe('вчера')
    expect(fmtRu(2 * D)).toBe('послезавтра')
    expect(fmtRu(5 * D)).toBe('через 5 дней')
    expect(fmtRu(-10 * D)).toBe('на прошлой неделе')
    expect(fmtRu(-21 * D)).toBe('3 недели назад')
    expect(fmtRu(-45 * D)).toBe('в прошлом месяце')
    expect(fmtRu(95 * D)).toBe('через 3 месяца')
    expect(fmtRu(-400 * D)).toBe('в прошлом году')
    expect(fmtRu(-3 * 365 * D)).toBe('3 года назад')
  })

  it('пороги на английском', () => {
    expect(fmtEn(10 * S)).toBe('just now')
    expect(fmtEn(-5 * M)).toBe('5 minutes ago')
    expect(fmtEn(2 * H)).toBe('in 2 hours')
    expect(fmtEn(-1 * D)).toBe('yesterday')
    expect(fmtEn(3 * D)).toBe('in 3 days')
    expect(fmtEn(14 * D)).toBe('in 2 weeks')
    expect(fmtEn(-60 * D)).toBe('2 months ago')
    expect(fmtEn(2 * 365 * D)).toBe('in 2 years')
  })

  it('строки и миллисекунды на входе, некорректная дата - дефис', () => {
    expect(formatRelativeTime('2026-10-08T11:00:00Z', now.getTime(), 'en-US', 'just now')).toBe('1 hour ago')
    expect(formatRelativeTime('не дата', now, 'ru-RU', 'только что')).toBe('-')
  })
})

describe('RelativeTime', () => {
  const date = new Date('2026-10-06T09:30:00Z')

  it('с now - относительное время уже на сервере, стабильно', () => {
    const el = <RelativeTime date={date} now={new Date('2026-10-08T12:00:00Z')} />
    const out = ru(el)
    expect(out).toBe(ru(el))
    expect(out).toContain('<time class="ev-reltime" dateTime="2026-10-06T09:30:00.000Z" tabindex="0">позавчера</time>')
    expect(en(el)).toContain('>2 days ago</time>')
  })

  it('без now - полная дата на сервере (с заданным поясом - одинаково везде)', () => {
    const el = <RelativeTime date="2026-10-06T09:30:00Z" timeZone="UTC" tooltip={false} />
    const out = ru(el)
    expect(out).toBe(ru(el))
    expect(out).toBe('<time class="ev-reltime" dateTime="2026-10-06T09:30:00.000Z">6 октября 2026 г. в 09:30</time>')
    expect(en(el)).toContain('>October 6, 2026 at 9:30 AM</time>')
  })

  it('некорректная дата - дефис', () => {
    expect(en(<RelativeTime date="x" />)).toBe('<span class="ev-reltime">-</span>')
  })
})

describe('ExpandableText', () => {
  it('обрезано до lines, кнопка невидима до измерения', () => {
    const out = ru(<ExpandableText lines={2}>Длинное описание инцидента.</ExpandableText>)
    expect(out).toContain('class="ev-expandable"')
    expect(out).toContain('style="--ev-expandable-lines:2"')
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('data-pending="true"')
    expect(out).toContain('aria-hidden="true"')
    expect(out).toContain('tabindex="-1"')
    expect(out).toContain('Показать полностью')
    expect(out).toMatch(/aria-controls="([^"]+)"/)
    const id = out.match(/aria-controls="([^"]+)"/)![1]
    expect(out).toContain(`id="${id}" class="ev-expandable-text"`)
  })

  it('развёрнутое состояние - кнопка «Свернуть» сразу видна', () => {
    const out = en(<ExpandableText defaultExpanded>Text</ExpandableText>)
    expect(out).toContain('data-expanded="true"')
    expect(out).toContain('aria-expanded="true"')
    expect(out).toContain('Show less')
    expect(out).not.toContain('data-pending')
  })
})
