import { Connection, FileChangeType } from 'vscode-languageserver'
import { ComponentDescriptor, parseSFC } from '@znck/vue-docgen'
import { pascalCase } from './utils'
import { getDocument, resolve, documents } from './documents'
import * as Path from 'path'
import { configuration } from './configuration'
import { camelCase } from 'lodash'
import { SyncGlobalComponents } from './protocol'

export async function setupDescriptor(connection: Connection) {
  // Request global components sync.
  connection.onInitialized(async () => {
    const { fileNames } = await connection.sendRequest(
      new SyncGlobalComponents()
    )

    fileNames.forEach(fileName => {
      globalComponentsMap[getComponentNameFromFileName(fileName)] = fileName
    })
  })

  // When file changes, update descriptors and global components.
  connection.onDidChangeWatchedFiles(event => {
    event.changes.forEach(change => {
      const fileName = change.uri.replace(/^file:\/\//, '')
      if (fileName.endsWith('.vue')) {
        if (change.type === FileChangeType.Deleted) {
          deleteDescriptor(fileName)
        } else {
          dirtyFiles.add(fileName)
        }
      }

      if (isGlobalComponent(fileName)) {
        const name = getComponentNameFromFileName(fileName)

        if (change.type === FileChangeType.Deleted) {
          delete globalComponentsMap[name]
        } else {
          globalComponentsMap[name] = fileName
        }
      }
    })
  })
}

/** List of dirty files which require re-parsing. */
const dirtyFiles = new Set<string>()

/** A collection of global component list with files. */
let globalComponentsMap: Record<string, string> = {}

/** A collection of Vue files with descriptors. */
const componentsByFilename: Record<string, ComponentDescriptor> = {}

/**
 * Check if file passes global components check.
 */
function isGlobalComponent(fileName: string) {
  const {
    directory,
    useSubdirectories,
    regExp,
  } = configuration.globalComponents

  try {
    return (
      fileName.startsWith(directory + Path.sep) &&
      (useSubdirectories ||
        /^[\\/]+\.vue$/.test(fileName.substr(directory.length + 1))) &&
      new RegExp(regExp).test(fileName)
    )
  } catch (e) {
    return false
  }
}

export async function getDescriptor(
  fileName: string
): Promise<ComponentDescriptor> {
  if (dirtyFiles.has(fileName) || !(fileName in componentsByFilename)) {
    await updateDescriptor(fileName)
  }

  return componentsByFilename[fileName]
}

export function getGlobalComponentList() {
  return Object.keys(globalComponentsMap)
}

export async function getDescriptorForGlobalComponent(tag: string) {
  const normalizedTag = pascalCase(tag)

  if (normalizedTag in globalComponentsMap) {
    return getDescriptor(globalComponentsMap[normalizedTag])
  }

  throw new Error(`[descriptor] Global component not found: '${tag}'`)
}

export function deleteDescriptor(fileName: string) {
  delete componentsByFilename[fileName]

  const index = Object.values(globalComponentsMap).indexOf(fileName)

  if (index >= 0) {
    const name = getGlobalComponentList()[index]

    delete globalComponentsMap[name]
  }
}

export async function updateDescriptor(
  fileName: string,
  source?: string
): Promise<ComponentDescriptor> {
  if (!source) {
    const document = await getDocument(fileName)

    source = document.getText()
  }

  const dir = Path.dirname(fileName)

  const descriptor = await parseSFC(source, {
    fileName,
    resolve: path => resolve(dir, path),
    async readFile(fileName) {
      const document = await getDocument(fileName)

      return document.getText()
    },
  })

  if (descriptor) {
    componentsByFilename[fileName] = descriptor

    return descriptor
  }

  throw new Error('Parser returned nothing')
}

function getComponentNameFromFileName(fileName: string) {
  const name = camelCase(Path.basename(fileName).replace(/\.vue$/, ''))

  return name[0].toUpperCase() + name.substr(1)
}
