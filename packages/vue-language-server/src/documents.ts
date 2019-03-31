import { TextDocuments, TextDocument, Connection } from 'vscode-languageserver'
import { configuration } from './configuration'
import * as Path from 'path'
import { GetFileRequest } from './protocol'

export function setupDocuments(connection: Connection) {
  currentConnection = connection
  documents.listen(connection)
}

let currentConnection: Connection
async function requestFile(fileName: string) {
  if (fileName.startsWith('file://')) {
    fileName = fileName.substr('file://'.length)
  }

  const {
    uri,
    languageId,
    version,
    content,
  } = await currentConnection.sendRequest(new GetFileRequest(), { fileName })

  return TextDocument.create(uri, languageId, version, content)
}

/** Workspace */
export let workspaceFolder: string | null
export function setWorkspaceFolder(dir: string | null) {
  workspaceFolder = dir
}

/** Filesystem */
export const documents = new TextDocuments()
export async function getDocument(fileName: string) {
  if (!fileName.startsWith('file://')) {
    fileName = `file://${fileName}`
  }

  const document = documents.get(fileName)

  if (document) return document

  return requestFile(fileName)
}

export function resolve(dir: string, request: string) {
  if (dir.startsWith('file://')) {
    dir = dir.substr('file://'.length)
  }

  if (!/\.(vue|js|ts)$/.test(request)) {
    request += '.vue'
  }

  if (/^\.{1,2}[\\/]/.test(request)) {
    return Path.resolve(dir, request)
  }

  for (const prefix in configuration.aliases) {
    if (request.startsWith(prefix)) {
      const aliasDir = configuration.aliases[prefix]
      const newRequest = request.substr(prefix.length)

      if (/^[\\/]/.test(aliasDir)) {
        return Path.resolve(aliasDir, newRequest)
      }

      return Path.resolve(workspaceFolder || '', aliasDir, newRequest)
    }
  }

  throw new Error(`Unknown path request: ${request}`)
}
