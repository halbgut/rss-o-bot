const fs = require('fs')

const Immutable = require('immutable')
const runCLI = require('../../../dist/cli.js')
const initStore = require('../../../dist/lib/store')
const Config = require('../../../dist/lib/config')

const databases = []

const removeDatabases = t => {
  databases.forEach(db => {
    try {
      fs.unlinkSync(db)
    } catch (e) {
      /* Ignore errors, since some tests don't ever ope na db */
    }
  })
  t.pass()
}
module.exports.removeDatabases = removeDatabases

const getConfig = ((id = 0) => () => {
  const db = `${__dirname}/../../../data/test_feeds-${++id}.sqlite`
  databases.push(db)
  return {
    'database': {
      'name': 'data',
      'options': {
        'dialect': 'sqlite',
        'storage': db
      }
    }
  }
})()
module.exports.getConfig = getConfig

const toConfig = object =>
  Config.applyDefaults(Immutable.fromJS(object))
module.exports.toConfig = toConfig

const getConfigWithDefaults = () => toConfig(getConfig())
module.exports.getConfigWithDefaults = getConfigWithDefaults

const handleError = t => err => {
  console.error(err)
  t.fail('test failed')
  t.end()
}
module.exports.handleError = handleError

const run = (a, n = 1) => f => t => {
  if (n) t.plan(n)
  const config = toConfig(getConfig())
  const o = runCLI(['node', '', ...a], null, config)
  f(t, o, config)
    .subscribe(
      () => {},
      handleError(t),
      () => t.end()
    )
}
module.exports.run = run

const parsePrintedFeeds = feeds =>
  feeds.split('\n')
    .map(feed => {
      if (feed.length < 1) {
        return false
      } else {
        const [id, rest] = feed.split(': ')
        const [title, setUrl, filters] = rest.split(' - ')
        return [id, title, setUrl, filters]
      }
    })
    .filter(x => !!x)
module.exports.parsePrintedFeeds = parsePrintedFeeds

const containsFeedUrl = (url, t) => feeds => {
  const feedsMatching = feeds.filter(feed =>
    typeof feed.get === 'function'
      ? feed.get('url') === url
      : feed[2] === url
  )
  return t.true(feedsMatching.length >= 1)
}
module.exports.containsFeedUrl = containsFeedUrl

const getStoreAnd = cb => config =>
  initStore(config)
    .flatMap(cb)
module.exports.getStoreAnd = getStoreAnd

const getStoreAndListFeeds = getStoreAnd(({ listFeeds }) => listFeeds())
module.exports.getStoreAndListFeeds = getStoreAndListFeeds

