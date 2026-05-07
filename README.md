# Мини-приложение планера + Telegram-бот

Есть два режима:

1. Локальный тест на компьютере: `server.mjs`.
2. Интернет-вариант для Telegram Mini App: GitHub Pages + Cloudflare Worker + KV.

Для GitHub Pages + Cloudflare смотри отдельную инструкцию:

[GITHUB_CLOUDFLARE_SETUP.md](./GITHUB_CLOUDFLARE_SETUP.md)

## Локальный запуск

```bash
node outputs/productivity_planner/server.mjs
```

Открыть:

```text
http://127.0.0.1:8787
```

## Подключение Telegram-бота

1. В Telegram откройте `@BotFather`.
2. Создайте бота командой `/newbot`.
3. Скопируйте токен.
4. Запустите приложение так:

```bash
TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН" node outputs/productivity_planner/server.mjs
```

После этого можно писать боту:

- `сделала рилс`
- `готово шаги`
- `/plan клиент 3 поста`
- `/today`
- `/week`
- `/balance здоровье 7`

## Telegram Mini App

Telegram Mini App откроется из бота только по публичному `https`-адресу. Локальный адрес `http://127.0.0.1:8787` подходит для браузера на компьютере, но не для кнопки Web App в Telegram.

Когда у приложения будет публичный URL, запустите так:

```bash
APP_URL="https://your-domain.ru" TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН" node outputs/productivity_planner/server.mjs
```

После этого в боте появится команда:

```text
/app
```

Она пришлёт кнопку `Открыть планер`, которая откроет эту страницу прямо внутри Telegram.

Для быстрого теста публичного URL можно использовать туннель вроде ngrok или Cloudflare Tunnel, а для постоянной версии — Render, Railway, VPS или любой хостинг Node.js.

Данные сохраняются в:

```text
outputs/productivity_planner/data/state.json
```
