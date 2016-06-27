/**
 * helpers
 * Helper functions used by multiple modules.
 */
const fs = require('fs')
const path = require('path')
const markedMan = require('marked-man')
const debug = require('debug')('rss-o-bot')
const {Observable: O} = require('rx')

const locations = [
  `${__dirname}/../../data`,
  process.platform === 'win32'
    ? `${process.env.USERPROFILE}/.rss-o-bot`
    : `${process.env.HOME}/.rss-o-bot`
].map(l => path.normalize(l))

const configError = `No config file found!
RTFM and put one in one of these locations:
${locations.join(', ')}
`

const domainRegex = '([\\w\\d-]+\\.)+\\w{2,}'
const protoRegex = '\\w+:\\/\\/'
const defaults = {
  mode: 'local',
  port: 3645,
  interval: 600,
  'jwt-expiration': 60,
  database: {
    name: 'rss-o-bot',
    options: {
      dialect: 'sqlite',
      storage: `${locations[1]}/feeds.sqlite`
    }
  }
}

const getConfig = (() => {
  const config =
    locations
      .filter(l => {
        try {
          return fs.statSync(l).isDirectory()
        } catch (e) {
          return false
        }
      })
      .slice(0, 1)
      .map(l =>
         debug(`Loading config ${l}`) ||
         [
           fs.readFileSync(path.normalize(`${l}/config.json`)),
           l
         ]
      )
      .map(([c, l]) => Object.assign(defaults, { location: l }, JSON.parse(c)))[0]
  return key => {
    if (!config) {
      throw new Error(configError)
    }
    return (
      key
        ? config[key]
        : config
    )
  }
})()

const privateKeyPath = path.normalize(`${getConfig('location')}/priv.pem`)
const publicKeyPath = path.normalize(`${getConfig('location')}/pub.pem`)

const readFile = p => fs.readFileSync(
  path.normalize(`${getConfig('location')}/${p}`)
)

const cut = (str, l = 100) =>
  str.length > l
    ? [str.substr(0, l), ...cut(str.substr(l), l)]
    : [str]

const tryGetKey = (key) => {
  let cache
  return () => {
    try {
      if (!cache) cache = readFile(`${key}.pem`).toString()
      return cache
    } catch (e) {
      return false
    }
  }
}

const helpers = {
  getConfig, privateKeyPath, publicKeyPath, cut,
  getMode: () =>
    getConfig('remote')
      ? 'remote'
      : getConfig('mode'),

  getTime (mod = 0) {
    return Math.round(((new Date()).getTime()) / 1000) + mod
  },

  setPrivateKey (key) {
    fs.writeFileSync(privateKeyPath, key)
  },
  setPublicKey (key) {
    fs.writeFileSync(publicKeyPath, key)
  },
  getPrivateKey: tryGetKey('priv'),
  getPublicKey: tryGetKey('pub'),

  transformFilter (filter) {
    return (
      filter[0] === '!'
        ? {keyword: filter.substr(1), kind: false}
        : {keyword: filter, kind: true}
    )
  },

  isAbsoluteUrl (str) {
    return !!str.match(new RegExp(`^${protoRegex}|${domainRegex}`))
  },

  getBaseUrl (url) {
    const match = url.match(new RegExp(`(${protoRegex})?${domainRegex}`))
    if (!match) return ''
    return match[0]
  },

  buildMan () {
    const packageInfo = require('../../package.json')
    const synopsis = fs.readFileSync(`${__dirname}/../../src/man/synopsis.md`).toString()
    const raw =
      fs.readFileSync(`${__dirname}/../../src/man/man.md`).toString()
        .replace('[[SYNOPSIS]]', synopsis)
        .replace('[[VERSION]]', packageInfo.version)
    const man = markedMan(raw, {
      version: packageInfo.version,
      section: 1
    })
    return { synopsis, man, raw }
  },

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
          `${id}: ${blogTitle} – ${url} – ${filters}\n`
        ).join('')
      )
}

module.exports = helpers

