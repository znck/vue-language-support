import { workspace } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { configuration } from '../configuration'
import { SyncGlobalComponents } from '../protocol'

export function setupSyncGlobalComponents(client: LanguageClient) {
  client.onRequest(new SyncGlobalComponents(), async () => {
    const { globalComponents } = configuration

    const files = await workspace.findFiles(
      `${globalComponents.directory}${
        globalComponents.useSubdirectories ? '/**/*' : '/*'
      }`
    )

    const re = new RegExp(globalComponents.regExp)
    const fileNames = files
      .filter(file => re.test(file.fsPath))
      .map(file => file.fsPath)

    return { fileNames }
  })
}
