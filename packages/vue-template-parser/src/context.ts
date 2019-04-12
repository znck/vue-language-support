import { Expression } from '@babel/types'
import { TextParsingMode } from "./mode";
import { ParserErrorCode } from "./error-codes";
import { isClosingTag } from './utils'
import { ElementNode, Position, Range, Node } from './node'
import { ParserOptions } from './options'
import * as helpers from './helpers'

export interface ParserContext<T> extends ParserOptions {
  source: string
  errors: Array<{ code: ParserErrorCode; position: Position; range: Range }>
  ancestors: Array<ElementNode<T>>
  getParent(): ElementNode<T> | null
  getSibling<T, R extends Node<T>>(fn: <T>(node: Node<T>) => boolean): R | null
  /**
   * Advance parser position cursor
   * @param numberOfCharacter - Number of characters to move cursor forward
   */
  advanceBy(numberOfCharacter: number): string
  /**
   * Advance parser position cursor to next non-space character
   */
  advanceSpaces(): string
  /**
   * Get current position.
   */
  getCurrentPosition(): Position
  /**
   * Get range from given position to current position.
   */
  getCurrentRange(position: Position): Range
  /**
   * Find next position if advanced by given number of characters.
   * @param position - Reference position
   * @param advanceBy - Number of characters to advance.
   */
  calculateNextPosition(position: Position, advanceBy: number): Position
  /**
   * Find character position for character index in the file.
   * @param offset - Index of character in the file
   */
  positionAt(offset: number): Position
  /**
   * Find character offset for position in the file.
   * @param position - Position of character in the file
   */
  offsetAt(position: Position): number
  /**
   * Get text in given range.
   * @param range - Source range
   */
  getText(range?: Range): string
  /**
   * Record error.
   * @param code - Error code
   */
  emitError(code: ParserErrorCode): void
  emitError(code: ParserErrorCode, start: Position): void
  emitError(code: ParserErrorCode, start: Position, end: Position): void
  emitError(
    code: ParserErrorCode,
    start: Position,
    end: Position,
    innerError?: Error
  ): void

  onNodeParsed(node: Node<T>): void
  isTerminalCharacter(mode: TextParsingMode): boolean

  /**
   * Parse to JavaScript AST using babel.
   * @param code - Expression code embedded in template
   */
  parseExpressionWithBabel(code: string, range: Range): Expression | undefined
}

export function createParserContext<T>(
  source: string,
  options: ParserOptions,
  onNodeParsed: (node: Node<T>) => void
): Readonly<ParserContext<T>> {
  const errors: Array<{
    code: ParserErrorCode
    position: Position
    range: Range
    error?: Error
  }> = []
  const lines = source.split(/(\r?\n)/)
  const lineOffsets = [0]
  const ancestors: (ElementNode<T>)[] = []
  // i = (0...n) because offsetAt uses next line offset.
  for (let i = 1; i <= lines.length; ++i) {
    lineOffsets.push(lineOffsets[i - 1] + lines[i - 1].length)
  }
  let currentPosition: Position = { line: 0, character: 0 }
  let remainingSource = source
  const context: ParserContext<T> = {
    ...options,
    errors,
    ancestors,
    getParent() {
      if (ancestors.length) {
        return ancestors[ancestors.length - 1]
      }
      return null
    },
    getSibling(fn) {
      const parent = context.getParent()
      if (helpers.isElement(parent) || helpers.isText(parent)) {
        return (parent.children.reverse().find(node => fn(node)) as any) || null
      }
      return null
    },
    parseExpressionWithBabel(code, range) {
      try {
        return options.parseExpression(code)
      } catch (e) {}
    },
    onNodeParsed,
    emitError(code, start?: Position, end?: Position, innerError?: Error) {
      if (!start) {
        start = currentPosition
        end = context.calculateNextPosition(currentPosition, 1)
      } else if (!end) {
        end = currentPosition
      }
      const error = {
        code,
        position: currentPosition,
        range: { start, end },
        error: innerError,
      }
      errors.push(error)
      options.onError(error.code, error.position, error.range, innerError)
    },
    get position() {
      return currentPosition
    },
    get source() {
      return remainingSource
    },
    advanceBy(characters) {
      const nextPosition = context.calculateNextPosition(
        currentPosition,
        characters
      )
      const prevOffset = context.offsetAt(currentPosition)
      const nextOffset = context.offsetAt(nextPosition)
      currentPosition = nextPosition
      remainingSource = source.substr(nextOffset)
      return source.substring(prevOffset, nextOffset)
    },
    advanceSpaces() {
      const match = /^\s+/.exec(remainingSource)
      return match ? context.advanceBy(match[0].length) : ''
    },
    getCurrentPosition() {
      return { ...currentPosition }
    },
    getCurrentRange(position) {
      return {
        start: { ...position },
        end: context.getCurrentPosition(),
      }
    },
    calculateNextPosition(prevPosition: Position, characters: number) {
      const prevOffset = context.offsetAt(prevPosition)
      const nextOffset = prevOffset + characters
      return context.positionAt(nextOffset)
    },
    positionAt(offset) {
      offset = Math.min(Math.max(0, offset), source.length)
      let low = 0
      let high = lines.length
      while (low < high) {
        let mid = low + Math.floor((high - low) / 2)
        const offsetAtMid = lineOffsets[mid]
        if (offsetAtMid <= offset) {
          low = mid + 1
        } else {
          high = mid
        }
      }
      const line = low - 1
      return {
        line,
        character: offset - lineOffsets[line],
      }
    },
    offsetAt(position) {
      if (position.line >= lines.length) return 0
      if (position.line < 0) return 0
      const offset = lineOffsets[position.line]
      const nextLineOffset =
        position.line < lines.length
          ? lineOffsets[position.line + 1]
          : source.length
      return Math.max(
        Math.min(offset + position.character, nextLineOffset),
        offset
      )
    },
    getText(range) {
      if (!range) {
        return source
      }
      return source.substring(
        context.offsetAt(range.start),
        context.offsetAt(range.end)
      )
    },
    isTerminalCharacter(mode) {
      switch (mode) {
        case TextParsingMode.DATA:
          if (remainingSource.startsWith('</')) {
            const tags = Array.from(
              new Set(ancestors.map(ancestor => ancestor.tagName))
            ).join('|')
            if (isClosingTag(remainingSource, tags)) return true
          }
          break
        case TextParsingMode.CDATA:
        case TextParsingMode.RCDATA:
          const parent = context.getParent()
          if (parent && isClosingTag(remainingSource, parent.tagName)) {
            return true
          }
          break
        case TextParsingMode.CDATA:
          if (remainingSource.startsWith(']]>')) return true
          break
      }
      return !remainingSource
    },
  }
  return context
}
