const fs = require('fs')
const { test } = require('ava')

const runCLI = require('../src/cli.js')
const configLocations = [`${__dirname}/config/local`]
const initStore = require('../src/lib/store')
const Config = require('../src/lib/config')
const H = require('../src/lib/helpers')

const handleError = t => err => {
  console.error(err)
  t.fail('poll-feeds failed')
  t.end()
}

const run = (a, n = 1) => f => t => {
  t.plan(n)
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

test.after('remove DB', t => {
  fs.unlink(`${__dirname}/../data/test_feeds.sqlite`)
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
  test.cb('add', run(['add', url, filter], 3)((t, o) =>
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

  test.cb('rm', t => {
    t.plan(1)
    const store$ =
      Config.readConfig(configLocations)
        .flatMap(initStore)

    store$.flatMap(({ insertFeed, listFeeds }) =>
      insertFeed(url + '2', [])
        .flatMap(listFeeds)
        .map(feeds => feeds.filter(feed => feed.get('url') === url + '2'))
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

