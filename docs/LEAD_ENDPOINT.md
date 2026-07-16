# Endpoint для заявок Speaker One

Фронтенд не должен обращаться к Telegram Bot API или CRM с секретными ключами напрямую. Переменная `VITE_LEAD_ENDPOINT` должна содержать URL защищённой серверной функции, например `https://example.ru/api/leads`.

## Настройка

1. Скопируйте `.env.example` в `.env.local`.
2. Укажите адрес серверной функции:

   ```env
   VITE_LEAD_ENDPOINT=https://example.ru/api/leads
   ```

3. Перезапустите dev-сервер или выполните новую production-сборку.

Переменные с префиксом `VITE_` попадают в клиентскую сборку. В них нельзя хранить bot token, chat id, ключи CRM и другие секреты. Сам endpoint должен быть безопасен для публикации и принимать запросы только по HTTPS. Для другого домена сервер также должен разрешить корректный CORS origin сайта.

Если endpoint не задан, форма не имитирует отправку: введённые данные остаются в полях, а пользователь получает возможность открыть Telegram вручную. Данные формы в Telegram URL не добавляются.

## Контракт запроса

```http
POST /api/leads
Content-Type: application/json
```

```json
{
  "name": "...",
  "contact": "...",
  "message": "...",
  "consent": true,
  "source": "speaker-one-website"
}
```

Успешный ответ должен иметь HTTP-статус `2xx`, заголовок `Content-Type: application/json` и тело:

```json
{
  "ok": true
}
```

Ожидаемый формат ошибки:

```json
{
  "ok": false,
  "message": "..."
}
```

Любой non-2xx ответ, пустой или некорректный JSON и ответ без `"ok": true` считаются ошибкой. Клиент отменяет запрос через 12 секунд и сохраняет введённые данные.

## Обязанности сервера

Серверная функция должна реализовать:

- повторную валидацию всех полей и согласия;
- rate limiting и антиспам-проверки;
- хранение Telegram/CRM-секретов только на сервере;
- безопасную отправку заявки в Telegram или CRM;
- логирование технических событий без избыточных персональных данных;
- HTTPS и ограниченный CORS;
- корректные статусы ответа и JSON-контракт;
- применимые требования законодательства к сбору, передаче, хранению и удалению персональных данных.

Клиентский honeypot и блокировка повторной отправки снижают простейший спам, но не заменяют серверную защиту.

## Готовый обработчик в проекте

Универсальная Web Request-реализация находится в `server/leadEndpoint.mjs`. Она:

- принимает только `POST` с JSON;
- повторно проверяет согласие и длину полей;
- проверяет honeypot и минимальное время заполнения;
- ограничивает частоту запросов в пределах одного экземпляра функции;
- разрешает CORS только точным адресам из `LEAD_ALLOWED_ORIGINS`;
- отменяет запрос к Telegram через 12 секунд;
- возвращает `{ "ok": true }` только после ответа Telegram с `message_id`;
- не использует HTML-разметку Telegram и не записывает секреты в лог.

Адаптеры размещения:

- `server/adapters/vercel.mjs`;
- `server/adapters/netlify.mjs`;
- `server/adapters/cloudflare.mjs`.

Выберите только адаптер под фактический хостинг. Для Vercel его обычно подключают как `api/leads.js`, для Netlify — как `netlify/functions/leads.js`, для Cloudflare Pages — как `functions/api/leads.js`. Универсальный файл намеренно не привязан к платформе до выбора хостинга.

## Server environment

В защищённых настройках функции задаются:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_THREAD_ID=
LEAD_WEBHOOK_SECRET=
LEAD_ALLOWED_ORIGINS=https://ВАШ-ДОМЕН
LEAD_STATUS_ALLOWED_ORIGINS=https://ВАШ-АДРЕС-STUDIO
LEAD_TIMEZONE=Asia/Yekaterinburg
```

`TELEGRAM_THREAD_ID` нужен только для темы в forum-группе. `LEAD_WEBHOOK_SECRET` защищает ручную тестовую проверку и никогда не передаётся форме. Эти значения нельзя хранить в Sanity, `siteConfig.js`, переменных `VITE_*` или Git.

## Проверка

Локальные автоматические тесты не обращаются к реальному Telegram:

```powershell
npm.cmd run test:lead
```

После размещения функции выполните server-side проверку:

```powershell
$env:LEAD_TEST_ENDPOINT='https://ВАШ-ДОМЕН/api/leads/test'
$env:LEAD_WEBHOOK_SECRET='ЗНАЧЕНИЕ_ИЗ_ХОСТИНГА'
npm.cmd run lead:test
```

Тест считается успешным только после появления тестового сообщения в нужном чате. До настройки реальных server environment и URL endpoint форма сохраняет введённые данные и показывает резервную Telegram-ссылку.

Для serverless-размещения in-memory rate limit недостаточен против распределённых запросов. Перед production требуется включить rate limiting платформы, edge firewall или внешнее хранилище счётчиков.
