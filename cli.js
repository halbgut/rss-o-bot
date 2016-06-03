#!/usr/bin/env node

const Rx = require('rx')
const {getConfig} = require('./lib/helpers')
const Tg = require('tg-yarl')
const config = getConfig()
const initStore = require('./lib/store')
const notify = require('./lib/notify')(config)

const help = `usage: rss-o-bot [flag | action [arguments]]

Flags:
  -h, --help          Displays this dialogue

Actions:
  add                 Add a Feed-URL to the database
  test-notification   Send a test notification over the
                      channels defined in config.json
  poll-telegram       Continuously checks telegram for new
                      messages and outputs senders userIds.
`

const action = process.argv[2]
const args = process.argv.slice(3)

if (action === 'add' && args[0]) {
  const [url] = args
  initStore(config)
    .flatMap(({ insertFeed }) => insertFeed(url))
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'test-notification' && args[0]) {
  const [url] = args
  notify('Test', url)
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'poll-telegram') {
  const tg = Tg(config['telegram-api-token'])
  Rx.Observable.interval(1000).startWith(0)
    .flatMap(() => Rx.Observable.fromPromise(tg.getUpdates()))
    .map(res => res.body.ok
      ? res.body.result.slice(-1)[0]
      : null
    )
    .distinctUntilChanged(update => update ? update.update_id : null)
    .map(update => update ? update.message.from.id : null)
    .subscribe(console.log, console.error, () => process.exit())
} else {
  process.stderr.write(`Unrecognized action: ${action}\n ${help}`)
  process.exit(1)
}

