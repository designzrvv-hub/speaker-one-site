import {getCliClient} from 'sanity/cli'

const apiVersion = process.env.SANITY_STUDIO_API_VERSION || '2026-07-15'
const shouldWrite = process.argv.includes('--write')
const contentIds = [
  'siteSettings',
  'linksSettings',
  'hero',
  'navigation',
  'manifesto',
  'competencies',
  'expert',
  'experience',
  'transformationSteps',
  'speechLab',
  'leadFormContent',
  'footer',
  'legal',
  'seo',
]

const client = getCliClient({apiVersion}).withConfig({useCdn: false})
const draftIds = contentIds.map((id) => `drafts.${id}`)
const state = await client.fetch(
  `{
    "drafts": *[_id in $draftIds],
    "publishedIds": *[_id in $contentIds]._id
  }`,
  {draftIds, contentIds},
  {perspective: 'raw'},
)

const publishedIds = new Set(state.publishedIds || [])
const drafts = Array.isArray(state.drafts) ? state.drafts : []
const publishable = drafts.filter((draft) => !publishedIds.has(draft._id.replace(/^drafts\./, '')))
const skipped = drafts
  .map((draft) => draft._id.replace(/^drafts\./, ''))
  .filter((id) => publishedIds.has(id))

console.log('Контентные документы, готовые к первой публикации:')
publishable.forEach((draft) => console.log(`- ${draft._id.replace(/^drafts\./, '')}`))
if (skipped.length > 0) {
  console.log(`Существующие Published-документы не перезаписываются: ${skipped.join(', ')}.`)
}

if (!shouldWrite) {
  console.log('DRY RUN завершён. Для публикации новых документов: npm.cmd run publish:content.')
  process.exit(0)
}

if (publishable.length === 0) {
  console.log('Новых Draft-документов для первой публикации нет.')
  process.exit(0)
}

let transaction = client.transaction()
publishable.forEach((draft) => {
  const {_rev, _createdAt, _updatedAt, ...document} = draft
  const publishedId = document._id.replace(/^drafts\./, '')
  transaction = transaction
    .create({...document, _id: publishedId})
    .delete(document._id)
})
await transaction.commit({autoGenerateArrayKeys: false})
console.log(`Опубликовано контентных документов: ${publishable.length}.`)
console.log('Медиа-документы не публиковались: право на использование изображений подтверждает владелец вручную.')
