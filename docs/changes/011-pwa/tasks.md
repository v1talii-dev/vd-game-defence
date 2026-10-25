# 011 — PWA (установка и офлайн)

Решение пользователя 2026-10-25: установка на главный экран + офлайн, ориентация landscape, fullscreen. Связано с `009-mobile` (viewport, safe-area, `theme-color` делаются там в T1).

Правила: срезы по порядку, `[x]` ставит тот, кто прогнал проверку. Деплой — GitHub Pages, `base: '/vd-game-defence/'`: `scope`, `start_url`, пути service worker и иконок строятся от base. Service worker только в production-сборке (в dev не регистрируется). Иконки и название — вымышленные, без ассетов EA; ассеты записать в `public/assets/LICENSES.md`. Тексты — русские, `shared/i18n`. Python нет, скрипты через Node.js. e2e ≤ 2 воркера, один прогон.

## Срезы

- [x] **P1. Manifest и иконки.** (`ui-engineer`) `manifest.webmanifest`: `name`, `short_name`, `lang: ru`, `start_url` и `scope` от base, `display: fullscreen` с запасным `standalone`, `orientation: landscape`, `theme_color`/`background_color`, иконки 192/512 + maskable 512 + `apple-touch-icon` 180; ссылки и iOS-метатеги (`apple-mobile-web-app-capable`, `status-bar-style`) в `index.html`. Иконки собрать Node-скриптом из SVG (силуэт башни, вымышленный).
  Проверка: Lighthouse/DevTools «Application → Manifest» без ошибок на `npm run build && npm run preview`; typecheck, lint, test.
- [ ] **P2. Service worker и офлайн.** (`render-engineer`) Плагин `vite-plugin-pwa` (workbox, `generateSW`) или ручной SW — выбрать меньшее, зафиксировать в отчёте. Precache: оболочка, JS/CSS, карты Tiled, `.glb`-модели, иконки; hash-версионирование; `registerType: 'prompt'`. Стратегия: precache для статики, без runtime-кэша внешних доменов. Лимит размера precache проверить (`.glb`).
  Проверка: `npm run preview`, загрузить, в DevTools поставить Offline, перезагрузить — меню, кампания и бой работают; typecheck, lint, test, build.
- [ ] **P3. Обновление версии и установка (UI).** (`ui-engineer`) Тост «Доступна новая версия — Обновить» (`useRegisterSW`/событие `needRefresh`), без перезагрузки посреди боя (только по кнопке или на экране меню); кнопка «Установить игру» в настройках по `beforeinstallprompt` (Android/desktop), на iOS подсказка «Поделиться → На экран Домой»; строки в `shared/i18n`; кнопка fullscreen в настройках там, где API доступен (на iOS скрыта).
  Проверка: компонентные тесты показа/скрытия; ручной проход в эмуляции; typecheck, lint, test.
- [ ] **P4. Приёмка PWA.** (`qa-debugger`) Лайтхаус PWA-аудит (installable, offline), e2e: manifest доступен, SW активируется в preview-сборке, офлайн-перезагрузка открывает меню (Chromium, ≤ 2 воркера, один прогон); сохранения v2 живут после установки и обновления SW; деплой-воркфлоу не ломается (`build`); SPEC §1/§10 обновить (PWA больше не «вне рамок»), `PROGRESS.md`, пакет в `archive/`. Ручной чек-лист: установка на Android Chrome и iOS Safari, запуск с иконки в landscape без адресной строки, офлайн в самолётном режиме, обновление версии после нового деплоя.

## Риски

- iOS: нет `beforeinstallprompt`, нет `requestFullscreen`, `orientation` в manifest игнорируется — landscape поддержан только `RotateHint` из 009; кэш SW на iOS может вытесняться.
- Размер precache с `.glb` (десятки МБ) замедляет первую установку: смотреть размер сборки, при необходимости кэшировать модели лениво (runtime CacheFirst для `/assets/`).
- Старый SW держит устаревшую версию: обязателен механизм обновления (P3) и версионирование save не завязывать на кэш.
- На GitHub Pages `scope` должен быть `/vd-game-defence/`, иначе установка не сработает.

## Порядок

Не пересекается с D3/D5/F4/X5/D4 (файлы: `index.html`, `vite.config.ts`, `public/`, виджет настроек). P1 → P2 → P3 → P4. `index.html` также правит T1 (009): не одновременно.
