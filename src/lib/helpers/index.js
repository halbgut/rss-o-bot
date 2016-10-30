/**
 * helpers
 * Helper functions used by multiple modules.
 */
const fs = require('fs')
const http = require('http')
const cp = require('child_process')
const path = require('path')
const url = require('url')
const uuid = require('node-uuid')
const R = require('ramda')
const markedMan = require('marked-man')
const { Observable: O } = require('rxjs/Rx')
const jwt = require('jsonwebtoken')
const debug = require('debug')('rss-o-bot')
const CliTable = require('cli-table2')

const ObservableOperators = require('./lib/observable-operators')
ObservableOperators(O)

const domainRegex = '([\\w\\d-]+\\.)+\\w{2,}'
const protoRegex = '\\w+:\\/\\/'

const Helpers = {
  /*
   * fs releated
   */
  readFile: O.bindNodeCallback(fs.readFile),
  writeFile: O.bindNodeCallback(fs.writeFile),
  exec: O.bindNodeCallback(cp.exec),
  stat: O.bindNodeCallback(fs.stat),
  isDirectory: path => Helpers.stat(path).map(Helpers.tryCall('isDirectory')).mapTo(path),
  isFile: path => Helpers.stat(path).map(Helpers.tryCall('isFile')).map(() => path),
  mkdir: O.bindNodeCallback(fs.mkdir),
  mkdirDeep: dirPath =>
    Helpers.isDirectory(dirPath)
      .catch(() =>
        Helpers.mkdirDeep(path.normalize(`${dirPath}/..`))
          .switchMap(() => Helpers.mkdir(dirPath))
      ),

  findExistingDirectory: loc =>
    O.onErrorResumeNextT(
      ...(R.is(Array, loc) ? loc : [loc])
        .map(Helpers.isDirectory)
    )
      .catch(() => O.throw(new Error('None of those directories exist'))),

  /*
   * Functional helpers
   */
  tryCall:
    (key, ...args) => obj =>
      typeof obj[key] === 'function'
        ? obj[key](...args)
        : false,

  tryGet:
    (...keys) => obj =>
      typeof obj === 'object'
        ? keys.length > 1
          ? obj[keys[0]]
            ? Helpers.tryGet(...keys.slice(1))(obj[keys[0]])
            : obj[keys[0]]
          : obj[keys[0]]
        : obj,

  /*
   * Key exchange related
   */
  privateKeyPath: config => path.normalize(`${config.get('location')}/priv.pem`),
  publicKeyPath: config => path.normalize(`${config.get('location')}/pub.pem`),

  getTime (mod = 0) {
    return Math.round(((new Date()).getTime()) / 1000) + mod
  },

  /*
   * RSS-o-Bot filter helpers
   */
  transformFilter (filter) {
    return (
      filter[0] === '!'
        ? {keyword: filter.substr(1), kind: false}
        : {keyword: filter, kind: true}
    )
  },

  /*
   * URL manipulation
   */

  /* Simply interpret URLs containing a domain as valid
   * this should be good enough in most cases.
   */
  isValidUrl: str => !!url.parse(str).hostname,
  isAbsoluteUrl: str =>
    !!str.match(new RegExp(`^${protoRegex}|${domainRegex}`)),

  getBaseUrl (url) {
    const match = url.match(new RegExp(`(${protoRegex})?${domainRegex}`))
    if (!match) return ''
    return match[0]
  },

  getRemoteUrl: configuration => `${configuration.get('remote')}:${configuration.get('port')}`,

  /*
   * HTTP helpers
   */
  serverStartup: Symbol('startup'),
  isResponseRedirect: res =>
    res.statusCode >= 300 && res.statusCode <= 399 && res.headers.location,
  isResponseSuccessful: res =>
    res.statusCode >= 200 && res.statusCode < 400,

  httpServer: port => O.create(o => {
    debug('Starting HTTP server.')
    const server = http.createServer((req, res) => {
      debug('Receiving message.')
      const respond = (code, headers = {'Content-Type': 'application/json'}) => (data) => {
        const body = R.cond([
          [Helpers.is('object'), JSON.stringify],
          [R.T, R.toString]
        ])(data)
        res.writeHead(code, headers)
        res.end(body)
        return O.of(true)
      }
      let body = ''
      req.on('data', data => { body += data })
      req.on('end', e => {
        let data
        try {
          data = JSON.parse(body)
        } catch (e) {
          data = body
        }
        o.next([data, respond])
      })
    })
    server.listen(port)
    o.next(Helpers.serverStartup)
  }),

  httpPost: url => message => O.create(o => {
    const buffer = Buffer.from(JSON.stringify(message))
    const [host, port] = url.split(':')
    const req = http.request(
      {
        host,
        port,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': buffer.length
        }
      },
      res => {
        let body = ''
        res.setEncoding('UTF-8')
        res.on('data', data => { body += data })
        res.on('end', () => {
          let resData
          try {
            resData = JSON.parse(body)
          } catch (e) {
            resData = body
          }
          o.next(resData)
          o.complete()
        })
      }
    )
    req.on('error', err => { o.error(err) })
    req.write(buffer)
    req.end()
  }),

  /*
   * JWT
   */
  isPayloadValid: (() => {
    let cache = []
    return nEl => {
      cache = cache.filter(el => el[1] > Helpers.getTime())
      return !(cache.findIndex(el => el[0] === nEl) > -1)
    }
  })(),

  verifyJwt: publicKey => token => O.create(o => {
    debug('Verifying JWT token.')
    jwt.verify(
      token,
      publicKey,
      { algorithms: ['RS512'] },
      (err, data) => {
        if (err || !Helpers.isPayloadValid([data.jit, data.exp])) {
          // TODO Use Error.js here
          return o.error(err || new Error('Invalid jit'))
        } else {
          o.next(data)
        }
      }
    )
  }),

  signJwt: privateKey => message => O.create(o => {
    jwt.sign(
      R.merge(message, { exp: Helpers.getTime(60), jti: uuid.v4() }),
      privateKey,
      { algorithm: 'RS512' },
      (err, token) => {
        if (err) return o.error(err)
        o.next(token)
        o.complete()
      }
    )
  }),

  /*
   * Man helpers
   */
  buildMan: state =>
    O.forkJoin(
      Helpers.readFile(`${__dirname}/../../../docs/man.md`),
      Helpers.readFile(`${__dirname}/../../../docs/synopsis.md`)
    )
      .map(([f1, f2]) => [f1.toString(), f2.toString()])
      .map(args => [...args, require('../../../package.json')])
      .map(([raw, synopsis, packageInfo]) => [
        raw, synopsis, packageInfo,
        raw
          .replace('[[SYNOPSIS]]', synopsis)
          .replace('[[VERSION]]', packageInfo.version)
      ])
      .map(([raw, synopsis, {version}, man]) => ({
        raw,
        synopsis,
        man: markedMan(raw, {version, section: 1})
      })),

  /* Prints all feed in a bare table */
  printFeeds: feeds =>
    O.forkJoin(
      feeds.map(feed => O.fromPromise(feed.getFilters()
        .then(filters => [
          feed.get('id'),
          feed.get('blogTitle'),
          feed.get('url'),
          filters.map(f =>
            f.get('kind')
              ? f.get('keyword')
              : `!${f.get('keyword')}`
          ).join(', ')
        ])
      ))
    )
      .map(feeds => {
        const table = new CliTable({ head: [ 'ID', 'Title', 'URL', 'Filters' ] })
        table.push(...feeds)
        return table.toString()
      }),

  /*
   * Helpers for finding commands
   */
  getCommand: commands => state => {
    const command = Helpers.findCommand(commands, state.get('action'), state.get('arguments'))
    if (!command) return state
    debug(`Running command ${command[0]}.`)
    return Helpers.setCommandState(state)(command)
  },

  setCommandState: state => command =>
    state
      .set('command', Helpers.tryGet(2)(command))
      .set('scope', Helpers.tryGet(3)(command)),

  findCommand: (commands, action, args) =>
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
    ),

  /* Extracts the config and arguments from a state */
  getConfigAndArgs: state => [
    state.get('configuration'),
    ...state.get('arguments').toJS()
  ],

  /* Makes most common preparation steps for a command */
  setUpEnv: init => state =>
    init(state.get('configuration'))
      .map(store => [store, ...Helpers.getConfigAndArgs(state)]),

  /*
   * Primitives manipulation
   */
  includesUpperCase: str => !!str.match(/[A-Z]/),
  is: type => R.pipe(R.type, R.equals(type)),

  /*
   * Scopes; meaning where to execute a commmand.
   * When running command in remote-mode, that code is normally just executed on the server.
   * Some can always be run locally though, avoiding unnecessary network traffic.
   */
  scope: {
    SHARED: Symbol('scope: shared'),
    LOCAL: Symbol('scope: local'),
    SERVER: Symbol('scope: local')
  },
  shouldRunOnRemote: scope =>
    scope === Helpers.scope.SHARED ||
    scope === Helpers.scope.LOCAL,
  shouldRunOnServer: scope =>
    scope === Helpers.scope.SHARED ||
    scope === Helpers.scope.SERVER,

  /*
   * Others
   */
  getNpmPrefix: () => Helpers.exec('npm config get prefix').map(l => `${l[0].trim()}/lib/node_modules/`)
}

module.exports = Helpers

