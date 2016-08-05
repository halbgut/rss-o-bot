const fs = require('fs')

const Immutable = require('immutable')

module.exports = ({ runCLI, initStore, Config }) => {
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

  const toConfig = object =>
    Config.applyDefaults(Immutable.fromJS(object))

  const getConfigWithDefaults = () => toConfig(getConfig())

  const handleError = t => err => {
    t.fail(`test failed: ${err.message}`)
    t.end()
  }

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

  const containsFeedUrl = (url, t) => feeds => {
    const feedsMatching = feeds.filter(feed =>
      typeof feed.get === 'function'
        ? feed.get('url') === url
        : feed[2] === url
    )
    return t.true(feedsMatching.length >= 1)
  }

  const getStoreAnd = cb => config =>
    initStore(config)
      .flatMap(cb)

  const getStoreAndListFeeds = getStoreAnd(({ listFeeds }) => listFeeds())

  const testObservable = o => t =>
    o.subscribe(
      () => {},
      handleError(t),
      () => t.end()
    )

  return {
    removeDatabases,
    getConfig,
    toConfig,
    getConfigWithDefaults,
    handleError,
    run,
    parsePrintedFeeds,
    containsFeedUrl,
    getStoreAnd,
    getStoreAndListFeeds,
    testObservable
  }
}

