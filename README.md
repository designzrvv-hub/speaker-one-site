# Speaker One

Editable premium website for the Speaker One public-speaking academy.

## Quick start

```bash
npm install
npm run dev
```

Windows users can run `start-site.bat`.

## Sanity content

Stage 10B.5 сохраняет опубликованный контент всех существующих разделов, legal и SEO в статическом build-time snapshot и добавляет отдельный защищённый Sanity Presentation preview. При отсутствии Sanity env, сети или валидного поля сайт использует последний snapshot и `src/config/siteConfig.js`. Критичные массивы переключаются только целиком.

Публичные переменные задаются в root `.env.local` по `.env.example`. Токены во frontend env запрещены.

```bash
npm run content:fetch
npm run build
```

`npm run build` автоматически выполняет `content:fetch`. Webhook пока не настроен: после Publish в Sanity новую сборку и размещение нужно запускать отдельно. Инструкция владельцу: [docs/SANITY_EDITING_GUIDE.md](docs/SANITY_EDITING_GUIDE.md).

Безопасный seed всех singleton-документов и используемых локальных изображений по умолчанию работает только как dry-run:

```bash
cd studio
npm run seed:dry
```

Для записи сначала выполните `npx sanity login`, затем `npm run seed:write`. Скрипт создаёт только отсутствующие Draft-документы, загружает текущие изображения один раз по стабильным ID, не публикует данные и не перезаписывает работу владельца. Команда `seed:overwrite` предназначена только для осознанного восстановления после резервной копии. Токены нельзя сохранять в Git.

## Visual Editing

Для визуального редактора запустите защищённый preview-server из корня:

```powershell
npm.cmd run dev:visual
```

Затем запустите Studio из `studio/` и откройте **«Редактор сайта»**. Read token хранится только в root/server environment без префикса `VITE_`; обычный `npm.cmd run dev` и production build остаются Published-only.

Инструкции: [для владельца](docs/VISUAL_EDITING_GUIDE.md) и [для разработчика](docs/VISUAL_EDITING_ARCHITECTURE.md).

## Lead endpoint

The consultation form sends data only through a protected server endpoint configured with `VITE_LEAD_ENDPOINT`. Do not put Telegram bot tokens, CRM keys, chat ids, or other secrets in frontend environment variables.

В `server/leadEndpoint.mjs` подготовлен универсальный обработчик, а в `server/adapters/` — тонкие адаптеры для Vercel, Netlify и Cloudflare Pages Functions. Реальная отправка появится только после размещения функции и добавления `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` и точного CORS-origin в защищённые переменные хостинга.

See [docs/LEAD_ENDPOINT.md](docs/LEAD_ENDPOINT.md) for the request contract, timeout behavior, security requirements, and deployment setup.

## Codex

1. Open this exact folder in Codex.
2. Confirm that `package.json`, `src`, `public`, and `AGENTS.md` are visible.
3. Send the contents of `FIRST_PROMPT.md`.
4. Work one stage at a time.

Read `START_HERE.md` and `SPEAKER_ONE_CODEX_MASTER_PLAN.md` for full instructions.
