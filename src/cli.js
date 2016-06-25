#!/usr/bin/env node

/**
 * cli
 * The executable configured by the package.
 */

const fs = require('fs')
const { getConfig, transformFilter, buildMan, printFeeds } = require('./lib/helpers')
const config = getConfig()
const initStore = require('./lib/store')
const notify = require('./lib/notify')(config)
const opml = require('./lib/opml')
const {Observable: O} = require('rx')

const action = process.argv[2]
const args = process.argv.slice(3)

process.title = 'rss-o-bot'

const commands = [
  [
    'add',
    args => !!args[0],
    ([url, ...filters]) =>
      initStore(config)
      .flatMap(({ insertFeed }) =>
        insertFeed(url, filters.map(transformFilter))
      )
  ],
  [
    'rm',
    args => !!args[0],
    ([id]) =>
      initStore(config)
        .flatMap(({ removeFeed }) => removeFeed(id))
  ],
  [
    'list',
    true,
    () =>
      initStore(config)
        .flatMap(({ listFeeds }) => listFeeds())
        .flatMap(printFeeds)
  ],
  [
    'poll-feeds',
    true,
    () =>
      initStore(config)
        .flatMap(s => require('.').pollFeeds(s, true))
  ],
  [
    'test-notification',
    true,
    (args) =>
      notify('Test', args[0] || 'test', 'Test Title')
  ],
  [
    'import',
    args => !!args[0],
    ([file]) =>
      initStore(config)
        .flatMap(opml.import(file))
        .flatMap(printFeeds)
  ],
  [
    'export',
    true,
    () =>
      initStore(config)
        .flatMap(opml.export)
  ],
  [
    ['run', undefined],
    true,
    () => O.create(o => {
      require('.')()
    })
  ],
  [
    ['-h', '--help'],
    true,
    () => O.create(o => {
      o.onNext(`${buildMan().synopsis}Please refer to \`man rss-o-bot\`, \`rss-o-bot --manual\` or the README for further instructions.`)
      o.onCompleted()
    })
  ],
  [
    ['-m', '--manual'],
    true,
    () => O.create(o => {
      o.onNext(buildMan().raw)
      o.onCompleted()
    })
  ],
  [
    ['-v', '--version'],
    true,
    () => O.create(o => {
      const packageInfo = require('../package.json')
      o.onNext(`RSS-o-Bot Version: ${packageInfo.version}`)
      o.onCompleted()
    })
  ],
  [
    'build-man',
    true,
    () => O.create(o => {
      fs.writeFileSync(`${__dirname}/../dist/man/rss-o-bot.1`, buildMan().man)
      o.onNext('Man built')
      o.onCompleted()
    })
  ]
]

const command = commands.find(([command, validator, run]) =>
  (
    typeof command === 'object'
      ? command.indexOf(action) > -1
      : command === action
  ) &&
  (
    typeof validator === 'function'
      ? validator(args)
      : validator
  )
)

if (command) {
  command[2](args)
    .subscribe(
      console.log,
      console.error
    )
} else {
  console.log(`Unrecognized action: ${action}\n ${buildMan().synopsis}`)
  process.exit(1)
}

