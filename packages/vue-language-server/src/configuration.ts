import { Connection } from 'vscode-languageserver'

export interface Configuration {
  globalComponents: {
    directory: string
    useSubdirectories: boolean
    regExp: string
  }
  aliases: Record<string, string>
}

export let configuration: Configuration = {
  globalComponents: {
    directory: 'src/components',
    useSubdirectories: false,
    regExp: '_?(?:app-|base-|App|Base).*?\\.vue$',
  },
  aliases: {},
}

export async function setupConfiguration(connection: Connection) {
  connection.onInitialized(async () => {
    if (connection.workspace) {
      configuration = await connection.workspace.getConfiguration('vueLanguage')
    }
  })

  connection.onDidChangeConfiguration(event => {
    configuration = event.settings.vueLanguage
  })
}
