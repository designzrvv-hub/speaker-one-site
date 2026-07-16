import {defineCliConfig} from 'sanity/cli'
import {studioEnvironment} from './environment.js'

export default defineCliConfig({
  api: {
    projectId: studioEnvironment.projectId,
    dataset: studioEnvironment.dataset,
  },
})
