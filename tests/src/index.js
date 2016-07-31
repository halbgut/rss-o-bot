const path = require('path')
const fs = require('fs')
const { test } = require('ava')
const sax = require('sax')
const { Observable: O } = require('rx')
const Immutable = require('immutable')

const runCLI = require('../../dist/cli.js')
const initStore = require('../../dist/lib/store')
const Config = require('../../dist/lib/config')
const H = require('../../dist/lib/helpers')
const databases = []

const getConfig = ((id = 0) => () => {
  const db = `${__dirname}/../../data/test_feeds-${++id}.sqlite`
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
  console.error(err)
  t.fail('test failed')
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

test.after('remove DB', t => {
  databases.forEach(fs.unlinkSync)
  t.pass()
})

test.cb('version', run(['-v'])((t, o) =>
  o.map(version =>
    t.regex(version, /RSS\-o\-Bot Version: \d+\.\d+\.\d+/)
  )
))

test.cb('help', run(['-h'])((t, o) =>
  o.map(help =>
    help.length > 100
      ? t.pass()
      : t.fail()
  )
))

test.cb('man', run(['-m'])((t, o) =>
  o.map(man =>
    man.length > 1000
      ? t.pass()
      : t.fail()
  )
))

/* function to create dummy posts */
const createDummyPost =
  (name, url, filters = []) =>
    initStore(getConfigWithDefaults())
      .flatMap(store =>
        store.insertFeed(url, filters)
          .map(store)
      )

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const filter = 'somefilter'
  test.cb('add', run(['add', url, filter], 3)((t, o, config) =>
    o.map(feed => {
      const [id, title, setUrl, filters] = parsePrintedFeeds(feed)[0]
      t.deepEqual([title, setUrl, filters], ['undefined', url, filter])
      t.regex(id, /\d+/)
    })
      .flatMap(() => initStore(config))
      .flatMap(H.tryCall('getFeeds'))
      .map(containsFeedUrl(url, t))
  ))

  test.cb('list', t => {
    const config = getConfig()
    t.plan(1)
    initStore(toConfig(config))
      .flatMap(H.tryCall('insertFeed', url, []))
      .flatMap(() =>
        runCLI(['node', '', 'list'], null, config)
      )
      .map(parsePrintedFeeds)
      .map(containsFeedUrl(url, t))
      .subscribe(
        () => {},
        handleError(t),
        () => t.end()
      )
  })

  const rmTestURL = 'https://lucaschmid.net/feed/atom.xml'
  test.cb('rm', t => {
    const config = getConfig()
    t.plan(1)
    const store$ = initStore(toConfig(config))

    store$.flatMap(({ insertFeed, listFeeds }) =>
      insertFeed(rmTestURL, [])
        .flatMap(listFeeds)
        .map(feeds => feeds.filter(feed => feed.get('url') === rmTestURL))
        .map(feeds => feeds[0].get('id'))
        .flatMap(feedId =>
          runCLI(['node', '', 'rm', feedId], null, config)
            .map(() => feedId)
        )
        .flatMap(feedId =>
          listFeeds()
            .map(feeds =>
              t.deepEqual(feeds.filter(feed => feed.get('id') === feedId).length, 0)
            )
        )
    )
      .subscribe(
        () => {},
        handleError(t),
        () => t.end()
      )
  })
})()

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  test.cb('poll-feeds', t => {
    createDummyPost('poll-feeds', url)
      .flatMap(store =>
        runCLI(['node', '', 'poll-feeds'], null, getConfig())
          .map(() => store)
      )
      .flatMap(({ listFeeds }) => listFeeds())
      .tap(feeds =>
        t.truthy(feeds[0].get('title') !== 'undefined')
      )
      .subscribe(
        () => {},
        handleError(t),
        () => t.end()
      )
  })
})()

/* Checks if the exported elements contain all elements inside the feed list.
 */
test.cb('export', run(['export'], false)((t, o, config) =>
  o.flatMap(xmlExport => O.create(o => {
    const parser = sax.parser(true)
    parser.onopentag = t => {
      if (t.name !== 'outline') return
      o.onNext([t.attributes.xmlUrl || t.attributes.url, t.attributes.title])
    }
    parser.onend = () => { o.onCompleted() }
    parser.onerror = err => o.onError(err)
    parser.write(xmlExport).close()
  }))
    .withLatestFrom(getStoreAndListFeeds(config))
    .tap(([ entry, list ]) => t.true(
      !!list.find(item =>
        item.get('url') === entry[0] &&
        (
          !item.get('blogTitle') ||
          item.get('blogTitle') === entry[1]
        )
      )
    ))
))

const importFile = path.resolve(__dirname, '..', 'data', 'export.xml')
test.cb('import', run(['import', importFile], 2)((t, o, config) =>
  o.flatMap(a => getStoreAndListFeeds(config).map(b => [a, b]))
    .tap(([result, list]) => {
      t.deepEqual(2, result.split('\n').filter(x => !!x).length)
      t.true(
        list.filter(item =>
          item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-email/commits/master.atom' ||
          item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-desktop/commits/master.atom'
        ).length >= 2
      )
    })
))

