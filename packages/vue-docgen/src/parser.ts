import { DescriptorBuilder, DescriptorBuilderOptions } from './builder'
import { parse as parseSFC } from './parse/vue'
import { parse as parseJavaScript } from './parse/javascript'
import { parse as parseTypeScript } from './parse/typescript'
import { parse as parseFlow } from './parse/flow'
import processScript from './script'

export interface ParserContext {}

export interface ParserOptions extends DescriptorBuilderOptions {
  readFile(filename: string): Promise<string>
}

export async function parse(source: string, options?: ParserOptions) {
  const config: Required<ParserOptions> = {
    fileName: 'component.vue',
    resolve: path => path,
    readFile: fileName => {
      throw new Error(`No readFile method provided.`)
    },
    ...options,
  }

  const builder = new DescriptorBuilder(config)

  if (/\.vue$/.test(config.fileName)) {
    const descriptor = parseSFC(source, { pad: true, deindent: false })

    builder.component.sfc = descriptor

    if (descriptor.script) {
      if (descriptor.script.content) {
        callProcessScript({
          lang: (langAliases[descriptor.script.lang!] ||
            descriptor.script.lang ||
            'js') as SupportedScriptLang,
          builder,
          content: descriptor.script.content,
          isVueFile: true,
        })
      } else if (descriptor.script.src) {
        const fileName = config.resolve(descriptor.script.src)
        const lang = fileName.split('.').pop() as SupportedScriptLang

        callProcessScript({
          lang,
          builder,
          content: await config.readFile(fileName),
          isVueFile: true,
        })
      }
    }
  }

  return builder.component
}

const scriptParsers = {
  js: parseJavaScript,
  ts: parseTypeScript,
  flow: parseFlow,
}

const langAliases = {
  typescript: 'ts',
  javascript: 'js',
}

type ScriptParsers = typeof scriptParsers

export type SupportedScriptLang = keyof ScriptParsers

async function callProcessScript({
  lang,
  content: source,
  builder,
  isVueFile,
}: {
  lang: SupportedScriptLang
  content: string
  builder: DescriptorBuilder
  isVueFile: boolean
}) {
  const parse = scriptParsers[lang]

  if (!parse) return

  const root = parse(source)

  await processScript(builder, {}, root, isVueFile)
}
