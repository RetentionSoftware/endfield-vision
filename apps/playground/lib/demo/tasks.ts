/*
 * Демо-данные задач: работы на объектах. Поля задачи вычисляются из номера
 * строки по формулам - без Math.random и Date.now, рендер детерминирован.
 */

import type { Tone } from 'endfield-vision'
import { bi, type Bi } from '../lang'

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'blocked' | 'done'
export type Priority = 'low' | 'normal' | 'high' | 'critical'

export interface ChecklistItem {
  id: string
  text: Bi
  done: boolean
}

export interface TaskComment {
  id: string
  authorId: string
  text: Bi
  /** ISO с временем. */
  at: string
}

export interface Task {
  id: string
  title: Bi
  facilityId: string
  assigneeId: string
  authorId: string
  priority: Priority
  status: TaskStatus
  /** YYYY-MM-DD. */
  due: string
  createdAt: string
  description: Bi
  checklist: ChecklistItem[]
  comments: TaskComment[]
}

/** «Сегодня» демо-консоли: просрочка считается от этой даты. */
export const TODAY = '2026-10-08'

export const TASK_STATUS: Record<TaskStatus, { label: Bi; tone: Tone }> = {
  new: { label: bi('Новая', 'New'), tone: 'info' },
  in_progress: { label: bi('В работе', 'In progress'), tone: 'accent' },
  review: { label: bi('На проверке', 'In review'), tone: 'violet' },
  blocked: { label: bi('Заблокирована', 'Blocked'), tone: 'danger' },
  done: { label: bi('Выполнена', 'Done'), tone: 'success' },
}

export const PRIORITY: Record<Priority, { label: Bi; tone: Tone }> = {
  low: { label: bi('Низкий', 'Low'), tone: 'neutral' },
  normal: { label: bi('Обычный', 'Normal'), tone: 'info' },
  high: { label: bi('Высокий', 'High'), tone: 'warning' },
  critical: { label: bi('Критический', 'Critical'), tone: 'danger' },
}

export const PRIORITY_ORDER: Record<Priority, number> = { low: 0, normal: 1, high: 2, critical: 3 }

export const STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'blocked', 'done']

/** Прогресс задачи: выполненная - 100%, иначе доля пунктов чек-листа. */
export function taskProgress(t: Task): number {
  if (t.status === 'done') return 100
  if (t.checklist.length === 0) return 0
  return Math.round((t.checklist.filter((c) => c.done).length / t.checklist.length) * 100)
}

export function isOverdue(t: Task): boolean {
  return t.status !== 'done' && t.due < TODAY
}

type Seed = [title: Bi, facilityId: string, assigneeId: string, steps: Bi[]]

// prettier-ignore
const SEEDS: Seed[] = [
  [bi('Калибровка датчиков давления линии №1', 'Calibrate pressure sensors on line 1'), 'f1', 'p10', [bi('Снять показания эталона', 'Take reference readings'), bi('Откалибровать датчики P1-P6', 'Calibrate sensors P1-P6'), bi('Внести поправки в SCADA', 'Enter corrections in SCADA'), bi('Подписать протокол', 'Sign the report')]],
  [bi('Замена фильтров приточной вентиляции', 'Replace supply ventilation filters'), 'f5', 'p05', [bi('Заказать фильтры класса F7', 'Order F7 class filters'), bi('Остановить приточку', 'Shut down supply ventilation'), bi('Заменить фильтры', 'Replace filters'), bi('Проверить перепад давления', 'Check pressure drop')]],
  [bi('Восстановить связь с ретранслятором', 'Restore the relay link'), 'f8', 'p14', [bi('Диагностика канала', 'Link diagnostics'), bi('Выезд бригады', 'Dispatch a crew'), bi('Замена модуля питания', 'Replace power module'), bi('Тест канала 24 часа', '24-hour link test')]],
  [bi('Устранить перегрев линии сборки №3', 'Fix overheating on assembly line 3'), 'f3', 'p03', [bi('Снять термограмму', 'Take a thermal image'), bi('Проверить охлаждение приводов', 'Check drive cooling'), bi('Заменить вентилятор шкафа', 'Replace cabinet fan'), bi('Контрольный прогон', 'Test run')]],
  [bi('Инвентаризация реагентов', 'Reagent stocktake'), 'f7', 'p11', [bi('Сверка остатков', 'Reconcile stock'), bi('Списание просроченных', 'Write off expired items'), bi('Акт инвентаризации', 'Stocktake report')]],
  [bi('Подготовить отчёт по выпуску за сентябрь', 'Prepare the September output report'), 'f1', 'p09', [bi('Выгрузка из MES', 'Export from MES'), bi('Сверка с учётом склада', 'Reconcile with inventory records'), bi('Комментарии к отклонениям', 'Comment on variances'), bi('Отправка руководству', 'Send to management')]],
  [bi('Плановое ТО крана КП-12', 'Scheduled maintenance of crane KP-12'), 'f4', 'p18', [bi('Осмотр металлоконструкций', 'Inspect steel structures'), bi('Замена троса', 'Replace the cable'), bi('Испытание грузом', 'Load test'), bi('Запись в журнал', 'Log entry')]],
  [bi('Обновить схему эвакуации корпуса Б', 'Update the building B evacuation plan'), 'f2', 'p16', [bi('Согласовать изменения', 'Approve changes'), bi('Печать планов', 'Print plans'), bi('Развесить на этажах', 'Post on every floor')]],
  [bi('Проверка заземления подстанции', 'Substation grounding check'), 'f6', 'p19', [bi('Замер сопротивления', 'Measure resistance'), bi('Протокол испытаний', 'Test report')]],
  [bi('Согласовать график отпусков на IV квартал', 'Approve the Q4 vacation schedule'), 'f1', 'p07', [bi('Собрать заявки', 'Collect requests'), bi('Проверить покрытие смен', 'Check shift coverage'), bi('Утвердить график', 'Approve the schedule')]],
  [bi('Ремонт конвейера КЛ-4', 'Repair conveyor KL-4'), 'f6', 'p20', [bi('Демонтаж ленты', 'Remove the belt'), bi('Замена роликов', 'Replace rollers'), bi('Монтаж и натяжка', 'Install and tension'), bi('Пробный пуск', 'Trial run')]],
  [bi('Аудит прав доступа к SCADA', 'SCADA access rights audit'), 'f2', 'p21', [bi('Выгрузка учётных записей', 'Export accounts'), bi('Сверка с кадровым списком', 'Check against the HR roster'), bi('Отзыв лишних прав', 'Revoke excess rights')]],
  [bi('Поверка весов на складе ГП', 'Verify scales at the finished goods warehouse'), 'f4', 'p23', [bi('Вызов поверителя', 'Call the verifier'), bi('Поверка', 'Verification'), bi('Пломбирование', 'Sealing')]],
  [bi('Заказ запчастей для насоса НЦ-200', 'Order spare parts for pump NTs-200'), 'f2', 'p02', [bi('Спецификация', 'Specification'), bi('Запрос цен', 'Request quotes'), bi('Согласование заявки', 'Approve the request')]],
  [bi('Пусконаладка нового анализатора', 'Commission the new analyzer'), 'f7', 'p11', [bi('Монтаж', 'Installation'), bi('Подключение к ЛИС', 'Connect to LIS'), bi('Валидация методики', 'Validate the method'), bi('Обучение персонала', 'Train staff'), bi('Ввод в эксплуатацию', 'Put into service')]],
  [bi('Проверка резервного генератора', 'Backup generator check'), 'f5', 'p24', [bi('Пуск под нагрузкой', 'Start under load'), bi('Замер расхода топлива', 'Measure fuel consumption')]],
  [bi('Инструктаж по охране труда для новых сотрудников', 'Safety briefing for new employees'), 'f3', 'p16', [bi('Подготовить материалы', 'Prepare materials'), bi('Провести инструктаж', 'Hold the briefing'), bi('Подписи в журнале', 'Collect signatures in the log')]],
  [bi('Сверка остатков топлива', 'Fuel stock reconciliation'), 'f6', 'p13', [bi('Замер резервуаров', 'Gauge the tanks'), bi('Сверка с учётом', 'Reconcile with records'), bi('Акт расхождений', 'Discrepancy report')]],
  [bi('Перенастроить маршрутизацию отгрузок', 'Reconfigure shipment routing'), 'f4', 'p15', [bi('Анализ очередей', 'Analyze queues'), bi('Новые окна погрузки', 'New loading windows'), bi('Уведомить перевозчиков', 'Notify carriers')]],
  [bi('Замена УПС в серверной', 'Replace the UPS in the server room'), 'f1', 'p14', [bi('Закупка батарей', 'Buy batteries'), bi('Замена', 'Replacement'), bi('Тест переключения', 'Switchover test')]],
  [bi('Отбор проб воды на сбросе', 'Sample discharge water'), 'f6', 'p23', [bi('Отбор проб', 'Sampling'), bi('Анализ', 'Analysis'), bi('Передача в надзор', 'Submit to the regulator')]],
  [bi('Подготовить заставу к зимнему сезону', 'Prepare the outpost for winter'), 'f5', 'p05', [bi('Утепление КПП', 'Insulate the checkpoint'), bi('Запас топлива', 'Stock up on fuel'), bi('Проверка отопления', 'Check heating'), bi('Снегоуборочная техника', 'Snow removal equipment')]],
  [bi('Обновить прошивку контроллеров ПЛК', 'Update PLC firmware'), 'f3', 'p10', [bi('Резервная копия', 'Backup'), bi('Обновление на стенде', 'Update on the test bench'), bi('Обновление на линии', 'Update on the line')]],
  [bi('Разобрать замечания пожарной инспекции', 'Address fire inspection findings'), 'f2', 'p02', [bi('Список замечаний', 'List the findings'), bi('План устранения', 'Remediation plan'), bi('Устранение', 'Remediation'), bi('Отчёт инспекции', 'Report to the inspection')]],
  [bi('Сменить пароли сервисных учётных записей', 'Rotate service account passwords'), 'f8', 'p21', [bi('Список учётных записей', 'List accounts'), bi('Смена паролей', 'Change passwords'), bi('Обновление в хранилище', 'Update the vault')]],
  [bi('Ревизия складских ячеек зоны C', 'Audit storage bins in zone C'), 'f4', 'p13', [bi('Пересчёт ячеек', 'Recount bins'), bi('Корректировка адресов', 'Correct bin addresses')]],
  [bi('Монтаж датчиков вибрации на дробилке', 'Install vibration sensors on the crusher'), 'f6', 'p19', [bi('Разметка точек', 'Mark mounting points'), bi('Монтаж', 'Installation'), bi('Подключение к мониторингу', 'Connect to monitoring')]],
  [bi('Квартальная поверка манометров', 'Quarterly pressure gauge verification'), 'f1', 'p23', [bi('Демонтаж', 'Removal'), bi('Поверка', 'Verification'), bi('Монтаж', 'Installation')]],
  [bi('Подготовить смету на ремонт кровли', 'Prepare a roof repair estimate'), 'f2', 'p17', [bi('Обследование', 'Survey'), bi('Ведомость объёмов', 'Bill of quantities'), bi('Смета', 'Estimate')]],
  [bi('Настроить оповещения о простое линий', 'Set up line downtime alerts'), 'f3', 'p09', [bi('Пороги простоя', 'Downtime thresholds'), bi('Каналы оповещения', 'Alert channels'), bi('Тестовые уведомления', 'Test notifications')]],
  [bi('Ремонт освещения причала №2', 'Repair lighting at berth 2'), 'f4', 'p18', [bi('Замена светильников', 'Replace light fixtures'), bi('Проверка щита', 'Check the panel')]],
  [bi('Проверка СИЗ на участке бурения', 'PPE check at the drilling site'), 'f6', 'p16', [bi('Осмотр', 'Inspection'), bi('Списание изношенных', 'Write off worn items'), bi('Заявка на выдачу', 'Issue request')]],
  [bi('Согласовать поставку реагентов на ноябрь', 'Approve the November reagent delivery'), 'f7', 'p07', [bi('Потребность', 'Requirements'), bi('Счёт поставщика', 'Supplier invoice'), bi('Оплата', 'Payment')]],
  [bi('Перенос резервной копии MES', 'Move the MES backup'), 'f1', 'p21', [bi('Новое хранилище', 'New storage'), bi('Копирование', 'Copy'), bi('Проверка восстановления', 'Test the restore')]],
  [bi('Чистка теплообменника ТО-3', 'Clean heat exchanger TO-3'), 'f2', 'p22', [bi('Остановка контура', 'Shut down the circuit'), bi('Химическая промывка', 'Chemical flush'), bi('Опрессовка', 'Pressure test')]],
  [bi('Проверить журнал вахты за сентябрь', 'Review the September watch log'), 'f5', 'p07', [bi('Сверка записей', 'Check entries'), bi('Замечания', 'Findings')]],
  [bi('Заменить уплотнения гидроцилиндров', 'Replace hydraulic cylinder seals'), 'f6', 'p20', [bi('Заказ ремкомплекта', 'Order a repair kit'), bi('Замена', 'Replacement'), bi('Проверка утечек', 'Leak check')]],
  [bi('Обучение операторов новой HMI', 'Train operators on the new HMI'), 'f3', 'p12', [bi('Программа обучения', 'Training program'), bi('Занятия', 'Sessions'), bi('Зачёт', 'Assessment')]],
]

const STATUS_CYCLE: TaskStatus[] = [
  'in_progress',
  'new',
  'done',
  'review',
  'in_progress',
  'blocked',
  'done',
  'in_progress',
  'new',
  'review',
  'done',
]
const PRIORITY_CYCLE: Priority[] = [
  'normal',
  'high',
  'normal',
  'critical',
  'low',
  'normal',
  'high',
  'normal',
  'low',
]
const AUTHORS = ['p07', 'p01', 'p21', 'p02', 'p04', 'p03']

const COMMENT_POOL = [
  bi('Запчасти на складе, можно начинать.', 'Parts are in stock, we can start.'),
  bi('Нужен допуск на работы на высоте, оформляю.', 'Need a work-at-height permit, filing it now.'),
  bi('Перенёс на завтра: линия занята до 18:00.', 'Moved to tomorrow: the line is busy until 18:00.'),
  bi('Фото и протокол приложил в карточку объекта.', 'Attached photos and the report to the facility card.'),
  bi('Подрядчик подтвердил выезд.', 'The contractor confirmed the visit.'),
  bi('Ожидаем согласования от главного инженера.', 'Waiting for approval from the chief engineer.'),
]

function isoDay(base: string, delta: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! + delta))
  return dt.toISOString().slice(0, 10)
}

export const TASKS: Task[] = SEEDS.map(([title, facilityId, assigneeId, steps], i) => {
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length]!
  const priority = i === 2 ? 'critical' : PRIORITY_CYCLE[i % PRIORITY_CYCLE.length]!
  // Срок от -9 до +17 дней от «сегодня»: часть задач просрочена.
  const due = isoDay(TODAY, ((i * 7) % 27) - 9)
  const createdAt = isoDay(TODAY, -(((i * 5) % 20) + 3))
  const doneCount =
    status === 'done'
      ? steps.length
      : status === 'new'
        ? 0
        : status === 'review'
          ? steps.length - 1
          : Math.min(steps.length - 1, (i % 3) + 1)
  const commentCount = i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0
  const comments: TaskComment[] = Array.from({ length: commentCount }, (_, k) => ({
    id: `c${i}-${k}`,
    authorId: k === 0 ? assigneeId : AUTHORS[i % AUTHORS.length]!,
    text: COMMENT_POOL[(i + k * 2) % COMMENT_POOL.length]!,
    at: `${isoDay(TODAY, -(k === 0 ? 2 : 1))}T${String(9 + ((i + k) % 8)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00`,
  }))
  return {
    id: `TSK-${1040 + i}`,
    title,
    facilityId,
    assigneeId,
    authorId: AUTHORS[i % AUTHORS.length]!,
    priority,
    status,
    due,
    createdAt,
    description: bi(
      `${title.ru}. Работы выполнить по регламенту объекта, результат отразить в чек-листе и приложить протокол.`,
      `${title.en}. Follow the facility procedures, record the result in the checklist and attach the report.`,
    ),
    checklist: steps.map((text, k) => ({ id: `s${i}-${k}`, text, done: k < doneCount })),
    comments,
  }
})
