import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettier from 'eslint-config-prettier'

export default defineConfigWithVueTs(
  { ignores: ['dist', 'dist-test', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    // симуляция должна оставаться чистой и детерминированной (SPEC §3.1)
    files: ['src/entities/*/model/**', 'src/shared/lib/sim/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['phaser', 'phaser/*', 'vue', 'pinia', 'vue-router'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'performance'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Используй ГСЧ с seed из shared/lib/sim.' },
        { object: 'Date', property: 'now', message: 'Время симуляции — это тики.' },
      ],
    },
  },
  prettier,
)
