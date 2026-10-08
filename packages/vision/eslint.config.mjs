import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/*
 * Правила библиотеки: рекомендации React/Next + конвенции проекта (AGENTS.md):
 * никакого нативного <select> и атрибута title= на DOM-элементах
 * (есть Select и Tooltip), никакого длинного тире в текстах.
 * Правила действуют на исходники (ts/tsx), не на этот файл.
 */
const LONG_DASH = 'Длинное тире запрещено: используйте дефис.'

const projectConventions = {
  files: ['**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "JSXOpeningElement[name.name='select']",
        message: 'Используйте Select из endfield-vision вместо нативного <select>.',
      },
      {
        selector: 'JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name="title"]',
        message: 'Используйте Tooltip из endfield-vision вместо атрибута title.',
      },
      { selector: 'Literal[value=/—/]', message: LONG_DASH },
      { selector: 'JSXText[value=/—/]', message: LONG_DASH },
      { selector: 'TemplateElement[value.raw=/—/]', message: LONG_DASH },
    ],
  },
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  projectConventions,
  // Библиотека - не приложение Next: правило о страницах неприменимо.
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  globalIgnores(['dist/**', 'node_modules/**']),
])
