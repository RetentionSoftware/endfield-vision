import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Autocomplete, filterAutocomplete } from '../components/Autocomplete'
import { Field } from '../components/Field'
import { MultiSelect, Select } from '../components/Select'
import { Thumbnail, ThumbnailGrid } from '../components/Thumbnail'
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
