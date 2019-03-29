import { parse } from "./parse";
import { getTransparentTargetTag } from "./tag";

describe('getTransparentTargetTag', () => {
  it('should return root element/component', async () => {
    const ast = await parse(`example.vue`, `<div>Foo</div>`)

    expect(getTransparentTargetTag(ast as any)).toBe('div')
  })
  
  it('should return null for multi-root node component', async () => {
    const ast = await parse(`example.vue`, `<div>Foo</div><div>Bar</div>`)

    expect(getTransparentTargetTag(ast as any)).toBe(null)
  })
  
  
  it('should return element using v-bind="$attrs"', async () => {
    const ast = await parse(`example.vue`, `<label>Foo</label><input type="text" v-bind="$attrs" />`)

    expect(getTransparentTargetTag(ast as any)).toBe('input')
  })
  
  it('should return element using v-bind="$attrs" (deeply nested)', async () => {
    const ast = await parse(`example.vue`, `<label>Foo: <input type="text" v-bind="$attrs" /></label>`)

    expect(getTransparentTargetTag(ast as any)).toBe('input')
  })
  
  it('should return element using [data-transparent-component-target]', async () => {
    const ast = await parse(`example.vue`, `<label>Foo: <input type="text" v-bind="computedAttrs" data-transparent-component-target /></label>`)

    expect(getTransparentTargetTag(ast as any)).toBe('input')
  })
})