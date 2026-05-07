# GitHub Pages + Cloudflare Worker + KV

Эта схема делает планер доступным как Telegram Mini App:

```text
GitHub Pages -> показывает HTML-планер
Cloudflare Worker -> API + Telegram webhook
Cloudflare KV -> хранит галочки, подзадачи и колесо баланса
```

## 1. Что коммитить в GitHub

Коммитим папку `outputs/productivity_planner`, но не коммитим:

- `data/`
- `config.js`
- `.wrangler/`
- `node_modules/`

Это уже указано в `.gitignore`.

## 2. GitHub Pages

1. Создай репозиторий на GitHub.
2. Загрузи туда содержимое папки `outputs/productivity_planner`.
3. В настройках репозитория открой `Settings -> Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main`, folder: `/root`.
6. После публикации получишь URL вида:

```text
https://USERNAME.github.io/REPOSITORY/
```

Это будет `APP_URL`.

## 3. Cloudflare KV

В Cloudflare:

1. Открой `Workers & Pages -> KV`.
2. Создай namespace, например `planner_state`.
3. Скопируй его ID.
4. В `cloudflare/wrangler.toml` замени:

```toml
id = "REPLACE_WITH_PRODUCTION_KV_ID"
preview_id = "REPLACE_WITH_PREVIEW_KV_ID"
```

Для теста можно поставить один и тот же ID в оба поля.

## 4. Cloudflare Worker

Из папки `outputs/productivity_planner/cloudflare`:

```bash
wrangler login
wrangler deploy
```

Если `wrangler` не установлен:

```bash
npm install -g wrangler
```

После деплоя Cloudflare даст URL вида:

```text
https://personal-productivity-planner.YOUR_SUBDOMAIN.workers.dev
```

Это будет API URL.

## 5. Секрет токена Telegram

В папке `outputs/productivity_planner/cloudflare`:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
```

Вставь новый токен от `@BotFather`.

Важно: токен, который уже был отправлен в чат, лучше перевыпустить.

Если хочешь ограничить бота только своим Telegram-чатом, можно добавить:

```bash
wrangler secret put TELEGRAM_CHAT_ID
```

Сначала можно пропустить.

## 6. Переменные APP_URL и ALLOWED_ORIGIN

В `cloudflare/wrangler.toml` замени:

```toml
APP_URL = "https://USERNAME.github.io/REPOSITORY/"
ALLOWED_ORIGIN = "https://USERNAME.github.io"
```

Потом снова:

```bash
wrangler deploy
```

## 7. Подключить HTML к Worker

В корне GitHub Pages создай файл `config.js`:

```js
window.PLANNER_API_BASE = "https://personal-productivity-planner.YOUR_SUBDOMAIN.workers.dev";
```

Можно начать с `config.example.js`: скопировать его в `config.js` и заменить URL.

## 8. Включить Telegram webhook

После деплоя Worker выполни:

```bash
curl -X POST https://personal-productivity-planner.YOUR_SUBDOMAIN.workers.dev/setup-webhook
```

После этого Telegram будет отправлять сообщения в Worker.

## 9. Проверка

В Telegram:

```text
/start
/app
сделала рилс
/today
/week
```

В планере:

- открой GitHub Pages URL;
- проверь, что галочки и подзадачи подтягиваются;
- открой через кнопку `/app` в Telegram.

## 10. Важное про безопасность

- Не хранить `TELEGRAM_BOT_TOKEN` в GitHub.
- Использовать `wrangler secret put`.
- Лучше перевыпустить токен в `@BotFather`, потому что старый был отправлен в чат.
