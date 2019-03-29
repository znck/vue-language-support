import { types as T } from '@babel/core'
import { findObjectPropertyByName } from './ast-helpers'
import { parse } from './babel/parse'

describe('findObjectPropertyByName', () => {
  const fn = async (code: string) => {
    const ast = await parse('example.vue', `export default ${code}`)
    const node = ast.program.body[0] as any

    return node.declaration
  }
  it('should find object property by name', async () => {
    expect(findObjectPropertyByName(await fn(`{}`), 'props')).toBe(null)

    expect(findObjectPropertyByName(await fn(`{ foo: '' }`), 'props')).toBe(
      null
    )

    expect(
      T.isObjectProperty(
        findObjectPropertyByName(await fn(`{ props: ['foo'] }`), 'props')
      )
    ).toBe(true)

    expect(findObjectPropertyByName(await fn(`{ foo() {} }`), 'foo')).toBe(null)
  })
})
