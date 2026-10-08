# ENDFIELD Vision

Дизайн-система для React 19 / Next.js: токены на CSS-переменных, тёмная и светлая темы, пресеты акцента, 70+ доступных компонентов без сторонних UI-библиотек и демо-консоль, собранная только из них.

| Пакет | Что это |
|---|---|
| [`packages/vision`](packages/vision) | Библиотека `endfield-vision`: стили, компоненты, тема. Документация - [README пакета](packages/vision/README.md). |
| [`apps/playground`](apps/playground) | Next.js 16: демо-консоль (обзор, объекты, задачи, склад, команда, финансы, входящие, журнал, настройки) и витрина **ENDFIELD Vision** (`/vision`) со всеми элементами библиотеки. |

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:3200
```

Плейграунд берёт библиотеку из исходников (`paths` в `apps/playground/tsconfig.json`): правки в `packages/vision/src` видны сразу.

## Проверки

```bash
npm run typecheck
npm run lint
npm test
npm run build      # dist библиотеки + production-сборка плейграунда
npm run check:dist -w endfield-vision   # собранный пакет импортируется как у потребителя
```

## Подключение в проект

```bash
npm i endfield-vision
```

```tsx
import 'endfield-vision/styles.css'
import { Button, DataTable, ThemeScript, useModals, toast } from 'endfield-vision'
```

Подробности (провайдеры, тема, акценты, слои, токены, список компонентов) - в [README пакета](packages/vision/README.md). Конвенции разработки (и для ИИ-агентов) - в [AGENTS.md](AGENTS.md).

## Лицензия

[MIT](LICENSE)
