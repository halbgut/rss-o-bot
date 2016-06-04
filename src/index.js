const Rx = require('rx')

const {getConfig} = require('./lib/helpers')
const config = getConfig()
const notify = require('./lib/notify')(config)
const poll = require('./lib/poll')
const initStore = require('./lib/store')

Rx.Observable.interval(config.interval * 1000).startWith(0).flatMap(
  initStore(config).flatMap(({getFeeds, insertFeed, updateLatestLink}) =>
    getFeeds()
      .flatMap((feeds) => Rx.Observable.combineLatest(
        ...feeds.map(feed =>
          Rx.Observable.fromPromise(feed.getFilters())
            .flatMap(filters =>
              poll(feed.get('url'), filters.map(f => [f.get('keyword'), f.get('kind')]))
                .retry(2)
                .flatMap((info) =>
                  updateLatestLink(feed.get('id'), info.latestLink).map(info)
                )
                .filter(({latestLink}) =>
                  feed.get('latestLink') && latestLink !== feed.get('latestLink')
                )
                .flatMap(({ blog, latestLink }) =>
                  notify(blog, latestLink)
                )
            )
        )
      ))
  )
  .retry()
  .filter(() => false)
)
  .subscribe(
    console.log,
    console.error,
    () => console.log('Complete')
  )

