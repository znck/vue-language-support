import * as T from '@babel/types'
import { NodePath } from '@babel/traverse'

export function getPropertyKey(nodePath: NodePath<T.ObjectMember>) {
  const { node } = nodePath

  if (node) {
    if (T.isIdentifier(node.key)) {
      return node.key.name
    }

    if (T.isStringLiteral(node.key)) {
      return node.key.value
    } 
  }

  throw new Error(
    `[parser#${getPropertyKey.name}] Unexpected object property key type: '${
      JSON.stringify(nodePath.node)
    }'`
  )
}

export function getObjectProperty(
  objectPath: NodePath<T.ObjectExpression>,
  name: string
): NodePath<T.ObjectProperty> | undefined {
  return objectPath
    .get('properties')
    .find(
      (propertyPath): propertyPath is NodePath<T.ObjectProperty> =>
        propertyPath.isObjectProperty() && name === getPropertyKey(propertyPath)
    )
}
export function getObjectMethod(
  objectPath: NodePath<T.ObjectExpression>,
  name: string
): NodePath<T.ObjectMethod> | undefined {
  return objectPath
    .get('properties')
    .find(
      (propertyPath): propertyPath is NodePath<T.ObjectMethod> =>
        propertyPath.isObjectMethod() && name === getPropertyKey(propertyPath)
    )
}
