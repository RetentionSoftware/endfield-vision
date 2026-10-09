'use client'

import {
  Avatar,
  AvatarGroup,
  Badge,
  BadgeStack,
  Button,
  Card,
  CompletenessBadge,
  EditablePanel,
  Field,
  Input,
  KeyValueList,
  Progress,
  RecordHeader,
  RecordLayout,
  StatusPill,
  Textarea,
  toast,
  type AvatarGroupItem,
  type BadgeStackItem,
  type KeyValueItem,
  type PresenceStatus,
} from 'endfield-vision'
import { Building2, FileText, Mail, Plus, Users } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import { useT, type Translator } from '@/lib/i18n'

/*
 * Карточка контрагента - пример сборки карточки сущности: шапка с
 * идентификаторами и цифрами, блоки с правкой на месте, боковая колонка
 * с полнотой данных, командой и тегами. Сохранение «Основных данных»
 * падает на ИНН не из 10 или 12 цифр - так видно ошибку под шапкой блока.
 */

type T = Translator['t']

interface General {
  name: string
  inn: string
  kpp: string
  address: string
}

interface Contacts {
  person: string
  phone: string
  email: string
  site: string
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function initialGeneral(t: T): General {
  return {
    name: t('ООО «Хребет-Сервис»', 'Ridge Service LLC'),
    inn: '7714058236',
    kpp: '',
    address: t('г. Северск, ул. Заводская, 14, стр. 2', '14 Zavodskaya St, bldg 2, Seversk'),
  }
}

function initialContacts(t: T): Contacts {
  return {
    person: t('Олег Румянцев, главный инженер', 'Oleg Rumyantsev, chief engineer'),
    phone: '+7 913 482-17-06',
    email: '',
    site: 'ridge-service.example',
  }
}

function team(t: T): AvatarGroupItem[] {
  return [
    { id: 'vorontsova', name: t('Алина Воронцова', 'Alina Vorontsova'), status: 'online' },
    { id: 'sorokin', name: t('Глеб Сорокин', 'Gleb Sorokin'), status: 'busy' },
    { id: 'lebedeva', name: t('Ирина Лебедева', 'Irina Lebedeva'), status: 'away' },
    { id: 'akhmedov', name: t('Тимур Ахмедов', 'Timur Akhmedov'), status: 'offline' },
    { id: 'kotova', name: t('Мария Котова', 'Maria Kotova') },
    { id: 'gusev', name: t('Павел Гусев', 'Pavel Gusev') },
    { id: 'ershov', name: t('Святослав Ершов', 'Svyatoslav Ershov') },
  ]
}

function tags(t: T): BadgeStackItem[] {
  return [
    { id: 'key', label: t('Ключевой', 'Key account'), tone: 'accent' },
    { id: 'sro', label: t('Допуск СРО', 'SRO permit'), tone: 'info' },
    { id: 'north', label: t('Северный сектор', 'North sector') },
    { id: 'vat', label: t('С НДС', 'VAT payer') },
    { id: 'edo', label: t('ЭДО', 'E-invoicing') },
  ]
}

function works(t: T): BadgeStackItem[] {
  return [
    { id: 'hvac', label: t('Вентиляция', 'Ventilation'), tone: 'violet' },
    { id: 'power', label: t('Электроснабжение', 'Power supply'), tone: 'violet' },
    { id: 'lift', label: t('Подъёмные механизмы', 'Lifting equipment'), tone: 'violet' },
    { id: 'fire', label: t('Пожарная автоматика', 'Fire safety systems'), tone: 'violet' },
  ]
}

/** Фокус на поле после того, как блок открылся на правку (EditablePanel уже поставил фокус на первое поле). */
function focusField(id: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) el.focus()
  })
}

function CounterpartyCard() {
  const { t } = useT()
  const uid = useId()
  const fid = (key: string) => `${uid}-${key}`

  const [general, setGeneral] = useState<General>(() => initialGeneral(t))
  const [generalDraft, setGeneralDraft] = useState<General>(general)
  const [editingGeneral, setEditingGeneral] = useState(false)

  const [contacts, setContacts] = useState<Contacts>(() => initialContacts(t))
  const [contactsDraft, setContactsDraft] = useState<Contacts>(contacts)
  const [editingContacts, setEditingContacts] = useState(false)

  // Вход в правку - черновик из сохранённых данных (повторный вход из бейджа полноты черновик не сбрасывает).
  const openGeneral = (next: boolean) => {
    if (next && !editingGeneral) setGeneralDraft(general)
    setEditingGeneral(next)
  }
  const openContacts = (next: boolean) => {
    if (next && !editingContacts) setContactsDraft(contacts)
    setEditingContacts(next)
  }

  const saveGeneral = async () => {
    await wait(700)
    const inn = generalDraft.inn.replace(/\s/g, '')
    if (!/^(\d{10}|\d{12})$/.test(inn)) {
      throw new Error(t('Сервер отклонил запись: ИНН должен содержать 10 или 12 цифр.', 'The server rejected the record: a Tax ID must have 10 or 12 digits.'))
    }
    setGeneral({ ...generalDraft, inn })
    toast.success(t('Основные данные сохранены', 'General details saved'))
  }

  const saveContacts = async () => {
    await wait(600)
    setContacts(contactsDraft)
    toast.success(t('Контакты сохранены', 'Contacts saved'))
  }

  // Обязательные поля карточки: что не заполнено - в бейдж полноты и пометку в списке.
  const required = [
    { key: 'kpp', label: t('КПП', 'Tax registration code'), filled: general.kpp.trim() !== '', panel: 'general' as const },
    { key: 'email', label: t('E-mail', 'Email'), filled: contacts.email.trim() !== '', panel: 'contacts' as const },
  ]
  const missing = required.filter((f) => !f.filled)
  const totalFields = 8
  const filledFields = totalFields - missing.length

  const jumpTo = (key: string) => {
    const field = required.find((f) => f.key === key)
    if (field?.panel === 'general') openGeneral(true)
    else if (field?.panel === 'contacts') openContacts(true)
    else {
      toast.info(t('Продление допуска - в разделе «Документы»', 'Permit renewal is in the Documents section'))
      return
    }
    focusField(fid(key))
  }

  const generalItems: KeyValueItem[] = [
    { key: 'name', label: t('Полное наименование', 'Legal name'), value: general.name },
    { key: 'inn', label: t('ИНН', 'Tax ID'), value: general.inn, mono: true },
    { key: 'kpp', label: t('КПП', 'Tax registration code'), value: general.kpp, mono: true, missing: !general.kpp.trim() },
    { key: 'address', label: t('Юридический адрес', 'Registered address'), value: general.address },
    {
      key: 'works',
      label: t('Виды работ', 'Scope of work'),
      value: <BadgeStack items={works(t)} max={2} size="sm" />,
    },
  ]

  const contactItems: KeyValueItem[] = [
    { key: 'person', label: t('Контактное лицо', 'Contact person'), value: contacts.person },
    { key: 'phone', label: t('Телефон', 'Phone'), value: contacts.phone, mono: true },
    { key: 'email', label: t('E-mail', 'Email'), value: contacts.email, missing: !contacts.email.trim() },
    { key: 'site', label: t('Сайт', 'Website'), value: contacts.site },
  ]

  return (
    <div className="ev-stack">
      <RecordHeader
        breadcrumbs={[{ label: t('Контрагенты', 'Counterparties') }, { label: general.name }]}
        headingLevel={2}
        avatar={<Avatar name={t('Хребет Сервис', 'Ridge Service')} size={56} tone="accent" />}
        title={general.name}
        subtitle={t('Подрядчик по обслуживанию оборудования, Северный сектор', 'Equipment maintenance contractor, North sector')}
        meta={
          <>
            <StatusPill tone="success">{t('Договор действует', 'Contract active')}</StatusPill>
            <Badge tone="violet">{t('Подрядчик', 'Contractor')}</Badge>
          </>
        }
        identifiers={[
          { label: t('Код', 'Code'), value: 'CP-0187', copy: true, copyLabel: t('Скопировать код', 'Copy code') },
          { label: t('ИНН', 'Tax ID'), value: general.inn, copy: true, copyLabel: t('Скопировать ИНН', 'Copy Tax ID') },
          { label: t('Договор', 'Contract'), value: 'CN-118/26' },
        ]}
        stats={[
          { key: 'open', label: t('Открытые наряды', 'Open work orders'), value: '7' },
          { key: 'done', label: t('Выполнено за месяц', 'Completed this month'), value: '42' },
          { key: 'late', label: t('Просрочено', 'Overdue'), value: '2', tone: 'danger', hint: t('за 30 дней', 'last 30 days') },
          { key: 'sum', label: t('Оплачено в 2026', 'Paid in 2026'), value: t('4 860 000 ₽', '₽4,860,000') },
        ]}
        tone="warning"
        actions={
          <>
            <Button variant="secondary" icon={<Mail size={15} />} onClick={() => toast.info(t('Письмо подготовлено', 'Email draft created'))}>
              {t('Написать', 'Message')}
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => toast.info(t('Новый наряд', 'New work order'))}>
              {t('Создать наряд', 'New work order')}
            </Button>
          </>
        }
      />

      <RecordLayout
        sticky
        sideLabel={t('Сводка по контрагенту', 'Counterparty summary')}
        main={
          <>
            <EditablePanel
              title={t('Основные данные', 'General details')}
              description={t('Чтобы увидеть ошибку сохранения, укажите ИНН не из 10 или 12 цифр.', 'To see a save error, enter a Tax ID that is not 10 or 12 digits long.')}
              icon={<Building2 size={16} />}
              editing={editingGeneral}
              onEditingChange={openGeneral}
              onSave={saveGeneral}
              renderEdit={() => (
                <div className="ev-stack">
                  <Field label={t('Полное наименование', 'Legal name')} id={fid('name')} required>
                    <Input value={generalDraft.name} onChange={(e) => setGeneralDraft({ ...generalDraft, name: e.target.value })} />
                  </Field>
                  <Field label={t('ИНН', 'Tax ID')} id={fid('inn')} required hint={t('10 цифр для организации, 12 - для ИП', '10 digits for a company, 12 for a sole trader')}>
                    <Input inputMode="numeric" value={generalDraft.inn} onChange={(e) => setGeneralDraft({ ...generalDraft, inn: e.target.value })} />
                  </Field>
                  <Field label={t('КПП', 'Tax registration code')} id={fid('kpp')}>
                    <Input inputMode="numeric" value={generalDraft.kpp} onChange={(e) => setGeneralDraft({ ...generalDraft, kpp: e.target.value })} />
                  </Field>
                  <Field label={t('Юридический адрес', 'Registered address')} id={fid('address')}>
                    <Textarea rows={2} autoResize value={generalDraft.address} onChange={(e) => setGeneralDraft({ ...generalDraft, address: e.target.value })} />
                  </Field>
                </div>
              )}
            >
              <KeyValueList items={generalItems} />
            </EditablePanel>

            <EditablePanel
              title={t('Контакты', 'Contacts')}
              icon={<Users size={16} />}
              editing={editingContacts}
              onEditingChange={openContacts}
              onSave={saveContacts}
              extraActions={
                <Button size="sm" variant="ghost" icon={<FileText size={13} />} onClick={() => toast.info(t('Журнал изменений', 'Change log'))}>
                  {t('Журнал', 'History')}
                </Button>
              }
              renderEdit={() => (
                <div className="ev-stack">
                  <Field label={t('Контактное лицо', 'Contact person')} id={fid('person')}>
                    <Input value={contactsDraft.person} onChange={(e) => setContactsDraft({ ...contactsDraft, person: e.target.value })} />
                  </Field>
                  <Field label={t('Телефон', 'Phone')} id={fid('phone')}>
                    <Input type="tel" value={contactsDraft.phone} onChange={(e) => setContactsDraft({ ...contactsDraft, phone: e.target.value })} />
                  </Field>
                  <Field label={t('E-mail', 'Email')} id={fid('email')}>
                    <Input type="email" value={contactsDraft.email} onChange={(e) => setContactsDraft({ ...contactsDraft, email: e.target.value })} />
                  </Field>
                  <Field label={t('Сайт', 'Website')} id={fid('site')}>
                    <Input value={contactsDraft.site} onChange={(e) => setContactsDraft({ ...contactsDraft, site: e.target.value })} />
                  </Field>
                </div>
              )}
            >
              <KeyValueList items={contactItems} />
            </EditablePanel>
          </>
        }
        side={
          <>
            <Card title={t('Полнота данных', 'Data completeness')} description={t('Нажмите на бейдж, чтобы перейти к полю.', 'Click the badge to jump to a field.')}>
              <div className="ev-stack">
                <CompletenessBadge
                  missing={missing.map((f) => ({ key: f.key, label: f.label }))}
                  expiring={[{ key: 'permit', label: t('Допуск СРО', 'SRO permit'), date: t('до 12.11.2026', 'until 12.11.2026') }]}
                  completeLabel={t('Всё заполнено', 'All filled in')}
                  onItemClick={jumpTo}
                />
                <Progress
                  value={filledFields}
                  max={totalFields}
                  tone={missing.length > 0 ? 'warning' : 'success'}
                  size="sm"
                  label={t('Заполнено полей', 'Fields filled in')}
                  showValue={(v, m) => `${Math.round(v)} / ${m}`}
                />
              </div>
            </Card>

            <Card title={t('Команда', 'Team')} description={t('Кто ведёт контрагента', 'Who manages this counterparty')}>
              <div className="ev-stack">
                <div className="ev-row" data-nowrap="" style={{ '--ev-gap': 'var(--ev-space-4)' } as CSSProperties}>
                  <Avatar name={t('Ирина Лебедева', 'Irina Lebedeva')} size={40} status="offline" lastSeen={t('вчера в 18:20', 'yesterday at 18:20')} />
                  <div>
                    <div>{t('Ирина Лебедева', 'Irina Lebedeva')}</div>
                    <div className="ev-muted" style={{ fontSize: 'var(--ev-fs-xs)' }}>
                      {t('Ответственный менеджер', 'Account manager')}
                    </div>
                  </div>
                </div>
                <AvatarGroup items={team(t)} max={5} size={32} label={t('Команда контрагента', 'Counterparty team')} />
              </div>
            </Card>

            <Card title={t('Теги', 'Tags')}>
              <BadgeStack items={tags(t)} max={2} />
            </Card>
          </>
        }
      />
    </div>
  )
}

const STATUSES: PresenceStatus[] = ['online', 'away', 'busy', 'offline']

/** Состояния по отдельности: присутствие, полнота, стопка бейджей. */
function VariantsCard() {
  const { t } = useT()
  const name = t('Глеб Сорокин', 'Gleb Sorokin')
  return (
    <Card
      title={t('Состояния', 'States')}
      description={t(
        'Присутствие у Avatar (status, lastSeen), тона CompletenessBadge (severity), BadgeStack с max 1 и 2.',
        'Avatar presence (status, lastSeen), CompletenessBadge tones (severity), BadgeStack with max 1 and 2.',
      )}
    >
      <div className="ev-stack">
        <div className="ev-row" style={{ '--ev-gap': 'var(--ev-space-6)' } as CSSProperties}>
          {STATUSES.map((s) => (
            <Avatar key={s} name={name} alt={name} size={40} status={s} lastSeen={s === 'offline' ? t('10 минут назад', '10 minutes ago') : undefined} />
          ))}
        </div>
        <div className="ev-row">
          <CompletenessBadge />
          <CompletenessBadge missing={[t('Телефон', 'Phone'), t('Адрес', 'Address')]} />
          <CompletenessBadge missing={[t('ИНН', 'Tax ID')]} severity="danger" />
          <CompletenessBadge expiring={[{ label: t('Медосмотр', 'Medical check'), date: t('до 20.10.2026', 'until 20.10.2026') }]} size="sm" />
        </div>
        <div className="ev-row">
          <BadgeStack items={tags(t)} />
          <BadgeStack items={works(t)} max={2} size="sm" />
        </div>
      </div>
    </Card>
  )
}

/** Витрина группы «Карточка сущности». */
export function RecordCards() {
  const { lang } = useT()
  return (
    <div className="ev-stack">
      {/* Данные карточки хранятся в состоянии: при смене языка - новый экземпляр. */}
      <CounterpartyCard key={lang} />
      <VariantsCard />
    </div>
  )
}
