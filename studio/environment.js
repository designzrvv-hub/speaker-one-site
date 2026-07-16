const projectId = String(process.env.SANITY_STUDIO_PROJECT_ID ?? '').trim()
const dataset = String(process.env.SANITY_STUDIO_DATASET ?? 'production').trim()
const apiVersion = String(process.env.SANITY_STUDIO_API_VERSION ?? '2026-07-15').trim()
const useCdn = String(process.env.SANITY_STUDIO_USE_CDN ?? 'false').toLowerCase() === 'true'
const previewUrlValue = String(
  process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:5173',
).trim()
const productionUrlValue = String(process.env.SANITY_STUDIO_PRODUCTION_URL ?? '').trim()
const leadHealthUrlValue = String(process.env.SANITY_STUDIO_LEAD_HEALTH_URL ?? '').trim()

if (!projectId) {
  throw new Error(
    'Не задан SANITY_STUDIO_PROJECT_ID. Скопируйте studio/.env.example в studio/.env.local и укажите Project ID.',
  )
}

if (!/^[a-z0-9]+$/i.test(projectId)) {
  throw new Error('SANITY_STUDIO_PROJECT_ID должен содержать только латинские буквы и цифры.')
}

if (!/^[a-z0-9_-]+$/i.test(dataset)) {
  throw new Error('SANITY_STUDIO_DATASET содержит недопустимые символы.')
}

if (dataset !== 'production') {
  throw new Error(
    'Stage 10B использует dataset production. Проверьте SANITY_STUDIO_DATASET в studio/.env.local.',
  )
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) {
  throw new Error('SANITY_STUDIO_API_VERSION должен быть датой в формате YYYY-MM-DD.')
}

function normalizeHttpUrl(name, value, {required = false} = {}) {
  if (!value) {
    if (required) throw new Error(`${name} не задан.`)
    return ''
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} должен быть полным URL с http:// или https://.`)
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} должен использовать протокол http:// или https://.`)
  }

  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

const previewUrl = normalizeHttpUrl('SANITY_STUDIO_PREVIEW_URL', previewUrlValue, {required: true})
const productionUrl = normalizeHttpUrl('SANITY_STUDIO_PRODUCTION_URL', productionUrlValue)
const leadHealthUrl = normalizeHttpUrl('SANITY_STUDIO_LEAD_HEALTH_URL', leadHealthUrlValue)
const activePreviewUrl = process.env.NODE_ENV === 'production' && productionUrl
  ? productionUrl
  : previewUrl
const previewOrigins = [...new Set(
  [previewUrl, productionUrl].filter(Boolean).map((value) => new URL(value).origin),
)]

export const studioEnvironment = Object.freeze({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  previewUrl,
  productionUrl,
  activePreviewUrl,
  previewOrigins,
  leadHealthUrl,
})
