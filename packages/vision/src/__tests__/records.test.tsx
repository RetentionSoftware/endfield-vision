import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AvatarGroup } from '../components/AvatarGroup'
import { BadgeStack, splitOverflow } from '../components/BadgeStack'
import { CompletenessBadge, completenessTone } from '../components/CompletenessBadge'
import { Avatar, Badge, KeyValueList } from '../components/Display'
import { EditablePanel } from '../components/EditablePanel'
import { RecordHeader } from '../components/RecordHeader'
import { RecordLayout } from '../components/RecordLayout'
import { renderRu } from './render-ru'

/* Блоки карточки сущности: серверный рендер, разметка и ARIA. */

const ru = (el: ReactElement) => renderRu(el).replace(/<!-- -->/g, '')
const en = (el: ReactElement) => renderToString(el).replace(/<!-- -->/g, '')

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('EditablePanel', () => {
  const view = <p>Просмотр</p>
  const edit = <input aria-label="Телефон" />

  it('просмотр: секция с заголовком, кнопка «Изменить» ссылается на заголовок, полей нет', () => {
    const out = ru(
      <EditablePanel title="Основные данные" description="Реквизиты" onSave={() => {}} editContent={edit}>
        {view}
      </EditablePanel>,
    )
    const titleId = /<h2 id="([^"]+)" class="ev-card-title">Основные данные<\/h2>/.exec(out)?.[1]
    expect(titleId).toBeTruthy()
    expect(out).toContain(`aria-labelledby="${titleId}"`)
    expect(out).toContain(`aria-describedby="${titleId}"`)
    expect(out).toContain('class="ev-card ev-edit-panel ev-corners"')
    expect(out).toContain('data-corners="off"')
    expect(out).toContain('>Изменить<')
    expect(out).toContain('<p class="ev-card-desc">Реквизиты</p>')
    expect(out).toContain('<p>Просмотр</p>')
    expect(out).not.toContain('<input')
    expect(out).not.toContain('data-editing')
    expect(out).not.toContain('>Сохранить<')
  })

  it('canEdit={false}: без кнопки правки, extraActions остаются', () => {
    const out = ru(
      <EditablePanel title="Блок" onSave={() => {}} canEdit={false} extraActions={<button type="button">Журнал</button>}>
        {view}
      </EditablePanel>,
    )
    expect(out).not.toContain('Изменить')
    expect(out).toContain('>Журнал<')
  })

  it('canEdit={false} не даёт войти в правку даже при editing', () => {
    const out = ru(
      <EditablePanel title="Блок" onSave={() => {}} canEdit={false} editing editContent={edit}>
        {view}
      </EditablePanel>,
    )
    expect(out).not.toContain('<input')
    expect(out).toContain('<p>Просмотр</p>')
  })

  it('правка: поля, «Отмена» и «Сохранить», уголки, extraActions скрыты', () => {
    const out = ru(
      <EditablePanel title="Контакты" onSave={() => {}} editing extraActions={<span>Доп</span>} renderEdit={() => edit}>
        {view}
      </EditablePanel>,
    )
    expect(out).toContain('data-editing="true"')
    expect(out).toContain('data-corners="diagonal"')
    expect(out).toContain('aria-label="Телефон"')
    expect(out).toContain('>Отмена<')
    expect(out).toContain('>Сохранить<')
    expect(out).not.toContain('>Изменить<')
    expect(out).not.toContain('Доп')
    expect(out).not.toContain('<p>Просмотр</p>')
    expect(out).not.toContain('role="alert"')
  })

  it('renderEdit важнее editContent; уровень заголовка настраивается', () => {
    const out = ru(
      <EditablePanel title="Блок" onSave={() => {}} defaultEditing headingLevel={3} editContent={<b>старое</b>} renderEdit={() => <i>новое</i>} />,
    )
    expect(out).toContain('<i>новое</i>')
    expect(out).not.toContain('<b>старое</b>')
    expect(out).toContain('<h3 ')
  })

  it('английский словарь', () => {
    const out = en(
      <EditablePanel title="Contacts" onSave={() => {}} editing editContent={edit}>
        {view}
      </EditablePanel>,
    )
    expect(out).toContain('>Cancel<')
    expect(out).toContain('>Save<')
  })
})

describe('RecordHeader', () => {
  it('аватар из имени, заголовок h1, бейджи, идентификаторы с копированием, действия', () => {
    const out = ru(
      <RecordHeader
        avatar="Северный терминал"
        title="Северный терминал"
        subtitle="Логистический объект"
        meta={<Badge tone="success">Работает</Badge>}
        identifiers={[
          { label: 'Код', value: 'NT-0042', copy: true, copyLabel: 'Скопировать код' },
          { label: 'Договор', value: 'Д-118/24' },
        ]}
        actions={<button type="button">Действие</button>}
        breadcrumbs={[{ label: 'Объекты', href: '/objects' }, { label: 'Северный терминал' }]}
      />,
    )
    expect(out).toContain('class="ev-record-header"')
    expect(out).toContain('<h1 class="ev-record-title">Северный терминал</h1>')
    expect(out).toContain('class="ev-avatar"')
    expect(out).toContain('>СТ<')
    expect(out).toContain('<p class="ev-record-subtitle">Логистический объект</p>')
    expect(out).toContain('>Работает<')
    expect(out).toContain('aria-label="Скопировать код: NT-0042"')
    expect(out).toContain('<dt class="ev-record-id-label">Договор</dt>')
    expect(out).toContain('<span class="ev-mono">Д-118/24</span>')
    expect(out).toContain('class="ev-record-actions"')
    expect(out).toContain('aria-label="Навигационная цепочка"')
    // Без тона - без уголков.
    expect(out).not.toContain('ev-corners')
  })

  it('tone - уголки видоискателя в цвете тона; stats - список показателей', () => {
    const out = ru(
      <RecordHeader
        title="Объект"
        tone="warning"
        animate={false}
        stats={[
          { label: 'Заявки', value: '128' },
          { label: 'Просрочено', value: '3', tone: 'danger', hint: 'за месяц' },
        ]}
      />,
    )
    expect(out).toContain('class="ev-panel ev-record-hero ev-corners" data-tone="warning" data-corners="diagonal"')
    expect(out).toContain('<dl class="ev-record-stats">')
    expect(out).toContain('<dt class="ev-record-stat-label">Заявки</dt>')
    expect(out).toContain('128')
    expect(out).toContain('data-tone="danger"')
    expect(out).toContain('<span class="ev-record-stat-hint">за месяц</span>')
    expect(out).not.toContain('ev-record-avatar')
    expect(out).not.toContain('ev-crumbs')
  })

  it('уровень заголовка и узел вместо аватара', () => {
    const out = ru(<RecordHeader title="Т" headingLevel={2} avatar={<span className="icon-x" />} />)
    expect(out).toContain('<h2 class="ev-record-title">')
    expect(out).toContain('<span class="icon-x"></span>')
  })
})

describe('RecordLayout', () => {
  it('основная и боковая колонки, ширина, прилипание, порядок на узком экране', () => {
    const out = ru(<RecordLayout main={<p>M</p>} side={<p>S</p>} sideWidth={300} sticky sideFirstOnMobile sideLabel="Сводка" />)
    expect(out).toContain('data-side="true"')
    expect(out).toContain('data-sticky="true"')
    expect(out).toContain('data-side-first="true"')
    expect(out).toContain('--ev-record-side-w:300px')
    expect(out).toContain('<aside class="ev-record-side" aria-label="Сводка"><p>S</p></aside>')
    expect(out.indexOf('class="ev-record-main"')).toBeLessThan(out.indexOf('class="ev-record-side"'))
  })

  it('без боковой колонки - одна колонка, без aside и признаков', () => {
    const out = ru(<RecordLayout main={<p>M</p>} sticky sideWidth="24rem" />)
    expect(out).not.toContain('<aside')
    expect(out).not.toContain('data-side')
    expect(out).not.toContain('data-sticky')
    expect(out).toContain('--ev-record-side-w:24rem')
  })
})

describe('CompletenessBadge', () => {
  it('completenessTone: незаполненные - severity, только сроки - warning, иначе success', () => {
    expect(completenessTone(0, 0)).toBe('success')
    expect(completenessTone(2, 0)).toBe('warning')
    expect(completenessTone(2, 0, 'danger')).toBe('danger')
    expect(completenessTone(0, 1)).toBe('warning')
    expect(completenessTone(0, 1, 'danger')).toBe('warning')
    expect(completenessTone(1, 3, 'danger')).toBe('danger')
  })

  it('всё заполнено: зелёный бейдж «Заполнено», не фокусируется', () => {
    const out = ru(<CompletenessBadge />)
    expect(out).toContain('data-tone="success"')
    expect(out).toContain('>Заполнено<')
    expect(out).not.toContain('tabindex')
    expect(out).not.toContain('<button')
  })

  it('свой текст для заполненного', () => {
    expect(ru(<CompletenessBadge completeLabel="Активен" />)).toContain('>Активен<')
  })

  it('незаполненные: «Не заполнено: N», тон по severity, бейдж фокусируется для подсказки', () => {
    const out = ru(<CompletenessBadge missing={['Телефон', { key: 'email', label: 'E-mail' }]} severity="danger" />)
    expect(out).toContain('data-tone="danger"')
    expect(out).toContain('>Не заполнено: 2<')
    expect(out).toContain('tabindex="0"')
    expect(out).not.toContain('<button')
  })

  it('только сроки: «Истекает срок», warning', () => {
    const out = ru(<CompletenessBadge expiring={[{ label: 'Допуск', date: '12.11.2026' }]} />)
    expect(out).toContain('data-tone="warning"')
    expect(out).toContain('>Истекает срок<')
  })

  it('onItemClick: бейдж - кнопка открытия списка', () => {
    const out = ru(<CompletenessBadge missing={['ИНН']} onItemClick={() => {}} size="sm" />)
    expect(out).toContain('<button')
    expect(out).toContain('type="button"')
    expect(out).toContain('aria-haspopup="dialog"')
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('data-size="sm"')
  })

  it('английский словарь', () => {
    expect(en(<CompletenessBadge missing={['Phone', 'Email', 'Tax ID']} />)).toContain('>3 missing<')
    expect(en(<CompletenessBadge />)).toContain('>Complete<')
  })
})

describe('KeyValueList: незаполненное поле', () => {
  it('missing: дефис скрыт от скринридера, метка и текст «Не заполнено», id строки', () => {
    const out = ru(
      <KeyValueList
        items={[
          { key: 'phone', label: 'Телефон', value: '+7 900 000-00-00' },
          { key: 'email', label: 'E-mail', value: null, missing: true, id: 'field-email' },
        ]}
      />,
    )
    expect(count(out, 'data-missing="true"')).toBe(1)
    expect(out).toContain('id="field-email"')
    expect(out).toContain('<span class="ev-empty-value" aria-hidden="true">-</span>')
    expect(out).toContain('class="ev-kv-missing"')
    expect(out).toContain('<span class="ev-visually-hidden">Не заполнено</span>')
  })

  it('без missing разметка прежняя', () => {
    const out = ru(<KeyValueList items={[{ key: 'a', label: 'A', value: '' }]} />)
    expect(out).toContain('<span class="ev-empty-value">-</span>')
    expect(out).not.toContain('data-missing')
    expect(out).not.toContain('ev-kv-missing')
  })
})

describe('splitOverflow', () => {
  it('делит на видимые и остаток', () => {
    expect(splitOverflow([1, 2, 3, 4], 2)).toEqual({ visible: [1, 2], hidden: [3, 4] })
    expect(splitOverflow([1, 2], 5)).toEqual({ visible: [1, 2], hidden: [] })
    expect(splitOverflow([1, 2], 0)).toEqual({ visible: [], hidden: [1, 2] })
    expect(splitOverflow([1, 2], -3)).toEqual({ visible: [], hidden: [1, 2] })
    expect(splitOverflow([1, 2, 3], 1.7)).toEqual({ visible: [1], hidden: [2, 3] })
  })
})

describe('BadgeStack', () => {
  const items = [
    { id: 'a', label: 'Администратор', tone: 'accent' as const },
    { id: 'b', label: 'Диспетчер' },
    { id: 'c', label: 'Аудитор' },
  ]

  it('по умолчанию виден один бейдж и «+2» с текстом для скринридера', () => {
    const out = ru(<BadgeStack items={items} />)
    expect(out).toContain('>Администратор<')
    expect(out).not.toContain('>Диспетчер<')
    expect(out).toContain('<span aria-hidden="true">+2</span>')
    expect(out).toContain('<span class="ev-visually-hidden">Ещё 2</span>')
    expect(out).toContain('tabindex="0"')
  })

  it('max покрывает все - без «+K»', () => {
    const out = ru(<BadgeStack items={items} max={3} />)
    expect(count(out, 'class="ev-badge"')).toBe(3)
    expect(out).not.toContain('ev-badge-stack-more')
  })

  it('children вместо items, размер', () => {
    const out = ru(
      <BadgeStack max={2} size="sm">
        <Badge>Один</Badge>
        <Badge>Два</Badge>
        <Badge>Три</Badge>
      </BadgeStack>,
    )
    expect(out).toContain('>Один<')
    expect(out).toContain('>Два<')
    expect(out).not.toContain('>Три<')
    expect(out).toContain('+1')
    expect(out).toContain('data-size="sm"')
  })

  it('пустой список - empty или ничего', () => {
    expect(ru(<BadgeStack items={[]} />)).toBe('')
    expect(ru(<BadgeStack items={[]} empty="-" />)).toBe('-')
  })

  it('английский словарь', () => {
    expect(en(<BadgeStack items={items} />)).toContain('>2 more<')
  })
})

describe('AvatarGroup', () => {
  const people = ['Алина Воронцова', 'Глеб Сорокин', 'Ирина Лебедева', 'Тимур Ахмедов', 'Мария Котова', 'Павел Гусев'].map((name) => ({ name }))

  it('группа с подписью, max аватаров с именами, «+K»', () => {
    const out = ru(<AvatarGroup items={people} max={3} size={32} label="Команда" />)
    expect(out).toContain('role="group"')
    expect(out).toContain('aria-label="Команда"')
    expect(count(out, 'class="ev-avatar-group-item"')).toBe(3)
    expect(out).toContain('aria-label="Алина Воронцова"')
    expect(out).not.toContain('Тимур Ахмедов')
    expect(out).toContain('<span aria-hidden="true">+3</span>')
    expect(out).toContain('<span class="ev-visually-hidden">Ещё 3</span>')
    expect(out).toContain('--ev-avatar-group-size:32px')
  })

  it('все помещаются - без «+K»; пустая группа не рендерится', () => {
    expect(ru(<AvatarGroup items={people.slice(0, 2)} />)).not.toContain('ev-avatar-group-more')
    expect(ru(<AvatarGroup items={[]} />)).toBe('')
  })

  it('статус участника - в подписи аватара', () => {
    const out = ru(<AvatarGroup items={[{ name: 'Глеб Сорокин', status: 'online' }]} />)
    expect(out).toContain('aria-label="Глеб Сорокин. В сети"')
  })
})

describe('Avatar: присутствие', () => {
  it('без статуса разметка прежняя', () => {
    const out = ru(<Avatar name="Иван Петров" alt="Иван Петров" className="x" />)
    expect(out.startsWith('<span class="ev-avatar x"')).toBe(true)
    expect(out).toContain('role="img"')
    expect(out).toContain('aria-label="Иван Петров"')
    expect(out).not.toContain('ev-avatar-presence')
  })

  it('статус с подписью: обёртка role=img, подпись с текстом статуса, точка скрыта', () => {
    const out = ru(<Avatar name="Иван Петров" alt="Иван Петров" status="busy" size={40} className="x" />)
    expect(out).toContain('class="ev-avatar-presence x" data-status="busy"')
    expect(out).toContain('aria-label="Иван Петров. Занят"')
    expect(out).toContain('<span class="ev-avatar-status" aria-hidden="true"></span>')
    expect(out).toContain('--ev-presence-dot:11px')
    // Сам круг внутри обёртки скрыт - подпись одна.
    expect(out).toContain('class="ev-avatar" data-tone=')
    expect(count(out, 'role="img"')).toBe(1)
  })

  it('декоративный аватар со статусом: статус текстом для скринридера', () => {
    const out = ru(<Avatar name="Иван Петров" status="away" />)
    expect(out).not.toContain('role="img"')
    expect(out).toContain('<span class="ev-visually-hidden">Нет на месте</span>')
  })

  it('не в сети с lastSeen: время в тексте статуса', () => {
    const out = ru(<Avatar name="Иван Петров" status="offline" lastSeen="вчера в 18:20" />)
    expect(out).toContain('data-status="offline"')
    expect(out).toContain('Не в сети. В сети вчера в 18:20')
  })

  it('lastSeen без offline не показывается; английский словарь', () => {
    const out = en(<Avatar name="Ivan Petrov" alt="Ivan Petrov" status="online" lastSeen="yesterday" />)
    expect(out).toContain('aria-label="Ivan Petrov. Online"')
    expect(out).not.toContain('Last seen')
  })
})
