import { Connection } from 'vscode-languageserver'
import { TagCompletionProvider, TagCompletionItemResolver } from './opening-tag'

export function setupCompletion(connection: Connection) {
  connection.onCompletion(TagCompletionProvider)
  connection.onCompletionResolve(TagCompletionItemResolver)
}
