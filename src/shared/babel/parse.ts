import { parseAsync, types as T, Node } from '@babel/core'
import CustomError, { ErrorCode } from '../errors'
// TODO: Use cache.
export async function parse(filename: string, source: string): Promise<T.File> {
  // TODO: Use babel config from project root.
  try {
    return (await parseAsync(source, {
      filename,
      sourceType: 'module',
    })) as T.File
  } catch (error) {
    // TODO: Handle error gracefully.
    throw new CustomError(
      ErrorCode.BABEL_PARSE_ERROR,
      `Unexpected error while parsing '${filename}'`,
      error
    )
  }
}
