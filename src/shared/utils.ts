import { camelCase, isEqual } from 'lodash'
import * as Path from 'path'

export function pascalCase(name: string) {
  name = camelCase(name)

  return name[0].toUpperCase() + name.substr(1)
}

export function areObjectsEqual(objectA: any, objectB: any) {
  return isEqual(objectA, objectB)
}


export function getComponentNameFromFilename(
  filename: string,
  extensions = ['vue']
) {
  const basename = Path.basename(filename)

  return basename.replace(new RegExp(`\\.(${extensions.join('|')})$`), '')
}

export enum CompletionItemPriority {
  LOCAL_USER_COMPONENT = '00',
  GLOBAL_USER_COMPONENT = '01',
  CURRENT_COMPONENT_PROPS = '02',
  CURRENT_COMPONENT_ATTRS = '03',
}