const fs = require('fs')
const { spawn } = require('child_process')

const Rx = require('rx')
const Immutable = require('immutable')
const uuid = require('node-uuid')

const runCLI = require('../../../dist/cli.js')
const H = require('../../../dist/lib/helpers')
const initStore = require('../../../dist/lib/store')(H)
const Config = require('../../../dist/lib/config')(H)

const DEBUG = process.env.DEBUG
const databases = []

const getConfig = ((id = 0) => (extend = {}) => {
  const db = `${__dirname}/../../../data/test_feeds-${uuid.v4()}.sqlite`
  databases.push(db)
  return Object.assign({
    'database': {
      'name': 'data',
      'options': {
        'dialect': 'sqlite',
        'storage': db
      }
    }
  }, extend)
})()

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

const toConfig = object =>
  Config.applyDefaults(Immutable.fromJS(object))

const getConfigWithDefaults = extend => toConfig(getConfig(extend))

const handleError = t => err => {
  t.fail(`test failed: ${err.message}`)
  t.end()
}

const run = (a, n = 1, passConfig = true) => (f, configExtend, configLocations) => t => {
  if (n) t.plan(n)
  const config = passConfig
    ? toConfig(getConfig(configExtend))
    : null
  const o = runCLI(['node', '', ...a], configLocations, config)
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

/* function to create dummy posts */
const createDummyEntry =
  (url, filters = [], config = getConfigWithDefaults(), storeAndEntity) =>
    initStore(config)
      .flatMap(store =>
        store.insertFeed(url, filters)
          .map(feed => storeAndEntity ? [store, feed] : store)
      )

const startServer =
  (port, configDir, t) => {
    const subject = new Rx.Subject()
    const server = spawn('bash', [
      '-c',
      `DEBUG=${DEBUG} RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --mode=server --config=${configDir} --port=${port}`
    ])

    server.stdout.on('data', buff => {
      const msg = buff.toString()
      if (msg === 'Server started!\n') {
        subject.onNext(true)
        subject.onCompleted()
      }
    })

    server.stderr.on('data', buff => {
      const msg = buff.toString()
      subject.onError(msg)
    })

    if (t) {
      t.after.always(() => {
        server.kill()
      })
    }

    return subject
  }

module.exports = {
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
  testObservable,
  createDummyEntry,
  startServer
}

