import {
  Node,
  ElementNode,
  AttributeNode,
  DirectiveNode,
  TextNode,
} from './node'

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') {
    const keys = Object.keys(b)

    return keys.every(key => shallowEqual(a[key], b[key]))
  }

  return false
}

function isType(node: Node | null, type: string, options: any = {}): boolean {
  return (
    typeof node === 'object' &&
    !!node &&
    node.type === type &&
    shallowEqual(node, options)
  )
}

export function isElement<T>(
  node: any,
  options?: Partial<ElementNode<T>>
): node is ElementNode<T> {
  return isType(node, 'Element', options)
}

export function isText<T>(
  node: any,
  options?: Partial<TextNode<T>>
): node is TextNode<T> {
  return isType(node, 'Text', options)
}

export function isAttribute<T>(
  node: any,
  options?: Partial<AttributeNode<T>>
): node is AttributeNode<T> {
  return isType(node, 'Attribute', options)
}

export function isDirective<T>(
  node: any,
  options?: Partial<DirectiveNode<T>>
): node is DirectiveNode<T> {
  return isType(node, 'Directive', options)
}
