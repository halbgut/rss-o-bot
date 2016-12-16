const { spawn, execSync } = require('child_process')

const Rx = require('rxjs/Rx')
const Immutable = require('immutable')
const uuid = require('node-uuid')
const nock = require('nock')

const runCLI = require('../../../../dist/cli.js')
const H = require('../../../../dist/lib/helpers')
const Errors = require('../../../../dist/lib/errors')
const initStore = require('../../../../dist/lib/store')(H, Errors)
const Config = require('../../../../dist/lib/config')(H)

const DEBUG = process.env.DEBUG

const getConfig = ((id = 0) => (extend = {}) => {
  const db = `${__dirname}/../../../../data/test_feeds-${uuid.v4()}.sqlite`
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

const mockLucaschmidNet = () => {
  /* Setting up network mocks */
  const lucaschmidNock = nock('https://lucaschmid.net/feed')
  lucaschmidNock.get('/rss.xml')
    .times(999)
    .replyWithFile(200, `${__dirname}/../../../data/lucaschmidNetFeedRss.xml`)
  lucaschmidNock.get('/atom.xml')
    .times(999)
    .replyWithFile(200, `${__dirname}/../../../data/lucaschmidNetFeedAtom.xml`)
}

const removeDatabases = t => {
  execSync(`rm ${__dirname}/../../../../data/test_feeds-*.sqlite`)
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
        const [title, setUrl, filters] = rest.split(' | ')
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
    .switchMap(cb)

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
      .switchMap(store =>
        store.insertFeed(url, filters)
          .map(feed => storeAndEntity ? [store, feed] : store)
      )

const startServer =
  (port, configDir, t) => {
    const subject = new Rx.Subject()
    const server = spawn('bash', [
      '-c',
      `DEBUG=${DEBUG} RSS_O_BOT_TESTING_MODE= ../../../dist/cli.js run --mode=server --config=${configDir} --port=${port}`
    ])

    server.stdout.on('data', buff => {
      if (!buff) return
      const msg = buff.toString()
      if (DEBUG) console.log(msg)
      if (msg.includes('Succssfully started server.')) {
        subject.next(true)
        subject.complete()
      }
    })

    server.stderr.on('data', buff => {
      if (!buff) return
      const msg = buff.toString()
      if (DEBUG) console.error(msg)
      /* Ignore debug statements */
      if (msg.match(/ GMT rss-o-bot /)) return
      subject.error(msg)
    })

    process.on('exit', () => {
      if (!server.killed) server.kill()
    })

    return subject
  }

module.exports = {
  mockLucaschmidNet,
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

