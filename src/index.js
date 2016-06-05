const Rx = require('rx')
const O = Rx.Observable

const {getConfig} = require('./lib/helpers')
const config = getConfig()
const notify = require('./lib/notify')(config)
const poll = require('./lib/poll')
const initStore = require('./lib/store')

O.combineLatest(
  initStore(config),
  Rx.Observable.interval(config.interval * 1000)
)
  .flatMap(([{getFeeds, insertFeed, updateLatestLink}]) =>
    getFeeds()
      .flatMap((feeds) => Rx.Observable.combineLatest(
        ...feeds.map(feed =>
          O.fromPromise(feed.getFilters())
            .flatMap(filters =>
              O.onErrorResumeNext(
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
                      .retry(2)
                  )
                ),
                O.just()
                  .tap(() => console.error(`Failed to get ${feed.get('url')}`))
            )
        )
      ))
  )
  .subscribe(
    () => {},
    err => console.log('ERROR') || console.error(err),
    () => console.log('Complete')
  )

