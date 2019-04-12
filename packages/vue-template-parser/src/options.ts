import { ElementNode, Position, Range, NamespaceType } from './node'
import { Expression } from '@babel/types'
import { parseExpression } from '@babel/parser'
import { ParserErrorCode } from './error-codes'
import { isElement, isAttribute } from './helpers'

function getNamedCharacterReferences() {
  const rawData = require('./named-character-references.json')

  const references: Record<string, string> = {}

  for (const name in rawData) {
    references[name] = rawData[name].characters
  }

  return references
}

/**
 * Parser Configuration Options
 */
export interface ParserOptions {
  /**
   * Checks whether a tag is self closing or not (e.g. img, br, hr)
   * @param tag - Tag name
   */
  isVoidTag(tag: string): boolean
  /**
   * Finds namespace for current tag, which is used to choose a text
   * parsing mode.
   * @param tag - Tag name
   * @param parent - Parent node
   */
  getNamespace(tag: string, parent?: ElementNode): NamespaceType
  /**
   * Delimiters for string interpolation.
   */
  delimiters: [string, string]
  /**
   * HTML entities, e.g. &amp;
   * @see https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references
   */
  namedCharacterReferences: Record<string, string>
  /**
   * Error listener.
   * @param code - Error code
   * @param position - Error position in source
   * @param range - Un-parsed source range
   * @param innerError - Error object for third-party errors (e.g. in parseExpression)
   */
  onError(
    code: ParserErrorCode,
    position: Position,
    range: Range,
    innerError?: Error
  ): void
  /**
   * Parse to JavaScript AST using babel.
   * @param code - Expression code embedded in template
   */
  parseExpression(code: string): Expression | undefined
}

export const defaultOptions: ParserOptions = {
  delimiters: ['{{', '}}'],
  /**
   * @see https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
   */
  getNamespace(tagName, parent) {
    let namespace = isElement(parent) ? parent.namespace : NamespaceType.HTML

    if (isElement(parent)) {
      if (parent.tagName === 'annotation-xml') {
        if (tagName === 'svg') return NamespaceType.SVG
        if (
          parent.attributes.some(
            attribute =>
              isAttribute(attribute) &&
              attribute.name === 'encoding' &&
              (attribute.value === 'text/html' ||
                attribute.value === 'application/xml+html')
          )
        ) {
          namespace = NamespaceType.HTML
        }
      } else if (
        /^m(?:[ions]|text)$/.test(parent.tagName) &&
        /^m(glyph|alignmark)$/.test(tagName)
      ) {
        namespace = NamespaceType.HTML
      }

      if (
        namespace === NamespaceType.SVG &&
        /^(foreignObject|desc|title)$/.test(parent.tagName)
      ) {
        namespace = NamespaceType.HTML
      }
    }

    if (namespace === NamespaceType.HTML) {
      if (tagName === 'svg') return NamespaceType.SVG
      if (tagName === 'math') return NamespaceType.MATH_ML
    }

    return namespace
  },
  isVoidTag(tag) {
    // area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
    return /^(area|base|col|embed|img|input|link|meta|param|source|track|(b|h|wb)r)$/.test(
      tag
    )
  },
  namedCharacterReferences: getNamedCharacterReferences(),
  onError() {},
  parseExpression,
}
