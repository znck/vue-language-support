import * as vscode from 'vscode'
import { PropsCompletionProvider } from './completion/props'
import { refreshDescriptor } from './shared/descriptor'
import { ComponentTagCompletionProvider } from './completion/component'
import { reloadGlobalComponents } from './shared/global-components'
import { ComponentDefinitionProvider } from './definition/component';

export function activate(context: vscode.ExtensionContext) {
  vscode.languages.registerCompletionItemProvider(
    { language: 'vue', scheme: 'file' },
    PropsCompletionProvider,
    ':',
    ' '
  )

  vscode.languages.registerCompletionItemProvider(
    { language: 'vue', scheme: 'file' },
    ComponentTagCompletionProvider,
    '<'
	)
	
	vscode.languages.registerDefinitionProvider(
		{ language: 'vue', scheme: 'file' },
		ComponentDefinitionProvider
	)

  vscode.workspace.onDidSaveTextDocument(document => {
    if (document.fileName.endsWith('.vue')) {
      refreshDescriptor(document)
    }
  })

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('pureVueDX.globalComponents')) {
      onConfigChange()
    }
	})
	
	onConfigChange()
}

export function deactivate(context: vscode.ExtensionContext) {
  context.subscriptions.forEach(subscription => subscription.dispose())
}

function onConfigChange() {
  const config = vscode.workspace.getConfiguration('pureVueDX.globalComponents')

  reloadGlobalComponents(
    String(config.source),
    Boolean(config.recursive),
    new RegExp(config.filter)
  )
}
