'use client'

import {
  addDaysIso,
  Avatar,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  IconButton,
  normalizeSearch,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Select,
  Sparkline,
  StatTile,
  toast,
  useModals,
  type ModalHandle,
  type SortState,
} from 'endfield-vision'
import {
  Activity,
  Download,
  LayoutGrid,
  MailPlus,
  Rows3,
  Send,
  Trash2,
  UserPlus,
  Users,
  UserRoundCheck,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { TODAY } from '@/lib/demo/tasks'
import {
  CURRENT_USER_ID,
  INVITE_BASE_URL,
  INVITES,
  PEOPLE,
  personName,
  ROLES,
  type Invite,
  type Person,
  type Role,
} from '@/lib/demo/team'
import { formatDate, plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { NoPeople, PeopleGrid, PeopleTable, type PersonActions } from './PeopleViews'
import {
  emptyInvite,
  InviteForm,
  ROLE_OPTIONS,
  RoleForm,
  validateInvite,
  type InviteDraft,
  type RoleDraft,
} from './TeamForms'
import s from './team.module.css'

type PresenceFilter = 'all' | 'shift' | 'vacation'
type View = 'table' | 'cards'

const ROLE_ORDER: Role[] = ['admin', 'manager', 'engineer', 'analyst', 'operator']

function token(seed: string): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let h = 7
  let out = ''
  for (let i = 0; i < 10; i++) {
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0) + i) % 1_000_003
    out += abc[h % abc.length]
  }
  return out
}

function compare(a: Person, b: Person, key: string): number {
  switch (key) {
    case 'role':
      return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    case 'load':
      return a.load - b.load
    case 'lastSeen':
      return a.lastSeen.localeCompare(b.lastSeen)
    default:
      return a.name.localeCompare(b.name, 'ru')
  }
}

export function TeamScreen() {
  const modals = useModals()
  const [people, setPeople] = useState<Person[]>(PEOPLE)
  const [invites, setInvites] = useState<Invite[]>(INVITES)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [presence, setPresence] = useState<PresenceFilter>('all')
  const [view, setView] = useState<View>('table')
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })

  const active = people.filter((p) => p.active)
  const working = active.filter((p) => p.presence !== 'vacation')
  const avgLoad = working.length ? Math.round(working.reduce((a, p) => a + p.load, 0) / working.length) : 0
  const onShift = active.filter((p) => p.presence === 'shift').length
  const onVacation = active.filter((p) => p.presence === 'vacation').length
  const drafts = invites.filter((i) => !i.sentAt).length

  const filtered = useMemo(() => {
    const needle = normalizeSearch(q)
    const digits = q.replace(/\D/g, '')
    const list = people.filter((p) => {
      if (role && p.role !== role) return false
      if (presence !== 'all' && (!p.active || p.presence !== presence)) return false
      if (!needle) return true
      if (digits.length >= 3 && p.phone.includes(digits)) return true
      return normalizeSearch(`${p.name} ${p.position} ${p.email}`).includes(needle)
    })
    if (sort) {
      const k = sort.dir === 'asc' ? 1 : -1
      list.sort((a, b) => compare(a, b, sort.key) * k || a.name.localeCompare(b.name, 'ru'))
    }
    return list
  }, [people, q, role, presence, sort])

  const patch = (id: string, fn: (p: Person) => Person) =>
    setPeople((list) => list.map((p) => (p.id === id ? fn(p) : p)))

  const actions: PersonActions = {
    editRole: (p) => {
      let draft: RoleDraft = { role: p.role, access: p.access }
      modals.open({
        title: 'Роль и доступ',
        subtitle: p.name,
        size: 'sm',
        body: <RoleForm initial={draft} onChange={(d) => (draft = d)} />,
        footer: {
          buttons: [
            { label: 'Отмена', variant: 'ghost' },
            {
              label: 'Сохранить',
              variant: 'primary',
              onClick: ({ close }) => {
                if (p.id === CURRENT_USER_ID && draft.access !== 'full') {
                  toast.warning('Нельзя понизить собственный доступ', {
                    description: 'Попросите другого администратора.',
                  })
                  return
                }
                patch(p.id, (x) => ({ ...x, role: draft.role, access: draft.access }))
                close()
                toast.success('Роль изменена', { description: `${p.name}: ${ROLES[draft.role].label}` })
              },
            },
          ],
        },
      })
    },
    resetAccess: async (p) => {
      const ok = await modals.confirm({
        title: 'Сбросить доступ?',
        message: `${p.name} выйдет из всех сессий. Ссылка для входа уйдёт на ${p.email}, старый пароль перестанет действовать.`,
        okLabel: 'Сбросить доступ',
        onOk: () => new Promise((r) => window.setTimeout(r, 600)),
      })
      if (ok) toast.success('Доступ сброшен', { description: `Ссылка отправлена на ${p.email}` })
    },
    deactivate: async (p) => {
      if (p.id === CURRENT_USER_ID) {
        toast.warning('Нельзя деактивировать собственную учётную запись')
        return
      }
      const ok = await modals.confirm({
        title: `Деактивировать ${p.name}?`,
        message:
          'Сотрудник потеряет доступ к консоли и мобильному приложению. Его задачи останутся без исполнителя. Учётную запись можно восстановить.',
        okLabel: 'Деактивировать',
        okVariant: 'danger',
        okIcon: <Trash2 size={15} />,
      })
      if (!ok) return
      patch(p.id, (x) => ({ ...x, active: false }))
      toast.success('Учётная запись отключена', {
        description: p.name,
        action: { label: 'Отменить', onClick: () => patch(p.id, (x) => ({ ...x, active: true })) },
      })
    },
    restore: (p) => {
      patch(p.id, (x) => ({ ...x, active: true }))
      toast.success('Доступ восстановлен', { description: p.name })
    },
  }

  const invite = () => {
    let draft: InviteDraft = emptyInvite()
    const onChange = (d: InviteDraft) => {
      draft = d
    }
    const taken = [...people.map((p) => p.email), ...invites.map((i) => i.email)]
    const handle: ModalHandle = modals.open({
      title: 'Пригласить сотрудника',
      subtitle: 'Приглашение действует 7 дней. Роль и доступ можно изменить позже.',
      size: 'lg',
      body: <InviteForm initial={draft} showErrors={false} takenEmails={taken} onChange={onChange} />,
      footer: {
        buttons: [
          { label: 'Отмена', variant: 'ghost' },
          {
            label: 'Пригласить',
            variant: 'primary',
            icon: <MailPlus size={15} />,
            onClick: async ({ close, setBusy }) => {
              const errors = validateInvite(draft, taken)
              if (Object.keys(errors).length > 0) {
                handle.update({
                  body: <InviteForm initial={draft} showErrors takenEmails={taken} onChange={onChange} />,
                })
                toast.warning('Проверьте поля формы', { description: Object.values(errors)[0] })
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 600))
              const email = draft.email.trim().toLowerCase()
              const created: Invite = {
                id: `inv-${email}`,
                name: draft.name.trim(),
                email,
                role: draft.role!,
                access: draft.access,
                facilityIds: draft.access === 'full' ? [] : draft.facilityIds,
                invitedBy: CURRENT_USER_ID,
                sentAt: draft.sendNow ? TODAY : null,
                expiresAt: addDaysIso(TODAY, 7),
                token: token(email),
              }
              setInvites((list) => [created, ...list])
              close()
              if (draft.sendNow)
                toast.success('Приглашение отправлено', { description: `${created.name}, ${created.email}` })
              else
                toast.info('Приглашение сохранено', { description: 'Отправьте его из списка приглашений.' })
            },
          },
        ],
      },
    })
  }

  const sendInvite = (i: Invite) => {
    setInvites((list) =>
      list.map((x) => (x.id === i.id ? { ...x, sentAt: TODAY, expiresAt: addDaysIso(TODAY, 7) } : x)),
    )
    toast.success(i.sentAt ? 'Приглашение отправлено повторно' : 'Приглашение отправлено', {
      description: i.email,
    })
  }

  const revokeInvite = async (i: Invite) => {
    const ok = await modals.confirm({
      title: 'Отозвать приглашение?',
      message: `Ссылка для ${i.name} перестанет работать. Чтобы пригласить снова, создайте новое приглашение.`,
      okLabel: 'Отозвать',
      okVariant: 'danger',
    })
    if (!ok) return
    setInvites((list) => list.filter((x) => x.id !== i.id))
    toast.success('Приглашение отозвано', { description: i.email })
  }

  const resetFilters = () => {
    setQ('')
    setRole(null)
    setPresence('all')
  }
  const empty = <NoPeople onReset={resetFilters} />

  return (
    <>
      <PageHeader
        title="Команда"
        subtitle="Сотрудники, роли и доступ к объектам."
        breadcrumbs={crumbs('team')}
        meta={<Badge tone="neutral">{active.length} в штате</Badge>}
        actions={
          <>
            <Button
              icon={<Download size={15} />}
              onClick={() =>
                toast.success('Список выгружен', {
                  description: `${filtered.length} ${plural(filtered.length, 'сотрудник', 'сотрудника', 'сотрудников')}, XLSX`,
                })
              }
            >
              Выгрузить
            </Button>
            <Button variant="primary" icon={<UserPlus size={15} />} onClick={invite}>
              Пригласить
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ '--ev-grid-min': '220px' } as CSSProperties}>
          <StatTile
            label="Сотрудников"
            value={active.length}
            icon={<Users size={16} />}
            delta={2}
            formatDelta={(d) => `+${d}`}
            deltaLabel="за месяц"
          />
          <StatTile
            label="На смене"
            value={onShift}
            icon={<UserRoundCheck size={16} />}
            tone="success"
            hint={`В отпуске: ${onVacation}`}
          />
          <StatTile
            label="Приглашения"
            value={invites.length}
            icon={<MailPlus size={16} />}
            tone="info"
            hint={drafts > 0 ? `Не отправлено: ${drafts}` : 'Все отправлены'}
          />
          <StatTile
            label="Средняя загрузка"
            value={`${avgLoad}%`}
            icon={<Activity size={16} />}
            tone={avgLoad >= 85 ? 'warning' : 'accent'}
            delta={4.5}
            positiveIsGood={false}
            deltaLabel="за неделю"
            trend={
              <Sparkline values={[61, 63, 62, 66, 64, 67, avgLoad]} aria-label="Средняя загрузка за неделю" />
            }
          />
        </div>

        <div className={s.main}>
          <div className={s.toolbar}>
            <SearchInput
              wrapperClassName={s.search}
              value={q}
              onChange={setQ}
              placeholder="Имя, должность, почта, телефон"
              aria-label="Поиск сотрудников"
            />
            <Select
              aria-label="Роль"
              placeholder="Все роли"
              width={180}
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              clearable
              searchable={false}
            />
            <SegmentedControl
              aria-label="Присутствие"
              value={presence}
              onChange={setPresence}
              options={[
                { value: 'all', label: 'Все', count: people.length },
                { value: 'shift', label: 'На смене', count: onShift },
                { value: 'vacation', label: 'В отпуске', count: onVacation },
              ]}
            />
            <span className="ev-spacer" />
            <div className={s.viewToggle} role="group" aria-label="Вид списка">
              <IconButton
                label="Таблица"
                icon={<Rows3 size={16} />}
                pressed={view === 'table'}
                variant={view === 'table' ? 'secondary' : 'ghost'}
                onClick={() => setView('table')}
              />
              <IconButton
                label="Карточки"
                icon={<LayoutGrid size={16} />}
                pressed={view === 'cards'}
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                onClick={() => setView('cards')}
              />
            </div>
          </div>

          {view === 'table' ? (
            <Card flush>
              <PeopleTable
                people={filtered}
                actions={actions}
                sort={sort}
                onSortChange={setSort}
                empty={empty}
              />
            </Card>
          ) : (
            <PeopleGrid people={filtered} actions={actions} empty={empty} />
          )}
        </div>

        <Card
          title="Приглашения"
          description="Ожидают регистрации по ссылке."
          actions={
            <Button size="sm" variant="ghost" icon={<UserPlus size={14} />} onClick={invite}>
              Новое
            </Button>
          }
        >
          {invites.length === 0 ? (
            <EmptyState
              compact
              icon={<MailPlus size={20} />}
              title="Приглашений нет"
              description="Новые приглашения появятся здесь."
            />
          ) : (
            <ul role="list" className={s.invites}>
              {invites.map((i) => (
                <li key={i.id} className={s.invite}>
                  <div className={s.inviteHead}>
                    <Avatar name={i.name} size={32} />
                    <div className={s.whoText}>
                      <span className={s.whoName}>{i.name}</span>
                      <span className="ev-muted ev-truncate">{i.email}</span>
                    </div>
                    <CopyButton
                      text={`${INVITE_BASE_URL}${i.token}`}
                      tooltip="Скопировать ссылку-приглашение"
                    />
                  </div>
                  <div className="ev-row">
                    <Badge tone={ROLES[i.role].tone} size="sm">
                      {ROLES[i.role].label}
                    </Badge>
                    {i.sentAt ? (
                      <span className={s.inviteMeta}>
                        Отправлено {formatDate(i.sentAt)}, до {formatDate(i.expiresAt)}
                      </span>
                    ) : (
                      <Badge tone="warning" size="sm" dot>
                        Не отправлено
                      </Badge>
                    )}
                  </div>
                  <div className={s.inviteActions}>
                    <span className={s.inviteMeta}>Пригласил: {personName(i.invitedBy)}</span>
                    <span className="ev-spacer" />
                    <Button
                      size="sm"
                      variant={i.sentAt ? 'ghost' : 'secondary'}
                      icon={<Send size={14} />}
                      onClick={() => sendInvite(i)}
                    >
                      {i.sentAt ? 'Повторить' : 'Отправить'}
                    </Button>
                    <Button size="sm" variant="danger-ghost" onClick={() => void revokeInvite(i)}>
                      Отозвать
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
