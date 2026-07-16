import {getCliClient} from 'sanity/cli'

const apiVersion = '2026-07-15'
const singletonTypes = [
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

const client = getCliClient({apiVersion})
const state = await client.fetch(
  `{
    "published": *[_type in $types && !(_id in path("drafts.**"))]{_id, _type},
    "drafts": *[_type in $types && _id in path("drafts.**")]{_id, _type},
    "publishedMedia": *[_type == "media" && !(_id in path("drafts.**"))]{_id},
    "draftMedia": *[_type == "media" && _id in path("drafts.**")]{_id}
  }`,
  {types: singletonTypes},
  {perspective: 'raw'},
)

const normalize = (items) => (Array.isArray(items) ? items : [])
  .map(({_id, _type}) => ({id: _id.replace(/^drafts\./, ''), type: _type}))
  .sort((left, right) => left.id.localeCompare(right.id))

const normalizedState = {
  singletonTypes: singletonTypes.length,
  published: normalize(state.published),
  drafts: normalize(state.drafts),
  publishedMedia: normalize(state.publishedMedia),
  draftMedia: normalize(state.draftMedia),
}

const publishedIds = new Set(normalizedState.published.map(({id}) => id))
const missingPublished = singletonTypes.filter((id) => !publishedIds.has(id))
if (missingPublished.length > 0) {
  throw new Error(`Не опубликованы контентные документы: ${missingPublished.join(', ')}.`)
}
if (normalizedState.drafts.length > 0) {
  throw new Error(`Остались неопубликованные контентные Draft: ${normalizedState.drafts.map(({id}) => id).join(', ')}.`)
}

process.stdout.write(`${JSON.stringify(normalizedState, null, 2)}\n`)
