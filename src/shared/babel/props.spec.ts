import { parse } from './parse'
import { getProps } from './props'

describe('getProps', () => {
  const fn = async (code: string) => {
    const root = await parse('example.vue', `export default ${code}`)
    const node = root.program.body[0] as any

    const options = node.declaration

    return { options, root }
  }
  it('should parse list of prop names', async () => {
    const { root, options } = await fn(`{ props: ['foo', 'bar'] }`)
    const props = await getProps(options, root)

    expect(props).toHaveLength(2)
    expect(props[0]).toEqual({
      name: 'foo',
      type: 'any',
      required: false,
    })
  })

  it('should parse map of prop names', async () => {
    const { root, options } = await fn(
      `{ props: { foo: { type: String, required: true }, bar: Number } }`
    )
    const props = await getProps(options, root)

    expect(props).toHaveLength(2)
    expect(props[0]).toEqual({
      name: 'foo',
      type: 'string',
      required: true,
    })
    expect(props[1]).toEqual({
      name: 'bar',
      type: 'number',
      required: false,
    })
  })
})
