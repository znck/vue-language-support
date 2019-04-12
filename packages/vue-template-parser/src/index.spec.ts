import { parseText, parse } from './index'

describe('parseText', () => {
  it('should parse single line plain text', () => {
    const node = parseText('single line plain text')

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(1)
    expect(node.children[0].type).toBe('Literal')
    expect(node.children[0].value).toBe('single line plain text')
    expect(node).toMatchSnapshot()
  })

  it('should parse multi line plain text', () => {
    const node = parseText('multi\nline\r\nplain\ntext')

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(1)
    expect(node.children[0].type).toBe('Literal')
    expect(node.children[0].value).toBe('multi\nline\r\nplain\ntext')
    expect(node).toMatchSnapshot()
  })

  it('should parse multi line plain text with character references', () => {
    const node = parseText('multi\nline &amp;\r\nplain\ntext')

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(3)
    expect(node.children[0].type).toBe('Literal')
    expect(node.children[0].value).toBe('multi\nline ')
    expect(node.children[1].type).toBe('CharacterReferenceLiteral')
    expect(node.children[1].value).toBe('&')
    expect(node).toMatchSnapshot()
  })

  it('should parse single line text with interpolation', () => {
    const node = parseText(`single line text {{ 'with' }} interpolation`)

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(3)
    expect(node.children[0].type).toBe('Literal')
    expect(node.children[0].value).toBe('single line text ')
    expect(node.children[1].type).toBe('Interpolation')
    expect(node.children[1].value).toBe(` 'with' `)
    expect(node.children[2].type).toBe('Literal')
    expect(node.children[2].value).toBe(' interpolation')
    expect(node).toMatchSnapshot()
  })
})

describe('parse', () => {
  it('should parse element (no children, no attributes)', () => {
    const node = parse(`<div></div>`)

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(1)
    expect(node.children[0].type).toBe('Element')
    expect(node).toMatchSnapshot()
  })

  it('should parse element (no children)', () => {
    const node = parse(`<div class=foo style="color: red;" data-text="\\">" required data-empty=""></div>`)

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(1)
    expect(node.children[0].type).toBe('Element')
    
    const div = node.children[0] as any
    expect(div.attributes).toHaveLength(5)
    expect(div.attributes[0].name).toBe('class')
    expect(div.attributes[1].name).toBe('style')
    expect(div.attributes[2].name).toBe('data-text')
    expect(div.attributes[3].name).toBe('required')
    expect(div.attributes[4].name).toBe('data-empty')
    
    expect(div.attributes[0].value).toBe('foo')
    expect(div.attributes[1].value).toBe('color: red;')
    expect(div.attributes[2].value).toBe('">')
    expect(div.attributes[3].value).toBe(undefined)
    expect(div.attributes[4].value).toBe('')
    
    expect(node).toMatchSnapshot()
  })

  it('should parse elements', () => {
    const node = parse(`
      <my-component>
        <div />
        <span />
      </my-component>
      <MyComponent>
        <img>
        <img />
        <hr>
      </MyComponent>
    `)

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(5)
    const first = node.children[1] as any
    expect(first.children).toHaveLength(5)
    const second = node.children[3] as any
    expect(second.children).toHaveLength(7)
    expect(node).toMatchSnapshot()
  })
  it('should parse directives', () => {
    const node = parse(
      `<fetch 
          v-on:start.delayed="onStart"
          v-bind:delay="20"
          :url="'//example.com'"
          @end.immediate.force.example="done = $event">
        <template #default>
          <span>Loading</span>
        </template>
        <template #done="{ data, ...response }">
          <span v-for="({ name, value, ...item }, index) in data">{{ name }} {{ value }}</span>
        </template>
        <template v-slot:done="{ status: { message, error, ...args } }">
          <span>{{ message }}</span>
        </template>
      </fetch>`)

    expect(node).toBeTruthy()
    expect(node.children).toHaveLength(1)
    const fetch = node.children[0] as any
    expect(fetch.children).toHaveLength(7)
    expect(node).toMatchSnapshot()
  })
})
