import * as LSP from 'vscode-languageserver'
import { getDescriptor } from '../descriptor'
import { ComponentDescriptor } from '@znck/vue-docgen'
import { getDocument } from '../documents'
import { isInRange } from '../utils/range'

export type CompletionParams = LSP.CompletionParams
export type CompletionList = LSP.CompletionList
export type CompletionItem = LSP.CompletionItem
export type CompletionItemKind = LSP.CompletionItemKind

export function createTemplateCompletionProvider<
  T = CompletionList | CompletionItem[] | void | null
>(
  provider: (
    descriptor: ComponentDescriptor,
    params: CompletionParams
  ) => T | Thenable<T>
) {
  return async (params: CompletionParams, token: LSP.CancellationToken) => {
    const { context, position, textDocument } = params
    if (!context) return // Missing context
    if (!textDocument.uri.endsWith('.vue')) return // Not in vue file
    try {
      const descriptor = await getDescriptor(textDocument.uri)
      const range = await getTemplateRange(descriptor)
      if (!isInRange(range, position)) return // Not in template area.
      return provider(descriptor, params)
    } catch (error) {
      console.error(error)
    }
  }
}

export const enum CompletionItemGroup {
  COMPONENT,
}

export interface CompletionItemData {
  type: CompletionItemGroup
}

export function createTemplateCompletionResolver<
  T extends CompletionItemData = CompletionItemData
>(
  resolver: (
    item: CompletionItem,
    data: T
  ) => Promise<CompletionItem> | CompletionItem
) {
  return (item: CompletionItem) => resolver(item, item.data)
}

const nullRange: LSP.Range = {
  start: {
    line: 0,
    character: 0,
  },
  end: {
    line: 0,
    character: 0,
  },
}

export async function getTemplateRange(descriptor: ComponentDescriptor) {
  if (!descriptor.fileName) return nullRange // NOTE: This would create problem for inline component.
  if (!descriptor.sfc) return nullRange
  if (!descriptor.sfc.template) return nullRange
  const document = await getDocument(descriptor.fileName)
  const range: LSP.Range = {
    start: document.positionAt(descriptor.sfc.template.start || 0),
    end: document.positionAt(descriptor.sfc.template.end || 0),
  }
  return range
}

export const enum CompletionItemPriority {
  USER_LOCAL = '00',
  USER_GLOBAL = '01',
  EXTERNAL_LOCAL = '02',
  EXTERNAL_GLOBAL = '03',
}

export function createSortString(
  priority: CompletionItemPriority,
  type: string,
  label: string
) {
  return `${priority}_${type}_${label}`
}
