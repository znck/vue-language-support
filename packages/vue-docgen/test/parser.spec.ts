import { parseSFC } from '../src'

// TODO: Move to global setup file
/**
 * Trims the initial indentation from the input string
 */
function trimIndentation(input: string) {
  const source = input.replace(/^\n+|\s+$/g, '')
  const match = source.match(/^[\x20\t]+/)
  if (!match) return source
  const indentation = match[0]
  const result = source
    .split('\n')
    .map(line => {
      if (line.indexOf(indentation) === 0) {
        return line.substring(indentation.length)
      } else {
        throw new Error('inconsistent indentation for trimming')
      }
    })
    .join('\n')

  return result
}

declare global {
  interface String {
    trimIndent: () => string
  }
}

String.prototype.trimIndent = function() {
  return trimIndentation(this.toString())
}

describe('parseSFC', () => {
  describe('JavaScript', () => {
    test('prop: full syntax', async () => {
      const result = await parseSFC(
        `
        <script>
          export default {
            props: {
              title: {
                type: String,
                required: true,
                default: 'TODO: Write a title here',
              },
            },
          }
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.name).toBe('title')
      expect(prop.type).toEqual({ name: 'string' })
      expect(prop.required).toBe(true)
      expect(prop.default).toEqual({ value: "'TODO: Write a title here'" })
    })

    test('prop: shorthand syntax', async () => {
      const result = await parseSFC(
        `
        <script>
          export default {
            props: {
              title: String,
            },
          }
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.name).toBe('title')
      expect(prop.type).toEqual({ name: 'string' })
    })
    
    test('prop: type annotation', async () => {
      const result = await parseSFC(
        `
        <script>
          export default {
            props: {
              /**
               * @type {{ title: string }}
               */
              title: Object,
            },
          }
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.name).toBe('title')
      expect(prop.type).toEqual({ name: '{title: string}' })
    })

    test('prop: doc comment', async () => {
      const result = await parseSFC(
        `
        <script>
          export default {
            props: {
              /**
               * The title of the article.
               * 
               * @since v0.5
               * @author Rahul Kadyan <rahulkdn@gmail.com>
               * @category basic
               */
              title: String,
            },
          }
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.description).toBe('The title of the article.')
      expect(prop.tags).toHaveLength(3)

      const [since, author, category] = prop.tags

      expect(since.description).toBe('v0.5')
      expect(author.description).toBe('Rahul Kadyan <rahulkdn@gmail.com>')
      expect(category.description).toBe('basic')
    })
  })

  describe('TypeScript', () => {
    test('prop: full syntax', async () => {
      const result = await parseSFC(
        `
        <script lang="ts">
          export default Vue.extend<{
            title: string
          }>({
            props: {
              title: { 
                default: 'foo',
              },
            },
          })
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.name).toBe('title')
      expect(prop.type).toEqual({ name: 'string' })
      expect(prop.required).toBe(true)
    })

    test('prop: shorthand syntax', async () => {
      const result = await parseSFC(
        `
        <script lang="ts">
          export default Vue.extend<{
            title: string
          }>({
            props: ['title'],
          })
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.name).toBe('title')
      expect(prop.type).toEqual({ name: 'string' })
    })

    test('prop: doc comment', async () => {
      const result = await parseSFC(
        `
        <script lang="ts">
          export default Vue.extend<{
            /**
             * The title of the article.
             * 
             * @since v0.5
             * @author Rahul Kadyan <rahulkdn@gmail.com>
             * @category basic
             */
            title: string
          }>({
            props: {
              title: { 
                default: 'foo',
              },
            },
          })
        </script>
      `.trimIndent()
      )

      expect(result.props).toHaveLength(1)

      const prop = result.props[0]
      expect(prop.description).toBe('The title of the article.')
      expect(prop.tags).toHaveLength(3)

      const [since, author, category] = prop.tags

      expect(since.description).toBe('v0.5')
      expect(author.description).toBe('Rahul Kadyan <rahulkdn@gmail.com>')
      expect(category.description).toBe('basic')
    })
  })
})
