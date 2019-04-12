import * as Babel from '@babel/types'
import { DirectiveNode } from './node'

export interface TextDirective<T = any> extends DirectiveNode<T> {
  name: 'text'
  content: Babel.Expression
}

export interface HTMLDirective<T = any> extends DirectiveNode<T> {
  name: 'html'
  content: Babel.Expression
}

export interface ShowDirective<T = any> extends DirectiveNode<T> {
  name: 'show'
  condition?: Babel.Expression
}

export interface IfDirective<T = any> extends DirectiveNode<T> {
  name: 'if'
  condition?: Babel.Expression
}

export interface ElseIfDirective<T = any> extends DirectiveNode<T> {
  name: 'else-if'
  condition?: Babel.Expression
}

export interface ElseDirective<T = any> extends DirectiveNode<T> {
  name: 'else'
}

export interface ForDirective<T = any> extends DirectiveNode<T> {
  name: 'for'
  left?: Babel.FunctionExpression['params']
  right?: Babel.Expression
  scopeIdentifiers: string[]
}

export interface OnDirective<T = any> extends DirectiveNode<T> {
  name: 'on'
  shorthand: '@'
  handler?:
    | Babel.Expression
    | Babel.ExpressionStatement
    | Array<Babel.ExpressionStatement>
}

export interface BindDirective<T = any> extends DirectiveNode<T> {
  name: 'bind'
  shorthand: ':'
  value?: Babel.Expression
}

export interface ModelDirective<T = any> extends DirectiveNode<T> {
  name: 'model'
  shorthand: ':'
  value?: Babel.LVal
}

export interface SlotDirective<T = any> extends DirectiveNode<T> {
  name: 'slot'
  shorthand: '#'
  params?: Babel.FunctionExpression['params']
  scopeIdentifiers: string[]
}

export interface PreDirective<T = any> extends DirectiveNode<T> {
  name: 'pre'
  content: string
}
