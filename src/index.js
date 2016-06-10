/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */
const Rx = require('rx')
const O = Rx.Observable
const debug = require('debug')('rss-o-bot')

const {getConfig} = require('./lib/helpers')
const config = getConfig()
const notify = require('./lib/notify')(config)
const poll = require('./lib/poll')
const initStore = require('./lib/store')

module.exports = function runRSSOBotDaemon () {
  O.combineLatest(
    initStore(config),
    Rx.Observable.interval(config.interval * 1000).startWith(0)
  )
    .flatMap(([s]) => pollFeeds(s))
    .subscribe(
      () => {},
      err => console.log('ERROR') || console.error(err),
      () => console.log('Complete')
    )
}

module.exports.pollFeeds = pollFeeds
module.exports.config = config

function pollFeeds ({getFeeds, insertFeed, updateLatestLink}, force) {
  return (
    getFeeds()
      .flatMap((feeds) => Rx.Observable.combineLatest(
        ...feeds.map(feed =>
          O.fromPromise(feed.getFilters())
            .flatMap(filters =>
              O.onErrorResumeNext(
                poll(feed.get('url'), filters.map(f => [f.get('keyword'), f.get('kind')]))
                  .retry(2)
                  .flatMap(getNewLinks(feed))
                  .filter(({latestLink}) =>
                    (latestLink && latestLink !== feed.get('latestLink')) || debug(`Old URL: ${latestLink}`)
                  )
                  .flatMap((info) =>
                    updateLatestLink(feed.get('id'), info.latestLink).map(info)
                  )
                  .filter(() => feed.get('latestLink'))
                  .tap(({latestLink}) => debug(`New URL: ${latestLink}`))
                  .flatMap(({ blog, latestLink, latestTitle }) =>
                    notify(blog, latestLink, latestTitle)
                      .tap(() => debug('Sent notifications'))
                      .retry(2)
                  )
                ),
                O.just()
                  .tap(() => console.error(`Failed to get ${feed.get('url')}`))
            )
        )
      ))
  )
}

const getNewLinks = feed => stream =>
  feed.get('latestLink')
    ? O.fromArray(stream.slice(
      0,
      stream.findIndex(e => e.latestLink === feed.get('latestLink'))
    ).reverse())
    : O.of(stream[0])

