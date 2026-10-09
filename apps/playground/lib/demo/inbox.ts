/*
 * Демо-данные входящих: уведомления об инцидентах, задачи, системные
 * сообщения и упоминания. Время - готовые подписи, без Date.now при рендере.
 */

import type { Tone } from 'endfield-vision'
import { bi, type Bi } from '../lang'

export type MessageKind = 'incident' | 'task' | 'system'

export const MESSAGE_KIND: Record<MessageKind, { label: Bi; tone: Tone }> = {
  incident: { label: bi('Инцидент', 'Incident'), tone: 'danger' },
  task: { label: bi('Задача', 'Task'), tone: 'info' },
  system: { label: bi('Система', 'System'), tone: 'neutral' },
}

export interface ThreadEntry {
  id: string
  author: Bi
  /** Подпись времени: «08:14», «вчера, 17:40». */
  time: Bi | string
  /** Текст: из демо-данных - на двух языках, ответ из формы - как есть. */
  text: Bi | string
}

export interface InboxMessage {
  id: string
  kind: MessageKind
  from: Bi
  /** Должность или источник. */
  fromRole: Bi
  subject: Bi
  /** Подпись времени в списке. */
  time: Bi | string
  unread: boolean
  /** Упоминание текущего пользователя. */
  mention: boolean
  archived: boolean
  /** Ссылка на связанный раздел. */
  link?: { label: Bi; href: string }
  thread: ThreadEntry[]
}

/** Текущий пользователь демо: автор ответов. */
export const ME = bi('Алина Воронцова', 'Alina Vorontsova')

/** Автор - текущий пользователь демо. */
export function isMe(author: Bi): boolean {
  return author.ru === ME.ru
}

const P = {
  rumyantsev: bi('Олег Румянцев', 'Oleg Rumyantsev'),
  akhmedov: bi('Тимур Ахмедов', 'Timur Akhmedov'),
  sorokin: bi('Глеб Сорокин', 'Gleb Sorokin'),
  kotova: bi('Мария Котова', 'Maria Kotova'),
  lebedeva: bi('Ирина Лебедева', 'Irina Lebedeva'),
  gusev: bi('Павел Гусев', 'Pavel Gusev'),
  ershov: bi('Святослав Ершов', 'Svyatoslav Ershov'),
  finance: bi('Финансовый модуль', 'Finance module'),
  sigma: bi('Лаборатория Сигма', 'Sigma Lab'),
  security: bi('Служба безопасности', 'Security team'),
  monitoring: bi('Система мониторинга', 'Monitoring system'),
  vision: bi('Endfield Vision', 'Endfield Vision'),
} satisfies Record<string, Bi>

const AUTO = bi('Автоматическое уведомление', 'Automatic notification')

export const MESSAGES: InboxMessage[] = [
  {
    id: 'm1',
    kind: 'incident',
    from: P.rumyantsev,
    fromRole: bi('Начальник объекта, Ретранслятор Южный', 'Facility manager, South Relay'),
    subject: bi('INC-2291: потеря связи с ретранслятором', 'INC-2291: relay connection lost'),
    time: '08:14',
    unread: true,
    mention: true,
    archived: false,
    link: { label: bi('К объекту', 'Go to facility'), href: '/facilities' },
    thread: [
      {
        id: 't1',
        author: P.rumyantsev,
        time: '08:14',
        text: bi(
          'Связь с ретранслятором потеряна в 08:12. Резервный канал не поднялся. Дежурная бригада выехала, ориентировочное прибытие - 09:30.\n\n@Алина Воронцова, прошу согласовать вызов подрядчика по договору обслуживания: без него замену модуля питания сделать не сможем.',
          'Connection to the relay was lost at 08:12. The backup channel did not come up. The on-call crew is on its way, estimated arrival - 09:30.\n\n@Alina Vorontsova, please approve calling in the contractor under the service agreement: we cannot replace the power module without them.',
        ),
      },
    ],
  },
  {
    id: 'm2',
    kind: 'incident',
    from: P.akhmedov,
    fromRole: bi('Начальник объекта, Хребет', 'Facility manager, Ridge'),
    subject: bi('INC-2288: перегрев линии сборки №3', 'INC-2288: assembly line 3 overheating'),
    time: '06:52',
    unread: true,
    mention: false,
    archived: false,
    link: { label: bi('К объекту', 'Go to facility'), href: '/facilities' },
    thread: [
      {
        id: 't1',
        author: P.akhmedov,
        time: '06:52',
        text: bi(
          'Температура подшипникового узла линии №3 - 94 °C при норме до 80 °C. Линия переведена на 60% мощности, выпуск смены снижен примерно на 140 ед.',
          'Line 3 bearing assembly temperature is 94 °C against a limit of 80 °C. The line is running at 60% capacity, shift output is down by about 140 units.',
        ),
      },
      {
        id: 't2',
        author: P.sorokin,
        time: '07:20',
        text: bi(
          'Смазку и датчики проверили, отклонений нет. Подозреваем износ подшипника, нужна остановка на 4 часа.',
          'Lubrication and sensors checked, no deviations. We suspect bearing wear and need a 4-hour shutdown.',
        ),
      },
    ],
  },
  {
    id: 'm3',
    kind: 'task',
    from: P.kotova,
    fromRole: bi('Начальник объекта, Порт Ясный', 'Facility manager, Clearwater Port'),
    subject: bi(
      'Согласовать график отгрузки на 12-18 октября',
      'Approve the shipment schedule for October 12-18',
    ),
    time: '07:41',
    unread: true,
    mention: true,
    archived: false,
    link: { label: bi('К задачам', 'Go to tasks'), href: '/tasks' },
    thread: [
      {
        id: 't1',
        author: P.kotova,
        time: '07:41',
        text: bi(
          '@Алина Воронцова, приложила график отгрузки на следующую неделю. Изменения: два дополнительных рейса на Терминал Ясный во вторник и четверг. Нужно согласование до 15:00, иначе перевозчик снимет бронь.',
          '@Alina Vorontsova, I have attached the shipment schedule for next week. Changes: two extra runs to Clearwater Terminal on Tuesday and Thursday. Approval is needed by 15:00, otherwise the carrier will cancel the booking.',
        ),
      },
    ],
  },
  {
    id: 'm4',
    kind: 'system',
    from: P.finance,
    fromRole: AUTO,
    subject: bi('Счёт СЧ-2026-0427 просрочен', 'Invoice INV-2026-0427 is overdue'),
    time: bi('вчера', 'yesterday'),
    unread: false,
    mention: false,
    archived: false,
    link: { label: bi('К финансам', 'Go to finance'), href: '/finance' },
    thread: [
      {
        id: 't1',
        author: P.finance,
        time: bi('вчера, 00:05', 'yesterday, 00:05'),
        text: bi(
          'Срок оплаты счёта СЧ-2026-0427 (АО «Транзит-Восток», 2 316 000 ₽) истёк 07.10.2026. Напоминание контрагенту отправлено автоматически.',
          'Invoice INV-2026-0427 (Transit East JSC, RUB 2,316,000) was due on 07.10.2026. A reminder was sent to the counterparty automatically.',
        ),
      },
    ],
  },
  {
    id: 'm5',
    kind: 'task',
    from: P.sorokin,
    fromRole: bi('Главный инженер', 'Chief engineer'),
    subject: bi('Калибровка датчиков VAL-01 завершена', 'VAL-01 sensor calibration complete'),
    time: bi('вчера', 'yesterday'),
    unread: false,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: P.sorokin,
        time: bi('вчера, 17:40', 'yesterday, 17:40'),
        text: bi(
          'Калибровка 48 датчиков давления на линиях VAL-01 завершена. Протокол загружен в карточку объекта. Отклонения в пределах допуска, повторная проверка через 90 дней.',
          'Calibration of 48 pressure sensors on the VAL-01 lines is complete. The report is uploaded to the facility card. Deviations are within tolerance, next check in 90 days.',
        ),
      },
      {
        id: 't2',
        author: ME,
        time: bi('вчера, 18:02', 'yesterday, 18:02'),
        text: bi('Принято, спасибо. Закрываю задачу.', 'Got it, thanks. Closing the task.'),
      },
    ],
  },
  {
    id: 'm6',
    kind: 'incident',
    from: P.sigma,
    fromRole: bi('Система контроля качества', 'Quality control system'),
    subject: bi('Отклонение состава партии Р-2210', 'Composition deviation in batch R-2210'),
    time: bi('вчера', 'yesterday'),
    unread: true,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: P.sigma,
        time: bi('вчера, 15:26', 'yesterday, 15:26'),
        text: bi(
          'Содержание примесей в пробе партии Р-2210 - 2,8% при допуске 2,5%. Партия помечена как условно годная до повторного анализа. Отгрузка ООО «Тяжмаш-Логистик» приостановлена.',
          'Impurity content in the batch R-2210 sample is 2.8% against a 2.5% tolerance. The batch is marked as conditionally acceptable pending re-analysis. Shipment to Tyazhmash Logistics LLC is on hold.',
        ),
      },
    ],
  },
  {
    id: 'm7',
    kind: 'task',
    from: P.lebedeva,
    fromRole: bi('Начальник объекта, Долина-2', 'Facility manager, Valley-2'),
    subject: bi('Заявка на дополнительную смену в выходные', 'Request for an extra weekend shift'),
    time: '06.10',
    unread: false,
    mention: true,
    archived: false,
    link: { label: bi('К команде', 'Go to team'), href: '/team' },
    thread: [
      {
        id: 't1',
        author: P.lebedeva,
        time: '06.10, 11:15',
        text: bi(
          '@Алина Воронцова, для выполнения плана октября нужна дополнительная смена 10 и 11 октября: 12 операторов, 2 инженера. Оценка затрат - 486 000 ₽, укладываемся в лимит месяца.',
          '@Alina Vorontsova, to meet the October plan we need an extra shift on October 10 and 11: 12 operators, 2 engineers. Estimated cost - RUB 486,000, within the monthly limit.',
        ),
      },
    ],
  },
  {
    id: 'm8',
    kind: 'system',
    from: P.security,
    fromRole: AUTO,
    subject: bi('Вход с нового устройства', 'Sign-in from a new device'),
    time: '06.10',
    unread: false,
    mention: false,
    archived: false,
    link: { label: bi('Активные сеансы', 'Active sessions'), href: '/settings?tab=security' },
    thread: [
      {
        id: 't1',
        author: P.security,
        time: '06.10, 08:03',
        text: bi(
          'Выполнен вход в учётную запись: Safari, iPadOS, Северодвинск. Если это были не вы, завершите сеанс в настройках безопасности и смените пароль.',
          'Your account was signed in to from Safari, iPadOS, Severodvinsk. If this was not you, end the session in security settings and change your password.',
        ),
      },
    ],
  },
  {
    id: 'm9',
    kind: 'task',
    from: P.gusev,
    fromRole: bi('Начальник объекта, Застава', 'Facility manager, Outpost'),
    subject: bi('Замена фильтров: нужен доступ подрядчика', 'Filter replacement: contractor access needed'),
    time: '05.10',
    unread: false,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: P.gusev,
        time: '05.10, 14:30',
        text: bi(
          'Подрядчик по замене фильтров приезжает 9 октября. Нужно оформить временные пропуска на 4 человек и доступ в зону вентиляции.',
          'The filter replacement contractor arrives on October 9. We need temporary passes for 4 people and access to the ventilation area.',
        ),
      },
    ],
  },
  {
    id: 'm10',
    kind: 'system',
    from: P.monitoring,
    fromRole: AUTO,
    subject: bi(
      'Еженедельная сводка: выпуск 39 120 ед. (+4,2%)',
      'Weekly summary: output 39,120 units (+4.2%)',
    ),
    time: '05.10',
    unread: false,
    mention: false,
    archived: false,
    link: { label: bi('К обзору', 'Go to overview'), href: '/overview' },
    thread: [
      {
        id: 't1',
        author: P.monitoring,
        time: '05.10, 09:00',
        text: bi(
          'Выпуск за неделю - 39 120 ед., на 4,2% выше прошлой недели. Энергопотребление - 16 410 МВт·ч. Открытых инцидентов на конец недели - 4. Лучший объект недели - Порт Ясный (загрузка 91%).',
          'Weekly output - 39,120 units, 4.2% above last week. Energy use - 16,410 MWh. Open incidents at week end - 4. Facility of the week - Clearwater Port (91% load).',
        ),
      },
    ],
  },
  {
    id: 'm11',
    kind: 'incident',
    from: P.ershov,
    fromRole: bi('Начальник объекта, Рудник Глубокий', 'Facility manager, Deep Mine'),
    subject: bi('INC-2276: остановка конвейера закрыта', 'INC-2276: conveyor stoppage closed'),
    time: '03.10',
    unread: false,
    mention: false,
    archived: true,
    thread: [
      {
        id: 't1',
        author: P.ershov,
        time: '03.10, 19:12',
        text: bi(
          'Конвейер К-4 запущен после замены ленты. Простой - 3 ч 40 мин. Акт расследования приложен к инциденту.',
          'Conveyor K-4 restarted after the belt replacement. Downtime - 3 h 40 min. The investigation report is attached to the incident.',
        ),
      },
    ],
  },
  {
    id: 'm12',
    kind: 'system',
    from: P.vision,
    fromRole: bi('Обновление консоли', 'Console update'),
    subject: bi('Версия 0.1.0: новые разделы консоли', 'Version 0.1.0: new console sections'),
    time: '01.10',
    unread: false,
    mention: false,
    archived: true,
    thread: [
      {
        id: 't1',
        author: P.vision,
        time: '01.10, 10:00',
        text: bi(
          'В консоли появились разделы «Финансы» и «Журнал», настройки уведомлений по каналам и ключи API для интеграций.',
          'The console now has Finance and Audit log sections, per-channel notification settings and API keys for integrations.',
        ),
      },
    ],
  },
]
