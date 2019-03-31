import {
  parse as babelParse,
  parseExpression as babelParseExpression,
  ParserOptions,
  ParserPlugin,
} from '@babel/parser'
import * as T from '@babel/types'

const DEFAULT_OPTIONS: ParserOptions = {
  sourceType: 'module',
  strictMode: false,
  ranges: true,
  tokens: true,
  plugins: [
    'asyncGenerators',
    'bigInt',
    'classPrivateMethods',
    'classPrivateProperties',
    'classProperties',
    'doExpressions',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'functionBind',
    'functionSent',
    'importMeta',
    'jsx',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'throwExpressions',
    'decorators-legacy',
  ],
}

export function mergeOptions(defaults: ParserOptions, options?: ParserOptions) {
  if (!options) return defaults

  return {
    ...defaults,
    ...options,
    plugins: Array.from(
      new Set(
        ([] as ParserPlugin[])
          .concat(options.plugins || [])
          .concat(defaults.plugins || [])
      )
    ),
  } as ParserOptions
}

export function parse(source: string, options?: ParserOptions): T.File {
  return babelParse(source, mergeOptions(DEFAULT_OPTIONS, options))
}

export function parseExpression(
  source: string,
  options?: ParserOptions
): T.Expression {
  return babelParseExpression(source, mergeOptions(DEFAULT_OPTIONS, options))
}
