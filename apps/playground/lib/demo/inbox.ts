/*
 * Демо-данные входящих: уведомления об инцидентах, задачи, системные
 * сообщения и упоминания. Время - готовые подписи, без Date.now при рендере.
 */

import type { Tone } from 'endfield-vision'

export type MessageKind = 'incident' | 'task' | 'system'

export const MESSAGE_KIND: Record<MessageKind, { label: string; tone: Tone }> = {
  incident: { label: 'Инцидент', tone: 'danger' },
  task: { label: 'Задача', tone: 'info' },
  system: { label: 'Система', tone: 'neutral' },
}

export interface ThreadEntry {
  id: string
  author: string
  /** Подпись времени: «08:14», «вчера, 17:40». */
  time: string
  text: string
}

export interface InboxMessage {
  id: string
  kind: MessageKind
  from: string
  /** Должность или источник. */
  fromRole: string
  subject: string
  /** Подпись времени в списке. */
  time: string
  unread: boolean
  /** Упоминание текущего пользователя. */
  mention: boolean
  archived: boolean
  /** Ссылка на связанный раздел. */
  link?: { label: string; href: string }
  thread: ThreadEntry[]
}

/** Текущий пользователь демо: автор ответов. */
export const ME = 'Алина Воронцова'

export const MESSAGES: InboxMessage[] = [
  {
    id: 'm1',
    kind: 'incident',
    from: 'Олег Румянцев',
    fromRole: 'Начальник объекта, Ретранслятор Южный',
    subject: 'INC-2291: потеря связи с ретранслятором',
    time: '08:14',
    unread: true,
    mention: true,
    archived: false,
    link: { label: 'К объекту', href: '/facilities' },
    thread: [
      {
        id: 't1',
        author: 'Олег Румянцев',
        time: '08:14',
        text: 'Связь с ретранслятором потеряна в 08:12. Резервный канал не поднялся. Дежурная бригада выехала, ориентировочное прибытие - 09:30.\n\n@Алина Воронцова, прошу согласовать вызов подрядчика по договору обслуживания: без него замену модуля питания сделать не сможем.',
      },
    ],
  },
  {
    id: 'm2',
    kind: 'incident',
    from: 'Тимур Ахмедов',
    fromRole: 'Начальник объекта, Хребет',
    subject: 'INC-2288: перегрев линии сборки №3',
    time: '06:52',
    unread: true,
    mention: false,
    archived: false,
    link: { label: 'К объекту', href: '/facilities' },
    thread: [
      {
        id: 't1',
        author: 'Тимур Ахмедов',
        time: '06:52',
        text: 'Температура подшипникового узла линии №3 - 94 °C при норме до 80 °C. Линия переведена на 60% мощности, выпуск смены снижен примерно на 140 ед.',
      },
      {
        id: 't2',
        author: 'Глеб Сорокин',
        time: '07:20',
        text: 'Смазку и датчики проверили, отклонений нет. Подозреваем износ подшипника, нужна остановка на 4 часа.',
      },
    ],
  },
  {
    id: 'm3',
    kind: 'task',
    from: 'Мария Котова',
    fromRole: 'Начальник объекта, Порт Ясный',
    subject: 'Согласовать график отгрузки на 12-18 октября',
    time: '07:41',
    unread: true,
    mention: true,
    archived: false,
    link: { label: 'К задачам', href: '/tasks' },
    thread: [
      {
        id: 't1',
        author: 'Мария Котова',
        time: '07:41',
        text: '@Алина Воронцова, приложила график отгрузки на следующую неделю. Изменения: два дополнительных рейса на Терминал Ясный во вторник и четверг. Нужно согласование до 15:00, иначе перевозчик снимет бронь.',
      },
    ],
  },
  {
    id: 'm4',
    kind: 'system',
    from: 'Финансовый модуль',
    fromRole: 'Автоматическое уведомление',
    subject: 'Счёт СЧ-2026-0427 просрочен',
    time: 'вчера',
    unread: false,
    mention: false,
    archived: false,
    link: { label: 'К финансам', href: '/finance' },
    thread: [
      {
        id: 't1',
        author: 'Финансовый модуль',
        time: 'вчера, 00:05',
        text: 'Срок оплаты счёта СЧ-2026-0427 (АО «Транзит-Восток», 2 316 000 ₽) истёк 07.10.2026. Напоминание контрагенту отправлено автоматически.',
      },
    ],
  },
  {
    id: 'm5',
    kind: 'task',
    from: 'Глеб Сорокин',
    fromRole: 'Главный инженер',
    subject: 'Калибровка датчиков VAL-01 завершена',
    time: 'вчера',
    unread: false,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: 'Глеб Сорокин',
        time: 'вчера, 17:40',
        text: 'Калибровка 48 датчиков давления на линиях VAL-01 завершена. Протокол загружен в карточку объекта. Отклонения в пределах допуска, повторная проверка через 90 дней.',
      },
      {
        id: 't2',
        author: ME,
        time: 'вчера, 18:02',
        text: 'Принято, спасибо. Закрываю задачу.',
      },
    ],
  },
  {
    id: 'm6',
    kind: 'incident',
    from: 'Лаборатория Сигма',
    fromRole: 'Система контроля качества',
    subject: 'Отклонение состава партии Р-2210',
    time: 'вчера',
    unread: true,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: 'Лаборатория Сигма',
        time: 'вчера, 15:26',
        text: 'Содержание примесей в пробе партии Р-2210 - 2,8% при допуске 2,5%. Партия помечена как условно годная до повторного анализа. Отгрузка ООО «Тяжмаш-Логистик» приостановлена.',
      },
    ],
  },
  {
    id: 'm7',
    kind: 'task',
    from: 'Ирина Лебедева',
    fromRole: 'Начальник объекта, Долина-2',
    subject: 'Заявка на дополнительную смену в выходные',
    time: '06.10',
    unread: false,
    mention: true,
    archived: false,
    link: { label: 'К команде', href: '/team' },
    thread: [
      {
        id: 't1',
        author: 'Ирина Лебедева',
        time: '06.10, 11:15',
        text: '@Алина Воронцова, для выполнения плана октября нужна дополнительная смена 10 и 11 октября: 12 операторов, 2 инженера. Оценка затрат - 486 000 ₽, укладываемся в лимит месяца.',
      },
    ],
  },
  {
    id: 'm8',
    kind: 'system',
    from: 'Служба безопасности',
    fromRole: 'Автоматическое уведомление',
    subject: 'Вход с нового устройства',
    time: '06.10',
    unread: false,
    mention: false,
    archived: false,
    link: { label: 'Активные сеансы', href: '/settings?tab=security' },
    thread: [
      {
        id: 't1',
        author: 'Служба безопасности',
        time: '06.10, 08:03',
        text: 'Выполнен вход в учётную запись: Safari, iPadOS, Северодвинск. Если это были не вы, завершите сеанс в настройках безопасности и смените пароль.',
      },
    ],
  },
  {
    id: 'm9',
    kind: 'task',
    from: 'Павел Гусев',
    fromRole: 'Начальник объекта, Застава',
    subject: 'Замена фильтров: нужен доступ подрядчика',
    time: '05.10',
    unread: false,
    mention: false,
    archived: false,
    thread: [
      {
        id: 't1',
        author: 'Павел Гусев',
        time: '05.10, 14:30',
        text: 'Подрядчик по замене фильтров приезжает 9 октября. Нужно оформить временные пропуска на 4 человек и доступ в зону вентиляции.',
      },
    ],
  },
  {
    id: 'm10',
    kind: 'system',
    from: 'Система мониторинга',
    fromRole: 'Автоматическое уведомление',
    subject: 'Еженедельная сводка: выпуск 39 120 ед. (+4,2%)',
    time: '05.10',
    unread: false,
    mention: false,
    archived: false,
    link: { label: 'К обзору', href: '/overview' },
    thread: [
      {
        id: 't1',
        author: 'Система мониторинга',
        time: '05.10, 09:00',
        text: 'Выпуск за неделю - 39 120 ед., на 4,2% выше прошлой недели. Энергопотребление - 16 410 МВт·ч. Открытых инцидентов на конец недели - 4. Лучший объект недели - Порт Ясный (загрузка 91%).',
      },
    ],
  },
  {
    id: 'm11',
    kind: 'incident',
    from: 'Святослав Ершов',
    fromRole: 'Начальник объекта, Рудник Глубокий',
    subject: 'INC-2276: остановка конвейера закрыта',
    time: '03.10',
    unread: false,
    mention: false,
    archived: true,
    thread: [
      {
        id: 't1',
        author: 'Святослав Ершов',
        time: '03.10, 19:12',
        text: 'Конвейер К-4 запущен после замены ленты. Простой - 3 ч 40 мин. Акт расследования приложен к инциденту.',
      },
    ],
  },
  {
    id: 'm12',
    kind: 'system',
    from: 'Endfield Vision',
    fromRole: 'Обновление консоли',
    subject: 'Версия 0.1.0: новые разделы консоли',
    time: '01.10',
    unread: false,
    mention: false,
    archived: true,
    thread: [
      {
        id: 't1',
        author: 'Endfield Vision',
        time: '01.10, 10:00',
        text: 'В консоли появились разделы «Финансы» и «Журнал», настройки уведомлений по каналам и ключи API для интеграций.',
      },
    ],
  },
]
