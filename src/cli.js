#!/usr/bin/env node

/**
 * @file
 *
 * cli
 * The executable configured by the package.
 */

const { Observable: O } = require('rx')
const Immutable = require('immutable')
const debug = require('debug')('rss-o-bot')

const initStore = require('./lib/store')
const Notify = require('./lib/notify')
const opml = require('./lib/opml')
const remote = require('./lib/remote')
const Server = require('./lib/server')

/* Pure modules */
const Config = require('./lib/config')
const Argv = require('./lib/argv')
const H = require('./lib/helpers')

const commands = [
  [
    'add',
    args => !!args.get(0),
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .flatMap(([{ insertFeed }, config, url, ...filters]) =>
          insertFeed(url, filters.map(H.transformFilter))
        )
        .map(f => [f])
        .flatMap(H.printFeeds)
  ],
  [
    'rm',
    args => !!args.get(0),
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .flatMap(([{ removeFeed }, config, id]) => removeFeed(id))
  ],
  [
    'list',
    true,
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .flatMap(([{ listFeeds }]) => listFeeds())
        .flatMap(H.printFeeds)
  ],
  [
    'poll-feeds',
    true,
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .flatMap(([store, config]) => require('.').pollFeeds(config, store, true))
  ],
  [
    'test-notification',
    true,
    state =>
      Notify(state.get('config'))('Test', state.get('arguments').first() || 'test', 'Test Title')
  ],
  [
    'import',
    (args) => !!args.get(0),
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .map(([store]) => store)
        // TODO: Perform readFile here instead of inside opml.import
        .flatMap(opml.import(state.get('arguments').first()))
        .flatMap(H.printFeeds)
  ],
  [
    'export',
    true,
    state =>
      O.of(state).flatMap(H.setUpEnv(initStore))
        .map(([ store ]) => store)
        .flatMap(opml.export)
  ],
  [
    ['run'],
    true,
    state => O.create(o => {
      require('.')()
    })
  ],
  [
    ['-h', '--help', 'help'],
    true,
    state =>
      O.of(state)
        .flatMap(H.buildMan)
        .map(({ synopsis }) => `${synopsis}Please refer to \`man rss-o-bot\`, \`rss-o-bot --manual\` or the README for further instructions.`)
  ],
  [
    ['-m', '--manual', '--man', 'manual'],
    true,
    state =>
      O.of(state)
        .flatMap(H.buildMan)
        .map(({ raw }) => raw)
  ],
  [
    ['-v', '--version', 'version'],
    true,
    state => O.create(o => {
      const packageInfo = require('../package.json')
      o.onNext(`RSS-o-Bot Version: ${packageInfo.version}`)
      o.onCompleted()
    })
  ],
  [
    'build-man',
    true,
    state =>
      O.of(state)
        .flatMap(H.buildMan)
        .flatMap(({ man }) => H.writeFile(`${__dirname}/../dist/man/rss-o-bot.1`, man))
        .map(() => 'Man built'),
    true
  ],
  [
    'ping',
    true,
    state => {
      if (state.get('mode') === 'local') {
        O.of('No server configured, running in local mode. Check the configuration section of the man-page for more info.')
      } else if (state.get('mode') === 'remote') {
        return remote.send({ action: 'ping', args: [] })(state.get('privateKey'))
      } else if (state.get('mode') === 'server') {
        return O.of('pong')
      }
    },
    true
  ]
]

const runCommand = state => {
  const mode = state.get('mode')
  const config = state.get('configuration')
  /* Execute the command locally */
  if (mode === 'local' || state.get('localOnly')) {
    debug('running command locally')
    return state.get('command')(state)
  /* Send to a server */
  } else if (mode === 'remote') {
    debug('Sending command as remote')
    return (
      H.readFile(H.privateKeyPath(config))
        .flatMap(remote.send(config.get('remote'), {
          action: state.get('action'),
          arguments: state.get('arguments').toJS()
        }))
    )
  } else if (mode === 'server') {
    if (state.get('mode') === 'server') {
      /* Ignore any command passed, since there's only
       * `run` on the server.
       */
      return Server.run(state, commands)
    }
  }
}

const getKeys = (state) => {
  const config = state.get('config')
  O.combineLatest(
    H.readFile(H.privateKeyPath(config)),
    H.readFile(H.publicKeyPath(config))
  )
}

const runCLI = (
  argv = process.argv,
  configLocations = Config.locations,
  config
) =>
  O.of(argv)
    /* Extract arguments */
    .map(Argv.extractArguments)
    /* Get config */
    .flatMap(state =>
      (config
        ? O.of(Immutable.fromJS(config)).map(Config.applyDefaults)
        : Config.readConfig(configLocations)
      )
        .map(config => state.set('configuration', config))
    )
    /* Define mode */
    .map(state =>
      state.set(
        'mode',
        state.getIn(['configuration', 'remote'])
          ? 'remote'
          : state.getIn(['configuration', 'mode'])
      )
    )
    .map(Argv.applyModeFlags)
    .map(H.getCommand(commands))
    .flatMap(state =>
      state.get('mode') === 'server' ||
      state.get('mode') === 'client'
        ? getKeys().map(([pub, priv]) =>
          state
            .set('publicKey', pub)
            .set('privateKey', priv)
        )
        : O.of(state)
    )
    /* Run command */
    .flatMap(runCommand)

module.exports = runCLI

if (!process.env['RSS_O_BOT_TESTING_MODE']) {
  runCLI()
    .subscribe(
      console.log,
      console.error
    )
}

