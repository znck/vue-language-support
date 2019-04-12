import * as Babel from '@babel/types'

/**
 * A character location in file.
 */
export interface Position {
  /**
   * 0-indexed line number
   */
  line: number
  /**
   * 0-indexed character number
   */
  character: number
}

/**
 * Text selection in source file
 */
export interface Range {
  /**
   * Starting position
   */
  start: Position
  /**
   * Ending position
   */
  end: Position
}

/**
 * Syntactic unit in the syntax tree of the source
 */
export interface Node<T extends Data = any> {
  type: string
  range: Range
  data?: T
}

/**
 * Custom information stored by ecosystem
 */
export interface Data {}

/**
 * The root container node. (akin to <template> block in SFC)
 */
export interface RootNode<T = any> extends Node<T> {
  type: 'Root'
  children: ElementChildNode<T>[]
}

export type ElementChildNode<T> = ElementNode<T> | TextNode<T> | CommentNode<T>

export enum NamespaceType {
  HTML = 'html',
  SVG = 'svg',
  MATH_ML = 'math',
}

/**
 * Native HTML Element or <slot> or <template>
 */
export interface ElementNode<T = any> extends Node<T> {
  type: 'Element'
  tagName: string
  tagType: 'element' | 'component' | 'template' | 'slot'
  namespace: NamespaceType
  attributes: Array<AttributeNode<T> | DirectiveNode<T>>
  children: ElementChildNode<T>[]
  isSelfClosing?: boolean
}

export interface AttributeNode<T = any> extends Node<T> {
  type: 'Attribute'
  name: string
  value?: string
  quotes?: string
}

export interface Slot<T = any> extends Node<T> {
  type: 'Slot'
  name: string
  scopeIdentifiers: string[]
  children: Node<T>[]
}

export interface DirectiveNode<T = any> extends Node<T> {
  type: 'Directive'
  name: string
  isShorthand: boolean
  argument?: DirectiveArgument<T>
  modifiers: Array<DirectiveModifier<T>>
  expression?: DirectiveExpression<T>
}

export interface DirectiveArgument<T = any> extends Node<T> {
  type: 'DirectiveArgument'
  isExpression: boolean
  value: string
  argument?: Babel.Expression
}

export interface DirectiveExpression<T = any> extends Node<T> {
  type: 'DirectiveExpression'
  quotes?: string
  value: string
}

export interface DirectiveModifier<T = any> extends Node<T> {
  type: 'DirectiveModifier'
  name: string
}

export interface TextNode<T = any> extends Node<T> {
  type: 'Text'
  children: Array<
    LiteralNode<T> | InterpolationNode<T> | CharacterReferenceLiteralNode<T>
  >
}

export interface LiteralNode<T = any> extends Node<T> {
  type: 'Literal'
  value: string
}

export interface CharacterReferenceLiteralNode<T = any> extends Node<T> {
  type: 'CharacterReferenceLiteral'
  value: string
  referenceType: 'named' | 'hex' | 'numeric'
}

export interface InterpolationNode<T = any> extends Node<T> {
  type: 'Interpolation'
  value: string
  expression?: Babel.Expression
}

export interface CommentNode<T = any> extends Node<T> {
  type: 'Comment'
  content: string
  isBogus?: boolean
}
