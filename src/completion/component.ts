import {
  CompletionItemProvider,
  CompletionItem,
  CompletionItemKind,
  SnippetString,
  TextLine,
  Position,
  Range,
} from 'vscode'
import { getDescriptor } from '../shared/descriptor'
import { error } from '../shared/notify'
import { getGlobalComponentNames } from '../shared/global-components'
import { CompletionItemPriority } from '../shared/utils';

export const ComponentTagCompletionProvider: CompletionItemProvider = {
  async provideCompletionItems(document, position, token, context) {
    const items: CompletionItem[] = []
    const range = document.getWordRangeAtPosition(position, /<[a-zA-Z0-9-_]+/)

    if (range) {
      if (!document.getText(range).startsWith('<')) {
        return items
      }
    } else {
      const ch = document
        .lineAt(position.line)
        .text.substr(position.character - 1, 1)

      if (ch !== '<') {
        return items
      }
    }

    try {
      const descriptor = await getDescriptor(document)

      if (descriptor) {
        if (descriptor.template) {
          const range = new Range(
            document.positionAt(descriptor.template.start),
            document.positionAt(descriptor.template.end)
          )

          if (range.contains(position)) {
            getGlobalComponentNames().map(name => {
              const item = new CompletionItem(name, CompletionItemKind.Function)
        
              item.insertText = new SnippetString(`${item.label} `)
              item.sortText = `${CompletionItemPriority.GLOBAL_USER_COMPONENT}${item.label}`
              item.detail = `(global component)`
        
              items.push(item)
            })

            descriptor.components.forEach(component => {
              // TODO: Use config to check PascalCase vs original.
              // TODO: Find correct type for tag.
              const item = new CompletionItem(
                component.normalizedName,
                CompletionItemKind.Function
              )

              item.insertText = new SnippetString(`${item.label} `)
              item.sortText = `${CompletionItemPriority.LOCAL_USER_COMPONENT}${item.label}`
              item.detail = `(local component)`

              items.push(item)
            })  
          }
        }
      }
    } catch (e) {
      error(e)
    }

    return items
  },
  async resolveCompletionItem(item, token) {
    return item
  },
}

function getTagNameInContext(line: TextLine, position: Position) {
  const source = line.text.substr(0, position.character)
  const index = source.lastIndexOf('<')
  const activeSource = source.substr(index)
  const matches = /^<(\S+)\s[^>]*$/.test(activeSource)
  if (matches) {
    return matches[1]
  }
}
