# Техническая настройка Sanity Studio

Статус: Stage 10B.5. Все утверждённые публичные разделы, legal и SEO остаются подключены через валидируемый build-time snapshot; отдельно добавлен защищённый Presentation preview с click-to-edit. `siteConfig.js` остаётся fallback для каждого поля и критичного массива.

## 1. Что реализовано

Sanity Studio находится в отдельной папке `studio/` и имеет собственные `package.json`, `package-lock.json` и `node_modules`. Публичный root runtime по-прежнему получает готовый статический snapshot. Официальные Sanity-пакеты в root используются только server-side preview-контуром и отдельным динамическим Visual Editing chunk; обычный посетитель Draft и overlays не загружает.

Публичный поток данных:

```text
Sanity Studio
→ published Content Lake
→ build-time fetch
→ schema validation
→ contentAdapter
→ CONFIG_CMS-compatible snapshot
→ Vite build
→ atomic deploy
```

Перед `vite build` build-time скрипт получает только Published-данные, а React импортирует готовый статический snapshot. SEO также формируется из этого snapshot до генерации `index.html`. В browser runtime нет Sanity fetch, токена или loading-экрана.

Поток визуального preview:

```text
Presentation Tool
→ проверка одноразовой preview-ссылки на сервере
→ подписанная HttpOnly-сессия
→ server-side Draft query со source maps
→ contentAdapter
→ React + click-to-edit overlays
```

Read token остаётся только в server environment. Подробности: [VISUAL_EDITING_ARCHITECTURE.md](VISUAL_EDITING_ARCHITECTURE.md).

## 2. Структура Studio

```text
studio/
  .env.example
  badges/
    deploymentStatusBadge.js
  environment.js
  package.json
  package-lock.json
  presentation/
    resolve.js
  sanity.cli.js
  sanity.config.js
  schemaTypes/
    editorialNotice.jsx
    index.js
    validation.js
    documents/
      siteSettings.js
      hero.js
      navigation.js
      seo.js
      legal.js
      media.js
      manifesto.js
      competencies.js
      expert.js
      transformationSteps.js
      speechLab.js
      leadFormContent.js
      footer.js
    objects/
      navigationItem.js
      socialLink.js
  scripts/
    seed-content.js
  structure/
    index.js
```

Все контентные документы, кроме `media`, работают как singleton с фиксированным ID. Глобальное создание дубликатов и опасные действия удаления для них отключены. `media` остаётся обычным списком, потому что изображений может быть несколько.

В каждом документе показано предупреждение, что Publish пока не обновляет публичный сайт. Дополнительный badge «Без автопубликации» напоминает об этом возле действий документа.

## 3. Схемы

| Schema | Название в Studio | Назначение |
| --- | --- | --- |
| `siteSettings` | Общие настройки сайта | Бренд, домен, логотипы, контакт, соцсети |
| `hero` | Первый экран | Оффер, CTA, эксперт и Hero-фотография |
| `navigation` | Навигация | Пункты меню, портфолио, CTA |
| `manifesto` | Философия | Тексты, фотография, CTA и видимость |
| `competencies` | Компетенции | Заголовок, карточки, иконки, порядок и видимость |
| `expert` | Эксперт | Данные, факты, фотографии, аудитория и опыт |
| `transformationSteps` | Этапы занятий | Этапы, номера, порядок и видимость |
| `speechLab` | Speech Lab | Вопросы, веса, результаты и CTA |
| `leadFormContent` | Форма консультации | Только публичные тексты и безопасные длины |
| `footer` | Подвал сайта | Описание, ссылки, соцсети и копирайт |
| `seo` | SEO | Title, description, OG и разрешение индексации |
| `legal` | Юридические данные | ИП, ИНН, ОГРНИП, политика |
| `media` | Медиа | Изображение, назначение, alt и права |

Все поля имеют русские подписи и объяснения. Обязательные значения и неверные URL блокируют Publish; рекомендуемая длина текста, повтор якоря и большой исходный файл показываются как warnings. Якоря навигации выбираются из существующего allow-list и не могут переименовать секции.

Alt-текст обязателен в каждом документе «Медиа». Ссылки на логотипы, Hero-фотографию и OG-изображение дополнительно проверяют alt выбранного media-документа. Для исходного изображения больше 8 МБ Studio делает асинхронную проверку asset metadata и показывает warning; сетевая ошибка этой дополнительной проверки не создаёт ложного сообщения о размере.

## 4. Переменные окружения Studio

Создайте `studio/.env.local` на основе `studio/.env.example`:

```dotenv
SANITY_STUDIO_PROJECT_ID=project_id_владельца
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_API_VERSION=2026-07-15
SANITY_STUDIO_USE_CDN=false
SANITY_STUDIO_PREVIEW_URL=http://localhost:5173
SANITY_STUDIO_PRODUCTION_URL=
```

Sanity подставляет все переменные `SANITY_STUDIO_*` в browser bundle Studio. Поэтому они подходят только для публичных идентификаторов и настроек — не для секретов.

`environment.js` проверяет:

- наличие Project ID;
- допустимые символы Project ID и dataset;
- точное имя dataset `production` для текущего этапа;
- формат API version `YYYY-MM-DD`.

## 5. Переменные публичного сайта

В root `.env.example` добавлены:

```dotenv
VITE_SANITY_PROJECT_ID=
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2026-07-15
VITE_SANITY_USE_CDN=true
```

Они используются только build-time скриптом `scripts/fetch-sanity-content.mjs`. Любая переменная `VITE_*` потенциально публична, поэтому `VITE_SANITY_TOKEN` создавать запрещено. `studio/.env.local` не копируется в корень автоматически: root env владелец заполняет отдельно.

Для защищённого preview в root `.env.local` дополнительно нужны server-only значения:

```dotenv
SANITY_API_READ_TOKEN=
SANITY_STUDIO_URL=http://localhost:3333
SANITY_PREVIEW_PORT=5173
SANITY_PREVIEW_SESSION_SECRET=
```

Read/session secrets не должны иметь префикс `VITE_`. Локально session secret можно оставить пустым; для размещённого preview он обязателен.

## 6. Команды

Из папки `studio/`:

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run build
npm.cmd run deploy
```

- local Studio по умолчанию: `http://localhost:3333/`;
- `npm.cmd run build` проверяет production-сборку Studio;
- `npm.cmd run deploy` размещает Studio на выбранном `*.sanity.studio` адресе.

Root-команды сайта дополнены build-time загрузкой и тестами:

```powershell
npm.cmd run content:fetch
npm.cmd run test:content
npm.cmd run dev
npm.cmd run dev:visual
npm.cmd run build
npm.cmd run preview:visual
```

`predev` и `prebuild` автоматически запускают `content:fetch`. При отсутствии env или сети скрипт не перезаписывает последний snapshot и завершает работу в режиме fallback.

`dev:visual` запускает Vite как middleware внутри защищённого preview-server на 5173. Обычный `dev` остаётся Published-only. `preview:visual` обслуживает готовый `dist` и требует production session secret; он не выполняет deploy.

### Seed текущих значений

Безопасный seed из папки `studio/` по умолчанию только показывает план:

```powershell
Set-Location -LiteralPath studio
npm.cmd run seed:dry
```

Он подготавливает Draft-документы всех подключённых singleton-разделов и план загрузки текущих локальных изображений, но ничего не публикует. Для записи войдите в Sanity CLI тем же аккаунтом владельца:

```powershell
npx sanity login
npm.cmd run seed:write
```

Скрипт сначала проверяет существующие Draft/Published ID и не перезаписывает их. `npm.cmd run seed:overwrite` разрешён только после резервной копии и осознанной проверки. Token не добавляется в `.env.example`, frontend, Studio fields или Git. После seed владелец подтверждает права на изображения, исправляет validation errors и только затем нажимает Publish.

## 7. Read-only клиенты

`src/services/sanityClient.js`:

- читает только `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`, `VITE_SANITY_API_VERSION`, `VITE_SANITY_USE_CDN`;
- формирует запрос с `perspective=published`;
- не поддерживает write token;
- проверяет environment и HTTP response;
- использует AbortController и timeout 12 секунд;
- возвращает нормализованную ошибку вместо исключения в UI;
- не импортируется browser bundle: его вызывает Node build-time script.

Если будет выбран private dataset, production-fetch должен выполняться только build/server процессом с read token из CI secret storage. Добавлять такой токен в этот browser-oriented модуль нельзя.

`scripts/visual-preview-server.mjs` использует отдельный server-side Sanity client: token без префикса `VITE_`, `perspective=drafts`, `useCdn=false`, stega только в preview и timeout 12 секунд. Доступ к JSON требует подписанной HttpOnly-сессии, которая создаётся только после `validatePreviewUrl()`.

## 8. Подготовленный адаптер

`src/services/contentAdapter.js` содержит:

- по-полевую валидацию всех простых текстовых и ссылочных полей;
- полную проверку массивов Navigation, Competencies, Transformation Steps и Speech Lab;
- безопасные пределы формы и проверку legal/SEO;
- оптимизацию всех CMS-изображений через Sanity image pipeline;
- allow-list внутренних якорей и разрешённых URL-протоколов;
- сортировку и видимость; дубликаты навигации приводят к полному fallback списка;
- безопасное преобразование известных полей в текущую структуру;
- полную копию `CONFIG_CMS` как fallback для каждого отсутствующего/невалидного поля;
- оптимизированные Sanity image URLs с `auto=format`, размерами, crop и hotspot.

Результат адаптера имеет вид:

```js
{
  config,
  source: 'fallback' | 'sanity-with-fallback',
  errors
}
```

`src/services/contentLoader.js` читает `src/generated/sanityContent.js`, вызывает адаптер и возвращает статус `ready` или `fallback`. Состояние `loading` зарезервировано для возможного runtime-подхода, но при утверждённой статической архитектуре первый render сразу получает готовый config без layout shift.

`src/hooks/useSiteContent.js` передаёт один CMS-neutral config во все публичные секции. Компоненты не импортируют Sanity schema и не выполняют сетевые запросы.

## 9. Безопасность

- `.env`, `.env.local` и `studio/.env*`, кроме примера, игнорируются Git;
- Project ID, dataset и API version не являются секретами;
- write/read tokens, пароли, webhook secrets, bot tokens и CRM keys не хранятся в Studio env;
- Studio — client-side приложение, поэтому любой встроенный в него secret фактически раскрыт;
- production write доступ к dataset запрещён для anonymous users;
- текущий владелец работает как Administrator; общий аккаунт не используется;
- lead endpoint остаётся в текущем root environment и не перенесён в Sanity.

Подробные правила: [SANITY_SECURITY.md](SANITY_SECURITY.md), [SANITY_ROLES.md](SANITY_ROLES.md), [SANITY_EDITOR_WORKFLOW.md](SANITY_EDITOR_WORKFLOW.md).

## 10. CORS origins

Откройте [Sanity Manage](https://www.sanity.io/manage) → нужный проект → **Settings** → **API settings** → **CORS Origins** → **Add CORS origin**. Origin указывается в формате `protocol://hostname[:port]`, без пути.

Добавляйте только необходимые точные origins:

| Origin | Когда нужен | Allow credentials |
| --- | --- | --- |
| `http://localhost:3333` | локальная Sanity Studio | Да |
| `https://<studio-host>.sanity.studio` | развёрнутая Studio | Да |
| `http://localhost:5173` | локальный preview frontend | Не требуется текущему server-side fetch; добавлять только при прямом browser-to-Sanity сценарии |
| `https://<preview-домен>` | будущий размещённый preview | По архитектуре хостинга; не добавлять wildcard |

Текущий build-time и Draft fetch выполняются из Node, поэтому public/preview origin не обращается напрямую к Content Lake. `http://localhost:3333` и точный deployed Studio origin нужны Studio с **Allow credentials = Yes**. Отдельно `presentationTool.allowOrigins` содержит `http://localhost:5173` и точный будущий preview origin для защищённого iframe-соединения. Wildcard `*` и широкие шаблоны нельзя использовать с credentials. После смены адреса Studio или preview удалите старый origin.

## 11. Что ещё не подключено

- нет webhook и автоматического deploy;
- Visual Preview реализован локально и production-capable, но его размещение зависит от выбранного хостинга и server environment;
- нет блога, аналитики, CRM и AI-функций;
- lead endpoint и остальные секретные серверные параметры намеренно остаются только в environment хостинга;
- нет browser runtime fetch;
- private-dataset read token не настроен;
- текущие локальные медиа входят в seed и загружаются только при авторизованном ручном запуске;
- `siteConfig.js` остаётся обязательным безопасным fallback.

## 12. Текущий gate

Stage 10B.5 завершает только Visual Editing. Webhook, automatic deploy и следующие продуктовые этапы не запускаются без отдельного подтверждения владельца.

Официальные справочные материалы:

- [структура Studio](https://www.sanity.io/docs/studio/project-structure)
- [переменные окружения](https://www.sanity.io/docs/studio/environment-variables)
- [конфигурация Studio](https://www.sanity.io/docs/studio/configuration)
- [развёртывание Studio](https://www.sanity.io/docs/studio/deployment)
- [CORS](https://www.sanity.io/docs/content-lake/cors)
- [Drafts](https://www.sanity.io/docs/content-lake/drafts)
- [валидация](https://www.sanity.io/docs/studio/validation)
