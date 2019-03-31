import {  parseComponent, SFCParserOptions } from 'vue-template-compiler'

export function parse(source: string, options?: SFCParserOptions) {
  return parseComponent(source, options)
}
