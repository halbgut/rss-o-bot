const path = require('path')
const fs = require('fs')
const { test } = require('ava')
const sax = require('sax')
const { Observable: O } = require('rx')

const runCLI = require('../../dist/cli.js')
const configLocations = [`${__dirname}/../config/local`]
const initStore = require('../../dist/lib/store')
const Config = require('../../dist/lib/config')
const H = require('../../dist/lib/helpers')

const handleError = t => err => {
  t.fail('test failed')
  t.end()
}

const run = (a, n = 1) => f => t => {
  if (n) t.plan(n)
  const o = runCLI(['node', '', ...a], configLocations)
  f(t, o)
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

const getStoreAnd = cb => () =>
  Config.readConfig(configLocations)
    .flatMap(initStore)
    .flatMap(cb)

const getStoreAndListFeeds = getStoreAnd(({ listFeeds }) => listFeeds())

test.after('remove DB', t => {
  console.log('unlinking!')
  fs.unlink(`${__dirname}/../../data/test_feeds.sqlite`)
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
  (url, filters = []) =>
    Config.readConfig(configLocations)
      .flatMap(initStore)
      .flatMap(store =>
        store.insertFeed(url, filters)
          .map(store)
      )

; (() => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const filter = 'somefilter'
  test.serial.cb('add', run(['add', url, filter], 3)((t, o) =>
    o.map(feed => {
      const [id, title, setUrl, filters] = parsePrintedFeeds(feed)[0]
      t.deepEqual([title, setUrl, filters], ['undefined', url, filter])
      t.regex(id, /\d+/)
    })
      .flatMap(Config.readConfig(configLocations))
      .flatMap(initStore)
      .flatMap(H.tryCall('getFeeds'))
      .map(containsFeedUrl(url, t))
  ))

  test.cb('list', t => {
    t.plan(1)
    Config.readConfig(configLocations)
      .flatMap(initStore)
      .flatMap(H.tryCall('insertFeed', url, []))
      .flatMap(() =>
        runCLI(['node', '', 'list'], configLocations)
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
  test.serial.cb('rm', t => {
    t.plan(1)
    const store$ =
      Config.readConfig(configLocations)
        .flatMap(initStore)

    store$.flatMap(({ insertFeed, listFeeds }) =>
      insertFeed(rmTestURL, [])
        .flatMap(listFeeds)
        .map(feeds => feeds.filter(feed => feed.get('url') === rmTestURL))
        .map(feeds => feeds[0].get('id'))
        .flatMap(feedId =>
          runCLI(['node', '', 'rm', feedId], configLocations)
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
    createDummyPost(url)
      .flatMap(store =>
        runCLI(['node', '', 'poll-feeds'], configLocations)
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
 * The test needs to be serial, to insure, that no entries are added/destroyed
 * between `export` and `listFeeds`.
 */
test.serial.cb('export', run(['export'], false)((t, o) =>
  o
    .flatMap(xmlExport => O.create(o => {
      const parser = sax.parser(true)
      parser.onopentag = t => {
        if (t.name !== 'outline') return
        o.onNext([t.attributes.xmlUrl || t.attributes.url, t.attributes.title])
      }
      parser.onend = () => { o.onCompleted() }
      parser.onerror = err => o.onError(err)
      parser.write(xmlExport).close()
    }))
    .withLatestFrom(getStoreAndListFeeds())
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
test.cb('import', run(['import', importFile], 2)((t, o) =>
  o.withLatestFrom(getStoreAndListFeeds())
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

