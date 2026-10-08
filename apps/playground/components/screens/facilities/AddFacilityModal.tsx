'use client'

import { Button, Field, Input, Modal, NumberInput, Select, Switch } from 'endfield-vision'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { REGIONS } from '@/lib/demo/facility-details'
import s from './facilities.module.css'

export interface NewFacility {
  name: string
  code: string
  region: string
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
  const formId = useId()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [capacity, setCapacity] = useState<number | null>(800)
  const [staff, setStaff] = useState<number | null>(12)
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  const clear = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 3) e.name = 'Название - не короче 3 символов.'
    if (!CODE_RE.test(code)) e.code = 'Формат кода: три латинские буквы, дефис, две цифры (VAL-03).'
    else if (existingCodes.includes(code)) e.code = 'Объект с таким кодом уже есть.'
    if (!region) e.region = 'Выберите регион.'
    if (capacity === null || capacity < 50) e.capacity = 'Мощность - не меньше 50 ед. в сутки.'
    if (staff === null || staff < 1) e.staff = 'Нужен хотя бы один сотрудник.'
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.values(e).some(Boolean)) return
    setBusy(true)
    await new Promise((r) => window.setTimeout(r, 700))
    onCreate({ name: name.trim(), code, region: region ?? '', capacity: capacity ?? 0, staff: staff ?? 0, active })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="md"
      title="Новый объект"
      subtitle="Объект появится в реестре и на обзоре. Персонал и оборудование назначаются после создания."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={formId} icon={<Plus size={15} />} loading={busy}>
            Добавить
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
        <Field label="Название" required error={errors.name} className={s.formWide}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clear('name')
            }}
            placeholder="Например: Долина-3"
            autoFocus
          />
        </Field>
        <Field label="Код объекта" required error={errors.code} hint="Три буквы и номер: VAL-03.">
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
        <Field label="Регион" required error={errors.region}>
          <Select
            value={region}
            onChange={(v) => {
              setRegion(v)
              clear('region')
            }}
            placeholder="Выберите регион"
            options={REGIONS.map((r) => ({ value: r, label: r }))}
          />
        </Field>
        <Field label="Проектная мощность" required error={errors.capacity}>
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
            unit="ед./сут"
          />
        </Field>
        <Field label="Персонал по штату" required error={errors.staff}>
          <NumberInput
            value={staff}
            onChange={(v) => {
              setStaff(v)
              clear('staff')
            }}
            min={0}
            max={500}
            stepper
            unit="чел."
          />
        </Field>
        <div className={s.formWide}>
          <Switch
            checked={active}
            onChange={setActive}
            label="Сразу ввести в работу"
            description={active ? 'Объект получит статус «В работе».' : 'Объект создаётся в статусе «Обслуживание».'}
          />
        </div>
      </form>
    </Modal>
  )
}
