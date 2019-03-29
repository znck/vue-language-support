import { types as T, Node } from '@babel/core'
import { findObjectPropertyByName } from '../ast-helpers'
import CustomError, { ErrorCode } from '../errors'

export interface Prop {
  name: string
  type: string
  description?: string
  required: boolean
}

// TODO: Figure out if TypeScript can infer or not.
// TODO: Parse JSDoc description.
export function getProps(options: Node, root: Node): Prop[] {
  const result = findObjectPropertyByName(options, 'props', root)

  if (!result) {
    return []
  }

  const props = result.value

  if (T.isArrayExpression(props)) {
    return props.elements.map(element => {
      if (T.isStringLiteral(element)) {
        return {
          name: element.value,
          type: 'any',
          required: false,
        }
      } else {
        throw new CustomError(
          ErrorCode.UNIMPLEMENTED,
          `Non-string prop name found.`
        )
      }
    })
  }

  if (T.isObjectExpression(props)) {
    return props.properties.map(property => {
      const prop = {
        name: '',
        type: 'any',
        required: false,
      }

      if (T.isObjectProperty(property)) {
        prop.name = property.key.name

        if (T.isIdentifier(property.value)) {
          prop.type = getTypeString(property, property.value.name)
        } else if (T.isObjectExpression(property.value)) {
          const type = findObjectPropertyByName(property.value, 'type', root)

          if (type && T.isIdentifier(type.value)) {
            prop.type = getTypeString(property, type.value.name)
          }

          const required = findObjectPropertyByName(property.value, 'required', root)

          if (required && T.isBooleanLiteral(required.value)) {
            prop.required = required.value.value
          }
        }
      } else {
        throw new CustomError(
          ErrorCode.UNIMPLEMENTED,
          `Unexpected prop syntax: ${property.type}.`
        )
      }

      return prop
    })
  }

  throw new CustomError(ErrorCode.UNIMPLEMENTED, `Unexpected props format: ${props.type}.`)
}

function getTypeString(node: T.ObjectProperty, type: string) {
  // TODO: Get JSDoc annotation to infer prop type.

  switch (type) {
    case 'String': return 'string'
    case 'Number': return 'number'
    case 'Array': return 'any[]'
    case 'Object': return '{ [key: string]: any }'
    case 'Boolean': return 'boolean'
    case 'Symbol': return 'symbol'
    default: return type
  }
}
