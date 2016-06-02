#!/usr/bin/env node

const config = require('./config')
const initStore = require('./lib/store')

const help = `usage: rss-o-bot [flag | action [arguments]]

Flags:
  -h, --help   Displays this dialogue

Actions:
  add          Add a Feed-URL to the database
`

const action = process.argv[2]
const args = process.argv.slice(3)

if (action === 'add' && args[0]) {
  const [url] = args
  initStore(config)
    .flatMap(({ insertFeed }) =>
      insertFeed(url)
    )
    .subscribe(
      console.log,
      console.error,
      () => process.exit()
    )
} else {
  process.stderr.write(`Unrecognized action: ${action}\n ${help}`)
  process.exit(1)
}

