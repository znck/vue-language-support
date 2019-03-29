import * as vscode from 'vscode'
import * as Path from 'path'
import { getComponentNameFromFilename, pascalCase } from './utils'

let COMPONENTS: Record<string, string> = {}

export function getGlobalComponentNames() {
  return Object.keys(COMPONENTS)
}

export function getGlobalComponentFileName(name: string) {
  return COMPONENTS[name]
}

export async function reloadGlobalComponents(
  relativePath: string,
  recursive: boolean,
  filter: RegExp
) {
  COMPONENTS = {}

  const files = await vscode.workspace.findFiles(
    recursive ? `${relativePath}/**/*` : `${relativePath}/*`
  )

  files
    .filter(file => filter.test(file.fsPath))
    .forEach(file => {
      COMPONENTS[pascalCase(getComponentNameFromFilename(file.fsPath))] = file.fsPath
    })
}
