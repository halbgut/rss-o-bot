#!/usr/bin/env node

const Rx = require('rx')
const O = Rx.Observable
const { getConfig, transformFilter } = require('./lib/helpers')
const Tg = require('tg-yarl')
const config = getConfig()
const initStore = require('./lib/store')
const notify = require('./lib/notify')(config)
const opml = require('./lib/opml')

const help = `usage: rss-o-bot [flag | action [arguments]]

Flags:
  -h, --help             Displays this dialogue

Actions:
  run                    Run the deamon process in the foreground

  add url [...filters]   Add a Feed-URL to the database

  rm id                  Remove a Feed-URL from the database

  list                   List all Feed-URLs

  test-notification      Send a test notification over the

                         channels defined in config.json
  poll-telegram          Continuously checks telegram for new
                         messages and outputs senders userIds.

  import file            OPML import. Takes a path to an XML-file
                         As a parameter and scanns it for outline
                         elements. It's standard for RSS clients
                         to provide an OPML import. These contain
                         outline tags which the importer searches
                         for. From those tags, the xmlUrl or Url
                         Attributes are read as feed-URLs>

  export                 Exports the RSS feeds as OPML. This does
                         not export the filters.

Arguments:
  url                    A URL of an RSS or Atom feed
  id                     The \`id\` of a Feed-URL inside the DB.
                         \`id\`s can be displayed using \`rss-o-bot list\`
  ...                    A space sperated list of something
  filters                Keywords to search for in titles of items inside
                         feeds. When filters are passed, only notifications
                         for items containing that word in their title
                         will be sent. If a filter is prefixed with '!',
                         you will only be notified about items without
                         that word in their titles.
`

const action = process.argv[2]
const args = process.argv.slice(3)

if (action === 'add' && args[0]) {
  const [url, ...filters] = args
  initStore(config)
    .flatMap(({ insertFeed }) => insertFeed(url, filters.map(transformFilter)))
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'rm' && args[0]) {
  const [id] = args
  initStore(config)
    .flatMap(({ removeFeed }) => removeFeed(id))
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'list') {
  initStore(config)
    .flatMap(({ listFeeds }) => listFeeds())
    .subscribe(
      printFeeds,
      console.error
    )
} else if (action === 'test-notification' && args[0]) {
  const [url] = args
  notify('Test', url)
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'poll-telegram') {
  const tg = Tg(config['telegram-api-token'])
  O.interval(1000).startWith(0)
    .flatMap(() => O.fromPromise(tg.getUpdates()))
    .map(res => res.body.ok
      ? res.body.result.slice(-1)[0]
      : null
    )
    .distinctUntilChanged(update => update ? update.update_id : null)
    .map(update => update ? update.message.from.id : null)
    .subscribe(console.log, console.error, () => process.exit())
} else if (action === 'import' && args[0]) {
  const [file] = args
  initStore(config)
    .flatMap(opml.import(file))
    .subscribe(
      printFeeds,
      console.error
    )
} else if (action === 'export') {
  initStore(config)
    .flatMap(opml.export)
    .subscribe(
      console.log,
      console.error
    )
} else if (action === 'run' || !action) {
  require('.')
} else if (action === '-h' && action === '--help' && action === 'help') {
  process.stdout.write(help)
} else {
  process.stderr.write(`Unrecognized action: ${action}\n ${help}`)
  process.exit(1)
}

function printFeeds (feeds) {
  Promise.all(
    feeds.map(feed => feed.getFilters()
      .then(filters => [
        feed.get('url'),
        filters.map(f =>
          f.get('kind')
            ? f.get('keyword')
            : `!${f.get('keyword')}`
        ).join(', ')
      ])
    )
  )
    .then(feeds => {
      feeds.forEach(([url, filters]) => {
        process.stdout.write(`${url}  ${filters}\n`)
      })
      process.stdout.write(`\n`)
    })
}

