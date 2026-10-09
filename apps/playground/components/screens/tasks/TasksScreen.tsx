'use client'

import {
  Badge,
  Button,
  Callout,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  Menu,
  MultiSelect,
  normalizeSearch,
  PageHeader,
  Pagination,
  Select,
  Tabs,
  toast,
  useModals,
  type ModalHandle,
  type SortState,
} from 'endfield-vision'
import { ChevronDown, Download, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  isOverdue,
  PRIORITY,
  STATUS_ORDER,
  TASK_STATUS,
  TASKS,
  TODAY,
  type Priority,
  type Task,
  type TaskStatus,
} from '@/lib/demo/tasks'
import { CURRENT_USER_ID, personName } from '@/lib/demo/team'
import { bi, useCrumbs, useT } from '@/lib/i18n'
import { useUrlTab } from '@/lib/use-url-state'
import { compareTasks, facilityName, taskColumns } from './TaskColumns'
import { TaskDrawer } from './TaskDrawer'
import {
  AssigneePicker,
  emptyDraft,
  facilityOptions,
  TaskForm,
  validateDraft,
  type TaskDraft,
} from './TaskForm'
import s from './tasks.module.css'

const TABS = ['all', 'mine', 'overdue', 'done'] as const
type TabKey = (typeof TABS)[number]

const TAB_FILTER: Record<TabKey, (t: Task) => boolean> = {
  all: () => true,
  mine: (t) => t.assigneeId === CURRENT_USER_ID,
  overdue: isOverdue,
  done: (t) => t.status === 'done',
}

export function TasksScreen() {
  const tr = useT()
  const { t, tx, plural } = tr
  const breadcrumbs = useCrumbs('tasks')
  const modals = useModals()
  const [tasks, setTasks] = useState<Task[]>(TASKS)
  const [tab, setTab] = useUrlTab(TABS, 'all')
  const [q, setQ] = useState('')
  const [priority, setPriority] = useState<Priority | null>(null)
  const [facilities, setFacilities] = useState<string[]>([])
  const [sort, setSort] = useState<SortState | null>({ key: 'due', dir: 'asc' })
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(
    () =>
      Object.fromEntries(TABS.map((k) => [k, tasks.filter(TAB_FILTER[k]).length])) as Record<TabKey, number>,
    [tasks],
  )

  const filtered = useMemo(() => {
    const needle = normalizeSearch(q)
    const list = tasks.filter((x) => {
      if (!TAB_FILTER[tab](x)) return false
      if (priority && x.priority !== priority) return false
      if (facilities.length > 0 && !facilities.includes(x.facilityId)) return false
      if (!needle) return true
      const hay = `${x.id} ${tx(x.title)} ${facilityName(x.facilityId, tr)} ${tx(personName(x.assigneeId))}`
      return normalizeSearch(hay).includes(needle)
    })
    if (sort) {
      const k = sort.dir === 'asc' ? 1 : -1
      list.sort((a, b) => compareTasks(a, b, sort.key, tr) * k || a.id.localeCompare(b.id))
    }
    return list
  }, [tasks, tab, q, priority, facilities, sort, tr, tx])

  const columns = useMemo(() => taskColumns(tr), [tr])
  const facilityOpts = useMemo(() => facilityOptions(tr), [tr])
  const priorityOptions = (Object.keys(PRIORITY) as Priority[]).map((p) => ({
    value: p,
    label: tx(PRIORITY[p].label),
  }))
  const taskWord = (n: number) => plural(n, ['задача', 'задачи', 'задач'], ['task', 'tasks'])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const openTask = openId ? (tasks.find((t) => t.id === openId) ?? null) : null
  const activeFilters = (priority ? 1 : 0) + (facilities.length > 0 ? 1 : 0)

  const update = (id: string, patch: (t: Task) => Task) =>
    setTasks((list) => list.map((t) => (t.id === id ? patch(t) : t)))
  const updateMany = (ids: string[], patch: (t: Task) => Task) => {
    const set = new Set(ids)
    setTasks((list) => list.map((t) => (set.has(t.id) ? patch(t) : t)))
  }
  const resetPage =
    <A,>(fn: (v: A) => void) =>
    (v: A) => {
      fn(v)
      setPage(1)
    }

  const newTask = () => {
    let draft: TaskDraft = emptyDraft()
    const onChange = (d: TaskDraft) => {
      draft = d
    }
    const handle: ModalHandle = modals.open({
      title: t('Новая задача', 'New task'),
      subtitle: t(
        'Задача попадёт в очередь исполнителя и в журнал объекта.',
        "The task goes to the assignee's queue and the facility log.",
      ),
      size: 'md',
      body: <TaskForm initial={draft} showErrors={false} onChange={onChange} />,
      footer: {
        buttons: [
          { label: t('Отмена', 'Cancel'), variant: 'ghost' },
          {
            label: t('Создать', 'Create'),
            variant: 'primary',
            onClick: async ({ setBusy, close }) => {
              const errors = validateDraft(draft, tr)
              if (Object.keys(errors).length > 0) {
                handle.update({ body: <TaskForm initial={draft} showErrors onChange={onChange} /> })
                toast.warning(t('Проверьте поля формы', 'Check the form fields'), {
                  description: Object.values(errors)[0],
                })
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 600))
              const id = `TSK-${Math.max(...tasks.map((x) => Number(x.id.slice(4))), 1000) + 1}`
              // Текст пользователя - на том языке, на котором он написан.
              const title = draft.title.trim()
              const description = draft.description.trim() || `${title}.`
              const created: Task = {
                id,
                title: bi(title, title),
                facilityId: draft.facilityId!,
                assigneeId: draft.assigneeId!,
                authorId: CURRENT_USER_ID,
                priority: draft.priority,
                status: 'new',
                due: draft.due,
                createdAt: TODAY,
                description: bi(description, description),
                checklist: [],
                comments: [],
              }
              setTasks((list) => [created, ...list])
              setTab('all')
              setSort(null)
              setPage(1)
              close()
              const who = tx(personName(created.assigneeId))
              toast.success(t(`Задача ${id} создана`, `Task ${id} created`), {
                description: draft.notify
                  ? t(`${who} получит уведомление.`, `${who} will be notified.`)
                  : title,
                action: { label: t('Открыть', 'Open'), onClick: () => setOpenId(id) },
              })
            },
          },
        ],
      },
    })
  }

  const bulkAssign = () => {
    let assignee: string | null = null
    const ids = selected
    modals.open({
      title: t('Назначить исполнителя', 'Assign'),
      subtitle: t(
        `${ids.length} ${taskWord(ids.length)} получат нового исполнителя.`,
        `${ids.length} ${taskWord(ids.length)} will get a new assignee.`,
      ),
      size: 'sm',
      body: <AssigneePicker onChange={(v) => (assignee = v)} />,
      footer: {
        buttons: [
          { label: t('Отмена', 'Cancel'), variant: 'ghost' },
          {
            label: t('Назначить', 'Assign'),
            variant: 'primary',
            onClick: ({ close }) => {
              if (!assignee) {
                toast.warning(t('Выберите исполнителя', 'Select an assignee'))
                return
              }
              const who = assignee
              updateMany(ids, (x) => ({ ...x, assigneeId: who }))
              close()
              toast.success(t('Исполнитель назначен', 'Assignee set'), {
                description: `${tx(personName(who))}: ${ids.length} ${taskWord(ids.length)}`,
              })
            },
          },
        ],
      },
    })
  }

  const bulkStatus = (status: TaskStatus) => {
    const ids = selected
    updateMany(ids, (x) => ({
      ...x,
      status,
      checklist: status === 'done' ? x.checklist.map((c) => ({ ...c, done: true })) : x.checklist,
    }))
    toast.success(t('Статус изменён', 'Status changed'), {
      description: `${tx(TASK_STATUS[status].label)}: ${ids.length} ${taskWord(ids.length)}`,
    })
  }

  const bulkDelete = async () => {
    const ids = selected
    const n = ids.length
    const ok = await modals.confirm({
      title: t(
        `Удалить ${n} ${plural(n, ['задачу', 'задачи', 'задач'], ['task', 'tasks'])}?`,
        `Delete ${n} ${taskWord(n)}?`,
      ),
      message: t(
        'Задачи, чек-листы и комментарии будут удалены без возможности восстановления. Запись об удалении останется в журнале.',
        'Tasks, checklists and comments will be permanently deleted. The deletion is recorded in the audit log.',
      ),
      okLabel: t('Удалить', 'Delete'),
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
      onOk: () => new Promise((r) => window.setTimeout(r, 500)),
    })
    if (!ok) return
    const set = new Set(ids)
    setTasks((list) => list.filter((x) => !set.has(x.id)))
    setSelected([])
    toast.success(t('Задачи удалены', 'Tasks deleted'), { description: ids.join(', ') })
  }

  return (
    <>
      <PageHeader
        title={t('Задачи', 'Tasks')}
        subtitle={t(
          'Работы на объектах: сроки, исполнители, ход выполнения.',
          'Work at facilities: due dates, assignees, progress.',
        )}
        breadcrumbs={breadcrumbs}
        meta={
          counts.overdue > 0 ? (
            <Badge tone="danger" dot>
              {t('Просрочено', 'Overdue')}: {counts.overdue}
            </Badge>
          ) : null
        }
        actions={
          <>
            <Button
              icon={<Download size={15} />}
              onClick={() =>
                toast.success(t('Реестр выгружен', 'Task list exported'), {
                  description: `${filtered.length} ${taskWord(filtered.length)}, CSV`,
                })
              }
            >
              {t('Выгрузить', 'Export')}
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={newTask}>
              {t('Новая задача', 'New task')}
            </Button>
          </>
        }
      >
        <Tabs
          aria-label={t('Фильтр задач', 'Task filter')}
          value={tab}
          onChange={(next) => {
            setTab(next)
            setPage(1)
            setSelected([])
          }}
          items={[
            { value: 'all', label: t('Все', 'All'), count: counts.all },
            { value: 'mine', label: t('Мои', 'Mine'), count: counts.mine },
            { value: 'overdue', label: t('Просроченные', 'Overdue'), count: counts.overdue },
            { value: 'done', label: t('Выполненные', 'Done'), count: counts.done },
          ]}
        />
      </PageHeader>

      <div className={s.page}>
        {selected.length > 0 ? (
          <Callout
            tone="info"
            icon={false}
            title={t(
              `Выбрано: ${selected.length} ${taskWord(selected.length)}`,
              `Selected: ${selected.length} ${taskWord(selected.length)}`,
            )}
            actions={
              <>
                <Button size="sm" icon={<UserPlus size={14} />} onClick={bulkAssign}>
                  {t('Назначить', 'Assign')}
                </Button>
                <Menu
                  label={t('Сменить статус', 'Change status')}
                  placement="bottom-start"
                  trigger={
                    <Button size="sm" iconRight={<ChevronDown size={14} />}>
                      {t('Сменить статус', 'Change status')}
                    </Button>
                  }
                  items={STATUS_ORDER.map((st) => ({
                    id: st,
                    label: tx(TASK_STATUS[st].label),
                    onSelect: () => bulkStatus(st),
                  }))}
                />
                <Button
                  size="sm"
                  variant="danger-ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => void bulkDelete()}
                >
                  {t('Удалить', 'Delete')}
                </Button>
                <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSelected([])}>
                  {t('Снять выбор', 'Clear selection')}
                </Button>
              </>
            }
          >
            {t(
              'Действие применится ко всем выбранным задачам, в том числе на других страницах.',
              'The action applies to all selected tasks, including those on other pages.',
            )}
          </Callout>
        ) : null}

        <Card
          flush
          toolbar={
            <FilterBar
              search={{
                value: q,
                onChange: resetPage(setQ),
                placeholder: t('Номер, название, объект, исполнитель', 'Number, title, facility, assignee'),
              }}
              activeCount={activeFilters}
              onReset={() => {
                setQ('')
                setPriority(null)
                setFacilities([])
                setPage(1)
              }}
            >
              <Select
                aria-label={t('Приоритет', 'Priority')}
                placeholder={t('Любой приоритет', 'Any priority')}
                value={priority}
                onChange={resetPage(setPriority)}
                options={priorityOptions}
                clearable
                searchable={false}
              />
              <MultiSelect
                aria-label={t('Объекты', 'Facilities')}
                placeholder={t('Все объекты', 'All facilities')}
                value={facilities}
                onChange={resetPage(setFacilities)}
                options={facilityOpts}
                dropdownMinWidth={280}
              />
            </FilterBar>
          }
        >
          <DataTable
            aria-label={t('Задачи', 'Tasks')}
            columns={columns}
            rows={pageRows}
            rowKey={(x) => x.id}
            sort={sort}
            onSortChange={setSort}
            selected={selected}
            onSelectedChange={setSelected}
            rowMuted={(x) => x.status === 'done'}
            onRowClick={(x) => setOpenId(x.id)}
            empty={
              <EmptyState
                compact
                title={t('Задач не найдено', 'No tasks found')}
                description={t(
                  'Измените условия поиска или сбросьте фильтры.',
                  'Change the search or reset the filters.',
                )}
                actions={
                  <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={newTask}>
                    {t('Новая задача', 'New task')}
                  </Button>
                }
              />
            }
            footer={
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n)
                  setPage(1)
                }}
                pageSizeOptions={[10, 25, 50]}
              />
            }
          />
        </Card>
      </div>

      <TaskDrawer task={openTask} onClose={() => setOpenId(null)} onUpdate={update} />
    </>
  )
}
