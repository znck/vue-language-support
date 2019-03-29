import Factory, {
  Visitor,
} from '@vue/experimental-template-parser/src/ast/visitor'
import {
  RootNode,
  NodeType,
  ElementNode,
} from '@vue/experimental-template-parser/src/parser'

export function getTransparentTargetTag(node: RootNode) {
  let tag

  Factory.create<Visitor>({
    visitElement(path) {
      const node = path.node!

      if (
        node.props.some(prop => {
          return (
            (prop.type === NodeType.DIRECTIVE &&
              prop.name === 'bind' &&
              prop.exp !== undefined &&
              prop.exp.content === '$attrs') ||
            (prop.type === NodeType.ATTRIBUTE &&
              prop.name === 'data-transparent-component-target') // TODO: Discuss with Chris
          )
        })
      ) {
        tag = node.tag
      }

      if (tag) {
        return false
      }

      this.visit(path)
    },
  }).process(node)

  if (tag) {
    return tag
  }

  const elements: ElementNode[] = node.children.filter(
    child => child.type === NodeType.ELEMENT
  ) as any

  if (elements.length !== 1) {
    return null // Multiple nodes.
  }

  return elements[0].tag
}
