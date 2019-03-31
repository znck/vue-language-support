const path = require('path')
const ts = require('rollup-plugin-typescript2')
const node = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const json = require('rollup-plugin-json')

const configurations = []

createConfig('packages', ['vue-docgen', 'vue-language-server'])
createConfig('extensions', ['vue-language-support', 'vue-syntax', 'vue-template-syntax'])

function createConfig(dir, names) {
  names.forEach(name => {
    const pkg = require(path.resolve(__dirname, dir, name, 'package.json'))

    try {
      configurations.push({
        input: path.resolve(__dirname, dir, name, pkg.tsMain),
        output: {
          file: path.resolve(__dirname, dir, name, pkg.main),
          format: 'cjs',
        },
        external: ['path', 'os', 'crypto', 'net', 'vscode'].concat(
          Object.keys(pkg.dependencies || {})
        ),
        plugins: [
          json(),
          node(),
          ts({
            check: false,
            tsconfig: path.resolve(__dirname, dir, name, 'tsconfig.build.json'),
          }),
          commonjs(),
        ],
      })
    } catch (e) {
      console.error(e)
    }
  })
}

export default configurations
