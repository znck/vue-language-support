import { types as T, Node } from '@babel/core'
import CustomError, { ErrorCode } from './errors'

export function findObjectPropertyByName(
  target: Node,
  name: string,
  root?: Node
): T.ObjectProperty | null {
  if (!T.isObjectExpression(target)) {
    return null
  }

  let hasObjectSpread = false
  const literals = [`'${name}'`, `"${name}"`, `\`${name}\``]
  const node = target.properties.find(property => {
    if (T.isObjectProperty(property)) {
      if (T.isIdentifier(property.key, { name })) {
        return true
      }

      if (
        T.isStringLiteral(property.key) &&
        literals.includes(property.key.value)
      ) {
        return true
      }
    }

    hasObjectSpread = hasObjectSpread || T.isSpreadElement(property)

    return false
  }) as any

  if (node) {
    return node
  }

  if (!hasObjectSpread) {
    return null
  }

  throw new CustomError(
    ErrorCode.UNIMPLEMENTED,
    `Finding '${name}' in object with object spread syntax is not supported yet.`
  )
}
