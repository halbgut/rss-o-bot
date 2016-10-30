const path = require('path')
const { test } = require('ava')
const sax = require('sax')
const { Observable: O } = require('rxjs/Rx')

const runCLI = require('../../dist/cli.js')
const H = require('../../dist/lib/helpers')
const initStore = require('../../dist/lib/store')(H)
const Config = require('../../dist/lib/config')(H)
const T = require('./lib/helpers')

test.always.after('remove DB', T.removeDatabases)

test.cb('version', T.run(['-v'])((t, o) =>
  o.map(version =>
    t.regex(version, /RSS-o-Bot Version: \d+\.\d+\.\d+/)
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

test.cb('help with mode-flag', T.run(['-h', '--mode=local'])((t, o) =>
  o.map(help =>
    help.length > 100
      ? t.pass()
      : t.fail()
  )
))

test.cb('--config', T.run(['help', `--config=${__dirname}/../config/failing`], 1, false)((t, o) =>
  o.catch(() => {
    t.pass()
    return O.of()
  })
))

test.cb('test-config true', T.run(['test-config', `--config=${__dirname}/../config/succeeding`], 1, false)((t, o) =>
  o.map(x => t.truthy(x))
))

test.cb('test-config false', T.run(['test-config', `--config=${__dirname}/../config/invalid`], 1, false)((t, o) =>
  o.map(x => t.falsy(x))
))

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const filter = 'somefilter'
  test.cb('add', T.run(['add', url, filter, '--no-wrap'], 4)((t, o, config) =>
    o.map(feed => {
      t.truthy(feed.includes('Luca Nils Schmid - Blog'))
      t.truthy(feed.includes(url))
      t.truthy(feed.includes(filter))
    })
      .switchMap(() => initStore(config))
      .switchMap(H.tryCall('getFeeds'))
      .map(T.containsFeedUrl(url, t))
  ))

  test.cb('list', t => {
    const config = T.getConfig()
    t.plan(1)
    initStore(T.toConfig(config))
      .switchMap(H.tryCall('insertFeed', url, []))
      .switchMap(() =>
        runCLI(['node', '', 'list', '--no-wrap'], null, config)
      )
      .subscribe(
        feeds => {
          t.truthy(feeds.includes(url))
        },
        T.handleError(t),
        () => t.end()
      )
  })

  const rmTestURL = 'https://lucaschmid.net/feed/atom.xml'
  test.cb('rm', t => {
    const config = T.getConfig()
    t.plan(1)
    const store$ = initStore(T.toConfig(config))

    store$.switchMap(({ insertFeed, listFeeds }) =>
      insertFeed(rmTestURL, [])
        .switchMap(listFeeds)
        .map(feeds => feeds.filter(feed => feed.get('url') === rmTestURL))
        .map(feeds => feeds[0].get('id'))
        .switchMap(feedId =>
          runCLI(['node', '', 'rm', feedId], null, config)
            .map(() => feedId)
        )
        .switchMap(feedId =>
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
    T.createDummyEntry(url)
      .switchMap(store =>
        runCLI(['node', '', 'poll-feeds'], null, T.getConfig())
          .map(() => store)
      )
      .switchMap(({ listFeeds }) => listFeeds())
      .do(feeds =>
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
  o.switchMap(xmlExport => O.create(o => {
    const parser = sax.parser(true)
    parser.onopentag = t => {
      if (t.name !== 'outline') return
      o.next([t.attributes.xmlUrl || t.attributes.url, t.attributes.title])
    }
    parser.onend = () => { o.complete() }
    parser.onerror = err => o.error(err)
    parser.write(xmlExport).close()
  }))
    .withLatestFrom(T.getStoreAndListFeeds(config))
    .do(([ entry, list ]) => t.true(
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
  o.switchMap(a => T.getStoreAndListFeeds(config).map(b => [a, b]))
    .do(([result, list]) => {
      t.deepEqual(2, result.split('\n').filter(x => !!x).length - 5)
      t.true(
        list.filter(item =>
          item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-email/commits/master.atom' ||
          item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-desktop/commits/master.atom'
        ).length >= 2
      )
    })
))

test.cb('readConfig', t => {
  Config.readConfig([ `${__dirname}/../config/succeeding` ])
    .switchMap(initStore)
    .switchMap(({ listFeeds }) => listFeeds())
    .subscribe(
      res => { t.true(Array.prototype.isPrototypeOf(res)) },
      T.handleError(t),
      () => t.end()
    )
})

