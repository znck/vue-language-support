import { parse as parseAsync } from '@vue/experimental-template-parser/src/parser'
import * as options from '@vue/experimental-template-parser/src/parser/options/standard'

export async function parse(filename: string, source: string) {
  return parseAsync(source, options)
}
