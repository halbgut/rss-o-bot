#!/usr/bin/env node

const fs = require('fs')
const Rx = require('rx')
const O = Rx.Observable
const { getConfig, transformFilter, buildMan } = require('./lib/helpers')
const Tg = require('tg-yarl')
const config = getConfig()
const initStore = require('./lib/store')
const notify = require('./lib/notify')(config)
const opml = require('./lib/opml')

const action = process.argv[2]
const args = process.argv.slice(3)

process.title = 'rss-o-bot'

if (action === 'add' && args[0]) {
  const [url, ...filters] = args
  initStore(config)
    .flatMap(({ insertFeed }) => insertFeed(url, filters.map(transformFilter)))
    .subscribe(
      f => console.log(`Added ${f.get('url')}`),
      console.error,
      () => process.exit()
    )
} else if (action === 'rm' && args[0]) {
  const [id] = args
  initStore(config)
    .flatMap(({ removeFeed }) => removeFeed(id))
    .subscribe(
      () => console.log('Removed.'),
      console.error,
      () => process.exit())
} else if (action === 'list') {
  initStore(config)
    .flatMap(({ listFeeds }) => listFeeds())
    .subscribe(
      printFeeds,
      console.error
    )
} else if (action === 'test-notification') {
  const url = args[0] || 'test'
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
} else if (action === '-h' || action === '--help') {
  process.stdout.write(buildMan().synopsis)
} else if (action === '-m' || action === '--manual') {
  process.stdout.write(buildMan().raw)
} else if (action === 'build-man') {
  fs.writeFileSync(`${__dirname}/../dist/man/rss-o-bot.man`, buildMan().man)
} else if (action === '-v' || action === '--version') {
  const packageInfo = require('../package.json')
  console.log(`RSS-o-Bot Version: ${packageInfo.version}`)
} else {
  process.stderr.write(`Unrecognized action: ${action}\n ${buildMan().synopsis}`)
  process.exit(1)
}

function printFeeds (feeds) {
  Promise.all(
    feeds.map(feed => feed.getFilters()
      .then(filters => [
        feed.get('id'),
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
      feeds.forEach(([id, url, filters]) => {
        process.stdout.write(`${id}: ${url}  ${filters}\n`)
      })
      process.stdout.write(`\n`)
    })
}

