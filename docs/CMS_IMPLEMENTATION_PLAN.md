# План реализации Stage 10B

Статус: только план. Stage 10B нельзя начинать, пока владелец прямо не утвердит CMS и не ответит на вопросы из `CMS_ARCHITECTURE.md`.

## 1. Целевая архитектура

План рассчитан на основной вариант:

- Sanity Studio — защищённая админ-панель;
- Sanity Content Lake и Asset CDN — контент и изображения;
- published-контент получается во время build;
- CMS-neutral адаптер сохраняет текущий контракт `CONFIG_CMS`;
- подписанный publish webhook запускает проверку и atomic Vite deploy;
- черновики доступны только в protected preview;
- `siteConfig.js` и last-known-good snapshot остаются fallback на период миграции.

Если владелец выберет Decap CMS, контентный контракт сохранится, но auth, media, preview и publication workflow нужно перепланировать до изменения кода.

## 2. Решения владельца до 10B.1

- основная CMS и запасной вариант;
- frontend-хостинг, preview hosting и финальный домен;
- владелец Sanity project и MFA;
- Free/Growth, число Admin/Editor/Viewer и право Editor публиковать;
- допустимый бюджет и правила использования стороннего cloud;
- требуемая глубина русификации панели;
- draft/review/publish workflow;
- backup frequency, retention и ответственный;
- судьба трёх неподтверждённых фактов эксперта;
- реальные social links, политика и approved lead endpoint host;
- нужно ли учитывать будущий блог/видео уже в первой schema.

## 3. Правила реализации

1. Каждый подэтап имеет отдельный review gate.
2. Production никогда не читает drafts.
3. Write token/secret не попадает в `VITE_*`, Git и browser bundle.
4. На каждом этапе проверяются section IDs, порядок, props, user flow и визуал.
5. Невалидный CMS-контент блокирует deploy.
6. Использование fallback обязательно отражается в CI-report.
7. Новые зависимости утверждаются в 10B.1; публичный проект не получает CMS-пакеты без необходимости.
8. `siteConfig.js` не удаляется до отдельного согласованного gate.

## 4. Предлагаемая структура файлов

Это планируемые, а не созданные в Stage 10A файлы:

```text
speaker-one-refactored/
  studio/
    sanity.config.ts
    sanity.cli.ts
    schemaTypes/
      index.ts
      documents/
      objects/
    structure/
    validation/
  scripts/
    fetch-cms-content.mjs
    validate-cms-content.mjs
    export-cms-snapshot.mjs
    import-site-config.mjs
  src/
    content/
      contentAdapter.js
      contentContract.js
      contentSource.js
      fallbackContent.js
      generated/
        cms-content.json
  docs/
    CMS_OWNER_GUIDE.md
    CMS_RECOVERY_RUNBOOK.md
```

Studio остаётся отдельной от public runtime. Точное размещение может зависеть от хостинга.

## 5. Подэтапы Stage 10B

### 10B.1 — Схема и окружение

**Цель:** создать CMS project, основу типизированных схем, environments и публичный data contract без переключения сайта на CMS.

**Файлы:**

- `studio/sanity.config.ts`, `studio/sanity.cli.ts`;
- `studio/schemaTypes/index.ts` и shared objects;
- `src/content/contentContract.js` с JSDoc/JSON-compatible contract;
- `src/content/contentSource.js`;
- документированные additions в `.env.example`;
- при необходимости `docs/CMS_ENVIRONMENT.md`.

**Зависимости:** утверждённые project/dataset names, Free/Growth, hosting, preview environment, согласие использовать TypeScript внутри Studio при сохранении JavaScript public app.

**Риски:** смешение preview/production datasets; secret в `VITE_*`; schema копирует случайные JSX-детали; CMS dependencies попадают в public runtime.

**Готово, когда:**

- environments описаны;
- Studio собирается и открывается только после login;
- public components и `siteConfig.js` не изменились;
- secrets находятся только в secret stores;
- sample content проходит CMS-neutral validation;
- `npm.cmd run build` публичного сайта проходит.

Оценка: 1–2 рабочих дня.

### 10B.2 — Авторизация, роли и security baseline

**Цель:** настроить защищённый вход и выбранную модель Admin/Editor/Viewer без подмены безопасности скрытием UI.

**Файлы/настройки:** project membership, roles, permission-aware Studio structure, preview/deploy environment protection, раздел security в owner guide.

**Зависимости:** выбранный режим:

- sole owner: Admin + Viewer;
- Growth: business Editor = Contributor, Admin публикует, settings boundary отделён;
- Enterprise: granular custom roles.

Также нужны named accounts, MFA/recovery owner и approved CORS origins.

**Риски:** built-in Growth Editor получает write/publish всех документов; Contributor видит общие datasets; старые аккаунты сохраняют доступ; drafts становятся публичными; секреты передаются в сообщениях.

**Готово, когда:**

- выбранный режим ролей письменно зафиксирован;
- anonymous write и draft read запрещены;
- business Editor не может довести изменение endpoint/domain/legal/scoring до production без Admin;
- Viewer не изменяет и не публикует;
- MFA, recovery и offboarding задокументированы;
- webhook/preview secrets после настройки один раз ротированы.

Оценка: 1 день плюс настройка аккаунтов владельцем.

### 10B.3 — Site Settings, Navigation и Hero

**Цель:** реализовать первый end-to-end slice: русские поля, validation и adapter mapping при сохранении production fallback.

**Файлы:**

- `siteSettings.ts`, `navigation.ts`, `hero.ts`;
- shared `link`, `cta`, `legalDetails`, image objects;
- начальный `contentAdapter.js`;
- `fetch-cms-content.mjs`;
- tests/fixtures для Hero, anchors и endpoint allow-list.

**Зависимости:** domain или staging placeholder, утверждённые anchors/CTA, текущий Hero copy/photo, endpoint host decision.

**Риски:** меняются переносы Hero/crop; anchor становится произвольным; endpoint доступен Editor; shared expert/site data дублируются.

**Готово, когда:**

- поля имеют русские labels, descriptions и counters;
- текущие значения проходят round-trip CMS → adapter без видимого изменения;
- anchors и CTA action ограничены;
- endpoint Admin-only и host-validated;
- Hero совпадает на 320, 375, 1024, 1440, 1920 px;
- production продолжает использовать fallback flag.

Оценка: 1–2 дня.

### 10B.4 — Остальные секции

**Цель:** добавить Manifesto, Competencies, Expert, experience cards, Steps и Footer без изменения section structure/props.

**Файлы:** schemas соответствующих documents/objects, adapter mappings в текущие `manifesto`, `results`, `expert`, `steps`, `footer`, cross-validation fixed counts и shared legal/social.

**Зависимости:** решение по неподтверждённым фактам; реальные social/portfolio links; policy/legal owner; изображения и права.

**Риски:** массив меняет grid cardinality; optional field создаёт новый UI; legal/social дублируются; факты усиливаются; перестановка нарушает смысл.

**Готово, когда:**

- текущий контент импортирован без редакторских изменений;
- активны 3 competency, 3 experience cards и 6 steps;
- порядок/IDs/JSX structure не изменились;
- credentials имеют private verification status/evidence;
- legal/social имеют один источник;
- responsive visual и link checks проходят.

Оценка: 1,5–2,5 дня.

### 10B.5 — Speech Lab

**Цель:** редактировать контент диагностики без изменения четырёх вопросов, scoring mechanics и privacy.

**Файлы:** `speechLab.ts`, question/option/result objects, `validation/speechLab.ts`, adapter fixtures для всех комбинаций, focused UX/a11y tests.

**Зависимости:** утверждённые текущие вопросы/results; веса и thresholds доступны только Admin; зафиксирован non-scientific editorial rule.

**Риски:** score не покрыт результатом; результат недостижим; ответы становятся очевидно «правильными»; count ломает progress/focus; результат сохраняется или отправляется.

**Готово, когда:**

- enforced 4 active questions × 3 options;
- каждый возможный total выбирает один result;
- Editor не редактирует weights/ranges;
- ответы не сохраняются, не анализируются и не отправляются;
- keyboard, aria-live, focus, back/reset и `scrollToForm` не изменились;
- mobile/reduced-motion checks проходят.

Оценка: 1–1,5 дня.

### 10B.6 — Медиа

**Цель:** безопасная загрузка, alt, crop preview, responsive delivery и защита удаления.

**Файлы/настройки:** reusable image schema, media views по usage, image URL builder, reference-report перед удалением, visual fixtures, owner guide.

**Зависимости:** originals и права; max upload/delivery widths; backup assets; Hero/portrait/OG crop rules.

**Риски:** лицо обрезается; новый aspect ratio ломает layout; originals удалены до cutover; старые версии ссылаются на удалённый asset.

**Готово, когда:**

- JPG/PNG/WebP/AVIF протестированы;
- у каждой content image уникальный alt;
- Hero и карточки проверены 320–1920 px;
- frontend получает responsive images;
- Editor не удаляет referenced asset;
- текущие `public/` images сохранены для rollback.

Оценка: 1–1,5 дня.

### 10B.7 — SEO и публикационные файлы

**Цель:** связать CMS SEO с существующими build generators и сохранить единый domain source.

**Файлы:** `seo.ts`, title/description/domain/OG validation, adapter bridge к `seoConfig.js` или CMS-neutral successor, tests robots/sitemap/manifest/JSON-LD, production guard от placeholders.

**Зависимости:** production domain, OG image, verified socials, подтверждённые Organization/Person/Service facts, working policy URL.

**Риски:** domain дублируется; preview индексируется; raw JSON-LD создаёт ложные ratings; sitemap остаётся на placeholder; meta меняется без rebuild.

**Готово, когда:**

- canonical/OG/sitemap/robots используют один domain;
- staging/preview всегда `noindex`;
- JSON-LD содержит только проверенные Organization/Person/Service;
- build падает при placeholders/invalid metadata;
- one-H1 и heading checks сохранены.

Оценка: 0,5–1 день.

### 10B.8 — Preview, webhook и publication pipeline

**Цель:** дать защищённый draft preview и надёжный publish → validate → build → atomic deploy.

**Файлы/настройки:** Presentation/preview config, preview activation endpoint/build, webhook verification handler при необходимости, CI workflow, event filter/debounce, publication runbook.

**Зависимости:** hosting API/preview capability, domains, secret store, approval workflow.

**Риски:** draft token попадает в bundle/logs; unsigned webhook запускает builds; autosave вызывает deploy; preview индексируется; CMS publish прошёл, а hosting build — нет.

**Готово, когда:**

- Preview открывает authenticated desktop/mobile draft;
- preview имеет `noindex` и короткую session;
- production читает только published;
- только explicit publish вызывает signed, filtered, debounced build;
- failed build оставляет previous deployment live и показывает понятную ошибку;
- rollback static deploy выполняется до 30 минут.

Оценка: 1,5–2,5 дня; главный фактор — выбранный хостинг.

### 10B.9 — Миграция и контролируемый cutover

**Цель:** импортировать текущий config/media, доказать parity и включить CMS source через обратимый flag.

**Файлы:** `import-site-config.mjs`, `export-cms-snapshot.mjs`, `fallbackContent.js`, generated snapshot/build artifact, migration manifest, parity reports.

**Зависимости:** готовые schemas/validation; owner-reviewed preview; media uploaded; backup/restore проверены; placeholders решены или явно отмечены blockers.

**Риски:** меняются пробелы/пунктуация; повторный import создаёт duplicates; fallback скрывает неполную миграцию; CMS IDs проникают в components; cutover выполняется до form/Speech Lab/SEO parity.

**Готово, когда:**

- import idempotent и создаёт field-by-field report;
- все тексты, links, alt, media, legal и SEO совпадают с утверждённой версией;
- компоненты получают те же effective props;
- visual regression проходит 320, 375, 768, 1024, 1440, 1920 px;
- форма и все Speech Lab paths проходят;
- fresh fetch, last snapshot и `siteConfig.js` fallback проверены;
- CMS flag включается только после owner sign-off, rollback описан.

Оценка: 1–2 дня.

### 10B.10 — Приёмка, recovery rehearsal и обучение

**Цель:** доказать, что владелец сам редактирует, проверяет, публикует и восстанавливает контент.

**Файлы/артефакты:** `CMS_OWNER_GUIDE.md`, `CMS_RECOVERY_RUNBOOK.md`, permission test report, backup restore record, final QA report.

**Зависимости:** время владельца; recovery account и backup storage; production domain/SSL/endpoint; решения по фактам и ссылкам.

**Риски:** панель технически работает, но непонятна; recovery зависит от одного разработчика; backup не проверен; длинный текст проходит schema, но ломает layout.

**Готово, когда:**

- владелец без разработчика меняет Hero draft, заменяет test image, проверяет mobile/desktop, публикует и находит результат;
- Editor/Viewer выполняют разрешённые сценарии и не превышают права;
- восстановлены previous content version и static deploy;
- backup читается, шифруется и хранится отдельно;
- Lighthouse/a11y/responsive/keyboard/reduced-motion/form/Speech Lab/SEO проходят;
- утверждены owner guide, support route и ответственный за обслуживание.

Оценка: 1–1,5 дня плюс сессия владельца.

## 6. Матрица тестов

| Область | Обязательные сценарии |
| --- | --- |
| Тексты | Required empty, max length, длинное слово, typography normalization, `ё`, visible escape/entity rejection |
| Навигация | Все hashes, hidden item, portfolio, длинный CTA, keyboard focus |
| Hero | 320/375/768/1024/1440/1920, face crop, logo, CTA |
| Массивы | Reorder, duplicate order/slug, запрещённое изменение count |
| Speech Lab | Все totals, back, reset, focus/aria-live, CTA, отсутствие persistence |
| Форма | Нет endpoint, 200 `{ok:true}`, 200 без подтверждения, 400, 500, timeout, offline, duplicate, validation, consent |
| Медиа | Все форматы, oversize, missing alt, replacement, referenced delete, old version |
| SEO | Real/placeholder domain, canonical, absolute OG, JSON-LD, robots/sitemap, preview noindex |
| Роли | Admin/Contributor/Viewer/anonymous matrix |
| Публикация | Draft, preview, publish, bad signature, build fail/success, atomic deploy, rollback |
| Сбой | CMS unavailable, snapshot есть/нет, live site во время сбоя |
| Производительность | Нет runtime CMS request, images, unchanged animations, Lighthouse/WebPageTest baseline |

## 7. Gates

### Gate A — Утверждение архитектуры

Выбраны CMS, бюджет, cloud policy, роли и hosting. Это единственный gate, достижимый в Stage 10A.

### Gate B — Foundation

После 10B.1–10B.2 проверяются schemas/security до импорта реального контента.

### Gate C — Content preview

После 10B.3–10B.7 контент виден в protected preview, production всё ещё использует fallback.

### Gate D — Publication pipeline

После 10B.8 показаны webhook security, failed-build behavior, preview privacy и rollback.

### Gate E — Cutover

После 10B.9 владелец утверждает parity и включает CMS source flag.

### Gate F — Handover

После 10B.10 завершены обучение, recovery rehearsal и документация. Удаление legacy fallback — отдельное решение.

## 8. Оценка и регулярное обслуживание

Общая оценка: **10–16 рабочих дней разработчика** при сохранении одного лендинга, без блога, video pipeline, CRM и при наличии preview/webhook у хостинга.

После запуска:

- ежемесячно проверять аккаунты и failed builds;
- делать monthly export, weekly при активных правках;
- ежеквартально тестировать restore и роли;
- обновлять Studio/build dependencies только через preview;
- ежегодно проверять domain, policy, legal, social links и факты эксперта;
- заранее отслеживать quota/plan/billing.

## 9. Явно отложено

- блог и article templates;
- page builder и перестановка секций;
- CRM, analytics dashboards и lead storage в CMS;
- AI copy/scoring;
- аккаунты посетителей;
- video hosting/streaming;
- редактирование CSS, design tokens и background JavaScript;
- мультиязычный public site;
- удаление `siteConfig.js` fallback;
- любые задачи Stage 11.

