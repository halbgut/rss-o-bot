const { test } = require('ava')
const { Observable: O } = require('rx')

const runCLI = require('../../dist/cli.js')
const H = require('../../dist/lib/helpers')
const initStore = require('../../dist/lib/store')(H)
const Config = require('../../dist/lib/config')(H)
const Poll = require('../../dist/lib/pollFeeds/lib/poll.js')(H)
const T = require('./lib/helpers')({ runCLI, initStore, Config })

const createDummyEntryAndPoll = (config, url) =>
  T.createDummyEntry(url, [], config, true)
    .flatMap(([store, feed]) =>
      Poll(url, [])
        .map(entries => entries.slice(0, 2))
        .flatMap(([latest, { link }]) =>
          store.updateLatestLink(feed.get('id'), link).map(latest)
        )
    )

test.cb('notifier injection', t => {
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const config = T.getConfigWithDefaults({
    'notification-methods': [`${__dirname}/lib/notifier.js`]
  })
  global.NOTIFIER_TEST_OBJECT = t
  createDummyEntryAndPoll(config, url)
    .flatMap(() => runCLI(['node', '', 'poll-feeds'], null, config))
    .subscribe(
      () => {},
      T.handleError(t)
    )
})

test.cb('notifiers/poll-feeds order', t => {
  let latestItem
  const notify = config => (blog, link, title) => {
    t.is(link, latestItem.link)
    t.end()
    return O.of(true)
  }
  const url = 'https://lucaschmid.net/feed/rss.xml'
  const config = T.getConfigWithDefaults({
    'notification-methods': [notify]
  })
  createDummyEntryAndPoll(config, url)
    .tap(latest => { latestItem = latest })
    .flatMap(() => runCLI(['node', '', 'poll-feeds'], null, config))
    .subscribe(
      () => {},
      T.handleError(t)
    )
})

