import { getComponentNameFromFilename } from './utils'

describe('getComponentNameFromFilename', () => {
  it('should just remove file .vue extension', () => {
    expect(getComponentNameFromFilename('foo-bar.vue')).toBe('foo-bar')
    expect(getComponentNameFromFilename('./foo-bar.vue')).toBe('foo-bar')
    expect(getComponentNameFromFilename('some/dir/foo-bar.vue')).toBe('foo-bar')
    expect(getComponentNameFromFilename('/some/dir/foo-bar.vue')).toBe(
      'foo-bar'
    )
  })
})
