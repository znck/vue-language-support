import { Configuration } from '@znck/vue-language-server/src/protocol'
import { workspace } from 'vscode'

export const configuration: Configuration = workspace.getConfiguration(
  'vueLanguage'
) as any
