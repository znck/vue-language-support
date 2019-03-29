import {
  DefinitionProvider,
  Range,
  Location,
  Uri,
  Position,
  workspace,
} from 'vscode'
import { getDescriptor } from '../shared/descriptor'
import {
  getGlobalComponentNames,
  getGlobalComponentFileName,
} from '../shared/global-components'
import { error } from '../shared/notify'
import { pascalCase } from '../shared/utils'
import CustomError, { ErrorCode } from '../shared/errors'
import * as fs from 'fs-extra'

export const ComponentDefinitionProvider: DefinitionProvider = {
  async provideDefinition(document, position) {
    const range = document.getWordRangeAtPosition(position, /<[a-zA-Z0-9-_]+/)

    if (range) {
      if (!document.getText(range).startsWith('<')) {
        return []
      }
    } else {
      return []
    }

    try {
      const descriptor = await getDescriptor(document)

      if (descriptor) {
        if (descriptor.template) {
          const templateRange = new Range(
            document.positionAt(descriptor.template.start),
            document.positionAt(descriptor.template.end)
          )

          if (templateRange.contains(position)) {
            const tag = parseTag(document.getText(range))

            const component = descriptor.components.find(
              component => component.normalizedName === tag
            )

            if (component) {
              return [
                {
                  targetUri: Uri.file(component.fileName!),
                  targetRange: await getFullRange(component.fileName!),
                },
              ]
            }

            const globalComponent = getGlobalComponentFileName(tag)

            if (globalComponent) {
              return [
                {
                  targetUri: Uri.file(globalComponent),
                  targetRange: await getFullRange(globalComponent),
                },
              ]
            }
          }
        }
      }
    } catch (e) {
      error(e)
    }

    return []
  },
}

function parseTag(source: string) {
  return pascalCase(source.replace(/^</, ''))
}

async function getFullRange(fileName: string) {
  const buffer = await fs.readFile(fileName)
  const text = buffer.toString()
  const lines = text.split(/\r?\n/)

  const range = new Range(
    new Position(0, 0),
    new Position(lines.length - 1, lines[lines.length - 1].length - 1)
  )

  return range
}
