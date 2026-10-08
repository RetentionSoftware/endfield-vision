# Endfield Vision - правила проекта

Дизайн-система для React 19 / Next.js (App Router): токены на CSS-переменных, тёмная (по умолчанию) и светлая темы, пресеты акцента, доступные компоненты без сторонних UI-библиотек.

## Структура

- `packages/vision` - библиотека (`endfield-vision`). Исходники `src/`, сборка `dist/` (tsc + полные пути импортов + копия стилей, `scripts/build.mjs`).
  - `src/components/*.tsx` - компоненты, `src/lib/*` - хуки, оверлеи, маски, даты, тема.
  - `src/styles/` - `tokens.css` (все литералы цветов только здесь и в `accents.css`), `base.css`, `shell.css`, `components/*.css`. Точка входа - `index.css`.
- `apps/playground` - Next.js 16: демо-консоль (разделы в `lib/nav.ts`) и витрина библиотеки `/vision` (ENDFIELD Vision). Берёт библиотеку из исходников через `paths` в `tsconfig.json`.

## Конвенции

- **Префиксы.** Классы библиотеки - `ev-`, CSS-переменные - `--ev-`, слои - `@layer ev.reset, ev.tokens, ev.base, ev.components, ev.shell, ev.utilities`. Классы плейграунда в `globals.css` - `pg-`; стили экранов - CSS Modules рядом с экраном.
- **Только токены.** Цвета, отступы, радиусы, тени, слои - через `var(--ev-...)`. Литералы цветов - только в `tokens.css` / `accents.css`.
- **Только компоненты библиотеки.** Выпадающий список - `Select`/`MultiSelect`, никогда нативный `<select>`. Подсказка - `Tooltip` (у `IconButton` встроена через `label`), никогда атрибут `title=`. ESLint ловит оба случая.
- **Дефис, не длинное тире** - в интерфейсе, коде, комментариях, коммитах. ESLint ловит длинное тире в строках.
- **Тон интерфейса** - сухой и деловой. Пустое значение в таблицах и карточках - `EMPTY_VALUE` (дефис).
- **Карточки, панели, плитки, таблицы - без рамки**: их отделяет поверхность (в светлой теме ещё `--ev-shadow-card`). Блок внутри карточки, окна или шторки - на `--ev-surface-nested`. Рамка - у полей ввода и контролов.
- **'use client'** - первой строкой у модулей с хуками и обработчиками. Модули без директивы (`Display.tsx`, `Page.tsx`, `lib/theme-script.tsx`, `lib/cx.ts`...) должны оставаться пригодными для серверных компонентов.
- **Демо-данные детерминированные** (без `Math.random`/`Date.now` при рендере): серверный и клиентский рендер совпадают.

## Новый компонент

1. `packages/vision/src/components/X.tsx` + стили в `src/styles/components/*.css` внутри `@layer ev.components`.
2. Экспорт (и типы) в `src/index.ts`.
3. Тест рендера в `src/__tests__/render.test.tsx` (серверный рендер, без браузера).
4. Пример на витрине `apps/playground/components/vision/`.

## Команды

```bash
npm install
npm run dev          # плейграунд на http://localhost:3200
npm run typecheck
npm run lint
npm test
npm run build        # dist библиотеки + сборка плейграунда
```
