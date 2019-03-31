import { SourceLocation } from '@babel/types'
import { SFCDescriptor } from 'vue-template-compiler'

export interface ComponentRegistrationDescriptor {
  /**
   * Name used for local component.
   */
  name: string
  /**
   * Name used for local component.
   */
  pascalName: string
  /**
   * Type of components:
   *
   * * __inline__ - declared in same file.
   * * __external__ - imported from external file.
   */
  type: 'external' | 'inline'
  /**
   * Source range of __inline__ declaration or __external__ import.
   */
  loc?: Array<SourceLocation | null>
  /**
   * Source file name.
   */
  fileName?: string
  /**
   * Absolute source file path.
   */
  absolutePath?: string
}

export interface PropDescriptor {
  /**
   * Prop name.
   */
  name: string
  /**
   * Kebab cased name for template usage.
   */
  kebabName: string
  /**
   * Human readable description of the prop.
   */
  description?: string
  /**
   * Declared type information.
   */
  type?: {
    name: string
  }
  // TODO: Add inferred type information for TypeScript like completion.
  /**
   * Is prop marked required.
   */
  required: boolean
  /**
   * Default Value.
   */
  defaultValue?: {
    value: string
    factory?: boolean
  }
  /**
   * JS Doc Tags
   */
  tags: Record<string, any> // TODO: Use tag names.
  /**
   * Source range for declaration.
   */
  loc?: SourceLocation | null
}

export interface ComponentDescriptor {
  /**
   * Component name as declared or detected from fileName.
   */
  name: string
  /**
   * Pascal case name for template usage.
   */
  pascalName: string
  /**
   * Source code file path.
   */
  fileName?: string
  /**
   * Human readable description.
   */
  description?: string
  /**
   * JS Doc tags.
   */
  tags: Record<string, string>
  /**
   * List of props declared.
   */
  props: Record<string, PropDescriptor>
  /**
   * List of components registered.
   */
  components: Record<string, ComponentRegistrationDescriptor>
  /**
   * SFC Descriptor
   */
  sfc?: SFCDescriptor
}
