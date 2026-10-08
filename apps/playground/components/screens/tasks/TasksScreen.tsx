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
import { crumbs } from '@/lib/nav'
import { plural } from '@/lib/format'
import { useUrlTab } from '@/lib/use-url-state'
import { compareTasks, facilityName, TASK_COLUMNS } from './TaskColumns'
import { TaskDrawer } from './TaskDrawer'
import {
  AssigneePicker,
  emptyDraft,
  FACILITY_OPTIONS,
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

const PRIORITY_OPTIONS = (Object.keys(PRIORITY) as Priority[]).map((p) => ({
  value: p,
  label: PRIORITY[p].label,
}))

export function TasksScreen() {
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
    const list = tasks.filter((t) => {
      if (!TAB_FILTER[tab](t)) return false
      if (priority && t.priority !== priority) return false
      if (facilities.length > 0 && !facilities.includes(t.facilityId)) return false
      if (!needle) return true
      const hay = `${t.id} ${t.title} ${facilityName(t.facilityId)} ${personName(t.assigneeId)}`
      return normalizeSearch(hay).includes(needle)
    })
    if (sort) {
      const k = sort.dir === 'asc' ? 1 : -1
      list.sort((a, b) => compareTasks(a, b, sort.key) * k || a.id.localeCompare(b.id))
    }
    return list
  }, [tasks, tab, q, priority, facilities, sort])

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
      title: 'Новая задача',
      subtitle: 'Задача попадёт в очередь исполнителя и в журнал объекта.',
      size: 'md',
      body: <TaskForm initial={draft} showErrors={false} onChange={onChange} />,
      footer: {
        buttons: [
          { label: 'Отмена', variant: 'ghost' },
          {
            label: 'Создать',
            variant: 'primary',
            onClick: async ({ setBusy, close }) => {
              const errors = validateDraft(draft)
              if (Object.keys(errors).length > 0) {
                handle.update({ body: <TaskForm initial={draft} showErrors onChange={onChange} /> })
                toast.warning('Проверьте поля формы', { description: Object.values(errors)[0] })
                return
              }
              setBusy(true)
              await new Promise((r) => window.setTimeout(r, 600))
              const id = `TSK-${Math.max(...tasks.map((t) => Number(t.id.slice(4))), 1000) + 1}`
              const created: Task = {
                id,
                title: draft.title.trim(),
                facilityId: draft.facilityId!,
                assigneeId: draft.assigneeId!,
                authorId: CURRENT_USER_ID,
                priority: draft.priority,
                status: 'new',
                due: draft.due,
                createdAt: TODAY,
                description: draft.description.trim() || `${draft.title.trim()}.`,
                checklist: [],
                comments: [],
              }
              setTasks((list) => [created, ...list])
              setTab('all')
              setSort(null)
              setPage(1)
              close()
              toast.success(`Задача ${id} создана`, {
                description: draft.notify
                  ? `${personName(created.assigneeId)} получит уведомление.`
                  : created.title,
                action: { label: 'Открыть', onClick: () => setOpenId(id) },
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
      title: 'Назначить исполнителя',
      subtitle: `${ids.length} ${plural(ids.length, 'задача', 'задачи', 'задач')} получат нового исполнителя.`,
      size: 'sm',
      body: <AssigneePicker onChange={(v) => (assignee = v)} />,
      footer: {
        buttons: [
          { label: 'Отмена', variant: 'ghost' },
          {
            label: 'Назначить',
            variant: 'primary',
            onClick: ({ close }) => {
              if (!assignee) {
                toast.warning('Выберите исполнителя')
                return
              }
              const who = assignee
              updateMany(ids, (t) => ({ ...t, assigneeId: who }))
              close()
              toast.success('Исполнитель назначен', {
                description: `${personName(who)}: ${ids.length} ${plural(ids.length, 'задача', 'задачи', 'задач')}`,
              })
            },
          },
        ],
      },
    })
  }

  const bulkStatus = (status: TaskStatus) => {
    const ids = selected
    updateMany(ids, (t) => ({
      ...t,
      status,
      checklist: status === 'done' ? t.checklist.map((c) => ({ ...c, done: true })) : t.checklist,
    }))
    toast.success('Статус изменён', {
      description: `${TASK_STATUS[status].label}: ${ids.length} ${plural(ids.length, 'задача', 'задачи', 'задач')}`,
    })
  }

  const bulkDelete = async () => {
    const ids = selected
    const ok = await modals.confirm({
      title: `Удалить ${ids.length} ${plural(ids.length, 'задачу', 'задачи', 'задач')}?`,
      message:
        'Задачи, чек-листы и комментарии будут удалены без возможности восстановления. Запись об удалении останется в журнале.',
      okLabel: 'Удалить',
      okVariant: 'danger',
      okIcon: <Trash2 size={15} />,
      onOk: () => new Promise((r) => window.setTimeout(r, 500)),
    })
    if (!ok) return
    const set = new Set(ids)
    setTasks((list) => list.filter((t) => !set.has(t.id)))
    setSelected([])
    toast.success('Задачи удалены', { description: ids.join(', ') })
  }

  return (
    <>
      <PageHeader
        title="Задачи"
        subtitle="Работы на объектах: сроки, исполнители, ход выполнения."
        breadcrumbs={crumbs('tasks')}
        meta={
          counts.overdue > 0 ? (
            <Badge tone="danger" dot>
              Просрочено: {counts.overdue}
            </Badge>
          ) : null
        }
        actions={
          <>
            <Button
              icon={<Download size={15} />}
              onClick={() =>
                toast.success('Реестр выгружен', {
                  description: `${filtered.length} ${plural(filtered.length, 'задача', 'задачи', 'задач')}, CSV`,
                })
              }
            >
              Выгрузить
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={newTask}>
              Новая задача
            </Button>
          </>
        }
      >
        <Tabs
          aria-label="Фильтр задач"
          value={tab}
          onChange={(t) => {
            setTab(t)
            setPage(1)
            setSelected([])
          }}
          items={[
            { value: 'all', label: 'Все', count: counts.all },
            { value: 'mine', label: 'Мои', count: counts.mine },
            { value: 'overdue', label: 'Просроченные', count: counts.overdue },
            { value: 'done', label: 'Выполненные', count: counts.done },
          ]}
        />
      </PageHeader>

      <div className={s.page}>
        <FilterBar
          className={s.filters}
          search={{
            value: q,
            onChange: resetPage(setQ),
            placeholder: 'Номер, название, объект, исполнитель',
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
            aria-label="Приоритет"
            placeholder="Любой приоритет"
            value={priority}
            onChange={resetPage(setPriority)}
            options={PRIORITY_OPTIONS}
            clearable
            searchable={false}
          />
          <MultiSelect
            aria-label="Объекты"
            placeholder="Все объекты"
            value={facilities}
            onChange={resetPage(setFacilities)}
            options={FACILITY_OPTIONS}
            dropdownMinWidth={280}
          />
        </FilterBar>

        {selected.length > 0 ? (
          <Callout
            tone="info"
            icon={false}
            title={`Выбрано: ${selected.length} ${plural(selected.length, 'задача', 'задачи', 'задач')}`}
            actions={
              <>
                <Button size="sm" icon={<UserPlus size={14} />} onClick={bulkAssign}>
                  Назначить
                </Button>
                <Menu
                  label="Сменить статус"
                  placement="bottom-start"
                  trigger={
                    <Button size="sm" iconRight={<ChevronDown size={14} />}>
                      Сменить статус
                    </Button>
                  }
                  items={STATUS_ORDER.map((st) => ({
                    id: st,
                    label: TASK_STATUS[st].label,
                    onSelect: () => bulkStatus(st),
                  }))}
                />
                <Button
                  size="sm"
                  variant="danger-ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => void bulkDelete()}
                >
                  Удалить
                </Button>
                <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSelected([])}>
                  Снять выбор
                </Button>
              </>
            }
          >
            Действие применится ко всем выбранным задачам, в том числе на других страницах.
          </Callout>
        ) : null}

        <Card flush>
          <DataTable
            aria-label="Задачи"
            columns={TASK_COLUMNS}
            rows={pageRows}
            rowKey={(t) => t.id}
            sort={sort}
            onSortChange={setSort}
            selected={selected}
            onSelectedChange={setSelected}
            rowMuted={(t) => t.status === 'done'}
            onRowClick={(t) => setOpenId(t.id)}
            empty={
              <EmptyState
                compact
                title="Задач не найдено"
                description="Измените условия поиска или сбросьте фильтры."
                actions={
                  <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={newTask}>
                    Новая задача
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
