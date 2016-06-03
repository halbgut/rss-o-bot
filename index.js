const Rx = require('rx')

const locations = [
  `${process.env.HOME}/.rss-o-bot`,
  '/etc/.rss-o-bot',
  `${__dirname}/config.json`
]
const fs = require('fs')
const config =
  locations
    .filter(l => {
      try {
        return fs.statSync(l).isFile()
      } catch (e) {
        return false
      }
    })
    .slice(0, 1)
    .map(l => fs.readFileSync(l))
    .map(c => JSON.parse(c))[0]

if (!config) {
  throw new Error(`No config file found!
RTFM and put one in one of these locations:
${locations.join(', ')}
`)
}

const notify = require('./lib/notify')(config)
const poll = require('./lib/poll')
const initStore = require('./lib/store')

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

