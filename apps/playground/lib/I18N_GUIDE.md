# Перевод демо-консоли (ru / en)

Язык консоли - cookie `ev-playground-lang`, сервер рендерит выбранный язык. Переключение - «Настройки - Профиль - Язык интерфейса» и палитра команд (Ctrl+K).

## Как переводить

- В компоненте: `const { t, tx, plural, formatNum, formatRub, formatRubShort, intl } = useT()` из `@/lib/i18n`.
  - `t('Сохранить', 'Save')` - пара строк прямо в коде экрана.
  - `tx(value)` - двуязычное значение из демо-данных (`{ ru, en }`), обычная строка - как есть.
  - `plural(n, ['задача', 'задачи', 'задач'], ['task', 'tasks'])`.
  - `formatNum/formatRub/formatRubShort` уже привязаны к языку; `intl` - для своих `toLocaleString`.
- Хлебные крошки: `useCrumbs('tasks')` вместо `crumbs('tasks')`. Подписи разделов меню - `tx(section(key).label)`.
- Демо-данные (`lib/demo/*.ts`): текстовые поля - тип `Bi`, значения - `bi('Русский', 'English')` из `@/lib/lang`. Идентификаторы, коды, даты, числа не меняются. Константы с подписями на уровне модуля (вкладки, статусы, роли) - тоже `Bi`, в компоненте - `tx(...)`.
- Тосты, окна, ошибки валидации - через `t(...)` внутри компонента (в обработчиках - тот же `t` из замыкания).
- Русский текст не переписывать - он остаётся как был. Английский - естественный, короткий, деловой, как в продуктовых интерфейсах (sentence case: «Create task», не «Create Task»). Без длинного тире.
- Комментарии в коде остаются на русском.
- Ничего не оставлять «как есть» на русском в английском режиме: заголовки, описания, подсказки, плейсхолдеры, aria-label, пустые состояния, тексты кода-примеров на витрине (строки внутри примеров кода можно оставить русскими, если пример показывает русский интерфейс; описание вокруг - переводится).

## Глоссарий

| Русский | English |
|---|---|
| Консоль | Console |
| Объект / площадка | Facility / site |
| Сектор (Северный ...) | North sector, East sector, Coastal sector, Border sector, Central sector, South sector |
| Долина-1, Долина-2, Хребет, Порт Ясный, Застава, Рудник Глубокий, Лаборатория Сигма, Ретранслятор Южный | Valley-1, Valley-2, Ridge, Clearwater Port, Outpost, Deep Mine, Sigma Lab, South Relay |
| Склад Долина-1 и т. п. | Valley-1 warehouse |
| Задача, исполнитель, срок, приоритет | Task, assignee, due date, priority |
| Инцидент | Incident |
| Журнал (аудит) | Audit log |
| Смена | Shift |
| Наряд | Work order |
| Отгрузка / поставка / перемещение | Shipment / delivery / transfer |
| Остатки | Stock |
| Счёт (финансы) | Invoice |
| Контрагент | Counterparty |
| Входящие | Inbox |
| В работе / С ограничениями / Обслуживание / Остановлен | Operating / Limited / Maintenance / Stopped |
| Единицы: ед., шт., кг, т, МВт·ч, мин, ч, дн. | units, pcs, kg, t, MWh, min, h, days |

Имена людей - транслитерация: Алина Воронцова - Alina Vorontsova, Глеб Сорокин - Gleb Sorokin, Ирина Лебедева - Irina Lebedeva, Тимур Ахмедов - Timur Akhmedov, Мария Котова - Maria Kotova, Павел Гусев - Pavel Gusev, Святослав Ершов - Svyatoslav Ershov, Олег Румянцев - Oleg Rumyantsev. Правила: ж - zh, х - kh, ц - ts, ч - ch, ш - sh, щ - shch, ю - yu, я - ya, ё - yo, й - y, ы - y, ь/ъ - опускаются, -ий в конце - -iy (Дмитрий - Dmitriy), но общепринятые формы (Maria, Alexander) допустимы. Должности переводятся (Начальник смены - Shift supervisor).

## Проверка

- `npx tsc --noEmit` и `npx eslint <свои файлы>` из `apps/playground`.
- Оставшийся русский вне `t()/bi()`: `node C:/Users/r1ot/AppData/Local/Temp/claude/C--Personal-Projects-Web-Libraries-UI-Endfield-Vision/f5bc1148-93cf-48ed-a8d1-fe7bac288dc8/scratchpad/ru-strings.mjs <папка>` выводит строки кода с кириллицей; каждая должна быть внутри `t('...', '...')`, `bi('...', '...')` или комментария.
- Серверная разметка на английском (dev-сервер уже запущен на :3200, свой не запускать, браузер не открывать - язык в cookie общий для всех): `curl -s -H "Cookie: ev-playground-lang=en" http://localhost:3200/<раздел> | grep -o '[А-Яа-яЁё][А-Яа-яЁё ,.-]*' | sort -u` - должно быть пусто (кроме слова «Русский» в переключателе языка).
