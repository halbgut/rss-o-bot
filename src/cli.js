#!/usr/bin/env node

/**
 * cli
 * The executable configured by the package.
 */

const fs = require('fs')
const {
  getConfig,
  getPrivateKey,
  getPublicKey,
  setPublicKey,
  transformFilter,
  buildMan,
  printFeeds,
  getMode } = require('./lib/helpers')
const config = getConfig()
const initStore = require('./lib/store')
const notify = require('./lib/notify')(config)
const opml = require('./lib/opml')
const {Observable: O} = require('rx')
const client = require('./lib/client')
const server = require('./lib/server')
const genKeys = require('./lib/genKeys')
const debug = require('debug')('rss-o-bot')

const CLIENT_ONLY = Symbol('CLIENT_ONLY')

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
    ['run'],
    true,
    () => O.create(o => {
      require('.')()
    })
  ],
  [
    ['-h', '--help', 'help'],
    true,
    () => O.create(o => {
      o.onNext(`${buildMan().synopsis}Please refer to \`man rss-o-bot\`, \`rss-o-bot --manual\` or the README for further instructions.`)
      o.onCompleted()
    })
  ],
  [
    ['-m', '--manual', '--man', 'manual'],
    true,
    () => O.create(o => {
      o.onNext(buildMan().raw)
      o.onCompleted()
    })
  ],
  [
    ['-v', '--version', 'version'],
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
    }),
    CLIENT_ONLY
  ],
  [
    'ping',
    true,
    () => O.create(o => {
      if (getMode() === 'local') {
        o.onNext('No server configured, running in local mode. Check the configuration section of the man-page for more info.')
        o.onCompleted()
      } else if (getMode() === 'remote') {
        client.send({action: 'ping', args: []})
          .subscribe(
            msg => o.onNext(msg),
            err => o.onNext(err),
            () => o.onCompleted()
          )
      } else if (getMode() === 'server') {
        o.onNext('pong')
        o.onCompleted()
      }
    }),
    CLIENT_ONLY
  ]
]

const executeCommand = (commands, action, args) =>
  command
    ? command[2](args)
    : O.create(o => o.onError(`Unrecognized action: ${action}\n ${buildMan().synopsis}`))

const action = process.argv[2]
const args = process.argv.slice(3)
const findCommand = (commands, action, args) =>
  commands.find(([command, validator, run]) =>
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

const command = findCommand(commands, action, args)
if (getMode() === 'local' || (command && command[3] === CLIENT_ONLY)) {
  debug('running command locally')
  executeCommand(command, action, args)
    .subscribe(
      console.log,
      console.error
    )
} else if (getMode() === 'remote') {
  debug('Sending command as remote')
  if (!getPrivateKey()) {
    try {
      debug('Generating new key pair')
      genKeys()
      client.send({ key: getPublicKey() }, true)
    } catch (e) {
      throw new Error('Failed to generate key pair. Automatic generation might work if you install OpenSSL. If you have already installed it and are still unable to initialize RSS-o-Bot, please generate a keypair manually.refer to the manual for more information')
    }
  }
  client.send({ action, args })
    .subscribe(
      console.log,
      console.error
    )
} else if (getMode() === 'server') {
  debug('Starting server')
  server.listen()
    .subscribe(
      ([data, respond]) => {
        debug('Recieved public key')
        if (typeof data === 'string') { // Must be a public key
          setPublicKey(data)
        } else {
          debug(`Executing command ${data.action}`)
          const action = findCommand(commands, data.action, data.args)
          executeCommand(action, data.args)
            .subscribe(
              respond,
              respond
            )
        }
      }
    )
}

