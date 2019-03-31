import { camelCase } from 'lodash'

export function pascalCase(input: string) {
  const output = camelCase(input)

  return output[0].toUpperCase() + output.substr(1)
}
