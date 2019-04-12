import { NamespaceType } from './node'
import { TextParsingMode } from './mode'

export function isClosingTag(source: string, tag: string): boolean {
  return new RegExp(`^<\\/(?:${tag})\\s*>`).test(source)
}
export function isPrefix(haystack: string, needle: string): boolean {
  return (
    haystack.startsWith(needle) || haystack.startsWith(needle.toLowerCase())
  )
}
export function findCharacterReference(
  map: Record<string, string>,
  key: string
): string | undefined {
  key = key.endsWith(';') ? key : `${key};`
  key = key.startsWith('&') ? key : `&${key}`
  if (key in map) {
    return map[key]
  }
  key = key.toLowerCase()
  if (key in map) {
    return map[key]
  }
  key = key.toUpperCase()
  if (key in map) {
    return map[key]
  }
}
export function minIndex(...indices: number[]) {
  return Math.min(...indices.filter(index => index >= 0))
}
export function findIdentifiers(ast: any): string[] {
  const identifiers: string[] = []
  if (!ast) return identifiers
  if (Array.isArray(ast)) {
    return identifiers.concat(...ast.map(findIdentifiers))
  }
  if (BT.isIdentifier(ast)) {
    identifiers.push(ast.name)
  } else if (BT.isObjectPattern(ast)) {
    ast.properties.forEach(property => {
      if (BT.isRestElement(property)) {
        identifiers.push(...findIdentifiers(property.argument))
      } else {
        identifiers.push(...findIdentifiers(property.value))
      }
    })
  } else if (BT.isArrayPattern(ast)) {
    ast.elements.forEach(element => {
      identifiers.push(...findIdentifiers(element))
    })
  } else {
    for (const key in ast) {
      const node = ast[key]
      identifiers.push(...findIdentifiers(node))
    }
  }
  return identifiers
}

/**
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
 */
export function getTextParsingMode(
  tagName: string,
  namespace: NamespaceType
): TextParsingMode {
  if (namespace === NamespaceType.HTML) {
    if (/^(?:title|textarea)$/i.test(tagName)) {
      return TextParsingMode.RCDATA
    }
    if (
      /^(?:style|xmp|iframe|noembed|noframes|script|noscript)$/i.test(tagName)
    ) {
      return TextParsingMode.RAWTEXT
    }
  }
  return TextParsingMode.DATA
}

function makeMap(str: string) {
  const values = new Set(str.split(','))

  return (value: string) => values.has(value)
}

export const isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
)

export const isSVGTag = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
    'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
    'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view'
)

export function isReservedTag(tagName: string): boolean {
  return isHTMLTag(tagName) || isSVGTag(tagName)
}
