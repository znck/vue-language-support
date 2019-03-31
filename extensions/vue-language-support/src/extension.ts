import { ExtensionContext, workspace } from 'vscode'
import {
  LanguageClient,
  TransportKind,
  ServerOptions,
  LanguageClientOptions,
} from 'vscode-languageclient'
import { setupSyncGlobalComponents } from './services/sync-global-component';
import { setupGetFile } from './services/get-file';

let client: LanguageClient
const serverPath = require.resolve('@znck/vue-language-server')

export async function activate(context: ExtensionContext) {
  const serverModule = serverPath
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'vue' }],
    synchronize: {
      configurationSection: 'vueLanguage',
      fileEvents: workspace.createFileSystemWatcher('**/*.{vue,js,ts}'),
    },
  }

  client = new LanguageClient(
    'Vue Language Server (alternate)',
    serverOptions,
    clientOptions
  )

  client.start()

  await client.onReady()

  setupSyncGlobalComponents(client)
  setupGetFile(client)
}

export function deactivate() {
  if (client) {
    return client.stop()
  }
}
