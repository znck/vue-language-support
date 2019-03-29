import { traverse, types as T, Node } from '@babel/core'
import CustomError, { ErrorCode } from '../errors'

export function getComponentOptions(ast: Node): T.ObjectExpression {
  let options: T.ObjectExpression | null = null

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      /**
       * Possible Scenarios:
       *
       * 1. Plain Object
       *     ```js
       *     export default {}
       *     ```
       *
       * 2. Extended Constructor
       *    ```js
       *    export default Vue.extend({})
       *    ```
       *
       * 3. Identifier
       *    ```js
       *    const component = {}
       *    export default component
       *    ```
       */

      const declaration = path.get('declaration')

      // Case 1: Plain Object
      if (declaration.isObjectExpression()) {
        options = declaration.node
      }

      // Case 2: Extended Constructor
      // TODO: Detect Vue.extend() call expression.
      else if (isVueExtendFunctionCall(declaration.node)) {
        const firstArg = declaration.get('arguments')[0]

        if (firstArg.isObjectExpression()) {
          options = firstArg
        } else if (firstArg.isIdentifier()) {
          throw new CustomError(
            ErrorCode.UNIMPLEMENTED,
            `Components using identifiers in Vue.extend (e.g. export default Vue.extend(MyComponent)) are not supported.`
          )
        } else {
          throw new CustomError(
            ErrorCode.BABEL_UNEXPECTED_VUE_EXTEND_ARGUMENT,
            `Unknown component export pattern.`
          )
        }
      }

      // Case 3: Identifier
      else if (declaration.isIdentifier()) {
        throw new CustomError(
          ErrorCode.UNIMPLEMENTED,
          `Components exporting identifiers (e.g. export default MyComponent) are not supported.`
        )
      }

      // Unknown usage pattern.
      else {
        throw new CustomError(
          ErrorCode.BABEL_UNEXPECTED_DEFAULT_EXPORT,
          `Unknown component export pattern.`
        )
      }

      path.stop()
    },
  })

  if (options === null) {
    throw new CustomError(
      ErrorCode.BABEL_UNEXPECTED_DEFAULT_EXPORT,
      `Unknown component export pattern.`
    )
  }

  return options
}

export function isVueExtendFunctionCall(node: Node): boolean {
  return (
    T.isCallExpression(node) &&
    T.isMemberExpression(node.callee) &&
    T.isIdentifier(node.callee.object, { name: 'Vue' }) &&
    T.isIdentifier(node.callee.property, { name: 'extend' })
  )
}
