import { types } from '@babel/core'
import { getComponentOptions, isVueExtendFunctionCall } from './options'
import { parse } from './parse'

describe('isVueExtendFunctionCall', () => {
  it('should match Vue.extend member expression', async () => {
    {
      const ast = await parse('example.vue', `Vue.extend({})`)
      const { expression } = ast.program.body[0] as any
      expect(isVueExtendFunctionCall(expression)).toBe(true)
    }

    {
      const ast = await parse('example.vue', `Vue.component({})`)
      const { expression } = ast.program.body[0] as any
      expect(isVueExtendFunctionCall(expression)).toBe(false)
    }

    {
      const ast = await parse('example.vue', `Foo.extend({})`)
      const { expression } = ast.program.body[0] as any
      expect(isVueExtendFunctionCall(expression)).toBe(false)
    }

    {
      const ast = await parse('example.vue', `Vue({})`)
      const { expression } = ast.program.body[0] as any
      expect(isVueExtendFunctionCall(expression)).toBe(false)
    }
  })
})

describe('getComponentOptions', () => {
  it('should extract component options from object expression', async () => {
    const ast = await parse('example.vue', `export default { name: 'Example' }`)
    const options = await getComponentOptions(ast)

    expect(options).toBeTruthy()
    // ASSERT: The default export should be an object expression.
    expect(types.isObjectExpression(options)).toBe(true)
  })

  it('should find component options from Vue.extend arguments', async () => {
    const ast = await parse(
      'example.vue',
      `export default Vue.extend({ name: 'Example' })`
    )
    const options = await getComponentOptions(ast)

    expect(options).toBeTruthy()
    // ASSERT: The default export should be an object expression.
    expect(types.isObjectExpression(options)).toBe(true)
  })
})
