import * as babel from '@babel/types'

import { createParserContext, ParserContext } from './context'
import { ParserOptions, defaultOptions } from './options'
import { ParserErrorCode } from './error-codes'
import * as directive from './directive'
import * as helpers from './helpers'
import * as utils from './utils'
import * as node from './node'
import { TextParsingMode } from './mode'

export const types = helpers

export function parse<T = any>(
  source: string,
  options?: Partial<
    ParserOptions & {
      onNodeParsed(
        node: node.Node<T>,
        root: node.RootNode<T>,
        context: ParserContext<T>
      ): void
    }
  >
): node.RootNode<T> {
  const context = createParserContext<T>(
    source,
    { ...defaultOptions, ...options },
    node => {
      if (options && options.onNodeParsed) {
        options.onNodeParsed(node, root, context)
      }
    }
  )

  const root: node.RootNode<T> = {
    type: 'Root',
    children: parseChildrenNodes(context),
    range: {
      start: context.positionAt(0),
      end: context.positionAt(source.length),
    },
  }

  return root
}

export function parseText<T = any>(
  source: string,
  options?: Partial<
    ParserOptions & {
      onNodeParsed(node: node.Node<T>, context: ParserContext<T>): void
    }
  >
): node.TextNode<T> {
  const context = createParserContext<T>(
    source,
    { ...defaultOptions, ...options },
    node => {
      if (options && options.onNodeParsed) {
        try {
          options.onNodeParsed(node, context)
        } catch (e) {
          console.error(e)
        }
      }
    }
  )

  return parseTextNode(context, TextParsingMode.DATA)
}

function parseChildrenNodes<T>(
  context: ParserContext<T>,
  mode: TextParsingMode = TextParsingMode.DATA
): Array<node.ElementChildNode<T>> {
  const nodes: node.ElementChildNode<T>[] = []

  while (!context.isTerminalCharacter(mode)) {
    const { source } = context
    let node: node.ElementChildNode<T> | null = null

    // |> Is comment or tag (element|component)?
    if (mode === TextParsingMode.DATA && utils.isPrefix(source, '<')) {
      if (utils.isPrefix(source, '<![CDATA[')) {
        const result = parseCDATA(context)

        if (result) nodes.push(...result)
      } else {
        node = parseElementLike(context, mode)
      }
    }
    // |> Parse as text.
    else {
      node = parseTextNode(context, mode)
    }

    if (node) nodes.push(node!)
  }

  return nodes
}

function parseElement<T>(
  context: ParserContext<T>,
  mode: TextParsingMode = TextParsingMode.DATA
): node.ElementNode<T> | null {
  if (!utils.isPrefix(context.source, '<') || !/<[a-z]/i.test(context.source)) {
    return null
  }

  const start = context.getCurrentPosition()
  const node = parseOpeningTag(context, mode)

  if (!node) return null

  context.ancestors.push(node)

  if (!node.isSelfClosing) {
    node.children = parseChildrenNodes(
      context,
      utils.getTextParsingMode(node.tagName, node.namespace)
    )

    parseClosingTag(context) // advance closing tag.
  }

  node.range = context.getCurrentRange(start)

  context.ancestors.pop() // remove it self

  return node
}

function parseOpeningTag<T>(
  context: ParserContext<T>,
  mode: TextParsingMode = TextParsingMode.DATA
): node.ElementNode<T> | null {
  if (!utils.isPrefix(context.source, '<') || !/<[a-z]/i.test(context.source)) {
    return null
  }

  const start = context.getCurrentPosition()
  const [openText, tagName] = /^<([a-z0-9-]+)/i.exec(context.source)!

  context.advanceBy(openText.length)

  const attributes: (node.AttributeNode<T> | node.DirectiveNode<T>)[] = []
  const attributeNames = new Set()

  // GOTO first non-space character
  context.advanceSpaces()
  while (
    context.source &&
    !utils.isPrefix(context.source, '>') &&
    !utils.isPrefix(context.source, '/>')
  ) {
    if (utils.isPrefix(context.source, '/')) {
      context.emitError(ParserErrorCode.UNEXPECTED_SOLIDUS_IN_TAG)
      context.advanceBy(1)
    } else {
      let name = ''
      const attr = parseAttributeLike(context)

      if (helpers.isAttribute(attr)) {
        name = attr.name
        attributes.push(attr)
      } else if (helpers.isDirective(attr)) {
        const { argument } = attr

        if (argument && !argument.isExpression) {
          name = argument.value
        }
        attributes.push(attr)
      }

      if (name) {
        if (attributeNames.has(name)) {
          context.emitError(
            ParserErrorCode.DUPLICATE_ATTRIBUTE,
            attr!.range.start,
            attr!.range.end
          )
        } else {
          attributeNames.add(name)
        }
      }
    }

    context.advanceSpaces()
  }

  let isSelfClosing = context.isVoidTag(tagName)

  if (utils.isPrefix(context.source, '/>')) {
    isSelfClosing = true
    context.advanceBy('/>'.length)
  } else if (utils.isPrefix(context.source, '>')) {
    context.advanceBy('>'.length)
  } else {
    context.emitError(ParserErrorCode.EOF_IN_CLOSING_TAG)
  }

  let tagType: node.ElementNode['tagType'] = 'element'

  switch (tagName) {
    case 'slot':
      tagType = 'slot'
      break
    case 'template':
      tagType = 'template'
      break
    default:
      if (!/^[a-z0-9]+$/.test(tagName) || !utils.isReservedTag(tagName)) {
        tagType = 'component'
      }
  }

  return {
    type: 'Element',
    tagName,
    tagType,
    isSelfClosing,
    attributes,
    children: [],
    namespace: context.getNamespace(tagName),
    range: context.getCurrentRange(start),
  }
}

function parseAttributeLike<T>(context: ParserContext<T>) {
  const node = parseDirective(context) || parseAttribute(context)

  if (node) {
    context.onNodeParsed(node)
  }

  return node
}

const directiveShorthand = {
  '#': 'slot',
  ':': 'bind',
  '@': 'on',
}
function parseDirective<T>(
  context: ParserContext<T>
): node.DirectiveNode<T> | null {
  if (!/^(v-|:|@|#)/.test(context.source)) return null

  const start = context.getCurrentPosition()

  if (/^(v-|:|@|#)$/.test(context.source)) {
    context.advanceBy(context.source.length)
    context.emitError(ParserErrorCode.EOF_IN_DIRECTIVE, start)

    return null
  }

  let name: string
  let isShorthand = false
  if (utils.isPrefix(context.source, 'v-')) {
    context.advanceBy('v-'.length)
    const [text] = /^[a-z0-9-]+/.exec(context.source)!
    name = text
    context.advanceBy(text.length)

    if (utils.isPrefix(context.source, ':')) {
      context.advanceBy(1)
    }
  } else {
    name = directiveShorthand[context.source[0]]
    isShorthand = true
    context.advanceBy(1) // : or @ or #
  }

  let argument: node.DirectiveArgument<T> | undefined = undefined
  if (!utils.isPrefix(context.source, '.')) {
    const start = context.getCurrentPosition()
    let isBracketed = false
    let endIndex = -1
    if (utils.isPrefix(context.source, '[')) {
      context.advanceBy(1)
      isBracketed = true
      endIndex = context.source.indexOf(']')

      if (endIndex < 0) {
        const match = /[\t\r\n\f =/>]/.exec(context.source)

        if (match) endIndex = match.index
        else endIndex = context.source.length
      }
    } else {
      const match = /^[^\t\r\n\f =./>]+/.exec(context.source)

      if (match) endIndex = match[0].length
    }

    if (endIndex >= 0) {
      const value = context.advanceBy(endIndex)
      if (isBracketed && utils.isPrefix(context.source, ']'))
        context.advanceBy(1)
      const range = context.getCurrentRange(start)

      argument = {
        type: 'DirectiveArgument',
        value,
        argument: isBracketed
          ? context.parseExpressionWithBabel(value, range)
          : undefined,
        isExpression: isBracketed,
        range,
      }
    }
  }

  const modifiers: node.DirectiveModifier<T>[] = []
  while (utils.isPrefix(context.source, '.')) {
    context.advanceBy(1)

    const match = /^[a-z0-9]+(?=[=.\s\/>])/i.exec(context.source)
    const start = context.getCurrentPosition()

    if (match) {
      context.advanceBy(match[0].length)
      modifiers.push({
        type: 'DirectiveModifier',
        name: match[0],
        range: context.getCurrentRange(start),
      })
    } else {
      if (!context.source) {
        context.emitError(ParserErrorCode.EOF_IN_DIRECTIVE)
      } else {
        while (!/^[=.\s\/>]/.test(context.source)) {
          context.advanceBy(1)
        }

        context.emitError(ParserErrorCode.ILLEGAL_DIRECTIVE_MODIFIER, start)
      }
    }
  }

  let expression: node.DirectiveExpression<T> | undefined = undefined

  if (utils.isPrefix(context.source, '=')) {
    context.advanceBy(1) // =

    const start = context.getCurrentPosition()
    let quotes: string | undefined = undefined

    // Check quotes.
    if (/^["']/.test(context.source)) quotes = context.source[0]

    const value = parseAttributeValue(context)

    expression = {
      type: 'DirectiveExpression',
      value,
      quotes,
      range: context.getCurrentRange(start),
    }
  }

  const node: node.DirectiveNode<T> = {
    type: 'Directive',
    name,
    isShorthand,
    argument,
    expression,
    modifiers,
    range: context.getCurrentRange(start),
  }

  if (node.expression) {
    switch (node.name) {
      case 'for':
        {
          const [left, right] = node.expression.value.split(/\sin\s/)
          ;(<directive.ForDirective>node).left = (<
            babel.ArrowFunctionExpression
          >context.parseExpressionWithBabel(`${left} => {}`, {
            start: node.expression.range.start,
            end: context.calculateNextPosition(
              node.expression.range.start,
              left.length
            ),
          })).params
          ;(<directive.ForDirective>(
            node
          )).right = context.parseExpressionWithBabel(right, {
            start: context.calculateNextPosition(
              node.expression.range.start,
              left.length + 4
            ),
            end: node.expression.range.end,
          })
          ;(<directive.ForDirective>(
            node
          )).scopeIdentifiers = utils.findIdentifiers(
            (<directive.ForDirective>node).left
          )
        }
        break
      case 'if':
        ;(<directive.IfDirective>(
          node
        )).condition = context.parseExpressionWithBabel(
          node.expression.value,
          node.expression.range
        )
        break
      case 'else-if':
        ;(<directive.ElseIfDirective>(
          node
        )).condition = context.parseExpressionWithBabel(
          node.expression.value,
          node.expression.range
        )
        break
      case 'show':
        ;(<directive.ShowDirective>(
          node
        )).condition = context.parseExpressionWithBabel(
          node.expression.value,
          node.expression.range
        )
        break
      case 'on':
        ;(<directive.OnDirective>(
          node
        )).handler = context.parseExpressionWithBabel(
          node.expression.value,
          node.expression.range
        )
        break
      case 'bind':
        ;(<directive.BindDirective>(
          node
        )).value = context.parseExpressionWithBabel(
          node.expression.value,
          node.expression.range
        )
        break
      case 'model':
        if (node.expression.value.trim()) {
          ;(<directive.ModelDirective>node).value = (<
            babel.AssignmentExpression
          >context.parseExpressionWithBabel(
            `${node.expression.value} = 0`,
            node.expression.range
          )).left
        }
        break
      case 'slot':
        if (node.expression.value.trim()) {
          const { params } =
            <babel.FunctionExpression>(
              context.parseExpressionWithBabel(
                `function (${node.expression.value}) {}`,
                node.expression.range
              )
            ) || ({} as any)
          ;(<directive.SlotDirective>node).params = params
          ;(<directive.SlotDirective>(
            node
          )).scopeIdentifiers = utils.findIdentifiers(params)
        }
        break
    }
  }

  return node
}

function parseAttribute<T>(
  context: ParserContext<T>
): node.AttributeNode<T> | null {
  if (!/^[^\t\r\n\f />]/.test(context.source)) return null

  const start = context.getCurrentPosition()
  const [name] = /^[^\t\r\n\f />][^\t\r\n\f =/>]*/.exec(context.source)!

  context.advanceBy(name.length)
  if (utils.isPrefix(name, '=')) {
    context.emitError(
      ParserErrorCode.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE,
      start,
      context.calculateNextPosition(start, name.length)
    )
    return null
  }

  let value: string | undefined = undefined
  let quotes: string | undefined = undefined
  if (utils.isPrefix(context.source, '=')) {
    context.advanceBy(1) // =

    // Check quotes.
    if (/^["']/.test(context.source)) quotes = context.source[0]

    value = parseAttributeValue(context)
  }

  return {
    type: 'Attribute',
    name,
    value,
    quotes,
    range: context.getCurrentRange(start),
  }
}

function parseAttributeValue<T>(context: ParserContext<T>): string {
  const re = /^[\t\r\n\f />]/
  const { source } = context
  const isQuoted = /^["']/.test(source)
  const quoteType = source[0]

  const maxLen = source.length
  let len = 0
  if (isQuoted) {
    ++len

    while (len < maxLen && quoteType !== source[len]) {
      if (source[len] === '\\' && source[len + 1] === quoteType) ++len

      ++len
    }

    if (len === maxLen) {
      context.emitError(ParserErrorCode.EOF_IN_ATTRIBUTE)
    } else {
      ++len
    }
  } else {
    while (len < maxLen && !re.test(source.substr(len))) ++len
  }

  let value = context.advanceBy(len)

  if (isQuoted) {
    value = value.substring(1, value.length - 1)
    value = value.replace(new RegExp(`\\\\${quoteType}`, 'g'), quoteType)
  }

  return value
}

function parseClosingTag<T>(
  context: ParserContext<T>
): node.ElementNode<T> | null {
  if (!utils.isPrefix(context.source, '</')) {
    return null
  }

  const node = context.getParent()

  if (node) {
    if (!utils.isPrefix(context.source, `</${node.tagName}`)) return null

    context.advanceBy(`</${node.tagName}`.length)
    context.advanceSpaces()

    if (context.source) {
      const len = utils.minIndex(
        context.source.indexOf('>'),
        context.source.length
      )

      context.advanceBy(len)
      if (utils.isPrefix(context.source, '>')) {
        context.advanceBy(1)
        return null
      }
    }

    context.emitError(ParserErrorCode.EOF_IN_CLOSING_TAG)
  }

  return null
}

function parseElementLike<T>(
  context: ParserContext<T>,
  mode: TextParsingMode = TextParsingMode.DATA
): node.ElementNode<T> | node.CommentNode<T> | null {
  const { source } = context
  const start = context.getCurrentPosition()

  if (utils.isPrefix(source, '<!--')) {
    return parseComment(context)
  } else if (utils.isPrefix(source, '<!DOCTYPE')) {
    return parseBogusComment(context)
  } else if (/^<[A-Za-z0-9-]/.test(source)) {
    return parseElement(context, mode)
  } else if (utils.isPrefix(source, '</')) {
    if (source === '</') {
      context.advanceBy('</'.length)
      context.emitError(ParserErrorCode.EOF_BEFORE_TAG_NAME, start)
    } else if (utils.isPrefix(source, '</>')) {
      context.advanceBy('</>'.length)
      context.emitError(ParserErrorCode.MISSING_END_TAG_NAME, start)
    } else if (/^<\/[a-z]/.test(source)) {
      const node = parseBogusComment(context)

      context.emitError(ParserErrorCode.UNEXPECTED_END_TAG, start)

      return node
    } else {
      context.emitError(
        ParserErrorCode.INVALID_FIRST_CHARACTER_IN_TAG_NAME,
        context.calculateNextPosition(start, 1)
      )

      return parseBogusComment(context)
    }
  }

  return null
}

function parseCDATA<T>(context: ParserContext<T>) {
  if (!utils.isPrefix(context.source, '<![CDATA[')) return null
  context.advanceBy('<![CDATA['.length)

  const nodes = parseChildrenNodes(context, TextParsingMode.CDATA)

  if (utils.isPrefix(context.source, ']]>')) {
    context.advanceBy(']]>'.length)
  } else if (!context.source) {
    context.emitError(ParserErrorCode.EOF_IN_CDATA)
  }

  return nodes
}

function parseComment<T>(
  context: ParserContext<T>
): node.CommentNode<T> | null {
  if (!utils.isPrefix(context.source, '<!--')) return null

  const start = context.getCurrentPosition()

  context.advanceBy('<!--'.length)

  const len = utils.minIndex(
    context.source.indexOf('-->'),
    context.source.indexOf('--!>'),
    context.source.length
  )

  let content = ''

  // <!-->
  if (utils.isPrefix(context.source, '>')) {
    context.advanceBy(1)
    context.emitError(ParserErrorCode.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
  }
  // <!--->
  else if (utils.isPrefix(context.source, '->')) {
    context.advanceBy(2)
    context.emitError(ParserErrorCode.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
  }
  // <!---
  else if (context.source === '-') {
    context.advanceBy(1)
    context.emitError(ParserErrorCode.EOF_IN_COMMENT)
  }
  // <!--
  else if (!context.source) {
    context.emitError(ParserErrorCode.EOF_IN_COMMENT)
  }
  // <!--...-->
  else {
    content = context.advanceBy(len)
    content = content.replace(/\0/g, String.fromCodePoint(0xfffd))

    // TODO: Report nested comments!

    if (utils.isPrefix(context.source, '-->')) {
      context.advanceBy('-->'.length)
    } else if (utils.isPrefix(context.source, '--!>')) {
      context.emitError(ParserErrorCode.INCORRECTLY_CLOSED_COMMENT)
      context.advanceBy('--!>'.length)
    } else if (!context.source) {
      context.emitError(ParserErrorCode.EOF_IN_COMMENT)
    }
  }

  const node: node.CommentNode<T> = {
    type: 'Comment',
    content,
    range: context.getCurrentRange(start),
  }

  context.onNodeParsed(node)

  return node
}

function parseBogusComment<T>(
  context: ParserContext<T>
): node.CommentNode<T> | null {
  if (!/^<([\!\?]|\/[^a-z>])/i.test(context.source)) return null

  const start = context.getCurrentPosition()
  context.advanceBy(1) // <

  const len = utils.minIndex(context.source.indexOf('>'), context.source.length)

  const content = context.advanceBy(len)

  if (utils.isPrefix(context.source, '>')) {
    context.advanceBy(1)
  }

  const node: node.CommentNode<T> = {
    type: 'Comment',
    content,
    isBogus: true,
    range: context.getCurrentRange(start),
  }

  return node
}

function parseTextNode<T>(
  context: ParserContext<T>,
  mode: TextParsingMode = TextParsingMode.DATA
): node.TextNode<T> {
  const {
    source,
    delimiters: [open],
  } = context
  const start = context.getCurrentPosition()
  let endIndex = utils.minIndex(
    source.indexOf('<', 1),
    mode === TextParsingMode.CDATA ? source.indexOf(']]>') : -1,
    source.length
  )

  const endOffset = context.offsetAt(start) + endIndex
  const children: Array<
    | node.LiteralNode<T>
    | node.CharacterReferenceLiteralNode<T>
    | node.InterpolationNode<T>
  > = []

  while (context.offsetAt(context.getCurrentPosition()) < endOffset) {
    const { source } = context
    let node:
      | node.LiteralNode<T>
      | node.CharacterReferenceLiteralNode<T>
      | node.InterpolationNode<T>
      | null = null
    // |> Parse: {{ ... }}
    if (utils.isPrefix(source, open)) {
      node = parseInterpolation(context)
    }
    // |> Parse: &xxx;
    else if (utils.isPrefix(source, '&')) {
      node = parseCharacterReferenceLiteral(context)
    }

    if (!node) {
      node = parseLiteral(context, mode, endIndex)
    }

    children.push(node)
  }

  const node: node.TextNode<T> = {
    type: 'Text',
    children,
    range: context.getCurrentRange(start),
  }

  context.onNodeParsed(node)

  return node
}

function parseInterpolation<T>(
  context: ParserContext<T>
): node.InterpolationNode<T> {
  const {
    delimiters: [open, close],
  } = context
  const start = context.getCurrentPosition()

  if (utils.isPrefix(context.source, open)) {
    // Advance open tag.
    context.advanceBy(open.length)
  } else {
    throw new Error(
      `Invalid interpolation string at ${context.getCurrentPosition().line}: ${
        context.source
      }`
    )
  }

  let contentLength = utils.minIndex(
    context.source.indexOf(close),
    context.source.length
  )

  const value = context.advanceBy(contentLength)

  if (utils.isPrefix(context.source, close)) {
    context.advanceBy(close.length)
  } else {
    context.emitError(ParserErrorCode.EOF_IN_INTERPOLATION)
  }

  const range = context.getCurrentRange(start)
  const expression = context.parseExpressionWithBabel(value, range) // TODO: Check possible parseErrors.
  const node: node.InterpolationNode<T> = {
    type: 'Interpolation',
    value,
    expression,
    range,
  }

  context.onNodeParsed(node)

  return node
}

function parseLiteral<T>(
  context: ParserContext<T>,
  mode: TextParsingMode,
  maxLength: number
): node.LiteralNode<T> {
  const {
    source,
    delimiters: [open],
  } = context
  let endIndex =
    mode === TextParsingMode.RAWTEXT || mode === TextParsingMode.CDATA
      ? maxLength
      : utils.minIndex(
          maxLength,
          source.indexOf('<'),
          source.indexOf('&'),
          source.indexOf(open)
        )
  const start = context.getCurrentPosition()

  context.advanceBy(endIndex)
  let remainingLength = maxLength - endIndex

  while (
    remainingLength > 0 &&
    context.source &&
    utils.isPrefix(context.source, '&')
  ) {
    const match = /^&((?:[a-z0-9]+|#x[0-9a-f]+|#[0-9]+)(;|(?=\s|\G)))/i.exec(
      context.source
    )
    if (match) {
      const [text, name] = match

      if (!utils.isPrefix(text, '#')) {
        if (
          utils.findCharacterReference(context.namedCharacterReferences, name)
        ) {
          break // named character reference
        } else {
          context.emitError(ParserErrorCode.UNKNOWN_NAMED_CHARACTER_REFERENCE)
        }
      } else {
        break // numeric character reference
      }
    }

    const nextEndIndex = Math.min(
      remainingLength,
      source.indexOf('<'),
      source.indexOf('&'),
      source.indexOf(open)
    )

    context.advanceBy(nextEndIndex)
    remainingLength -= nextEndIndex
  }

  const range = context.getCurrentRange(start)

  const node: node.LiteralNode<T> = {
    type: 'Literal',
    value: context.getText(range),
    range,
  }

  context.onNodeParsed(node)

  return node
}

function parseCharacterReferenceLiteral<T>(
  context: ParserContext<T>
): node.CharacterReferenceLiteralNode<T> | null {
  if (!utils.isPrefix(context.source, '&')) return null

  const start = context.getCurrentPosition()
  const match = /^&((?:[a-z0-9]+|#x[0-9a-f]+|#[0-9]+);?)/i.exec(context.source)
  if (!match) {
    if (utils.isPrefix(context.source, '&#')) {
      // TODO: Handle numeric character reference errors
    } else {
      // TODO: Handle named character reference errors
    }

    return null // Will be captured by text parser.
  }

  const [text, reference] = match
  const value = context.advanceBy(text.length)

  const node: node.CharacterReferenceLiteralNode<T> = {
    type: 'CharacterReferenceLiteral',
    value,
    referenceType: 'named',
    range: context.getCurrentRange(start),
  }

  if (utils.isPrefix(reference, '#x')) {
    node.value = parseCodePoint(
      context,
      node.range,
      parseInt(reference.substr(2), 16)
    )
  } else if (utils.isPrefix(reference, '#')) {
    node.value = parseCodePoint(
      context,
      node.range,
      parseInt(reference.substr(1), 10)
    )
  } else {
    const character = utils.findCharacterReference(
      context.namedCharacterReferences,
      reference
    )

    if (character) node.value = character
    else {
      context.emitError(
        ParserErrorCode.UNKNOWN_NAMED_CHARACTER_REFERENCE,
        start
      )
    }
  }

  if (!reference.endsWith(';')) {
    context.emitError(
      ParserErrorCode.MISSING_SEMICOLON_CHARACTER_REFERENCE,
      start
    )
  }

  context.onNodeParsed(node)

  return node
}

function parseCodePoint<T>(
  context: ParserContext<T>,
  range: node.Range,
  codePoint: number
): string {
  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
  if (codePoint === 0) {
    codePoint = 0xfffd
    context.emitError(
      ParserErrorCode.NULL_CHARACTER_REFERENCE,
      range.start,
      range.end
    )
  } else if (codePoint > 0x10ffff) {
    codePoint = 0xfffd
    context.emitError(
      ParserErrorCode.OUTSIDE_UNICODE_RANGE_CHARACTER_REFERENCE,
      range.start,
      range.end
    )
  } else if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    codePoint = 0xfffd
    context.emitError(
      ParserErrorCode.SURROGATE_CHARACTER_REFERENCE,
      range.start,
      range.end
    )
  } else if (
    (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
    (codePoint & 0xfffe) === 0xfdef
  ) {
    context.emitError(
      ParserErrorCode.NONCHARACTER_CHARACTER_REFERENCE,
      range.start,
      range.end
    )
  } else if (
    (codePoint >= 0x01 && codePoint <= 0x08) ||
    codePoint === 0x0b ||
    (codePoint >= 0x0d && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f)
  ) {
    codePoint = codePointReplacementMap[codePoint] || codePoint
    context.emitError(
      ParserErrorCode.CONTROL_CHARACTER_REFERENCE,
      range.start,
      range.end
    )
  }

  return String.fromCodePoint(codePoint)
}

const codePointReplacementMap = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
}
