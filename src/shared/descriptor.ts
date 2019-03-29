import { parse as parseSFC, SFCBlock } from '@vue/component-compiler-utils'
// TODO: Check if it can depend on a fixed version of template compiler.
import * as compiler from 'vue-template-compiler'
import { Prop, getProps } from './babel/props'
import { parse as parseBabel } from './babel/parse'
import CustomError, { ErrorCode } from './errors'
import { getComponentOptions } from './babel/options'
import * as fs from 'fs-extra'
import { areObjectsEqual, getComponentNameFromFilename } from './utils'
import { ComponentMeta, getComponents } from './babel/components'
import { error } from './notify'

export interface ComponentDescriptor {
  name: string
  attrsTarget: string | null
  props: Prop[]
  components: ComponentMeta[]
  stale?: boolean
  template: SFCBlock | null
  script: SFCBlock | null
}

// TODO: Use cache.
const CACHE: Record<string, ComponentDescriptor> = {}

export async function refreshDescriptor(document: Document) {
  if (CACHE[document.fileName]) {
    CACHE[document.fileName].stale = true
  }

  return getDescriptor(document)
}

export interface Document {
  fileName: string
  getText(): string | Promise<string>
}

export async function getDescriptorForFile(fileName: string) {
  return getDescriptor({
    fileName: fileName,
    async getText() {
      const buffer = await fs.readFile(fileName)

      return buffer.toString()
    },
  })
}

export async function getDescriptor(document: Document) {
  const filename = document.fileName

  if (filename in CACHE && !CACHE[filename].stale) {
    return CACHE[filename]
  }

  const { template, script } = parseSFC({
    filename,
    compiler: compiler as any,
    source: await document.getText(),
  })

  const oldComponent = CACHE[filename] || {}
  const component: ComponentDescriptor = {
    ...oldComponent,
    name: getComponentNameFromFilename(filename),
    template,
    script,
  }

  // Template Processing
  // if (template) {
  //   if (!areObjectsEqual(template, oldComponent.template)) {
  //     const { lang = 'html', content } = template

  //     if (lang !== 'html') {
  //       throw new CustomError(
  //         ErrorCode.UNIMPLEMENTED,
  //         'Only HTML <template> blocks are supported.'
  //       )
  //     }

  //     const ast = await parseTemplate(filename, content)

  //     component.attrsTarget = getTransparentTargetTag(ast)
  //   }
  // } else if (oldComponent.template) {
  //   // Unset.
  //   component.attrsTarget = null
  // }

  // Script Processing
  if (script) {
    if (!areObjectsEqual(script, oldComponent.script)) {
      const { lang = 'js', content } = script

      if (lang !== 'js') {
        throw new CustomError(
          ErrorCode.UNIMPLEMENTED,
          'Only JavaScript <script> blocks are supported.'
        )
      }

      try {
        const ast = await parseBabel(filename, content)
        const options = getComponentOptions(ast)

        component.props = getProps(options, ast)
        component.components = getComponents(filename, options, ast)
      } catch (e) {
        error(e)
      }
    }
  } else if (oldComponent.script) {
    component.props = []
    component.components = []
  }

  CACHE[filename] = component

  return component
}
