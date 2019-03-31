import {
  createConnection,
  ProposedFeatures,
} from 'vscode-languageserver'
import { setWorkspaceFolder, setupDocuments, documents } from './documents'
import { setupConfiguration, Configuration } from './configuration'
import { setupDescriptor } from './descriptor'
import { setupCompletion } from './completion'

export { Configuration }

const connection = createConnection(ProposedFeatures.all)

connection.onInitialize(params => {
  setWorkspaceFolder(params.rootUri)

  console.log(`Vue Language Server (alternate) is staring.`)

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [
          '<', // For opening tag
          '.', // For directive modifier
          ':', // For v-bind shorthand or directive argument
          '@', // For v-on shorthand
          '#', // For v-slot shorthand
          '/', // For closing tag
          '-', // For directive name
        ],
      },
    },
  }
})

setupConfiguration(connection)
setupDescriptor(connection)
setupDocuments(connection)
setupCompletion(connection)

connection.listen()
