import {defineConfig} from 'sanity'
import {presentationTool} from 'sanity/presentation'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes/index.js'
import {
  singletonActions,
  singletonTypes,
  studioStructure,
} from './structure/index.js'
import {studioEnvironment} from './environment.js'
import {deploymentStatusBadge} from './badges/deploymentStatusBadge.js'
import {mainDocuments} from './presentation/resolve.js'

export default defineConfig({
  name: 'speaker-one',
  title: 'Speaker One — управление сайтом',
  projectId: studioEnvironment.projectId,
  dataset: studioEnvironment.dataset,
  plugins: [
    presentationTool({
      name: 'presentation',
      title: 'РЕДАКТИРОВАТЬ САЙТ',
      previewUrl: {
        initial: studioEnvironment.activePreviewUrl,
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
      allowOrigins: studioEnvironment.previewOrigins,
      resolve: {
        mainDocuments,
      },
    }),
    structureTool({
      name: 'structure',
      title: 'Все разделы',
      structure: studioStructure,
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((template) => !singletonTypes.has(template.schemaType)),
  },
  document: {
    badges: (badges) => [...badges, deploymentStatusBadge],
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType)
        ? actions.filter((action) => action.action && singletonActions.has(action.action))
        : actions,
    newDocumentOptions: (options) =>
      options.filter(
        (option) =>
          !singletonTypes.has(option.templateId) && !singletonTypes.has(option.schemaType),
      ),
  },
})
