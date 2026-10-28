import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Autocomplete, filterAutocomplete } from '../components/Autocomplete'
import { Field } from '../components/Field'
import { Input, NumberInput } from '../components/Input'
import { LightboxFrame } from '../components/Lightbox'
import { MultiSelect, Select } from '../components/Select'
import { Thumbnail, ThumbnailGrid } from '../components/Thumbnail'
import { VideoPlayer } from '../components/VideoPlayer'
import { renderRu } from './render-ru'

/* Миниатюры, поле с подсказками, раскрытие выпадающего списка при монтировании. */

const noop = () => {}

describe('Thumbnail', () => {
  it('кадр с пропорциями, обрезкой и подписью; до загрузки - скелетон', () => {
    const out = renderRu(<Thumbnail src="/a.jpg" alt="Одометр" caption="Пробег" aspect={1} fit="contain" />)
    expect(out).toContain('<figure class="ev-thumb" data-state="loading" data-fit="contain" style="--ev-thumb-aspect:1"')
    expect(out).toContain('<img class="ev-thumb-img" src="/a.jpg" alt="Одометр" loading="lazy" decoding="async"')
    expect(out).toContain('class="ev-thumb-skeleton" aria-hidden="true"')
    expect(out).toContain('<figcaption class="ev-thumb-caption">Пробег</figcaption>')
    expect(out).toContain('aria-busy="true"')
    expect(out).not.toContain('<button')
  })

  it('onClick: кадр - кнопка с подписью из alt; значок поверх', () => {
    const out = renderRu(<Thumbnail src="/v.jpg" alt="Видео осмотра" badge="Видео" onClick={noop} aspect="16/9" />)
    expect(out).toContain('<button type="button" class="ev-thumb-frame" aria-label="Видео осмотра"')
    expect(out).toContain('--ev-thumb-aspect:16/9')
    expect(out).toContain('<span class="ev-thumb-badge">Видео</span>')
  })

  it('по умолчанию - 4/3 и cover', () => {
    const out = renderRu(<Thumbnail src="/a.jpg" alt="" />)
    expect(out).toContain('data-fit="cover"')
    expect(out).toContain('--ev-thumb-aspect:4/3')
  })
})

describe('ThumbnailGrid', () => {
  it('список превью, кадры - кнопки просмотра; колонка не уже minWidth', () => {
    const out = renderRu(
      <ThumbnailGrid
        aria-label="Фото ТС"
        minWidth={120}
        items={[
          { src: '/1.jpg', alt: 'Спереди' },
          { src: '/2.jpg', alt: 'Сзади', caption: 'Сзади' },
          { src: '/v.jpg', alt: 'Видео', badge: 'Видео', onClick: noop },
        ]}
      />,
    )
    expect(out).toContain('<ul role="list" aria-label="Фото ТС" class="ev-thumb-grid" style="--ev-thumb-min:120px">')
    expect(out.match(/<li>/g)).toHaveLength(3)
    expect(out.match(/class="ev-thumb-frame"/g)).toHaveLength(3)
    expect(out.match(/<button/g)).toHaveLength(3)
    // Lightbox монтируется только в браузере.
    expect(out).not.toContain('ev-lightbox')
  })

  it('без lightbox и onItemClick кадры не нажимаются', () => {
    const out = renderRu(<ThumbnailGrid lightbox={false} items={[{ src: '/1.jpg', alt: 'A' }]} />)
    expect(out).not.toContain('<button')
  })
})

describe('Autocomplete', () => {
  it('filterAutocomplete: подстрока без регистра и «ё», без повторов и точного совпадения, лимит', () => {
    const list = ['Седельный тягач', 'Самосвал', 'Самосвал', { value: 'Тягач', hint: 'N3' }, 'Ёмкость', 'Фургон']
    expect(filterAutocomplete(list, 'тяг').map((s) => s.value)).toEqual(['Седельный тягач', 'Тягач'])
    expect(filterAutocomplete(list, 'емк').map((s) => s.value)).toEqual(['Ёмкость'])
    expect(filterAutocomplete(list, '').map((s) => s.value)).toEqual(['Седельный тягач', 'Самосвал', 'Тягач', 'Ёмкость', 'Фургон'])
    expect(filterAutocomplete(list, 'самосвал')).toEqual([])
    expect(filterAutocomplete(list, '', { limit: 2 })).toHaveLength(2)
    expect(filterAutocomplete(list, 'xyz', { filter: false }).map((s) => s.value)).toHaveLength(5)
    expect(filterAutocomplete(list, 'тяг')[1]).toEqual({ value: 'Тягач', hint: 'N3' })
  })

  it('поле - combobox со свободным вводом, список закрыт до фокуса', () => {
    const out = renderRu(
      <Field label="Класс транспорта">
        <Autocomplete value="Тяг" onChange={noop} suggestions={['Тягач']} placeholder="Например, тягач" />
      </Field>,
    )
    expect(out).toContain('role="combobox"')
    expect(out).toContain('aria-autocomplete="list"')
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('autoComplete="off"')
    expect(out).toContain('value="Тяг"')
    expect(out).not.toContain('role="listbox"')
    expect(out).toMatch(/<label[^>]*for="([^"]+)"[\s\S]*<input[^>]*id="\1"/)
  })

  it('loading: индикатор в поле и aria-busy', () => {
    const out = renderRu(<Autocomplete aria-label="Город" value="" onChange={noop} suggestions={[]} loading />)
    expect(out).toContain('aria-busy="true"')
    expect(out).toContain('ev-spinner')
  })
})

describe('Select / MultiSelect: defaultOpen', () => {
  it('серверная разметка - закрытый список: раскрытие после гидратации', () => {
    const one = renderToString(
      <Select aria-label="Статус" defaultOpen value={null} onChange={noop} options={[{ value: 'a', label: 'A' }]} />,
    )
    expect(one).toContain('aria-expanded="false"')
    expect(one).not.toContain('role="listbox"')
    const many = renderToString(
      <MultiSelect aria-label="Метки" defaultOpen value={[]} onChange={noop} options={[{ value: 'a', label: 'A' }]} />,
    )
    expect(many).toContain('aria-expanded="false"')
  })
})

describe('Видео: Thumbnail kind="video", VideoPlayer, Lightbox', () => {
  it('превью видео: немой первый кадр, значок «Видео», знак воспроизведения после загрузки', () => {
    const out = renderRu(<Thumbnail kind="video" src="/dmo.webm" alt="Видео медосмотра" aspect="16/9" />)
    expect(out).toContain('data-kind="video"')
    expect(out).toMatch(/<video class="ev-thumb-img" src="\/dmo\.webm#t=0\.1" role="img" aria-label="Видео медосмотра" preload="metadata"[^>]*muted=""[^>]*playsInline=""/)
    expect(out).toContain('<span class="ev-thumb-badge"><svg')
    expect(out).toContain('Видео</span>')
    expect(out).not.toContain('<img')
    // Своя отметка времени в адресе сохраняется; badge={null} убирает значок.
    expect(renderRu(<Thumbnail kind="video" src="blob:x#t=2" alt="" badge={null} />)).toContain('src="blob:x#t=2"')
    expect(renderRu(<Thumbnail kind="video" src="blob:x" alt="" badge={null} />)).not.toContain('ev-thumb-badge')
  })

  it('превью видео в кнопке: подпись у кнопки, кадр скрыт от скринридера', () => {
    const out = renderRu(<Thumbnail kind="video" src="/dmo.webm" alt="Видео медосмотра" onClick={noop} />)
    expect(out).toContain('<button type="button" class="ev-thumb-frame" aria-label="Видео медосмотра"')
    expect(out).toContain('aria-hidden="true" preload="metadata"')
    expect(out).not.toContain('tabindex')
  })

  it('VideoPlayer: элементы управления, предел высоты, подпись', () => {
    const out = renderRu(<VideoPlayer src="blob:abc" poster="/p.jpg" aria-label="Медосмотр" maxHeight={480} />)
    expect(out).toContain('class="ev-video" style="--ev-video-max-h:480px"')
    expect(out).toMatch(/<video class="ev-video-el" src="blob:abc" poster="\/p\.jpg" aria-label="Медосмотр" controls=""[^>]*playsInline=""[^>]*preload="metadata"/)
    expect(renderRu(<VideoPlayer src="/a.mp4" maxHeight="60vh" />)).toContain('--ev-video-max-h:60vh')
    expect(renderRu(<VideoPlayer src="/a.mp4" />)).toContain('<div class="ev-video">')
  })

  it('Lightbox: видео - в плеере, изображение - картинкой', () => {
    const images = [
      { src: '/a.png', name: 'a.png' },
      { src: '/dmo.webm', kind: 'video' as const, name: 'dmo.webm', alt: 'Медосмотр' },
    ]
    const video = renderRu(<LightboxFrame images={images} index={1} onClose={noop} />)
    expect(video).toContain('class="ev-video ev-lightbox-video"')
    expect(video).toContain('aria-label="Медосмотр" controls=""')
    expect(video).not.toContain('ev-lightbox-img')
    expect(renderRu(<LightboxFrame images={images} index={0} onClose={noop} />)).toContain('class="ev-lightbox-img"')
  })
})

describe('Ширина контролов: width', () => {
  it('Input и NumberInput: токен, px или CSS-длина на обёртке, не шире контейнера', () => {
    expect(renderRu(<Input aria-label="Поиск" width="lg" />)).toContain('style="width:var(--ev-control-w-lg);max-width:100%"')
    expect(renderRu(<NumberInput aria-label="Рейсы" value={3} onChange={noop} width="xs" />)).toContain('width:var(--ev-control-w-xs)')
    expect(renderRu(<Input aria-label="A" width={180} />)).toContain('width:180px')
    expect(renderRu(<Input aria-label="A" width="12rem" />)).toContain('width:12rem')
    // Атрибут width не уходит на сам input.
    expect(renderRu(<Input aria-label="A" width={180} />)).not.toMatch(/<input[^>]*width=/)
    expect(renderRu(<Input aria-label="A" />)).not.toContain('style=')
  })

  it('Select и MultiSelect: те же значения', () => {
    expect(renderRu(<Select aria-label="S" value={null} onChange={noop} options={[]} width="md" />)).toContain('width:var(--ev-control-w-md)')
    expect(renderRu(<MultiSelect aria-label="M" value={[]} onChange={noop} options={[]} width={240} />)).toContain('width:240px')
  })
})
