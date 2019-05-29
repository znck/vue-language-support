import {
  ComponentDescriptor,
  ComponentRegistrationDescriptor,
} from '@znck/vue-docgen'
import {
  createTemplateCompletionProvider as provider,
  createTemplateCompletionResolver as resolver,
  createSortString,
  CompletionItemPriority,
  CompletionItemGroup,
  CompletionItemData,
  CompletionList,
  CompletionItem,
} from './_helpers'
import {
  getGlobalComponentList,
  getDescriptor,
  getDescriptorForGlobalComponent,
} from '../descriptor'

interface TagCompletionItemData extends CompletionItemData {
  type: CompletionItemGroup.COMPONENT
  fileName?: string
  isInline?: boolean
  isGlobal?: boolean
}

export const TagCompletionProvider = provider((descriptor, { context }) => {
  if (context!.triggerCharacter !== '<') return

  const completionList: CompletionList = {
    isIncomplete: false,
    items: [],
  }
  const components: ComponentRegistrationDescriptor[] = Object.values(
    descriptor.components
  )
  for (const component of components) {
    const item: CompletionItem = {
      label: component.pascalName,
      detail: `(component)`,
      sortText: createSortString(
        CompletionItemPriority.USER_LOCAL,
        'component',
        component.pascalName
      ),
      kind: 3, // function
      data: <TagCompletionItemData>{
        type: CompletionItemGroup.COMPONENT,
        fileName: component.absolutePath,
        isInline: !!component.fileName,
      },
    }

    completionList.items.push(item)
  }

  for (const componentName of getGlobalComponentList()) {
    const item: CompletionItem = {
      label: componentName,
      detail: `(global component)`,
      sortText: createSortString(
        CompletionItemPriority.USER_GLOBAL,
        'component',
        componentName
      ),
      kind: 3,
      data: <TagCompletionItemData>{
        type: CompletionItemGroup.COMPONENT,
        isGlobal: true,
      },
    }

    completionList.items.push(item)
  }

  return completionList
})

export const TagCompletionItemResolver = resolver<TagCompletionItemData>(
  async (item, data) => {
    if (data.type === CompletionItemGroup.COMPONENT) {
      if (data.fileName) {
        const descriptor = await getDescriptor(data.fileName)

        item.documentation = {
          kind: 'markdown',
          value: `${descriptor.description || ''}`,
        }

        item.detail = `(local) ${descriptor.pascalName}\n\n${Object.values(
          descriptor.props
        )
          .map(
            prop =>
              `@prop {${prop.type ? prop.type.name : 'any'}} ${
                prop.default
                  ? `[${prop.name}=${prop.default.value}]`
                  : prop.required
                  ? prop.name
                  : `[${prop.name}]`
              }`
          )
          .join('\n')}`
      } else if (data.isGlobal) {
        const descriptor = await getDescriptorForGlobalComponent(item.label)

        item.documentation = {
          kind: 'markdown',
          value: `${descriptor.description || ''}`,
        }

        item.detail = `(global) ${
          descriptor.pascalName
        }\n\n${Object.values(descriptor.props)
          .map(
            prop =>
              `@prop {${prop.type ? prop.type.name : 'any'}} ${
                prop.default
                  ? `[${prop.name}=${prop.default.value}]`
                  : prop.required
                  ? prop.name
                  : `[${prop.name}]`
              }`
          )
          .join('\n')}`
      }
    }

    return item
  }
)
