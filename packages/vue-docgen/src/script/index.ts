import * as T from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'
import components from './options/components'
import props from './options/props'
import { DescriptorBuilder } from '../builder'
import { ParserContext } from '../parser'

const optionsSyntax = [components, props]
const classSyntax: Array<(...args: any[]) => void> = []

export default async function script(
  builder: DescriptorBuilder,
  context: ParserContext,
  ast: T.File,
  isVueFile: boolean
) {
  const componentPaths: NodePath<T.ObjectExpression | T.ClassDeclaration>[] = []

  if (isVueFile) {
    traverse(ast, {
      ExportDefaultDeclaration(path) {
        const component = findComponentOptions(path)

        if (component) componentPaths.push(component)
        path.stop()
      },
    })
  }

  await Promise.all(
    componentPaths.map(async path => {
      if (path.isObjectExpression()) {
        await Promise.all(
          optionsSyntax.map(async fn => {
            try {
              await fn(builder, path, context, ast)
            } catch (error) {
              console.error(builder.component.fileName, error)
            }
          })
        )
      } else {
        await Promise.all(
          classSyntax.map(async fn => {
            try {
              await fn(builder, path, context, ast)
            } catch (error) {
              console.error(builder.component.fileName, error)
            }
          })
        )
      }
    })
  )

  // Enhance with type information.
}

function findComponentOptions(
  path: NodePath<T.ExportDefaultDeclaration>
): NodePath<T.ObjectExpression> | void {
  const declarationPath = path.get('declaration')

  if (declarationPath.isObjectExpression()) {
    return declarationPath
  }

  if (declarationPath.isCallExpression()) {
    const fnPath = declarationPath.get('callee')

    if (
      fnPath.isIdentifier({ name: 'createComponent' }) ||
      (
        fnPath.isMemberExpression() &&
        T.isIdentifier(fnPath.node.object, { name: 'Vue' }) &&
        T.isIdentifier(fnPath.node.property, { name: 'extend' })
      )
    ) {
      const optionsPath = declarationPath.get('arguments')[0]

      if (optionsPath) {
        if (optionsPath.isObjectExpression()) return optionsPath
        if (optionsPath.isIdentifier()) {
          const binding = resolveIdentifierToOptions(optionsPath)

          if (binding) return binding
        }
      }
    }
  }

  if (declarationPath.isIdentifier()) {
    const binding = resolveIdentifierToOptions(declarationPath)

    if (binding) return binding
  }

  // TODO: Report error: No component found.
}

function resolveIdentifierToOptions(
  path: NodePath<T.Identifier>
): NodePath<T.ObjectExpression> | void {
  const binding = path.scope.getBinding(path.node.name)

  if (binding) {
    if (binding.path.isVariableDeclarator()) {
      const initPath = binding.path.get('init')

      if (initPath.isObjectExpression()) {
        return initPath
      }
    }
  }
}
