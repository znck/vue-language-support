import {
  CompletionItemProvider,
  CompletionItem,
  CompletionItemKind,
  SnippetString,
  TextLine,
  Position,
} from 'vscode'
import {
  getDescriptor,
  ComponentDescriptor,
  getDescriptorForFile,
} from '../shared/descriptor'
import { error } from '../shared/notify'
import { pascalCase, CompletionItemPriority } from '../shared/utils'
import { getGlobalComponentFileName } from '../shared/global-components'

export const PropsCompletionProvider: CompletionItemProvider = {
  async provideCompletionItems(document, position, token, context) {
    const items: CompletionItem[] = []
    const range = document.getWordRangeAtPosition(
      position,
      /<[\S]+\s[^>]+/
    )

    if (!range) {
      return items
    }

    const tag = getTagNameInContext(document.getText(range))

    if (!tag) {
      return items
    }

    if (!/[A-Z-]/.test(tag)) {
      return items
    }

    let descriptor: ComponentDescriptor | undefined
    try {
      const normalizedTag = pascalCase(tag)
      const activeComponent = await getDescriptor(document)
      const componentMeta = activeComponent.components.find(
        component => component.normalizedName === normalizedTag
      )

      const fileName = componentMeta
        ? componentMeta.fileName
        : getGlobalComponentFileName(normalizedTag)

      if (fileName) {
        descriptor = await getDescriptorForFile(fileName)
      }
    } catch (e) {
      error(e)

      return items
    }

    if (!descriptor) {
      return items
    }

    descriptor.props.forEach(prop => {
      // TODO: Find correct item type.
      const item = new CompletionItem(prop.name, CompletionItemKind.Field)

      item.detail = `(prop) ${prop.type}`
      item.documentation = prop.description
      item.insertText = new SnippetString(`${prop.name}="$0"`)
      item.sortText = `${CompletionItemPriority.CURRENT_COMPONENT_PROPS}${
        prop.name
      }`

      items.push(item)
    })

    return items
  },
  resolveCompletionItem(item, token) {
    return item
  },
}

function getTagNameInContext(source: string) {
  const index = source.lastIndexOf('<')
  if (index > -1) {
    const activeSource = source.substr(index)
    const matches = /^<(\S+)\s[^>]*$/.exec(activeSource)
    if (matches) {
      return matches[1]
    }
  }
}
