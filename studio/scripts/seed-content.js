import {existsSync, readFileSync} from 'node:fs'
import {basename, dirname, extname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'
import {CONFIG_CMS} from '../../src/config/siteConfig.js'

const studioRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(studioRoot, '..')
const args = new Set(process.argv.slice(2))
const shouldWrite = args.has('--write')
const overwrite = args.has('--overwrite')

function readPublicStudioEnvironment() {
  const values = {}
  const envPath = resolve(studioRoot, '.env.local')
  if (!existsSync(envPath)) return values

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(SANITY_STUDIO_(?:PROJECT_ID|DATASET|API_VERSION))\s*=\s*(.*?)\s*$/)
    if (!match) continue
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return values
}

const localEnvironment = readPublicStudioEnvironment()
const projectId = String(process.env.SANITY_STUDIO_PROJECT_ID || localEnvironment.SANITY_STUDIO_PROJECT_ID || '').trim()
const dataset = String(process.env.SANITY_STUDIO_DATASET || localEnvironment.SANITY_STUDIO_DATASET || 'production').trim()
const apiVersion = String(process.env.SANITY_STUDIO_API_VERSION || localEnvironment.SANITY_STUDIO_API_VERSION || '2026-07-15').trim()
const writeToken = String(process.env.SANITY_WRITE_TOKEN || '').trim()

const cleanText = (value) => String(value ?? '').trim()
const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')
const isPlaceholder = (value) => /your_|speaker-one\.example|example\.(?:com|org|net)/i.test(String(value ?? ''))
const publicLink = (url) => ({_type: 'publicLink', url, isVisible: Boolean(url) && !isPlaceholder(url)})
const reference = (id) => ({_type: 'reference', _ref: id})
// A draft section may reference a media document that is still a draft. Sanity
// validates strong references against published IDs, so keep these references
// weak until the owner reviews and publishes the media document.
const mediaReference = (id) => ({_type: 'reference', _ref: id, _weak: true})
const action = (actionType, options = {}) => ({_type: 'buttonAction', actionType, ...options})

function sectionActionFromHref(href) {
  const destinations = {
    '#about': 'philosophy',
    '#features': 'competencies',
    '#expert': 'expert',
    '#speech-lab': 'speechLab',
    '#protocol': 'steps',
    '#consultation': 'consultation',
  }
  return destinations[href]
    ? action('section', {section: destinations[href]})
    : action('external', {externalUrl: href})
}

function currentAction(target, fallbackType = 'external') {
  if (target === 'scrollToForm' || target === '#consultation') return action('form')
  if (target === 'telegram') return action('telegram')
  if (target === 'telegramBot') return action('telegramBot')
  if (target === 'telegramChannel') return action('telegramChannel')
  if (typeof target === 'string' && target.startsWith('#')) return sectionActionFromHref(target)
  return action(fallbackType, target ? {externalUrl: target} : {})
}

const mediaDefinitions = [
  {id: 'media-logo-full', title: 'Полный логотип Speaker One', usage: 'logo', file: 'logo-full.png', alt: CONFIG_CMS.brand.logoAlt},
  {id: 'media-logo-mark', title: 'Знак логотипа S1', usage: 'logo', file: 'logo-mark.png', alt: CONFIG_CMS.brand.logoAlt},
  {id: 'media-favicon', title: 'Иконка сайта Speaker One', usage: 'favicon', file: 'logo-mark.png', alt: 'Знак Speaker One'},
  {id: 'media-hero', title: 'Главное фото первого экрана', usage: 'hero', file: 'andrey-hero.jpg', alt: CONFIG_CMS.hero.imageAlt},
  {id: 'media-philosophy', title: 'Фото раздела «Философия»', usage: 'section', file: 'andrey-philosophy.jpg', alt: CONFIG_CMS.manifesto.imageAlt},
  {id: 'media-portrait', title: 'Основное фото эксперта', usage: 'portrait', file: 'andrey-portrait.jpg', alt: CONFIG_CMS.expert.portraitAlt},
  {id: 'media-work', title: 'Дополнительное фото эксперта', usage: 'section', file: 'andrey-work.jpg', alt: CONFIG_CMS.speechLab.imageAlt},
  {id: 'media-og', title: 'Изображение для социальных сетей', usage: 'og', file: 'andrey-hero.jpg', alt: CONFIG_CMS.seo.ogImageAlt},
]

const siteUrl = CONFIG_CMS.brand.siteUrl || CONFIG_CMS.seo.canonicalUrl || 'https://speaker-one.example/'
const ownerName = cleanText(CONFIG_CMS.legal.owner)
  .replace(/\u00a0/g, ' ')
  .replace(/^Индивидуальный предприниматель\s+/i, '')

const contentDocuments = [
  {
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: CONFIG_CMS.brand.name,
    siteUrl,
    language: 'ru',
    locale: 'ru_RU',
    timezone: 'Asia/Yekaterinburg',
    copyright: CONFIG_CMS.footer.copyrightBrand,
    logoFull: mediaReference('media-logo-full'),
    logoMark: mediaReference('media-logo-mark'),
    favicon: mediaReference('media-favicon'),
  },
  {
    _id: 'linksSettings',
    _type: 'linksSettings',
    primaryTelegram: publicLink(CONFIG_CMS.links.telegramPrimary ?? CONFIG_CMS.links.telegramBot),
    telegramBot: publicLink(CONFIG_CMS.links.telegramBotToChannel ?? CONFIG_CMS.links.telegramBot),
    telegramChannel: publicLink(CONFIG_CMS.links.telegramChannel),
    vkontakte: publicLink(CONFIG_CMS.links.vkontakte),
    youtube: publicLink(CONFIG_CMS.links.youtube),
    dzen: publicLink(CONFIG_CMS.links.dzen),
    portfolio: publicLink(CONFIG_CMS.links.portfolioDrive),
  },
  {
    _id: 'hero',
    _type: 'hero',
    eyebrow: CONFIG_CMS.hero.tagline,
    titleMain: CONFIG_CMS.hero.titleMain,
    titleAccent: CONFIG_CMS.hero.titleItalic,
    subtitle: CONFIG_CMS.hero.subtitle,
    description: CONFIG_CMS.hero.description,
    primaryCtaLabel: CONFIG_CMS.hero.primaryCta,
    primaryButtonAction: currentAction(CONFIG_CMS.hero.primaryCtaTarget),
    ctaNote: CONFIG_CMS.hero.ctaNote,
    image: mediaReference('media-hero'),
    founderLabel: CONFIG_CMS.hero.expertRole,
    expertName: CONFIG_CMS.hero.expertName ?? CONFIG_CMS.expert.name,
    expertRole: CONFIG_CMS.hero.proofPoints[0],
  },
  {
    _id: 'navigation',
    _type: 'navigation',
    items: CONFIG_CMS.navigation.items.map((item, index) => ({
      _key: `navigation-${index + 1}`,
      _type: 'navigationItem',
      label: item.label,
      destination: sectionActionFromHref(item.href),
      order: (index + 1) * 10,
      isVisible: true,
    })),
    portfolioLabel: CONFIG_CMS.navigation.portfolioLabel,
    portfolioUrl: CONFIG_CMS.links.portfolioDrive,
    consultationLabel: CONFIG_CMS.navigation.consultationLabel,
    consultationButtonAction: currentAction(CONFIG_CMS.navigation.consultationTarget),
  },
  {
    _id: 'manifesto',
    _type: 'manifesto',
    isVisible: CONFIG_CMS.manifesto.visible !== false,
    eyebrow: CONFIG_CMS.manifesto.sectionTitle,
    heading: CONFIG_CMS.manifesto.mainText,
    mainText: CONFIG_CMS.manifesto.quote,
    additionalText: CONFIG_CMS.manifesto.additionalText,
    image: mediaReference('media-philosophy'),
    ctaLabel: CONFIG_CMS.manifesto.ctaLabel,
    buttonAction: currentAction(CONFIG_CMS.manifesto.ctaTarget),
  },
  {
    _id: 'competencies',
    _type: 'competencies',
    eyebrow: CONFIG_CMS.results.sectionTitle,
    title: CONFIG_CMS.results.mainTitle,
    description: CONFIG_CMS.results.description,
    cards: CONFIG_CMS.results.cards.map((card, index) => ({
      _key: card.key,
      _type: 'competencyCard',
      internalKey: card.key,
      title: card.title,
      description: card.description,
      additionalLabels: card.additionalLabels,
      icon: card.icon,
      order: (index + 1) * 10,
      isVisible: true,
    })),
  },
  {
    _id: 'expert',
    _type: 'expert',
    eyebrow: CONFIG_CMS.expert.sectionTitle,
    name: CONFIG_CMS.expert.name,
    role: CONFIG_CMS.expert.subRole,
    founderStatus: CONFIG_CMS.expert.founderStatus,
    description: CONFIG_CMS.expert.description,
    audienceTitle: CONFIG_CMS.expert.audienceTitle,
    audienceDescription: CONFIG_CMS.expert.studentsText,
    portrait: mediaReference('media-portrait'),
    workPhoto: mediaReference('media-work'),
    ctaLabel: CONFIG_CMS.expert.telegramCta,
    buttonAction: action('telegramBot'),
  },
  {
    _id: 'experience',
    _type: 'experience',
    factsTitle: CONFIG_CMS.expert.credentialsTitle,
    facts: CONFIG_CMS.expert.regalies,
    cards: CONFIG_CMS.expert.experienceCards.map((card, index) => ({
      _key: card.key,
      _type: 'experienceCard',
      internalKey: card.key,
      label: card.label,
      text: card.text,
      icon: card.icon,
      order: (index + 1) * 10,
      isVisible: true,
    })),
  },
  {
    _id: 'transformationSteps',
    _type: 'transformationSteps',
    eyebrow: CONFIG_CMS.steps.sectionTitle,
    title: CONFIG_CMS.steps.mainTitle,
    description: CONFIG_CMS.steps.description,
    itemLabel: CONFIG_CMS.steps.itemLabel,
    items: CONFIG_CMS.steps.items.map((item, index) => ({
      _key: item.key,
      _type: 'transformationStep',
      internalKey: item.key,
      number: item.num,
      title: item.title,
      description: item.desc,
      order: (index + 1) * 10,
      isVisible: true,
    })),
  },
  {
    _id: 'speechLab',
    _type: 'speechLab',
    eyebrow: CONFIG_CMS.speechLab.eyebrow,
    title: CONFIG_CMS.speechLab.title,
    description: CONFIG_CMS.speechLab.description,
    situationLabel: CONFIG_CMS.speechLab.situationLabel,
    completedLabel: CONFIG_CMS.speechLab.completedLabel,
    progressAriaLabel: CONFIG_CMS.speechLab.progressAriaLabel,
    backLabel: CONFIG_CMS.speechLab.backLabel,
    resultEyebrow: CONFIG_CMS.speechLab.resultEyebrow,
    recommendationLabel: CONFIG_CMS.speechLab.recommendationLabel,
    image: mediaReference('media-work'),
    questions: CONFIG_CMS.speechLab.questions.map((question, questionIndex) => ({
      _key: question.key,
      _type: 'speechQuestion',
      internalKey: question.key,
      shortTitle: question.title,
      prompt: question.prompt,
      order: (questionIndex + 1) * 10,
      options: question.options.map((option, optionIndex) => ({
        _key: `${question.key}-option-${optionIndex + 1}`,
        _type: 'speechOption',
        text: option.text,
        weight: option.points,
      })),
    })),
    results: CONFIG_CMS.speechLab.results.map((result, index) => ({
      _key: result.key,
      _type: 'speechResult',
      internalKey: result.key,
      title: result.title,
      description: result.description,
      recommendation: result.recommendation,
      minScore: result.minScore,
      maxScore: result.maxScore,
      order: (index + 1) * 10,
    })),
    ctaTitle: CONFIG_CMS.speechLab.ctaTitle,
    ctaDescription: CONFIG_CMS.speechLab.ctaDescription,
    ctaLabel: CONFIG_CMS.speechLab.resultCta,
    buttonAction: currentAction(CONFIG_CMS.speechLab.resultCtaTarget),
    resetLabel: CONFIG_CMS.speechLab.resetLabel,
  },
  {
    _id: 'leadFormContent',
    _type: 'leadFormContent',
    eyebrow: CONFIG_CMS.form.eyebrow,
    title: CONFIG_CMS.form.title,
    description: CONFIG_CMS.form.description,
    nameLabel: CONFIG_CMS.form.fields.name.label,
    namePlaceholder: CONFIG_CMS.form.fields.name.placeholder,
    nameHint: CONFIG_CMS.form.fields.name.hint,
    nameMin: CONFIG_CMS.form.limits.name.min,
    nameMax: CONFIG_CMS.form.limits.name.max,
    contactLabel: CONFIG_CMS.form.fields.contact.label,
    contactPlaceholder: CONFIG_CMS.form.fields.contact.placeholder,
    contactHint: CONFIG_CMS.form.fields.contact.hint,
    contactMin: CONFIG_CMS.form.limits.contact.min,
    contactMax: CONFIG_CMS.form.limits.contact.max,
    messageLabel: CONFIG_CMS.form.fields.message.label,
    messagePlaceholder: CONFIG_CMS.form.fields.message.placeholder,
    messageHint: CONFIG_CMS.form.fields.message.hint,
    messageMin: CONFIG_CMS.form.limits.message.min,
    messageMax: CONFIG_CMS.form.limits.message.max,
    submitLabel: CONFIG_CMS.form.submitLabel,
    submittingLabel: CONFIG_CMS.form.submittingLabel,
    telegramLabel: CONFIG_CMS.form.telegramLabel,
    fallbackButtonAction: action('telegram'),
    idleMessage: CONFIG_CMS.form.messages.idle,
    successMessage: CONFIG_CMS.form.messages.success,
    errorMessage: CONFIG_CMS.form.messages.error,
    unavailableMessage: CONFIG_CMS.form.messages.unavailable,
    validationMessage: CONFIG_CMS.form.messages.validation,
    nameRequiredMessage: CONFIG_CMS.form.validation.nameRequired,
    nameLengthMessage: CONFIG_CMS.form.validation.nameLength,
    contactRequiredMessage: CONFIG_CMS.form.validation.contactRequired,
    contactLengthMessage: CONFIG_CMS.form.validation.contactLength,
    messageRequiredMessage: CONFIG_CMS.form.validation.messageRequired,
    messageLengthMessage: CONFIG_CMS.form.validation.messageLength,
    consentRequiredMessage: CONFIG_CMS.form.validation.consentRequired,
    legalPrefix: CONFIG_CMS.form.legalPrefix,
    legalLinkLabel: CONFIG_CMS.form.legalLinkLabel,
    legalSuffix: CONFIG_CMS.form.legalSuffix,
    privacyPolicyUrl: CONFIG_CMS.legal.privacyPolicyLink,
  },
  {
    _id: 'footer',
    _type: 'footer',
    brandName: CONFIG_CMS.footer.brandName,
    description: CONFIG_CMS.footer.description,
    navigationTitle: CONFIG_CMS.footer.navigationTitle,
    navigationLinks: CONFIG_CMS.footer.navigationLinks.map((item, index) => {
      let linkAction = currentAction(item.href)
      if (item.href === 'portfolio') linkAction = action('external', {externalUrl: CONFIG_CMS.links.portfolioDrive})
      if (item.href === 'privacy') linkAction = action('external', {externalUrl: CONFIG_CMS.legal.privacyPolicyLink})
      return {
        _key: item.key,
        _type: 'footerNavigationLink',
        internalKey: item.key,
        label: item.label,
        action: linkAction,
        order: (index + 1) * 10,
        isVisible: true,
      }
    }),
    socialTitle: CONFIG_CMS.footer.mediaTitle,
    copyright: CONFIG_CMS.footer.copyrightBrand,
    statusText: CONFIG_CMS.footer.studioStatus,
  },
  {
    _id: 'legal',
    _type: 'legal',
    entityType: 'individualEntrepreneur',
    ownerFullName: ownerName,
    inn: digitsOnly(CONFIG_CMS.legal.inn),
    ogrnip: digitsOnly(CONFIG_CMS.legal.ogrn),
    privacyPolicyUrl: CONFIG_CMS.legal.privacyPolicyLink,
    consentPrefix: CONFIG_CMS.form.legalPrefix,
    consentLinkLabel: CONFIG_CMS.form.legalLinkLabel,
    consentSuffix: CONFIG_CMS.form.legalSuffix,
  },
  {
    _id: 'seo',
    _type: 'seo',
    siteName: CONFIG_CMS.seo.siteName,
    author: CONFIG_CMS.seo.author,
    locale: CONFIG_CMS.seo.locale,
    title: CONFIG_CMS.seo.title,
    description: CONFIG_CMS.seo.description,
    canonicalUrl: CONFIG_CMS.seo.canonicalUrl,
    allowIndexing: CONFIG_CMS.seo.allowIndexing,
    ogTitle: CONFIG_CMS.seo.ogTitle,
    ogDescription: CONFIG_CMS.seo.ogDescription,
    ogImage: mediaReference('media-og'),
    twitterCard: CONFIG_CMS.seo.twitterCard,
  },
]

function draftDocument(document) {
  return {...document, _id: `drafts.${document._id}`}
}

function validateEnvironment() {
  if (!/^[a-z0-9]+$/i.test(projectId)) throw new Error('SANITY_STUDIO_PROJECT_ID отсутствует или имеет неверный формат.')
  if (!/^[a-z0-9_-]+$/i.test(dataset)) throw new Error('SANITY_STUDIO_DATASET имеет неверный формат.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) throw new Error('SANITY_STUDIO_API_VERSION должен иметь формат YYYY-MM-DD.')
}

function createMigrationClient() {
  const cliClient = getCliClient({apiVersion})
  return cliClient.withConfig({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    ...(writeToken ? {token: writeToken} : {}),
  })
}

async function fetchExistingIds(client, ids) {
  const draftIds = ids.map((id) => `drafts.${id}`)
  const result = await client.fetch(
    '*[_id in $ids || _id in $draftIds]._id',
    {ids, draftIds},
    {perspective: 'raw'},
  )
  return new Set(Array.isArray(result) ? result : [])
}

async function uploadImage(client, fileName) {
  const filePath = resolve(projectRoot, 'public', fileName)
  if (!existsSync(filePath)) throw new Error(`Не найден файл изображения: public/${fileName}.`)
  const extension = extname(fileName).toLowerCase()
  const contentTypes = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif'}
  const contentType = contentTypes[extension]
  if (!contentType) throw new Error(`Неподдерживаемый формат изображения: ${fileName}.`)

  const asset = await client.assets.upload('image', readFileSync(filePath), {
    filename: basename(fileName),
    contentType,
  })
  if (!asset?._id) throw new Error(`Sanity не вернул ID файла ${fileName}.`)
  return asset._id
}

async function mutate(client, documents, mutationName) {
  if (documents.length === 0) return
  let transaction = client.transaction()
  documents.forEach((document) => {
    transaction = mutationName === 'createOrReplace'
      ? transaction.createOrReplace(document)
      : transaction.create(document)
  })
  await transaction.commit({autoGenerateArrayKeys: false})
}

console.log('Миграция подготовила текущий контент сайта:')
contentDocuments.forEach((document) => console.log(`- ${document._id}`))
console.log('Изображения:')
mediaDefinitions.forEach((media) => console.log(`- ${media.id} ← public/${media.file}`))
console.log(`Режим: ${shouldWrite ? (overwrite ? 'запись с явным перезаписыванием' : 'запись только отсутствующих документов') : 'dry-run без записи'}.`)

if (!shouldWrite) {
  console.log('DRY RUN завершён. Для безопасной записи отсутствующих данных: npm.cmd run seed:write.')
  console.log('Чтобы явно заменить уже существующие черновики текущим siteConfig: npm.cmd run seed:overwrite.')
  process.exit(0)
}

try {
  validateEnvironment()
  const client = createMigrationClient()
  const allIds = [...contentDocuments.map(({_id}) => _id), ...mediaDefinitions.map(({id}) => id)]
  const existingIds = await fetchExistingIds(client, allIds)
  const existsInEitherState = (id) => existingIds.has(id) || existingIds.has(`drafts.${id}`)

  const mediaToCreate = mediaDefinitions.filter(({id}) => !existsInEitherState(id))
  const assetByFile = new Map()
  const mediaDocuments = []
  for (const media of mediaToCreate) {
    let assetId = assetByFile.get(media.file)
    if (!assetId) {
      assetId = await uploadImage(client, media.file)
      assetByFile.set(media.file, assetId)
    }
    mediaDocuments.push(draftDocument({
      _id: media.id,
      _type: 'media',
      title: media.title,
      usage: media.usage,
      asset: {_type: 'image', asset: reference(assetId)},
      alt: media.alt,
      rightsConfirmed: false,
      notes: 'Перенесено из текущего публичного сайта. Перед Publish подтвердите права на публикацию.',
    }))
  }
  await mutate(client, mediaDocuments, 'create')

  const contentToWrite = contentDocuments
    .filter(({_id}) => overwrite || !existsInEitherState(_id))
    .map(draftDocument)
  await mutate(client, contentToWrite, overwrite ? 'createOrReplace' : 'create')

  const skipped = contentDocuments.filter(({_id}) => !overwrite && existsInEitherState(_id)).map(({_id}) => _id)
  console.log(`Создано новых медиа-документов: ${mediaDocuments.length}.`)
  console.log(`Записано контентных документов: ${contentToWrite.length}.`)
  if (skipped.length > 0) console.log(`Сохранены без изменений существующие документы: ${skipped.join(', ')}.`)
  console.log('Контент находится в Draft. Проверьте изображения, ссылки и предупреждения, затем публикуйте документы по одному.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Миграция завершилась с неизвестной ошибкой.')
  process.exit(1)
}
