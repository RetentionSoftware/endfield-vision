import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Chip, ChipGroup, nodeText } from '../components/Chip'
import { Field } from '../components/Field'
import { errorText, InlineEdit } from '../components/InlineEdit'
import { distributeOtp, insertOtp, OtpInput, removeOtpAt, sanitizeOtp, typedOtpChars } from '../components/OtpInput'
import {
  clampValue,
  closestThumb,
  fractionToValue,
  Slider,
  sliderKeyValue,
  snapToStep,
  updateRangeValue,
  valueToPercent,
} from '../components/Slider'
import { addTags, filterTagSuggestions, hasTag, splitTags, TagInput } from '../components/TagInput'
import { renderRu } from './render-ru'

const noop = () => {}

/* --- Slider --- */

describe('Slider: чистые функции', () => {
  it('clampValue держит границы', () => {
    expect(clampValue(-5, 0, 100)).toBe(0)
    expect(clampValue(150, 0, 100)).toBe(100)
    expect(clampValue(42, 0, 100)).toBe(42)
  })

  it('snapToStep: ближайший шаг от min, без хвостов плавающей точки', () => {
    expect(snapToStep(43, 0, 100, 5)).toBe(45)
    expect(snapToStep(42, 0, 100, 5)).toBe(40)
    expect(snapToStep(0.30000000000000004, 0, 1, 0.1)).toBe(0.3)
    expect(snapToStep(0.7, 0, 1, 0.1)).toBe(0.7)
    expect(snapToStep(7, 2, 20, 3)).toBe(8)
    expect(snapToStep(150, 0, 100, 5)).toBe(100)
  })

  it('snapToStep: max вне сетки шага не превышается', () => {
    expect(snapToStep(9.9, 0, 10, 3)).toBe(9)
  })

  it('valueToPercent и fractionToValue', () => {
    expect(valueToPercent(25, 0, 100)).toBe(25)
    expect(valueToPercent(-20, -40, 60)).toBe(20)
    expect(valueToPercent(5, 5, 5)).toBe(0)
    expect(fractionToValue(0.333, 0, 100, 10)).toBe(30)
    expect(fractionToValue(1.4, 0, 100, 10)).toBe(100)
  })

  it('sliderKeyValue: стрелки, крупный шаг, границы', () => {
    const o = { min: 0, max: 100, step: 5 }
    expect(sliderKeyValue('ArrowRight', 50, o)).toBe(55)
    expect(sliderKeyValue('ArrowDown', 50, o)).toBe(45)
    expect(sliderKeyValue('PageUp', 50, o)).toBe(100)
    expect(sliderKeyValue('PageDown', 50, o)).toBe(0)
    expect(sliderKeyValue('PageUp', 50, { ...o, bigStep: 20 })).toBe(70)
    expect(sliderKeyValue('Home', 50, o)).toBe(0)
    expect(sliderKeyValue('End', 50, o)).toBe(100)
    expect(sliderKeyValue('ArrowUp', 100, o)).toBe(100)
    expect(sliderKeyValue('a', 50, o)).toBeNull()
  })

  it('updateRangeValue: бегунки не перескакивают друг друга', () => {
    expect(updateRangeValue([20, 60], 0, 30)).toEqual([30, 60])
    expect(updateRangeValue([20, 60], 0, 80)).toEqual([60, 60])
    expect(updateRangeValue([20, 60], 1, 10)).toEqual([20, 20])
    expect(updateRangeValue([20, 60], 1, 90)).toEqual([20, 90])
  })

  it('closestThumb: ближний бегунок, края - по стороне', () => {
    expect(closestThumb([20, 60], 30)).toBe(0)
    expect(closestThumb([20, 60], 50)).toBe(1)
    expect(closestThumb([20, 60], 5)).toBe(0)
    expect(closestThumb([20, 60], 95)).toBe(1)
    expect(closestThumb([40, 40], 30)).toBe(0)
    expect(closestThumb([40, 40], 50)).toBe(1)
  })
})

describe('Slider: разметка', () => {
  it('одно значение: нативный range с границами и aria-valuetext', () => {
    const out = renderToString(<Slider value={40} onChange={noop} min={0} max={100} step={5} aria-label="Порог загрузки" format={(v) => `${v} %`} />)
    expect(out).toContain('class="ev-slider"')
    expect(out).toContain('type="range"')
    expect(out).toContain('min="0"')
    expect(out).toContain('max="100"')
    expect(out).toContain('step="5"')
    expect(out).toContain('value="40"')
    expect(out).toContain('aria-valuetext="40 %"')
    expect(out).toContain('aria-label="Порог загрузки"')
    expect(out).toContain('left:40%')
    expect(out).not.toContain('role="group"')
  })

  it('по умолчанию число в формате языка', () => {
    const out = renderToString(<Slider value={12500} onChange={noop} max={20000} />)
    expect(out).toContain('aria-valuetext="12,500"')
    const ru = renderRu(<Slider value={12500} onChange={noop} max={20000} />)
    expect(ru).toMatch(/aria-valuetext="12\s500"/)
  })

  it('диапазон: группа, два бегунка «От» / «До», границы бегунков - соседние значения', () => {
    const out = renderRu(<Slider value={[20, 60] as [number, number]} onChange={noop} aria-label="Температура" />)
    expect(out).toContain('role="group"')
    expect(out).toContain('data-range="true"')
    expect(out.match(/type="range"/g)).toHaveLength(2)
    expect(out).toContain('>Температура</span>')
    expect(out).toContain('>От</span>')
    expect(out).toContain('>До</span>')
    // У первого бегунка max - значение второго, у второго min - значение первого.
    expect(out).toMatch(/min="0" max="60" step="1"[^>]*value="20"/)
    expect(out).toMatch(/min="20" max="100" step="1"[^>]*value="60"/)
    expect(out).toMatch(/aria-labelledby="[^"]+-name [^"]+-part0"/)
    expect(out).toContain('left:20%;width:40%')
  })

  it('метки: риски и подписи, крайние прижаты к краям', () => {
    const out = renderToString(
      <Slider
        value={[0, 50] as [number, number]}
        onChange={noop}
        marks={[{ value: 0, label: '0 °C' }, { value: 50 }, { value: 100, label: '100 °C' }]}
      />,
    )
    expect(out.match(/class="ev-slider-tick"/g)).toHaveLength(3)
    expect(out).toContain('data-edge="start"')
    expect(out).toContain('data-edge="end"')
    expect(out).toContain('0 °C')
  })

  it('showValue: значение справа или подсказка над бегунком', () => {
    const inline = renderToString(<Slider value={[10, 30] as [number, number]} onChange={noop} showValue />)
    expect(inline).toContain('class="ev-slider-value ev-num"')
    expect(inline).toContain('10 - 30')
    const tip = renderToString(<Slider value={10} onChange={noop} showValue="tooltip" />)
    expect(tip).toContain('class="ev-slider-bubble ev-num"')
    expect(tip).toContain('data-value-tooltip="true"')
  })

  it('внутри Field: id подписи, описание, disabled', () => {
    const out = renderRu(
      <Field label="Порог" hint="Выше - тревога" disabled>
        <Slider value={70} onChange={noop} />
      </Field>,
    )
    const id = out.match(/<label id="[^"]+" class="ev-field-label" for="([^"]+)"/)![1]
    expect(out).toContain(`id="${id}"`)
    expect(out).toContain(`aria-describedby="${id}-hint"`)
    expect(out).toContain('data-disabled="true"')
    expect(out).toMatch(/type="range"[^>]*disabled=""/)
  })
})

/* --- Chip --- */

describe('Chip', () => {
  it('статичный чип с тоном', () => {
    const out = renderToString(<Chip tone="success">В работе</Chip>)
    expect(out).toContain('class="ev-chip"')
    expect(out).toContain('data-tone="success"')
    expect(out).toContain('<span class="ev-chip-main">')
    expect(out).not.toContain('<button')
  })

  it('удаляемый: кнопка «Убрать» с текстом метки', () => {
    const out = renderRu(<Chip onRemove={noop}>Насос</Chip>)
    expect(out).toContain('aria-label="Убрать «Насос»"')
    expect(out).toContain('data-removable="true"')
    const en = renderToString(
      <Chip onRemove={noop}>
        <b>Pump</b> 3
      </Chip>,
    )
    expect(en).toContain('aria-label="Remove Pump 3"')
  })

  it('фильтр: кнопка aria-pressed, по умолчанию тон accent, галочка у выбранного', () => {
    const on = renderToString(
      <Chip selected onClick={noop}>
        Активные
      </Chip>,
    )
    expect(on).toContain('aria-pressed="true"')
    expect(on).toContain('data-tone="accent"')
    expect(on).toContain('data-selected="true"')
    expect(on).toContain('ev-chip-icon')
    const off = renderToString(
      <Chip selected={false} onClick={noop}>
        Архив
      </Chip>,
    )
    expect(off).toContain('aria-pressed="false"')
    expect(off).not.toContain('ev-chip-icon')
  })

  it('фильтр с крестиком: две соседние кнопки, не вложенные', () => {
    const out = renderToString(
      <Chip selected onClick={noop} onRemove={noop} disabled>
        Склад
      </Chip>,
    )
    expect(out.match(/<button/g)).toHaveLength(2)
    expect(out).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<button/)
    expect(out.match(/disabled=""/g)).toHaveLength(2)
  })

  it('ChipGroup: role="group" только с подписью', () => {
    expect(renderToString(<ChipGroup aria-label="Статусы">x</ChipGroup>)).toContain('role="group"')
    expect(renderToString(<ChipGroup>x</ChipGroup>)).not.toContain('role=')
  })

  it('nodeText собирает текст из вложенных элементов', () => {
    expect(nodeText(['Цех ', <i key="a">№{4}</i>, null, false])).toBe('Цех №4')
  })
})

/* --- TagInput --- */

describe('TagInput: чистые функции', () => {
  it('splitTags: запятая, точка с запятой, перевод строки, табуляция', () => {
    expect(splitTags('насос, клапан;  датчик\nпривод\tфильтр,, ')).toEqual(['насос', 'клапан', 'датчик', 'привод', 'фильтр'])
    expect(splitTags('   ')).toEqual([])
  })

  it('hasTag без учёта регистра и «ё/е»', () => {
    expect(hasTag(['Ёмкость'], 'емкость')).toBe(true)
    expect(hasTag(['Насос'], 'клапан')).toBe(false)
  })

  it('addTags: дубли, пустые, transform', () => {
    const r = addTags(['насос'], [' Насос ', 'КЛАПАН', ''], { transform: (s) => s.toLowerCase() })
    expect(r.value).toEqual(['насос', 'клапан'])
    expect(r.added).toEqual(['клапан'])
    expect(r.rejected).toEqual(['насос'])
    expect(r.error).toEqual({ kind: 'duplicate', tag: 'насос' })
  })

  it('addTags: дубли внутри одной вставки и allowDuplicates', () => {
    expect(addTags([], ['a', 'A']).value).toEqual(['a'])
    expect(addTags([], ['a', 'A'], { allowDuplicates: true }).value).toEqual(['a', 'A'])
  })

  it('addTags: лимит', () => {
    const r = addTags(['a', 'b'], ['c', 'd'], { max: 3 })
    expect(r.value).toEqual(['a', 'b', 'c'])
    expect(r.rejected).toEqual(['d'])
    expect(r.error?.kind).toBe('limit')
  })

  it('addTags: validate - текст ошибки', () => {
    const r = addTags([], ['P-101', 'x'], { validate: (t) => (/^[A-Z]-\d{3}$/.test(t) ? null : 'Формат: P-101') })
    expect(r.value).toEqual(['P-101'])
    expect(r.error).toEqual({ kind: 'invalid', tag: 'x', message: 'Формат: P-101' })
  })

  it('filterTagSuggestions: фильтр, без уже добавленных, лимит', () => {
    const all = ['Насос', 'Насосная станция', 'Клапан', 'Датчик давления']
    expect(filterTagSuggestions(all, 'нас', ['Насос'])).toEqual(['Насосная станция'])
    expect(filterTagSuggestions(all, '', [], { limit: 2 })).toEqual(['Насос', 'Насосная станция'])
    expect(filterTagSuggestions(all, 'нас', ['Насос'], { allowDuplicates: true })).toHaveLength(2)
  })
})

describe('TagInput: разметка', () => {
  it('чипы с крестиками, плейсхолдер из словаря, живой регион', () => {
    const out = renderRu(<TagInput value={['насос', 'клапан']} onChange={noop} />)
    expect(out).toContain('class="ev-input ev-tag-input"')
    expect(out.match(/class="ev-chip"/g)).toHaveLength(2)
    expect(out).toContain('aria-label="Убрать «клапан»"')
    expect(out).toContain('tabindex="-1"')
    expect(out).toContain('placeholder="Введите и нажмите Enter"')
    expect(out).toContain('aria-live="polite"')
    expect(out).not.toContain('role="combobox"')
  })

  it('с подсказками - combobox со свёрнутым списком', () => {
    const out = renderToString(<TagInput value={[]} onChange={noop} suggestions={['pump']} aria-label="Tags" />)
    expect(out).toContain('role="combobox"')
    expect(out).toContain('aria-autocomplete="list"')
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('aria-label="Tags"')
  })

  it('лимит достигнут: подсказка и плейсхолдер с лимитом', () => {
    const out = renderRu(<TagInput value={['a', 'b']} onChange={noop} max={2} />)
    expect(out).toContain('placeholder="Не больше 2"')
    expect(out).toMatch(/aria-live="polite"[^>]*>Не больше 2</)
  })

  it('внутри Field: id, ошибка, размер и скрытое поле формы', () => {
    const out = renderRu(
      <Field label="Метки" error="Нужна хотя бы одна">
        <TagInput value={['x']} onChange={noop} size="sm" name="tags" />
      </Field>,
    )
    const id = out.match(/for="([^"]+)"/)![1]
    expect(out).toContain(`id="${id}"`)
    expect(out).toContain('aria-invalid="true"')
    expect(out).toContain(`aria-describedby="${id}-error"`)
    expect(out).toContain('data-size="sm"')
    expect(out).toContain('type="hidden" name="tags" value="x"')
  })
})

/* --- OtpInput --- */

describe('OtpInput: чистые функции', () => {
  it('sanitizeOtp', () => {
    expect(sanitizeOtp('12-34 5a6')).toBe('123456')
    expect(sanitizeOtp('ab-12 c', 'alphanumeric')).toBe('AB12C')
  })

  it('insertOtp: перезапись, без пропусков, обрезка по длине', () => {
    expect(insertOtp('12', 2, '3', 6)).toEqual({ value: '123', focus: 3 })
    expect(insertOtp('123456', 1, '9', 6)).toEqual({ value: '193456', focus: 2 })
    expect(insertOtp('12', 5, '3', 6)).toEqual({ value: '123', focus: 3 })
    expect(insertOtp('12345', 5, '6', 6)).toEqual({ value: '123456', focus: 5 })
    expect(insertOtp('', 0, '12345678', 6)).toEqual({ value: '123456', focus: 5 })
  })

  it('distributeOtp: полный код с первой ячейки, часть - с текущей', () => {
    expect(distributeOtp('99', 1, '123 456', 6)).toEqual({ value: '123456', focus: 5 })
    expect(distributeOtp('9', 1, '12', 6)).toEqual({ value: '912', focus: 3 })
    expect(distributeOtp('9', 1, 'abc', 6)).toBeNull()
  })

  it('removeOtpAt и typedOtpChars', () => {
    expect(removeOtpAt('123456', 2)).toBe('12456')
    expect(removeOtpAt('12', 5)).toBe('12')
    expect(typedOtpChars('57', '5')).toBe('7')
    expect(typedOtpChars('75', '5')).toBe('7')
    expect(typedOtpChars('7', '5')).toBe('7')
    expect(typedOtpChars('•8', '•')).toBe('8')
  })
})

describe('OtpInput: разметка', () => {
  it('группа, ячейки с подписями, автозаполнение у первой', () => {
    const out = renderRu(<OtpInput value="12" onChange={noop} />)
    expect(out).toContain('role="group"')
    expect(out).toContain('aria-label="Код подтверждения"')
    expect(out.match(/class="ev-otp-box ev-num"/g)).toHaveLength(6)
    expect(out).toContain('aria-label="Цифра 1 из 6"')
    expect(out).toContain('aria-label="Цифра 6 из 6"')
    expect(out.match(/autoComplete="one-time-code"/g)).toHaveLength(1)
    expect(out).toContain('inputMode="numeric"')
    // В порядке табуляции - первая пустая ячейка.
    expect(out.match(/tabindex="0"/g)).toHaveLength(1)
  })

  it('маска, группы, недопустимые символы отброшены', () => {
    const out = renderToString(<OtpInput value="12a3" onChange={noop} mask groupSize={3} length={6} />)
    expect(out.match(/value="•"/g)).toHaveLength(3)
    expect(out.match(/class="ev-otp-sep"/g)).toHaveLength(1)
    expect(out).not.toContain('value="a"')
  })

  it('буквенно-цифровой режим и ошибка', () => {
    const out = renderToString(<OtpInput value="ab" onChange={noop} mode="alphanumeric" length={4} invalid />)
    expect(out).toContain('value="A"')
    expect(out).toContain('inputMode="text"')
    expect(out).toContain('data-invalid="true"')
    expect(out.match(/aria-invalid="true"/g)).toHaveLength(4)
  })

  it('внутри Field: первая ячейка - цель подписи, описание у всех ячеек', () => {
    const out = renderRu(
      <Field label="Код из SMS" hint="Отправлен на +7 900 000-00-00">
        <OtpInput value="" onChange={noop} length={4} name="code" />
      </Field>,
    )
    const id = out.match(/for="([^"]+)"/)![1]
    expect(out).toContain(`id="${id}"`)
    expect(out).toContain(`id="${id}-3"`)
    expect(out.match(new RegExp(`aria-describedby="${id}-hint"`, 'g'))).toHaveLength(4)
    expect(out).toContain('type="hidden" name="code" value=""')
  })
})

/* --- InlineEdit --- */

describe('InlineEdit', () => {
  it('просмотр: кнопка со значением и карандашом «Изменить»', () => {
    const out = renderRu(<InlineEdit value="Долина-1" onSave={noop} />)
    expect(out).toContain('class="ev-inline-edit"')
    expect(out).toContain('class="ev-inline-edit-display"')
    expect(out).toContain('type="button"')
    expect(out).toContain('Долина-1')
    expect(out).toContain('role="img" aria-label="Изменить"')
    expect(out).not.toContain('<input')
  })

  it('пустое значение: текст из словаря или placeholder', () => {
    expect(renderRu(<InlineEdit value="" onSave={noop} />)).toContain('<span class="ev-inline-edit-empty">Не указано</span>')
    expect(renderToString(<InlineEdit value="  " onSave={noop} placeholder="No note" />)).toContain('No note')
    expect(renderToString(<InlineEdit value="" onSave={noop} />)).toContain('data-empty="true"')
  })

  it('renderValue, многострочный режим, disabled', () => {
    const out = renderToString(<InlineEdit value="a" onSave={noop} multiline disabled renderValue={(v) => <b>{v.toUpperCase()}</b>} />)
    expect(out).toContain('<b>A</b>')
    expect(out).toContain('data-multiline="true"')
    expect(out).toMatch(/<button[^>]*disabled=""/)
  })

  it('aria-label без Field: имя из подписи, значения и действия', () => {
    const out = renderToString(<InlineEdit value="North" onSave={noop} aria-label="Facility name" />)
    expect(out).toMatch(/aria-labelledby="([^"]+)-name \1-value \1-edit"/)
    expect(out).toContain('>Facility name</span>')
  })

  it('внутри Field: id кнопки совпадает с for подписи', () => {
    const out = renderRu(
      <Field label="Название" hint="Видно всем">
        <InlineEdit value="Хребет" onSave={noop} />
      </Field>,
    )
    const id = out.match(/for="([^"]+)"/)![1]
    expect(out).toMatch(new RegExp(`<button[^>]*id="${id}"`))
    expect(out).toContain(`aria-describedby="${id}-hint"`)
  })

  it('errorText: сообщение исключения', () => {
    expect(errorText(new Error('Нет связи'))).toBe('Нет связи')
    expect(errorText('Отказано')).toBe('Отказано')
    expect(errorText(404)).toBe('404')
  })
})
