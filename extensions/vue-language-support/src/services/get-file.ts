import { workspace, Uri, TextDocument } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { configuration } from '../configuration'
import { GetFileRequest } from '../protocol'

export function setupGetFile(client: LanguageClient) {
  client.onRequest(new GetFileRequest(), async ({ fileName }) => {
    const document = await workspace.openTextDocument(Uri.file(fileName))

    return {
      uri: document.uri.toString(),
      languageId: document.languageId,
      version: document.version,
      content: document.getText(),
    }
  })
}
