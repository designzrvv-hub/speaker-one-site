import React, {useEffect, useMemo, useState} from 'react'
import {IntentButton, useClient} from 'sanity'
import {studioEnvironment} from '../environment.js'

const singletonDocuments = [
  ['siteSettings', 'Настройки сайта'],
  ['linksSettings', 'Социальные сети и Telegram'],
  ['hero', 'Первый экран'],
  ['navigation', 'Навигация'],
  ['manifesto', 'Философия'],
  ['competencies', 'Компетенции'],
  ['expert', 'Обо мне'],
  ['experience', 'Опыт и факты'],
  ['transformationSteps', 'Этапы занятий'],
  ['speechLab', 'Speech Lab'],
  ['leadFormContent', 'Форма консультации'],
  ['footer', 'Подвал сайта'],
  ['seo', 'SEO'],
  ['legal', 'Юридическая информация'],
]

const documentIds = singletonDocuments.map(([id]) => id)
const draftIds = documentIds.map((id) => `drafts.${id}`)
const PLACEHOLDER_PATTERN = /your_|speaker-one\.example|example\.(?:com|org|net)/i

const query = `{
  "draftCount": count(*[_id in path("drafts.**") && _type in $types]),
  "publishedCount": count(*[_id in $ids]),
  "foundDocuments": *[_id in $ids || _id in $draftIds]{
    _id, _type, siteName, titleMain, title, name, brandName, ownerFullName, eyebrow,
    "itemCount": count(coalesce(items, cards, questions, navigationLinks, [])),
    "hasPrimaryLink": defined(primaryTelegram.url)
  },
  "settings": coalesce(*[_id == "drafts.siteSettings"][0], *[_id == "siteSettings"][0]){siteUrl},
  "links": coalesce(*[_id == "drafts.linksSettings"][0], *[_id == "linksSettings"][0]){
    primaryTelegram{url, isVisible}, telegramBot{url, isVisible}, telegramChannel{url, isVisible},
    vkontakte{url, isVisible}, youtube{url, isVisible}, dzen{url, isVisible},
    rutube{url, isVisible}, instagram{url, isVisible}, whatsapp{url, isVisible}, portfolio{url, isVisible}
  },
  "legal": coalesce(*[_id == "drafts.legal"][0], *[_id == "legal"][0]){privacyPolicyUrl},
  "seo": coalesce(*[_id == "drafts.seo"][0], *[_id == "seo"][0]){canonicalUrl, allowIndexing}
}`

const shellStyle = {maxWidth: 1060, margin: '0 auto', padding: '28px 22px 48px'}
const gridStyle = {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12}
const cardStyle = {padding: 18, border: '1px solid var(--card-border-color)', borderRadius: 10, background: 'var(--card-bg-color)'}
const mutedStyle = {opacity: 0.72, lineHeight: 1.55}
const badgeStyle = {display: 'inline-flex', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'var(--card-badge-default-bg-color)'}

function StatusCard({title, value, detail, tone = 'default'}) {
  return (
    <section style={cardStyle}>
      <div style={{...badgeStyle, color: tone === 'critical' ? '#d94b4b' : tone === 'positive' ? '#24936e' : 'inherit'}}>{value}</div>
      <h3 style={{fontSize: 16, margin: '12px 0 5px'}}>{title}</h3>
      <p style={{...mutedStyle, margin: 0, fontSize: 13}}>{detail}</p>
    </section>
  )
}

function useOwnerStatus() {
  const client = useClient({apiVersion: studioEnvironment.apiVersion})
  const [state, setState] = useState({loading: true, error: '', data: null, lead: null})

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function load() {
      try {
        const data = await client.fetch(query, {ids: documentIds, draftIds, types: documentIds}, {perspective: 'raw', signal: controller.signal})
        let lead = {status: 'hostingRequired', label: 'Требуется настройка хостинга'}
        if (studioEnvironment.leadHealthUrl) {
          try {
            const response = await fetch(studioEnvironment.leadHealthUrl, {headers: {Accept: 'application/json'}, signal: controller.signal})
            const payload = await response.json().catch(() => null)
            lead = response.ok && payload?.ok === true && payload?.status === 'configured'
              ? {status: 'configured', label: 'Настроено', checkedAt: new Date().toLocaleString('ru-RU')}
              : payload?.status === 'unconfigured'
                ? {status: 'unconfigured', label: 'Не настроено'}
                : {status: 'error', label: 'Ошибка подключения'}
          } catch {
            lead = {status: 'error', label: 'Ошибка подключения'}
          }
        }
        if (active) setState({loading: false, error: '', data, lead})
      } catch (error) {
        if (active && error?.name !== 'AbortError') {
          setState({loading: false, error: 'Не удалось получить состояние сайта. Проверьте подключение к Sanity.', data: null, lead: null})
        }
      }
    }

    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [client])

  return state
}

function getStatusDetails(data) {
  const found = new Set((data?.foundDocuments || []).map((item) => item._id.replace(/^drafts\./, '')))
  const missing = singletonDocuments.filter(([id]) => !found.has(id)).map(([, title]) => title)
  const hasContent = (document) => {
    if (document._type === 'siteSettings') return Boolean(document.siteName)
    if (document._type === 'linksSettings') return document.hasPrimaryLink
    if (document._type === 'hero') return Boolean(document.titleMain)
    if (document._type === 'navigation') return document.itemCount > 0
    if (['competencies', 'transformationSteps', 'speechLab', 'experience'].includes(document._type)) return document.itemCount > 0
    if (document._type === 'expert') return Boolean(document.name)
    if (document._type === 'footer') return Boolean(document.brandName)
    if (document._type === 'legal') return Boolean(document.ownerFullName)
    return Boolean(document.title || document.eyebrow)
  }
  const emptyTypes = new Set((data?.foundDocuments || []).filter((item) => !hasContent(item)).map((item) => item._type))
  const empty = singletonDocuments.filter(([id]) => emptyTypes.has(id)).map(([, title]) => title)
  const links = Object.entries(data?.links || {})
  const linkLabels = {
    primaryTelegram: 'Основной Telegram', telegramBot: 'Telegram-бот', telegramChannel: 'Telegram-канал',
    vkontakte: 'ВКонтакте', youtube: 'YouTube', dzen: 'Дзен', rutube: 'Rutube',
    instagram: 'Instagram', whatsapp: 'WhatsApp', portfolio: 'Портфолио',
  }
  const placeholders = links
    .filter(([, value]) => value?.url && PLACEHOLDER_PATTERN.test(value.url))
    .map(([name]) => linkLabels[name] || name)
  const bot = data?.links?.telegramBot?.url
  const realDomain = data?.settings?.siteUrl && !PLACEHOLDER_PATTERN.test(data.settings.siteUrl)
  const policyReady = data?.legal?.privacyPolicyUrl === '/privacy-policy.html' || /^https:\/\//.test(data?.legal?.privacyPolicyUrl || '')
  return {missing, empty, placeholders, botReady: Boolean(bot && !PLACEHOLDER_PATTERN.test(bot)), realDomain, policyReady}
}

export function OwnerDashboard() {
  const state = useOwnerStatus()
  const details = useMemo(() => getStatusDetails(state.data), [state.data])
  const configuredSiteUrl = state.data?.settings?.siteUrl
  const siteUrl = configuredSiteUrl && !PLACEHOLDER_PATTERN.test(configuredSiteUrl)
    ? configuredSiteUrl
    : studioEnvironment.productionUrl || studioEnvironment.previewUrl
  const incompleteDocuments = [...new Set([...details.missing, ...details.empty])]

  return (
    <main style={shellStyle}>
      <p style={{fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.62}}>Панель управления Speaker One</p>
      <h1 style={{fontSize: 30, margin: '5px 0 8px'}}>Начало</h1>
      <p style={{...mutedStyle, maxWidth: 760}}>Выберите раздел в левом меню, измените нужное поле, сохраните Draft и нажмите Publish после проверки. Секретные данные Telegram настраиваются один раз в защищённых настройках хостинга и специально не показываются в админке.</p>

      {state.loading && <p style={{marginTop: 24}}>Проверяем состояние сайта…</p>}
      {state.error && <p style={{marginTop: 24, color: '#d94b4b'}}>{state.error}</p>}

      {!state.loading && state.data && (
        <>
          <div style={{...gridStyle, marginTop: 24}}>
            <StatusCard title="Панель управления" value="Подключена" detail="Рабочее хранилище сайта доступно." tone="positive" />
            <StatusCard title="Опубликованные разделы" value={`${state.data.publishedCount}/${singletonDocuments.length}`} detail={incompleteDocuments.length ? `Требуют заполнения: ${incompleteDocuments.join(', ')}` : 'Все основные документы созданы и содержат данные.'} tone={incompleteDocuments.length ? 'critical' : 'positive'} />
            <StatusCard title="Неопубликованные изменения" value={String(state.data.draftCount)} detail="Draft-документы ещё не являются опубликованной версией." />
            <StatusCard title="Ссылки-заглушки" value={String(details.placeholders.length)} detail={details.placeholders.length ? 'Замените временные ссылки перед релизом.' : 'Временные ссылки не найдены.'} tone={details.placeholders.length ? 'critical' : 'positive'} />
            <StatusCard title="Telegram-бот для переходов" value={details.botReady ? 'Подключён' : 'Не подключён'} detail="Проверяется публичная ссылка, а не секретный Bot Token." tone={details.botReady ? 'positive' : 'critical'} />
            <StatusCard title="Приём заявок" value={state.lead?.label || 'Не настроено'} detail="Фактический статус защищённого приёма заявок." tone={state.lead?.status === 'configured' ? 'positive' : 'critical'} />
            <StatusCard title="Политика" value={details.policyReady ? 'Подключена' : 'Не подключена'} detail={state.data.legal?.privacyPolicyUrl || 'Ссылка не указана.'} tone={details.policyReady ? 'positive' : 'critical'} />
            <StatusCard title="SEO-домен" value={details.realDomain ? 'Указан' : 'Требуется домен'} detail={state.data.seo?.canonicalUrl || state.data.settings?.siteUrl || 'Основной адрес не заполнен.'} tone={details.realDomain ? 'positive' : 'critical'} />
          </div>

          <div style={{...cardStyle, marginTop: 18}}>
            <h2 style={{fontSize: 19, margin: '0 0 13px'}}>Быстрые действия</h2>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
              <a href={siteUrl} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>Открыть сайт</a>
              <IntentButton intent="edit" params={{id: 'hero', type: 'hero'}} text="Редактировать первый экран" mode="ghost" />
              <IntentButton intent="edit" params={{id: 'linksSettings', type: 'linksSettings'}} text="Настроить Telegram" mode="ghost" />
              <a href={`${siteUrl}#consultation`} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>Проверить форму</a>
              <a href="/presentation" style={{color: 'inherit'}}>Открыть визуальный редактор</a>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export function LeadStatusPanel() {
  const state = useOwnerStatus()
  return (
    <main style={shellStyle}>
      <h1 style={{fontSize: 28, marginBottom: 8}}>Заявки с сайта</h1>
      <p style={{...mutedStyle, maxWidth: 760}}>Публичные тексты формы меняются в документе «Форма консультации». Bot Token, Chat ID и серверные ключи находятся только в защищённых переменных хостинга.</p>
      <div style={{...gridStyle, marginTop: 24}}>
        <StatusCard title="Состояние приёма заявок" value={state.loading ? 'Проверяем…' : state.lead?.label || 'Не настроено'} detail={state.lead?.checkedAt ? `Настройки проверены: ${state.lead.checkedAt}. Тестовая заявка отправляется отдельно.` : studioEnvironment.leadHealthUrl ? 'Защищённый адрес проверки доступен.' : 'После размещения функции добавьте адрес проверки в настройки Studio.'} tone={state.lead?.status === 'configured' ? 'positive' : 'critical'} />
        <StatusCard title="Резервный Telegram" value={getStatusDetails(state.data).botReady ? 'Указан' : 'Требуется ссылка'} detail="Редактируется в разделе «Социальные сети и Telegram»." tone={getStatusDetails(state.data).botReady ? 'positive' : 'critical'} />
      </div>
      <div style={{...cardStyle, marginTop: 18}}>
        <h2 style={{fontSize: 18}}>Как подключить Telegram</h2>
        <ol style={{...mutedStyle, paddingLeft: 20}}>
          <li>Разместите защищённую функцию на хостинге.</li>
          <li>Добавьте Bot Token и Chat ID в секреты хостинга.</li>
          <li>Укажите публичный адрес функции в VITE_LEAD_ENDPOINT.</li>
          <li>Выполните тест через форму сайта.</li>
        </ol>
        <p style={mutedStyle}>Подробная инструкция находится в docs/TELEGRAM_OWNER_GUIDE.md.</p>
      </div>
    </main>
  )
}

export function VisualEditorShortcut() {
  return (
    <main style={shellStyle}>
      <h1 style={{fontSize: 28}}>Редактор сайта</h1>
      <p style={{...mutedStyle, maxWidth: 700}}>Откройте сайт, нажмите на нужный текст или фотографию и измените их справа.</p>
      <a href="/presentation" style={{display: 'inline-block', marginTop: 16}}>Открыть визуальный редактор</a>
    </main>
  )
}
