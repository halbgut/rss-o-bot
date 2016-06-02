const Rx = require('rx')

const config = require('./config')
const notify = require('./lib/notify')(config)
const poll = require('./lib/poll.js')
const initStore = require('./lib/store.js')

Rx.Observable.combineLatest(
  initStore(config),
  Rx.Observable.interval(config.interval * 1000),
  ({getFeeds, insertFeed, updateLatestLink}) => {
    getFeeds()
      .flatMap(feeds => Rx.combineLatest(
        ...feeds.map(feed =>
          poll(feed.get('url'))
            .filter(({latestLink}) =>
              latestLink !== feed.get('latestLink')
            )
            .map(({ blog, link }) => notify(blog, link))
        )
      ))
  }
)
  .subscribe(
    console.log,
    console.error
  )

