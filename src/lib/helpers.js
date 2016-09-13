/**
 * helpers
 * Helper functions used by multiple modules.
 */
const fs = require('fs')
const http = require('http')
const cp = require('child_process')
const path = require('path')
const uuid = require('node-uuid')
const R = require('ramda')
const markedMan = require('marked-man')
const { Observable: O } = require('rx')
const jwt = require('jsonwebtoken')
const debug = require('debug')('rss-o-bot')

const domainRegex = '([\\w\\d-]+\\.)+\\w{2,}'
const protoRegex = '\\w+:\\/\\/'

const Helpers = {
  /*
   * fs releated
   */
  readFile: O.fromNodeCallback(fs.readFile),
  writeFile: O.fromNodeCallback(fs.writeFile),
  exec: O.fromNodeCallback(cp.exec),
  stat: O.fromNodeCallback(fs.stat),
  isDirectory: path => Helpers.stat(path).map(Helpers.tryCall('isDirectory')).map(() => path),
  isFile: path => Helpers.stat(path).map(Helpers.tryCall('isFile')).map(() => path),

  findExistingDirectory: strOrArrLocations => {
    const locations = Array.prototype.isPrototypeOf(strOrArrLocations)
      ? strOrArrLocations
      : [strOrArrLocations]
    return (
      O.of(locations[0])
        .flatMap(l => l
          ? Helpers.isDirectory(l).flatMap(is => is
            ? O.of(l)
            : Helpers.findExistingDirectory(locations.slice(1))
          )
          : O.throw('None of those directories exist')
        )
    )
  },

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
      const respond = (code, headers = {'Content-Type': 'application/json'}) => (data) => {
        const body = R.cond([
          [Helpers.is('object'), JSON.stringify],
          [R.T, R.toString]
        ], body)
        res.writeHead(code, headers)
        res.end(body)
        return O.just(true)
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
        o.onNext([data, respond])
      })
    })
    server.listen(port)
    console.log(Helpers.serverStartup)
    o.onNext(Helpers.serverStartup)
  }),

  httpPost: url => message => O.create(o => {
    const buffer = Buffer.from(JSON.stringify(message))
    const [host, port] = url.split(':')
    const req = http.request(
      {
        port,
        host,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': buffer
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
          o.onNext(resData)
          o.onCompleted()
        })
      }
    )
    req.on('error', err => { o.onError(err) })
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
    jwt.verify(
      token,
      publicKey,
      { algorithms: ['RS512'] },
      (err, data) => {
        if (err || !Helpers.isPayloadValid([data.jit, data.exp])) {
          // TODO Use Error.js here
          return o.onError(err || new Error('Invalid jit'))
        }
        o.onNext(data)
      }
    )
  }),

  signJwt: privateKey => message => O.create(o => {
    jwt.sign(
      R.merge(message, { exp: 60000, jti: uuid.v4() }),
      privateKey,
      { algorithm: 'RS512' },
      (err, token) => {
        if (err) return o.onError(err)
        o.onNext(token)
        o.onCompleted()
      }
    )
  }),

  /*
   * Man helpers
   */
  buildMan: state =>
    O.forkJoin(
      Helpers.readFile(`${__dirname}/../../src/docs/man.md`),
      Helpers.readFile(`${__dirname}/../../src/docs/synopsis.md`)
    )
      .map(([f1, f2]) => [f1.toString(), f2.toString()])
      .map(args => [...args, require('../../package.json')])
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
      .map(feeds =>
        feeds.map(([id, blogTitle, url, filters]) =>
          `${id}: ${blogTitle} - ${url} - ${filters}\n`
        ).join('')
      ),

  /*
   * Helpers for finding commands
   */
  getCommand: commands => state => {
    const command = Helpers.findCommand(commands, state.get('action'), state.get('arguments'))
    if (!command) throw new Error(`No such command: ${state.get('action')}`)
    debug(`Running command ${command[0]}`)
    return Helpers.setCommandState(state)(command)
  },

  setCommandState: state => command =>
    state
      .set('command', Helpers.tryGet(2)(command))
      .set('localOnly', Helpers.tryGet(3)(command)),

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
  is: type => R.pipe(R.type, R.equals(type))
}

module.exports = Helpers

