'use client'

import { Button, Field, Input, Modal, NumberInput, Select, Switch } from 'endfield-vision'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { REGIONS } from '@/lib/demo/facility-details'
import { useT, type Bi } from '@/lib/i18n'
import s from './facilities.module.css'

export interface NewFacility {
  name: string
  code: string
  region: Bi
  capacity: number
  staff: number
  active: boolean
}

interface AddFacilityModalProps {
  open: boolean
  onClose: () => void
  onCreate: (f: NewFacility) => void
  existingCodes: string[]
}

/** Окно добавления объекта. Форма монтируется заново при каждом открытии - поля чистые. */
export function AddFacilityModal({ open, ...rest }: AddFacilityModalProps) {
  return open ? <AddFacilityForm {...rest} /> : null
}

type Errors = Partial<Record<'name' | 'code' | 'region' | 'capacity' | 'staff', string>>

const CODE_RE = /^[A-Z]{3}-\d{2}$/

function AddFacilityForm({ onClose, onCreate, existingCodes }: Omit<AddFacilityModalProps, 'open'>) {
  const { t, tx } = useT()
  const formId = useId()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  // Регион - по русскому названию (ключ в REGIONS).
  const [region, setRegion] = useState<string | null>(null)
  const [capacity, setCapacity] = useState<number | null>(800)
  const [staff, setStaff] = useState<number | null>(12)
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  const clear = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 3) e.name = t('Название - не короче 3 символов.', 'Name must be at least 3 characters.')
    if (!CODE_RE.test(code)) e.code = t('Формат кода: три латинские буквы, дефис, две цифры (VAL-03).', 'Code format: three Latin letters, a hyphen, two digits (VAL-03).')
    else if (existingCodes.includes(code)) e.code = t('Объект с таким кодом уже есть.', 'A facility with this code already exists.')
    if (!region) e.region = t('Выберите регион.', 'Choose a region.')
    if (capacity === null || capacity < 50) e.capacity = t('Мощность - не меньше 50 ед. в сутки.', 'Capacity must be at least 50 units per day.')
    if (staff === null || staff < 1) e.staff = t('Нужен хотя бы один сотрудник.', 'At least one employee is required.')
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    const picked = REGIONS.find((r) => r.ru === region)
    if (Object.values(e).some(Boolean) || !picked) return
    setBusy(true)
    await new Promise((r) => window.setTimeout(r, 700))
    onCreate({ name: name.trim(), code, region: picked, capacity: capacity ?? 0, staff: staff ?? 0, active })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="md"
      title={t('Новый объект', 'New facility')}
      subtitle={t(
        'Объект появится в реестре и на обзоре. Персонал и оборудование назначаются после создания.',
        'The facility will appear in the register and on the overview. Staff and equipment are assigned after creation.',
      )}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Отмена', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Plus size={15} />} loading={busy}>
            {t('Добавить', 'Add')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={s.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label={t('Название', 'Name')} required error={errors.name} className={s.formWide}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clear('name')
            }}
            placeholder={t('Например: Долина-3', 'For example: Valley-3')}
            autoFocus
          />
        </Field>
        <Field label={t('Код объекта', 'Facility code')} required error={errors.code} hint={t('Три буквы и номер: VAL-03.', 'Three letters and a number: VAL-03.')}>
          <Input
            value={code}
            className="ev-mono"
            maxLength={6}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              clear('code')
            }}
            placeholder="VAL-03"
          />
        </Field>
        <Field label={t('Регион', 'Region')} required error={errors.region}>
          <Select
            value={region}
            onChange={(v) => {
              setRegion(v)
              clear('region')
            }}
            placeholder={t('Выберите регион', 'Choose a region')}
            options={REGIONS.map((r) => ({ value: r.ru, label: tx(r) }))}
          />
        </Field>
        <Field label={t('Проектная мощность', 'Design capacity')} required error={errors.capacity}>
          <NumberInput
            value={capacity}
            onChange={(v) => {
              setCapacity(v)
              clear('capacity')
            }}
            min={0}
            max={5000}
            step={50}
            stepper
            unit={t('ед./сут', 'units/day')}
          />
        </Field>
        <Field label={t('Персонал по штату', 'Headcount')} required error={errors.staff}>
          <NumberInput
            value={staff}
            onChange={(v) => {
              setStaff(v)
              clear('staff')
            }}
            min={0}
            max={500}
            stepper
            unit={t('чел.', 'people')}
          />
        </Field>
        <div className={s.formWide}>
          <Switch
            checked={active}
            onChange={setActive}
            label={t('Сразу ввести в работу', 'Bring online immediately')}
            description={
              active
                ? t('Объект получит статус «В работе».', 'The facility will be set to Operating.')
                : t('Объект создаётся в статусе «Обслуживание».', 'The facility is created in Maintenance status.')
            }
          />
        </div>
      </form>
    </Modal>
  )
}
