#!/usr/bin/env node

/**
 * @file
 *
 * cli
 * The executable configured by the package.
 */

const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')
const chalk = require('chalk')

const H = require('./lib/shared/helpers')
const Errors = require('./lib/shared/errors')
const { throwO } = Errors
const initStore = require('./lib/store')
const Notify = require('./lib/notify')
const opml = require('./lib/opml')
const remote = require('./lib/remote')
const pollFeeds = require('./lib/poll-feeds')
const Server = require('./lib/server')
const genKeys = require('./lib/gen-keys')
const packageInfo = require('../package.json')
const Config = require('./lib/config')
const initialize = require('./lib/initialize')

const commands = [
  [
    'add',
    args => !!args.get(0),
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .switchMap(([store, config, url, ...filters]) =>
          store.insertFeed(url, filters.map(H.transformFilter))
            .switchMap(feed =>
              pollFeeds.queryFeed(store)(feed)
                .mapTo(feed.get('id'))
                .catch((err) =>
                  store.removeFeed(feed.get('id'))
                    .switchMap(() => O.throw(err))
                )
            )
            .switchMap(store.findById)
        )
        .map(f => [f])
        .switchMap(
          H.printFeeds(
            !state.getIn(['switches', 'no-wrap']),
            state.getIn(['switches', 'columns']),
            state.getIn(['switches', 'ugly'])
          )
        )
  ],
  [
    'rm',
    args => !!args.get(0),
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .switchMap(([{ removeFeed }, config, id]) => removeFeed(id))
        .mapTo(`Deleted feed "${state.get('arguments').get(0)}"`)
  ],
  [
    'list',
    true,
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .switchMap(([{ listFeeds }]) => listFeeds())
        .switchMap(
          H.printFeeds(
            !state.getIn(['switches', 'no-wrap']),
            state.getIn(['switches', 'columns']),
            state.getIn(['switches', 'ugly'])
          )
        )
  ],
  [
    'poll-feeds',
    true,
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .switchMap(([store, config]) =>
          pollFeeds(store, true, state.getIn(['switches', 'ids']))
            .do(({ blogTitle, link, title }) => { H.log(`New URL in "${blogTitle}": "${link}"`) })
            .concatMap(({ blogTitle, link, title }) =>
              Notify(config)(blogTitle, link, title)
                .retry(2)
            )
        )
        .defaultIfEmpty(false)
        .last()
        .mapTo('Successfully polled all feeds in store.')
  ],
  [
    'test-notification',
    true,
    state =>
      Notify(state.get('configuration'))('Test', state.get('arguments').first() || 'test', 'Test Title')
        .mapTo('Successfully sent test notification.')
  ],
  [
    'import',
    (args) => !!args.get(0),
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .map(([store]) => store)
        // TODO: Perform readFile here instead of inside opml.import
        .switchMap(opml.import(state.get('arguments').first()))
        .switchMap(
          H.printFeeds(
            !state.getIn(['switches', 'no-wrap']),
            state.getIn(['switches', 'columns']),
            state.getIn(['switches', 'ugly'])
          )
        )
  ],
  [
    'export',
    true,
    state =>
      O.of(state).switchMap(H.setUpEnv(initStore))
        .map(([ store ]) => store)
        .switchMap(opml.export)
  ],
  [
    ['run'],
    true,
    state => O.create(o => {
      require('.')(state)
    })
  ],
  [
    ['-h', '--help', 'help'],
    true,
    state =>
      O.of(state)
        .switchMap(H.buildMan)
        .map(({ synopsis }) => `${synopsis}Please refer to \`man rss-o-bot\`, \`rss-o-bot --manual\` or the README for further instructions.`)
  ],
  [
    ['-m', '--manual', '--man', 'manual'],
    true,
    state =>
      O.of(state)
        .switchMap(H.buildMan)
        .map(({ raw }) => raw)
  ],
  [
    ['-v', '--version', 'version'],
    true,
    state => O.create(o => {
      o.next(`RSS-o-Bot Version: ${packageInfo.version}`)
      o.complete()
    })
  ],
  [
    'build-man',
    true,
    state =>
      O.of(state)
        .switchMap(() => H.mkdirDeep(`${__dirname}/../dist/docs`))
        .switchMap(H.buildMan)
        .switchMap(({ man }) => H.writeFile(`${__dirname}/../dist/docs/rss-o-bot.1`, man))
        .map(() => 'Man built'),
    true
  ],
  [
    'ping',
    true,
    state => {
      if (state.get('mode') === 'local') {
        return throwO('NO_REMOTE_CONFIGURED')
      } else if (state.get('mode') === 'remote') {
        const privK = state.get('privateKey')
        if (!privK) return throwO('NO_PRIVATE_KEY_FOUND')
        debug('Sending ping.')
        return remote.send(
          privK,
          H.getRemoteUrl(state.get('configuration'))
        )({ command: 'ping', args: [] })
      } else if (state.get('mode') === 'server') {
        return O.of('pong')
      }
    },
    H.scope.SHARED
  ],
  [
    'gen-keys',
    true,
    state => {
      /* Generate a key pair */
      const serverUrl = H.getRemoteUrl(state.get('configuration'))
      return (
        genKeys(state.get('configuration'))
          .switchMap(() => getKeys(state))
          /* Send the public key to the server */
          .do(() => debug(`Sending public key to ${serverUrl}`))
          .switchMap(([, pubK]) => remote.send(
            null,
            serverUrl,
            /* Do it insecurely */
            true
          )(pubK.toString()))
          .map((res) =>
            res.output
              ? 'Keys generated and public key transmitted to server.'
              : Errors.create(res.error)
          )
      )
    },
    H.scope.LOCAL
  ],
  [
    'test-config',
    true,
    state => O.of(Config.validate(state.get('configuration').toJS()))
      .map(x => x
        ? 'Configuration file valid.'
        : 'Invalid Config'
      ),
    H.scope.LOCAL
  ]
]

const runCommand = state => {
  const mode = state.get('mode')
  const config = state.get('configuration')
  /* Execute the command locally */
  if (mode === 'local' || H.shouldRunOnRemote(state.get('scope'))) {
    debug(`Running command "${state.get('action')}" locally.`)
    debug(`Passing arguments ${H.mapToJSON(state.get('arguments'))}`)
    debug(`Passing switches ${H.mapToJSON(state.get('switches'))}`)
    return state.get('command')(state)
  /* Send to a server */
  } else if (mode === 'remote') {
    debug('Sending command as remote')
    return (
      H.readFile(H.privateKeyPath(config))
        .switchMap(privK =>
          remote.send(privK, H.getRemoteUrl(config))({
            command: state.get('command'),
            arguments: state.get('arguments').toJS()
          })
        )
    )
  } else if (mode === 'server') {
    /* Ignore any command passed, since there's only
     * `run` on the server.
     */
    return Server(commands, state)
  } else {
    throw new Error(`Unexpected state mode is set to ${mode}`)
  }
}

const getKeys = state => {
  const config = state.get('configuration')
  return O.combineLatest(
    /* If a keyfile can't be opended, simply assume it isn't there */
    H.readFile(H.privateKeyPath(config)).catch(() => O.of(undefined)),
    H.readFile(H.publicKeyPath(config)).catch(() => O.of(undefined))
  )
}

const runCLI = (
  argv = process.argv,
  configLocations,
  config
) =>
  initialize(argv, configLocations, config)
    .map(H.getCommand(commands))
    .flatMap(state => state.get('command')
      ? O.of(state)
      : throwO('NO_SUCH_COMMAND', { command: state.get('action') })
    )
    .switchMap(state =>
      state.get('mode') === 'server' ||
      state.get('mode') === 'remote'
        ? getKeys(state).map(([priv, pub]) =>
          state
            .set('publicKey', pub)
            .set('privateKey', priv)
        )
        : O.of(state)
    )
    /* Run command */
    .switchMap(runCommand)

module.exports = runCLI

if (!process.env['RSS_O_BOT_TESTING_MODE']) {
  runCLI()
    .subscribe(
      (msg) => process.stdout.write(msg),
      (error) => {
        const translatedError = Errors.translate(error)
        process.stderr.write(chalk.dim.bold.bgRed.white('error:'))
        process.stderr.write(' ')
        process.stderr.write(translatedError)
        process.stderr.write('\n')
      }
    )
}

