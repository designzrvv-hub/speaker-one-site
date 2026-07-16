import {defineDocuments} from 'sanity/presentation'

export const mainDocuments = defineDocuments([
  {
    route: '/',
    filter: '_type == "hero" && _id == "hero"',
  },
])
