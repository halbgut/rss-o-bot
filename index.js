const Rx = require('rx')

const config = require('./config')
const notify = require('./lib/notify')(config)
const poll = require('./lib/poll.js')
const initStore = require('./lib/store.js')

Rx.Observable.interval(config.interval * 1000).startWith(0).flatMap(
  initStore(config).flatMap(({getFeeds, insertFeed, updateLatestLink}) =>
    getFeeds()
      .flatMap((feeds) => Rx.Observable.combineLatest(
        ...feeds.map(feed =>
          poll(feed.get('url'))
            .retry(2)
            .filter(({latestLink}) =>
              latestLink !== feed.get('latestLink')
            )
            .flatMap(({ blog, latestLink }) =>
              Rx.Observable.forkJoin(
                notify(blog, latestLink),
                updateLatestLink(feed.get('id'), latestLink)
              )
            )
        )
      ))
  ).retry()
)
  .subscribe(
    console.log,
    console.error,
    () => console.log('Complete')
  )

