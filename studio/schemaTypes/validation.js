import {studioEnvironment} from '../environment.js'

const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024

export const safeIconOptions = [
  {title: 'Голос', value: 'volume'},
  {title: 'Цель', value: 'target'},
  {title: 'Рост', value: 'trending'},
  {title: 'Компас', value: 'compass'},
  {title: 'Защита', value: 'shield'},
  {title: 'Эфир', value: 'radio'},
]

export function rejectHtml(value) {
  if (typeof value !== 'string' || !/<\/?[a-z][^>]*>/i.test(value)) return true
  return 'HTML-код не поддерживается. Введите только обычный текст.'
}

export function validateStableKey(value) {
  if (!value) return 'Укажите стабильный ключ.'
  return /^[a-z][a-z0-9-]{1,49}$/.test(value)
    ? true
    : 'Используйте 2–50 латинских символов, цифр или дефисов; начните с буквы.'
}

export function validateSafePublicUrl(value) {
  if (!value) return 'Укажите ссылку или действие.'
  if (value === 'scrollToForm') return true
  if (value.startsWith('/')) return !value.startsWith('//') || 'Путь не должен начинаться с //.'
  if (value.startsWith('#')) {
    return ['#about', '#features', '#expert', '#speech-lab', '#protocol', '#consultation'].includes(value)
      ? true
      : 'Выберите существующий раздел сайта.'
  }

  try {
    const url = new URL(value)
    return ['https:', 'mailto:', 'tel:'].includes(url.protocol)
      ? true
      : 'Разрешены HTTPS, ссылка для письма или звонка, внутренний путь либо выбранный раздел сайта.'
  } catch {
    return 'Укажите корректную ссылку или действие.'
  }
}

function getValidationClient(context) {
  return context
    .getClient({apiVersion: studioEnvironment.apiVersion})
    .withConfig({perspective: 'drafts', useCdn: false})
}

export async function validateReferencedMediaAlt(reference, context) {
  if (!reference?._ref) return true

  try {
    const alt = await getValidationClient(context).fetch(
      '*[_type == "media" && _id == $id][0].alt',
      {id: reference._ref.replace(/^drafts\./, '')},
    )

    return typeof alt === 'string' && alt.trim()
      ? true
      : 'У выбранного изображения нет описания для поисковых систем. Откройте его в разделе «Изображения» и заполните описание.'
  } catch {
    return 'Не удалось проверить описание изображения. Проверьте подключение к Sanity и повторите попытку.'
  }
}

export async function warnAboutLargeSourceImage(image, context) {
  const assetId = image?.asset?._ref
  if (!assetId) return true

  try {
    const size = await getValidationClient(context).fetch('*[_id == $id][0].size', {id: assetId})

    if (typeof size !== 'number' || size <= MAX_SOURCE_IMAGE_BYTES) return true

    const sizeInMegabytes = (size / 1024 / 1024).toFixed(1).replace('.', ',')
    return `Исходный файл весит ${sizeInMegabytes} МБ. Рекомендуемый максимум — 8 МБ; оптимизируйте изображение перед публикацией.`
  } catch {
    // Ошибка сетевой проверки не должна создавать ложное предупреждение о размере.
    return true
  }
}
