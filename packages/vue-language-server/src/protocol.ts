import { TextDocument } from 'vscode-languageserver'
import { RequestType, RequestType0, ResponseError } from 'vscode-jsonrpc'
import { Configuration } from './configuration'
export { Configuration }

export class SyncGlobalComponents extends RequestType0<
  { fileNames: string[] },
  ResponseError<{}>,
  {}
> {
  constructor() {
    super('$/syncGlobalComponent')
  }
}

export class GetFileRequest extends RequestType<
  { fileName: string },
  {
    uri: string
    languageId: string
    version: number
    content: string
  },
  ResponseError<{}>,
  {}
> {
  constructor() {
    super('$/getFile')
  }
}
