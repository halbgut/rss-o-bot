const path = require('path')
const { test } = require('ava')
const sax = require('sax')
const { Observable: O } = require('rx')

const runCLI = require('../../dist/cli.js')
const H = require('../../dist/lib/helpers')
const initStore = require('../../dist/lib/store')(H)
const Config = require('../../dist/lib/config')(H)
const T = require('./lib/helpers')({ runCLI, initStore, Config })

test.after('remove DB', T.removeDatabases)

test.cb('version', T.run(['-v'])((t, o) =>
  o.map(version =>
    t.regex(version, /RSS\-o\-Bot Version: \d+\.\d+\.\d+/)
  )
))

test.cb('help', T.run(['-h'])((t, o) =>
  o.map(help =>
    help.length > 100
      ? t.pass()
      : t.fail()
  )
))

test.cb('man', T.run(['-m'])((t, o) =>
  o.map(man =>
    man.length > 1000
      ? t.pass()
      : t.fail()
  )
))

/* function to create dummy posts */
const createDummyPost =
  (name, url, filters = []) =>
    initStore(T.getConfigWithDefaults())
      .flatMap(store =>
        store.insertFeed(url, filters)
          .map(store)
      )

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const filter = 'somefilter'
  test.cb('add', T.run(['add', url, filter], 3)((t, o, config) =>
    o.map(feed => {
      const [id, title, setUrl, filters] = T.parsePrintedFeeds(feed)[0]
      t.deepEqual([title, setUrl, filters], ['undefined', url, filter])
      t.regex(id, /\d+/)
    })
      .flatMap(() => initStore(config))
      .flatMap(H.tryCall('getFeeds'))
      .map(T.containsFeedUrl(url, t))
  ))

  test.cb('list', t => {
    const config = T.getConfig()
    t.plan(1)
    initStore(T.toConfig(config))
      .flatMap(H.tryCall('insertFeed', url, []))
      .flatMap(() =>
        runCLI(['node', '', 'list'], null, config)
      )
      .map(T.parsePrintedFeeds)
      .map(T.containsFeedUrl(url, t))
      .subscribe(
        () => {},
        T.handleError(t),
        () => t.end()
      )
  })

  const rmTestURL = 'https://lucaschmid.net/feed/atom.xml'
  test.cb('rm', t => {
    const config = T.getConfig()
    t.plan(1)
    const store$ = initStore(T.toConfig(config))

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
        T.handleError(t),
        () => t.end()
      )
  })
})()

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  test.cb('poll-feeds', t => {
    createDummyPost('poll-feeds', url)
      .flatMap(store =>
        runCLI(['node', '', 'poll-feeds'], null, T.getConfig())
          .map(() => store)
      )
      .flatMap(({ listFeeds }) => listFeeds())
      .tap(feeds =>
        t.truthy(feeds[0].get('title') !== 'undefined')
      )
      .subscribe(
        () => {},
        T.handleError(t),
        () => t.end()
      )
  })
})()

/* Checks if the exported elements contain all elements inside the feed list.
 */
test.cb('export', T.run(['export'], false)((t, o, config) =>
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
    .withLatestFrom(T.getStoreAndListFeeds(config))
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
test.cb('import', T.run(['import', importFile], 2)((t, o, config) =>
  o.flatMap(a => T.getStoreAndListFeeds(config).map(b => [a, b]))
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

test.cb('readConfig', t => {
  Config.readConfig([ `${__dirname}/../config` ])
    .flatMap(initStore)
    .flatMap(({ listFeeds }) => listFeeds())
    .subscribe(
      res => { t.true(Array.prototype.isPrototypeOf(res)) },
      T.handleError(t),
      () => t.end()
    )
})

