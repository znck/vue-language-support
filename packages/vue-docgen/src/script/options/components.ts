import * as T from '@babel/types'
import { NodePath } from '@babel/traverse'
import { DescriptorBuilder } from '../../builder'
import { ParserContext } from '../../parser'
import { getObjectProperty, getPropertyKey } from '../_babel-helpers'

export default function parseProp(
  builder: DescriptorBuilder,
  optionsPath: NodePath<T.ObjectExpression>,
  context: ParserContext,
  root: T.File
) {
  const targetPath = getObjectProperty(optionsPath, 'components')

  if (!targetPath) return

  const componentsPath = targetPath.get('value')

  if (!componentsPath.isObjectExpression()) return

  componentsPath.get('properties').forEach(propertyPath => {
    if (!propertyPath.isObjectProperty()) return
    const localName = getPropertyKey(propertyPath)
    const componentPath = propertyPath.get('value')

    if (componentPath.isIdentifier()) {
      const name = componentPath.node.name
      const componentBindingPath = componentPath.scope.getBinding(name)

      if (componentBindingPath) {
        if (componentBindingPath.kind === 'module') {
          const parentPath = componentBindingPath.path.parentPath

          if (parentPath.isImportDeclaration()) {
            builder.addComponentRegistration({
              name: localName,
              fileName: parentPath.node.source.value,
              loc: [
                propertyPath.node.loc,
                componentBindingPath.path.parent.loc,
              ],
            })
          }
          return
        }

        builder.addComponentRegistration({
          name: localName,
          loc: [propertyPath.node.loc, componentBindingPath.path.node.loc],
        })

        return
      }

      builder.addComponentRegistration({
        name: localName,
        loc: [propertyPath.node.loc],
      })
    }
  })
}
