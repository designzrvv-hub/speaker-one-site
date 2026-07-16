# Project progress

## Stage 10B Visual Owner Editor — локальная реализация

- Presentation Tool поставлен первым инструментом Studio под названием «РЕДАКТИРОВАТЬ САЙТ»; структура документов оставлена резервным режимом.
- Preview использует настоящий React/Vite frontend, server-side draft token, HttpOnly preview-session, noindex, официальный Visual Editing overlay и Sanity Live Content API без polling.
- Сохранены `_key` массивов; добавлены точные пути для навигации, CTA, карточек, этапов, вопросов, ответов и результатов Speech Lab, изображений, placeholders, ссылок и юридических строк.
- Production-сборка больше не содержит Visual Editing chunks; preview-модуль включается только в dev или отдельной preview-сборке.
- Безопасный seed текущего `siteConfig.js` выполнен в реальном dataset `production`; созданные singleton-документы не дублируются.
- Все 14 контентных singleton-документов опубликованы и проверены строгим status-script. Медиа загружены как Draft и ждут личного подтверждения владельцем прав на публикацию.
- На реальном проекте проверены Google-вход, настоящий сайт в Presentation Tool, точный переход к полю Hero, live-обновление с возвратом исходного текста и переключение preview между шириной сайта и 375 px.

## Baseline
- Editable React/Vite project prepared.
- Existing page structure preserved.
- Media and logos included.
- Master Codex plan and workflow documentation included.

## Current stage
Stage 10B Visual Owner Editor — Presentation Tool является главным способом редактирования: настоящий сайт открывается внутри Studio, Draft меняется в live-preview, а overlays ведут к точным полям и элементам массивов. Текущий контент перенесён; 14 контентных документов опубликованы, медиа ждут подтверждения прав владельцем. Для постоянного защищённого draft-preview на хостинге ещё нужен отдельный server-only Viewer token; временная локальная проверка выполнена через авторизованную CLI-сессию без помещения токена в bundle или Git. Публичный дизайн, порядок секций, published-only production и `siteConfig.js` fallback сохранены. Автоматический deploy, блог, аналитика, CRM и AI не подключались.

Codex should update this file only when the user explicitly requests progress tracking.
