const { test } = require('ava')

const runCLI = require('../../dist/cli.js')
const H = require('../../dist/lib/helpers')
const initStore = require('../../dist/lib/store')(H)
const Config = require('../../dist/lib/config')(H)
const Poll = require('../../dist/lib/pollFeeds/lib/poll.js')(H)
const T = require('./lib/helpers')({ runCLI, initStore, Config })

test.cb('config injection', t => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const config = T.getConfigWithDefaults({
    'notification-methods': [`${__dirname}/lib/notifier.js`]
  })
  global.NOTIFIER_TEST_OBJECT = t
  T.createDummyEntry(url, [], config, true)
    .flatMap(([store, feed]) =>
      Poll(url, [])
        .map(entries => entries.slice(-2))
        .flatMap(([_, { link }]) =>
          store.updateLatestLink(feed.get('id'), link)
        )
    )
    .flatMap(() => runCLI(['node', '', 'poll-feeds'], null, config))
    .subscribe(
      () => {},
      T.handleError(t)
    )
})

