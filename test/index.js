const {test} = require('ava')
const runCLI = require('../src/cli.js')
const configLocations = [`${__dirname}/config/local`]

const run = (a, n = 1) => f => t => {
  t.plan(n)
  const o = runCLI(['node', '', a], configLocations)
  f(t, o)
    .catch(e => t.fail(e))
    .subscribe(
      () => {},
      console.error,
      () => t.end()
    )
}

test.cb('version', run('-v')((t, o) =>
  o.map(version =>
    version.match(/RSS\-o\-Bot Version: \d+\.\d+\.\d+/)
      ? t.pass()
      : t.fail()
  )
))

test.cb('help', run('-h')((t, o) =>
  o.map(help =>
    help.length > 100
      ? t.pass()
      : t.fail()
  )
))

test.cb('man', run('-m')((t, o) =>
  o.map(man =>
    man.length > 1000
      ? t.pass()
      : t.fail()
  )
))

