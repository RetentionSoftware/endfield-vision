import { defineConfig } from 'vitest/config'

// Тесты библиотеки: чистые функции и серверный рендер компонентов (без браузера).
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
