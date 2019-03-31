import * as Path from 'path'
import { kebabCase, camelCase } from 'lodash'
import {
  ComponentDescriptor,
  PropDescriptor,
  ComponentRegistrationDescriptor,
} from './descriptor'

export interface DescriptorBuilderOptions {
  fileName?: string
  resolve(path: string): string
}

export class DescriptorBuilder {
  options: DescriptorBuilderOptions
  component: ComponentDescriptor
  constructor(options: DescriptorBuilderOptions) {
    this.options = options
    const name = options.fileName
      ? getComponentNameFromFilename(options.fileName)
      : 'anonymous-component'
    this.component = {
      name,
      pascalName: pascalCase(name),
      fileName: options.fileName,
      tags: {},
      props: {},
      components: {},
    }
  }
  addProp({ name, ...others }: Partial<PropDescriptor>): PropDescriptor {
    if (!name) {
      throw new Error(`[builder#createProp] Name is required for prop.`)
    }
    const prop = {
      name,
      required: false,
      tags: {},
      ...others,
      kebabName: kebabCase(name),
    }
    this.component.props[name] = prop
    return prop
  }
  addComponentRegistration(
    options: Pick<ComponentRegistrationDescriptor, 'name' | 'fileName' | 'loc'>
  ): ComponentRegistrationDescriptor {
    const component: ComponentRegistrationDescriptor = {
      type: options.fileName ? 'external' : 'inline',
      pascalName: pascalCase(options.name),
      ...options,
    }
    if (options.fileName) {
      component.absolutePath = this.options.resolve(options.fileName)
    }
    this.component.components[component.pascalName] = component
    return component
  }
}

function getComponentNameFromFilename(fileName: string) {
  return camelCase(Path.basename(fileName).replace(/\.vue$/, ''))
}

function pascalCase(name: string) {
  return name[0].toUpperCase() + name.substr(1)
}
