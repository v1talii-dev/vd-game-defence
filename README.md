# Рубеж обороны

Браузерный tower defense в изометрии с военным сеттингом: типы урона против типов брони, ранги ветеранства, 12 волн на пустынной базе. Работает на десктопе и мобильных.

Спецификация — [`docs/SPEC.md`](docs/SPEC.md). Лицензии ассетов — [`public/assets/LICENSES.md`](public/assets/LICENSES.md).

## Запуск

Нужен Node 24 (`.nvmrc`).

```
npm ci
npm run dev        # http://localhost:5173/vd-game-defence/
```

## Проверки

```
npm run typecheck
npm run lint
npm run test       # unit, детерминизм, golden-реплеи, баланс
npm run e2e        # Playwright: desktop-chromium, mobile, mobile-safari
```

## Управление

| Действие | Клавиши |
|---|---|
| Выбрать башню | `1`–`4` |
| Улучшить / продать | `U` / `S` |
| Отмена | `Esc`, ПКМ |
| Следующая волна | `Space` |
| Пауза / скорость | `P` / `F` |
| Камера | WASD, край экрана, колесо |
| Debug-оверлей | `F3` или `?debug=1` |

Параметры для отладки: `#/battle?seed=1&wave=8&money=9999&speed=8`.
