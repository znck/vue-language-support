import { ParserOptions } from '@babel/parser'
import {
  mergeOptions,
  parse as parseJS,
  parseExpression as parseExpressionJS,
} from './javascript'

export function parse(source: string, options?: ParserOptions) {
  return parseJS(source, mergeOptions({ plugins: ['typescript'] }, options))
}

export function parseExpression(source: string, options?: ParserOptions) {
  return parseExpressionJS(
    source,
    mergeOptions({ plugins: ['typescript'] }, options)
  )
}
