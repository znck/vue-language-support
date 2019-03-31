import * as T from '@babel/types'
import { NodePath } from '@babel/traverse'
import { ParserContext } from '../../parser'
import { DescriptorBuilder } from '../../builder'
import {
  getObjectProperty,
  getPropertyKey,
  getObjectMethod,
} from '../_babel-helpers'

export default function parseProps(
  builder: DescriptorBuilder,
  componentPath: NodePath<T.ObjectExpression>,
  context: ParserContext,
  root: T.File
) {
  const targetPath = getObjectProperty(componentPath, 'props')

  if (!targetPath) return

  const propsPath = targetPath.get('value')

  // List of prop names.
  if (propsPath.isArrayExpression()) {
    propsPath.get('elements').forEach(elementPath => {
      if (elementPath.isStringLiteral()) {
        const { node } = elementPath
        builder.addProp({
          name: node.value,
          loc: node.loc,
        })
      }
      // TODO: Handle non-string prop types.
    })
  }
  // Object of prop type descriptors.
  else if (propsPath.isObjectExpression()) {
    propsPath.get('properties').forEach(propertyPath => {
      if (propertyPath.isObjectProperty()) {
        // TODO: Parse leading comments using JSDoc parser.
        const currentPropPath = propertyPath.get('value')
        const name = getPropertyKey(propertyPath)

        const prop = builder.addProp({ name, loc: propertyPath.node.loc })

        if (
          currentPropPath.isArrayExpression() ||
          currentPropPath.isIdentifier()
        ) {
          prop.type = parsePropType(currentPropPath)
        } else if (currentPropPath.isObjectExpression()) {
          prop.type = getPropType(currentPropPath)
          prop.required = getPropRequired(currentPropPath)
          prop.defaultValue = getPropDefault(currentPropPath)
        }
      }
    })
  }
}

const NORMALIZED_TYPE_NAMES = {
  Array: 'any[]',
  Boolean: 'boolean',
  Function: '((...args: any[]) => any)',
  Number: 'number',
  Object: '{ [key: string]: any }',
  String: 'string',
  Symbol: 'symbol',
}

function parsePropType(
  nodePath: NodePath
): {
  name: string
} {
  const name = nodePath.isArrayExpression()
    ? nodePath
        .get('elements')
        .filter(
          (elementPath): elementPath is NodePath<T.Identifier> =>
            elementPath.isIdentifier()
        )
        .map(elementPath => parsePropType(elementPath).name)
        .join('|')
    : nodePath.isIdentifier()
    ? NORMALIZED_TYPE_NAMES[nodePath.node.name] || nodePath.node.name
    : 'any'

  return {
    name,
  }
}

function getPropType(propPath: NodePath<T.ObjectExpression>) {
  const typePath = getObjectProperty(propPath, 'type')

  if (typePath) {
    const type = parsePropType(typePath.get('value'))
    
    return type
  }
}

function getPropRequired(propPath: NodePath<T.ObjectExpression>) {
  const requiredPath = getObjectProperty(propPath, 'required')

  if (requiredPath) {
    const valuePath = requiredPath.get('value')
    if (valuePath.isBooleanLiteral()) {
      return valuePath.node.value
    }
  }

  return false
}

function getPropDefault(propPath: NodePath<T.ObjectExpression>) {
  const defaultPath =
    getObjectProperty(propPath, 'default') ||
    getObjectMethod(propPath, 'default')

  if (defaultPath) {
    const defaultValuePath = defaultPath.get('value')

    if (defaultValuePath.isArrowFunctionExpression()) {
      const code = defaultValuePath.get('body').getSource()

      return {
        value: (defaultValuePath.node.body as any).extra.parenthesized
          ? code.slice(1, code.length - 1)
          : code,
        factory: true,
      }
    } else {
      return {
        value: defaultValuePath.getSource(),
      }
    }
  }
}
