const {test} = require('ava')
const runCLI = require('../src/cli.js')
const configLocations = [`${__dirname}/config/local`]

const run = t => n => o => {
  t.plan(n)
  o.subscribe(() => {}, console.error, () => t.end())
}

test.cb('version', t => run(t)(1)(
  runCLI(['node', '', '-v'], configLocations)
    .map(version =>
      version.match(/RSS\-o\-Bot Version: \d+\.\d+\.\d+/)
        ? t.pass()
        : t.fail()
    )
))

