import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  // набор слайсов задан в SPEC §3.2, слайсы с одним потребителем — норма
  { rules: { 'fsd/insignificant-slice': 'off' } },
])
