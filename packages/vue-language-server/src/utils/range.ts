import { Range, Position } from 'vscode-languageserver'

export function comparePosition(a?: Position, b?: Position) {
  if (!b) return 1
  if (!a) return -1
  if (a.line === b.line) {
    return a.character - b.character
  }
  return a.line - b.line
}
export function createComparisonUtil<T>(compare: (a?: T, b?: T) => number) {
  return {
    eq: (a?: T, b?: T) => compare(a, b) === 0,
    lt: (a?: T, b?: T) => compare(a, b) < 0,
    lte: (a?: T, b?: T) => compare(a, b) <= 0,
    gt: (a?: T, b?: T) => compare(a, b) > 0,
    gte: (a?: T, b?: T) => compare(a, b) >= 0,
  }
}

export const PositionUtility = createComparisonUtil(comparePosition)

export function isSubRange(outer: Range, inner: Range) {
  return (
    PositionUtility.lte(outer.start, inner.start) &&
    PositionUtility.gte(outer.end, inner.end)
  )
}

export function isInRange(range: Range, position: Position) {
  return (
    PositionUtility.lte(range.start, position) &&
    PositionUtility.gte(range.end, position)
  )
}
