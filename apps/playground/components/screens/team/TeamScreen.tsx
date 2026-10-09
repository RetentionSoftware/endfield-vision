'use client'

import {
  addDaysIso,
  Avatar,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
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
import { formatDate } from '@/lib/format'
import { bi, useCrumbs, useT, type Translator } from '@/lib/i18n'
import { NoPeople, PeopleGrid, PeopleTable, type PersonActions } from './PeopleViews'
import {
  emptyInvite,
  InviteForm,
  roleOptions,
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

function compare(a: Person, b: Person, key: string, { tx, intl }: Translator): number {
  switch (key) {
    case 'role':
      return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    case 'load':
      return a.load - b.load
    case 'lastSeen':
      return a.lastSeen.localeCompare(b.lastSeen)
    default:
      return tx(a.name).localeCompare(tx(b.name), intl)
  }
}

export function TeamScreen() {
  const tr = useT()
  const { t, tx, plural } = tr
  const breadcrumbs = useCrumbs('team')
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
      return normalizeSearch(`${tx(p.name)} ${tx(p.position)} ${p.email}`).includes(needle)
    })
    if (sort) {
      const k = sort.dir === 'asc' ? 1 : -1
      list.sort((a, b) => compare(a, b, sort.key, tr) * k || tx(a.name).localeCompare(tx(b.name), tr.intl))
    }
    return list
  }, [people, q, role, presence, sort, tr, tx])

  const roles = useMemo(() => roleOptions(tr), [tr])

  const patch = (id: string, fn: (p: Person) => Person) =>
    setPeople((list) => list.map((p) => (p.id === id ? fn(p) : p)))

  const actions: PersonActions = {
    editRole: (p) => {
      let draft: RoleDraft = { role: p.role, access: p.access }
      modals.open({
        title: t('Роль и доступ', 'Role and access'),
        subtitle: tx(p.name),
        size: 'sm',
        body: <RoleForm initial={draft} onChange={(d) => (draft = d)} />,
        footer: {
          buttons: [
            { label: t('Отмена', 'Cancel'), variant: 'ghost' },
            {
              label: t('Сохранить', 'Save'),
              variant: 'primary',
              onClick: ({ close }) => {
                if (p.id === CURRENT_USER_ID && draft.access !== 'full') {
                  toast.warning(t('Нельзя понизить собственный доступ', 'You cannot lower your own access'), {
                    description: t('Попросите другого администратора.', 'Ask another administrator.'),
                  })
                  return
                }
                patch(p.id, (x) => ({ ...x, role: draft.role, access: draft.access }))
                close()
                toast.success(t('Роль изменена', 'Role changed'), {
                  description: `${tx(p.name)}: ${tx(ROLES[draft.role].label)}`,
                })
              },
            },
          ],
        },
      })
    },
    resetAccess: async (p) => {
      const ok = await modals.confirm({
        title: t('Сбросить доступ?', 'Reset access?'),
        message: t(
          `${tx(p.name)} выйдет из всех сессий. Ссылка для входа уйдёт на ${p.email}, старый пароль перестанет действовать.`,
          `${tx(p.name)} will be signed out of all sessions. A sign-in link goes to ${p.email}, the old password stops working.`,
        ),
        okLabel: t('Сбросить доступ', 'Reset access'),
        onOk: () => new Promise((r) => window.setTimeout(r, 600)),
      })
      if (ok)
        toast.success(t('Доступ сброшен', 'Access reset'), {
          description: t(`Ссылка отправлена на ${p.email}`, `Link sent to ${p.email}`),
        })
    },
    deactivate: async (p) => {
      if (p.id === CURRENT_USER_ID) {
        toast.warning(
          t('Нельзя деактивировать собственную учётную запись', 'You cannot deactivate your own account'),
        )
        return
      }
      const ok = await modals.confirm({
        title: t(`Деактивировать ${tx(p.name)}?`, `Deactivate ${tx(p.name)}?`),
        message: t(
          'Сотрудник потеряет доступ к консоли и мобильному приложению. Его задачи останутся без исполнителя. Учётную запись можно восстановить.',
          'The employee loses access to the console and the mobile app. Their tasks will have no assignee. The account can be restored.',
        ),
        okLabel: t('Деактивировать', 'Deactivate'),
        okVariant: 'danger',
        okIcon: <Trash2 size={15} />,
      })
      if (!ok) return
      patch(p.id, (x) => ({ ...x, active: false }))
      toast.success(t('Учётная запись отключена', 'Account deactivated'), {
        description: tx(p.name),
        action: { label: t('Отменить', 'Undo'), onClick: () => patch(p.id, (x) => ({ ...x, active: true })) },
      })
    },
    restore: (p) => {
      patch(p.id, (x) => ({ ...x, active: true }))
      toast.success(t('Доступ восстановлен', 'Access restored'), { description: tx(p.name) })
    },
  }

  const invite = () => {
    let draft: InviteDraft = emptyInvite()
    const onChange = (d: InviteDraft) => {
      draft = d
    }
    const taken = [...people.map((p) => p.email), ...invites.map((i) => i.email)]
    const handle: ModalHandle = modals.open({
      title: t('Пригласить сотрудника', 'Invite an employee'),
      subtitle: t(
        'Приглашение действует 7 дней. Роль и доступ можно изменить позже.',
        'The invitation is valid for 7 days. Role and access can be changed later.',
      ),
      size: 'lg',
      body: <InviteForm initial={draft} showErrors={false} takenEmails={taken} onChange={onChange} />,
      footer: {
        buttons: [
          { label: t('Отмена', 'Cancel'), variant: 'ghost' },
          {
            label: t('Пригласить', 'Invite'),
            variant: 'primary',
            icon: <MailPlus size={15} />,
            onClick: async ({ close, setBusy }) => {
              const errors = validateInvite(draft, taken, tr)
              if (Object.keys(errors).length > 0) {
                handle.update({
                  body: <InviteForm initial={draft} showErrors takenEmails={taken} onChange={onChange} />,
                })
                toast.warning(t('Проверьте поля формы', 'Check the form fields'), {
                  description: Object.values(errors)[0],
                })
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 600))
              const email = draft.email.trim().toLowerCase()
              // Имя - как его ввёл пользователь, на обоих языках одинаково.
              const name = draft.name.trim()
              const created: Invite = {
                id: `inv-${email}`,
                name: bi(name, name),
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
                toast.success(t('Приглашение отправлено', 'Invitation sent'), {
                  description: `${name}, ${created.email}`,
                })
              else
                toast.info(t('Приглашение сохранено', 'Invitation saved'), {
                  description: t(
                    'Отправьте его из списка приглашений.',
                    'Send it from the invitations list.',
                  ),
                })
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
    toast.success(
      i.sentAt
        ? t('Приглашение отправлено повторно', 'Invitation resent')
        : t('Приглашение отправлено', 'Invitation sent'),
      {
        description: i.email,
      },
    )
  }

  const revokeInvite = async (i: Invite) => {
    const ok = await modals.confirm({
      title: t('Отозвать приглашение?', 'Revoke invitation?'),
      message: t(
        `Ссылка для ${tx(i.name)} перестанет работать. Чтобы пригласить снова, создайте новое приглашение.`,
        `The link for ${tx(i.name)} will stop working. To invite again, create a new invitation.`,
      ),
      okLabel: t('Отозвать', 'Revoke'),
      okVariant: 'danger',
    })
    if (!ok) return
    setInvites((list) => list.filter((x) => x.id !== i.id))
    toast.success(t('Приглашение отозвано', 'Invitation revoked'), { description: i.email })
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
        title={t('Команда', 'Team')}
        subtitle={t('Сотрудники, роли и доступ к объектам.', 'Employees, roles and facility access.')}
        breadcrumbs={breadcrumbs}
        meta={<Badge tone="neutral">{t(`${active.length} в штате`, `${active.length} on staff`)}</Badge>}
        actions={
          <>
            <Button
              icon={<Download size={15} />}
              onClick={() =>
                toast.success(t('Список выгружен', 'List exported'), {
                  description: `${filtered.length} ${plural(filtered.length, ['сотрудник', 'сотрудника', 'сотрудников'], ['employee', 'employees'])}, XLSX`,
                })
              }
            >
              {t('Выгрузить', 'Export')}
            </Button>
            <Button variant="primary" icon={<UserPlus size={15} />} onClick={invite}>
              {t('Пригласить', 'Invite')}
            </Button>
          </>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ '--ev-grid-min': '220px' } as CSSProperties}>
          <StatTile
            label={t('Сотрудников', 'Employees')}
            value={active.length}
            icon={<Users size={16} />}
            delta={2}
            formatDelta={(d) => `+${d}`}
            deltaLabel={t('за месяц', 'this month')}
          />
          <StatTile
            label={t('На смене', 'On shift')}
            value={onShift}
            icon={<UserRoundCheck size={16} />}
            tone="success"
            hint={t(`В отпуске: ${onVacation}`, `On vacation: ${onVacation}`)}
          />
          <StatTile
            label={t('Приглашения', 'Invitations')}
            value={invites.length}
            icon={<MailPlus size={16} />}
            tone="info"
            hint={
              drafts > 0
                ? t(`Не отправлено: ${drafts}`, `Not sent: ${drafts}`)
                : t('Все отправлены', 'All sent')
            }
          />
          <StatTile
            label={t('Средняя загрузка', 'Average load')}
            value={`${avgLoad}%`}
            icon={<Activity size={16} />}
            tone={avgLoad >= 85 ? 'warning' : 'accent'}
            delta={4.5}
            positiveIsGood={false}
            deltaLabel={t('за неделю', 'this week')}
            trend={
              <Sparkline
                values={[61, 63, 62, 66, 64, 67, avgLoad]}
                width="auto"
                aria-label={t('Средняя загрузка за неделю', 'Average load this week')}
              />
            }
          />
        </div>

        <div className={s.main}>
          <div className={s.toolbar}>
            <SearchInput
              wrapperClassName={s.search}
              value={q}
              onChange={setQ}
              placeholder={t('Имя, должность, почта, телефон', 'Name, position, email, phone')}
              aria-label={t('Поиск сотрудников', 'Search employees')}
            />
            <Select
              aria-label={t('Роль', 'Role')}
              placeholder={t('Все роли', 'All roles')}
              width={180}
              value={role}
              onChange={setRole}
              options={roles}
              clearable
              searchable={false}
            />
            <SegmentedControl
              aria-label={t('Присутствие', 'Presence')}
              value={presence}
              onChange={setPresence}
              options={[
                { value: 'all', label: t('Все', 'All'), count: people.length },
                { value: 'shift', label: t('На смене', 'On shift'), count: onShift },
                { value: 'vacation', label: t('В отпуске', 'On vacation'), count: onVacation },
              ]}
            />
            <span className="ev-spacer" />
            <SegmentedControl
              aria-label={t('Вид списка', 'List view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'table', icon: <Rows3 size={16} />, 'aria-label': t('Таблица', 'Table') },
                { value: 'cards', icon: <LayoutGrid size={16} />, 'aria-label': t('Карточки', 'Cards') },
              ]}
            />
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
          title={t('Приглашения', 'Invitations')}
          description={t('Ожидают регистрации по ссылке.', 'Waiting for sign-up via the link.')}
          actions={
            <Button size="sm" variant="ghost" icon={<UserPlus size={14} />} onClick={invite}>
              {t('Новое', 'New')}
            </Button>
          }
        >
          {invites.length === 0 ? (
            <EmptyState
              compact
              icon={<MailPlus size={20} />}
              title={t('Приглашений нет', 'No invitations')}
              description={t('Новые приглашения появятся здесь.', 'New invitations will appear here.')}
            />
          ) : (
            <ul role="list" className={s.invites}>
              {invites.map((i) => (
                <li key={i.id} className={s.invite}>
                  <div className={s.inviteHead}>
                    <Avatar name={tx(i.name)} size={32} />
                    <div className={s.whoText}>
                      <span className={s.whoName}>{tx(i.name)}</span>
                      <span className="ev-muted ev-truncate">{i.email}</span>
                    </div>
                    <CopyButton
                      text={`${INVITE_BASE_URL}${i.token}`}
                      tooltip={t('Скопировать ссылку-приглашение', 'Copy invitation link')}
                    />
                  </div>
                  <div className="ev-row">
                    <Badge tone={ROLES[i.role].tone} size="sm">
                      {tx(ROLES[i.role].label)}
                    </Badge>
                    {i.sentAt ? (
                      <span className={s.inviteMeta}>
                        {t(
                          `Отправлено ${formatDate(i.sentAt)}, до ${formatDate(i.expiresAt)}`,
                          `Sent ${formatDate(i.sentAt)}, valid until ${formatDate(i.expiresAt)}`,
                        )}
                      </span>
                    ) : (
                      <Badge tone="warning" size="sm" dot>
                        {t('Не отправлено', 'Not sent')}
                      </Badge>
                    )}
                  </div>
                  <div className={s.inviteActions}>
                    <span className={s.inviteMeta}>
                      {t('Пригласил', 'Invited by')}: {tx(personName(i.invitedBy))}
                    </span>
                    <span className="ev-spacer" />
                    <Button
                      size="sm"
                      variant={i.sentAt ? 'ghost' : 'secondary'}
                      icon={<Send size={14} />}
                      onClick={() => sendInvite(i)}
                    >
                      {i.sentAt ? t('Повторить', 'Resend') : t('Отправить', 'Send')}
                    </Button>
                    <Button size="sm" variant="danger-ghost" onClick={() => void revokeInvite(i)}>
                      {t('Отозвать', 'Revoke')}
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
