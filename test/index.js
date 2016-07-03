const {test} = require('ava')
const runCLI = require('../src/cli.js')
const configLocations = [`${__dirname}/config/local`]

const run = (a, n = 1) => f => t => {
  t.plan(n)
  const o = runCLI(['node', '', ...a], configLocations)
  f(t, o)
    .catch(e => t.fail(e))
    .subscribe(
      () => {},
      console.error,
      () => t.end()
    )
}

test.cb('version', run(['-v'])((t, o) =>
  o.map(version =>
    t.regex(version, /RSS\-o\-Bot Version: \d+\.\d+\.\d+/)
  )
))

test.cb('help', run(['-h'])((t, o) =>
  o.map(help =>
    help.length > 100
      ? t.pass()
      : t.fail()
  )
))

test.cb('man', run(['-m'])((t, o) =>
  o.map(man =>
    man.length > 1000
      ? t.pass()
      : t.fail()
  )
))

{
  const url = 'https://github.com/Kriegslustig/rss-o-bot/commits/master.atom'
  const filter = 'somefilter'
  test.cb('add', run(['add', url, filter], 2)((t, o) =>
    o.map(feed => {
      const [id, rest] = feed.split('\n')[0].split(': ')
      const [title, setUrl, filters] = rest.split(' - ')
      t.deepEqual([title, setUrl, filters], ['undefined', url, filter])
      t.regex(id, /\d+/)
    })
  ))
}

