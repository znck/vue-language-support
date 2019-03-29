export const enum ErrorCode {
  UNIMPLEMENTED = 0,
  BABEL_PARSE_ERROR,
  BABEL_UNEXPECTED_DEFAULT_EXPORT,
  BABEL_UNEXPECTED_VUE_EXTEND_ARGUMENT,
}

export default class CustomError extends Error {
  code: ErrorCode
  prevError?: Error

  constructor(code: ErrorCode, message: string, prevError?: Error) {
    super(message)

    this.code = code
    this.prevError = prevError
  }
}
