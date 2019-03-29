import { types as T, Node, traverse } from '@babel/core'
import { NodePath, Hub } from '@babel/traverse'
import { findObjectPropertyByName } from '../ast-helpers'
import CustomError, { ErrorCode } from '../errors'
import { pascalCase, getComponentNameFromFilename } from '../utils'
import * as Path from 'path'

export interface ComponentMeta {
  name: string
  normalizedName: string
  fileName?: string // Missing for global components.
}

// TODO: Figure out if TypeScript can infer or not.
// TODO: Parse JSDoc description.
export function getComponents(
  fileName: string,
  options: Node,
  root: Node
): ComponentMeta[] {
  const result = findObjectPropertyByName(options, 'components', root)

  if (!result) {
    return []
  }

  const components: ComponentMeta[] = []

  traverse(root, {
    ObjectExpression(path) {
      if (path.node === result.value) {
        path.get('properties').forEach(property => {
          if (property.isObjectProperty()) {
            const value = property.get('value')

            if (value.isIdentifier()) {
              const binding = value.scope.getBinding(value.node.name)

              if (binding) {
                const component = binding.path

                if (component.isImportDefaultSpecifier()) {
                  const importStatement = component.parentPath

                  if (importStatement.isImportDeclaration()) {
                    // TODO: Resolve webpack/typescript alias.
                    const importPath = importStatement.node.source.value
                    const componentFileName = Path.resolve(
                      Path.dirname(fileName),
                      importPath.endsWith('.vue')
                        ? importPath
                        : importPath + '.vue'
                    )
                    const name = getComponentNameFromFilename(componentFileName)

                    components.push({
                      name,
                      normalizedName: pascalCase(name),
                      fileName: componentFileName,
                    })

                    return // done.
                  }
                }
              }
            }
          }

          throw new CustomError(
            ErrorCode.UNIMPLEMENTED,
            `Unexpected component format: ${property.type}.`
          )
        })

        return false
      }
    },
  })

  return components
}
