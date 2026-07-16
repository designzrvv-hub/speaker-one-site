# Быстрый запуск Speaker One на хостинге

## Что потребуется

- реальный домен;
- хостинг с serverless-функциями или Node.js;
- опубликованный контент Sanity;
- Telegram Bot Token и Chat ID.

## Переменные публичной сборки

```env
VITE_SANITY_PROJECT_ID=
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2026-07-15
VITE_SANITY_USE_CDN=true
VITE_LEAD_ENDPOINT=https://ваш-домен.ru/api/leads
```

## Секретные переменные сервера

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_THREAD_ID=
LEAD_WEBHOOK_SECRET=
LEAD_ALLOWED_ORIGINS=https://ваш-домен.ru
LEAD_STATUS_ALLOWED_ORIGINS=https://ваша-studio.sanity.studio
LEAD_TIMEZONE=Asia/Yekaterinburg
```

## Сборка

```bash
npm ci
npm run build
```

Готовый статический сайт находится в `dist/`.

## Важно

Обычный FTP-хостинг сможет показать сайт, но не сможет безопасно отправлять заявки в Telegram без отдельной серверной функции. Для полной работы используйте хостинг с функциями, например Vercel, Netlify или Cloudflare Pages.
