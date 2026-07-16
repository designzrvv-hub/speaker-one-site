# Архитектура Sanity Visual Editing

Статус: Stage 10B.5. Presentation Tool и безопасный Vite preview-контур подключены; webhook, автоматический deploy и блог не входят в этот этап.

## 1. Потоки данных

Production остаётся статическим:

```text
Sanity Published
→ build-time fetch
→ validation/contentAdapter
→ generated snapshot
→ Vite build
→ static deploy
```

Visual preview работает отдельно:

```text
Sanity Presentation Tool
→ одноразовая подписанная preview-ссылка
→ server-side validation
→ HttpOnly preview-session
→ server-side drafts query + Content Source Maps
→ contentAdapter + React
→ Visual Editing overlays
```

`siteConfig.js` остаётся fallback в обоих потоках.

## 2. Presentation Tool

`studio/sanity.config.js` подключает официальный `presentationTool` под русским названием **«Редактор сайта»**. Настройка использует:

- `SANITY_STUDIO_PREVIEW_URL` для локального preview;
- `SANITY_STUDIO_PRODUCTION_URL` для будущего размещённого preview;
- `/api/draft-mode/enable` и `/api/draft-mode/disable`;
- точный `allowOrigins` без wildcard;
- locations для singleton-документов и существующих якорей.

Основной route — `/`; секционные locations используют `#about`, `#features`, `#expert`, `#speech-lab` и `#protocol`. Порядок и id публичных секций не меняются.

## 3. Защита Draft

Vite SPA не хранит read token. `scripts/visual-preview-server.mjs` выполняет server-side шаги:

1. Presentation Tool создаёт временный preview secret.
2. `/api/draft-mode/enable` проверяет его через `validatePreviewUrl()`.
3. Сервер создаёт официальный perspective-cookie и дополнительную HMAC-подписанную HttpOnly session-cookie.
4. `/api/preview/content` принимает запрос только с действующей подписанной сессией.
5. Read token используется только Node-процессом.
6. HTML preview получает `noindex,nofollow,noarchive` и `X-Robots-Tag`.

Cookie использует `HttpOnly`, `Secure`, `SameSite=None`, ограниченный срок один час и очищается disable endpoint. Поддельного значения perspective-cookie недостаточно для чтения Draft.

Для локального режима session secret может создаваться при запуске и пропадает после остановки процесса. Для размещённого preview `SANITY_PREVIEW_SESSION_SECRET` обязателен и должен храниться в secret storage хостинга.

## 4. Environment variables

Публичные, допустимые в Vite/build:

```dotenv
VITE_SANITY_PROJECT_ID=
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2026-07-15
VITE_SANITY_USE_CDN=true
```

Только server environment:

```dotenv
SANITY_API_READ_TOKEN=
SANITY_STUDIO_URL=http://localhost:3333
SANITY_PREVIEW_PORT=5173
SANITY_PREVIEW_SESSION_SECRET=
```

Studio browser environment:

```dotenv
SANITY_STUDIO_PROJECT_ID=
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_API_VERSION=2026-07-15
SANITY_STUDIO_PREVIEW_URL=http://localhost:5173
SANITY_STUDIO_PRODUCTION_URL=
```

Ни один token не должен иметь префикс `VITE_` или `SANITY_STUDIO_`.

## 5. Content Source Maps и stega

Draft client на сервере использует:

- `perspective: drafts` или perspective, переданный Presentation Tool;
- `useCdn: false`;
- `stega.enabled: true`;
- официальный `studioUrl`;
- Content Source Maps, которые Sanity client запрашивает автоматически.

Published/build-time запрос остаётся без stega. Технические поля `internalKey`, `network`, ИНН/ОГРНИП и значения действий исключены из кодирования, потому что участвуют в сравнении или валидации.

`contentAdapter` валидирует видимый текст отдельно и сохраняет невидимую разметку без повреждения. Это важно для `trim()`, неразрывных пробелов и типографики с отрицательным letter-spacing. Fallback-строки не получают metadata.

## 6. Overlays

`src/preview/enableVisualEditing.js` загружается динамически только после server-side активации preview. Официальный `enableVisualEditing()`:

- сканирует stega-текст;
- рисует click-to-edit overlays;
- передаёт document ID и field path в Studio;
- синхронизирует навигацию и hash-якоря.

Строки и массивы получают точные source paths из Content Source Maps. Стабильные `_key`/`internalKey` обеспечивают адресацию карточек, этапов, вопросов, ответов и результатов после сортировки.

Для изображений используется официальный `createDataAttribute()`/`data-sanity`, потому что URL изображения не должен содержать невидимые символы. Атрибут добавляется только если адаптер действительно применил CMS-изображение; локальный fallback не становится ложной целью редактирования.

## 7. Live updates

Preview-server подписывается на официальный Sanity Live Content API через `client.live.events({includeDrafts: true})`. Подписка и read token остаются в Node-процессе. Браузер получает через защищённый `/api/preview/events` только обезличенный сигнал о том, что контент изменился. При изменении Draft:

1. preview вызывает тот же защищённый `/api/preview/content`;
2. React получает новый адаптированный config;
3. DOM обновляется без полной перезагрузки и polling;
4. текущая позиция страницы сохраняется;
5. overlays повторно сканируют изменённые узлы.

События объединяются короткой задержкой 120 мс, а запросы сериализуются: если изменение приходит во время загрузки, выполняется ещё одно итоговое обновление. Постоянного polling нет. EventSource доступен только с действующей HttpOnly preview-сессией; при закрытии preview server-side подписка и keepalive очищаются. Смена perspective перезагружает preview только когда значение действительно изменилось.

## 8. Production isolation и bundle

- Production HTML не получает `__SANITY_PREVIEW__`.
- Обычный browser runtime не выполняет draft/API запросы.
- Preview UI подключён через условный dynamic import только в dev или специальной preview-сборке.
- Main bundle не импортирует `@sanity/visual-editing` синхронно.
- Server-side `@sanity/client` и `@sanity/preview-url-secret` не попадают в browser main chunk.
- Preview listeners, EventSource и overlays создаются только после server-side активации preview. Обычная production-сборка не содержит Visual Editing chunk.

Проверка `npm audit --omit=dev` на момент Stage 10B.5 сообщает о четырёх moderate-предупреждениях в транзитивной цепочке официального `@sanity/preview-url-secret` (`@sanity/uuid` → `uuid@8.3.2`). Предложенный npm автоматический fix требует `--force` и несовместимого изменения версии Visual Editing, поэтому он намеренно не применён. Перед следующим обновлением зависимостей нужно проверить исправление в актуальных пакетах Sanity и повторить audit без принудительного downgrade.

## 9. CORS и origins

В `presentationTool.allowOrigins` должны быть только:

- `http://localhost:5173` для локального preview;
- точный будущий preview/production origin из `SANITY_STUDIO_PRODUCTION_URL`.

В Sanity Manage → Project → Settings → API → CORS Origins:

- `http://localhost:3333` — локальная Studio, credentials разрешены;
- точный `https://<studio-host>.sanity.studio` — deployed Studio, credentials разрешены;
- preview origin добавляется только если выбранный deployment выполняет browser-to-Sanity запросы; текущий server-side preview их не выполняет.

Wildcard `*` с credentials запрещён. Старые origins нужно удалять после смены адреса.

## 10. Команды

Локальная работа:

```powershell
# терминал 1, корень
npm.cmd run dev:visual

# терминал 2
Set-Location -LiteralPath studio
npm.cmd run dev
```

Проверка production-like preview после сборки:

```powershell
npm.cmd run build
npm.cmd run preview:visual
```

`preview:visual` требует `SANITY_PREVIEW_SESSION_SECRET` длиной не меньше 32 символов и остальные server secrets. Он не является automatic deploy.

## 11. Требования к размещению

Для deployed visual preview нужен Node/serverless-контур, который сохраняет поведение четырёх endpoints и server-side secrets. Хостинг должен:

- поддерживать HTTPS;
- разрешать embedding только доверенной Studio через CSP `frame-ancestors`;
- хранить read/session secrets вне Git;
- передавать `Set-Cookie` без изменения;
- не кэшировать preview HTML и JSON;
- не размещать preview за публичным индексируемым URL без `noindex`;
- использовать одинаковый HMAC-секрет во всех инстансах.

## 12. Fallback и ошибки

- Production при недоступной CMS использует последний snapshot и `siteConfig.js`.
- Preview при сетевой ошибке сохраняет последний рабочий config и показывает редактору спокойное сообщение.
- Невалидное простое поле заменяется fallback-полем.
- Navigation, Competencies, Transformation Steps и Speech Lab переключаются только целым валидным массивом.
- Посетитель не видит preview-сообщения.

## 13. Диагностика

- Нет overlays: проверить draft mode, stega, `allowOrigins` и запуск `dev:visual`.
- Клик не открывает поле: проверить source map, сохранение невидимой разметки и стабильный key.
- Фото не подсвечивается: убедиться, что CMS-изображение прошло alt/URL validation и реально применено адаптером.
- Нет live update: проверить соединение Presentation Tool, `/api/preview/events` и ответ `/api/preview/content`.
- Preview показывает 401: открыть его заново из Studio; не создавать cookie вручную.
- Preview показывает 503: заполнить root server environment.
- Preview работает локально, но не на домене: развернуть server endpoints, указать production URL, HTTPS, CSP и exact origins.

Официальные материалы Sanity:

- [Visual editing architecture](https://www.sanity.io/docs/visual-editing/visual-editing-architecture)
- [Complete framework-agnostic Vite example](https://www.sanity.io/docs/visual-editing/build-a-visual-editing-integration)
- [Presentation Tool configuration](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool)
- [Draft mode](https://www.sanity.io/docs/visual-editing/implementing-draft-mode)
- [Overlays](https://www.sanity.io/docs/visual-editing/visual-editing-overlays)
- [Live preview updates](https://www.sanity.io/docs/visual-editing/live-preview-content-updates)
