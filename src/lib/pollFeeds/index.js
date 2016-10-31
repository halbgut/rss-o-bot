const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

const poll = require('./lib/poll')

/* Extracts blog, link and title from a feed-item */
const callbackWrapper = callback => ({ blogTitle, link, title }) =>
  callback(blogTitle, link, title)
    .do(() => debug('Sent notifications'))
    .retry(2)

module.exports = (H, { throwO }) => {
  const Poll = poll(H)
  /* Takes a store and a feed entity and returns an observable of new links
   * found on that feed.
   */
  const queryFeed = ({updateLatestLink, setBlogTitle}) => feed => {
    const feed$ = O.fromPromise(feed.getFilters())
      .switchMap(filters =>
        Poll(
          feed.get('url'),
          filters.map(f => [f.get('keyword'), f.get('kind')])
        )
          .retry(2)
          .catch(err => {
            const msg = `Failed downloading "${feed.get('url')}"`
            debug(`${msg}: ${err}`)
            return throwO('FAILED_TO_DOWNLOAD_FEED', { error: err, feed: feed.get('url') })
          })
      )
    return (
      feed$
        .switchMap(getNewLinks(feed))
        .filter(({link}) =>
          (link && link !== feed.get('latestLink')) || debug(`Old URL: ${link}`)
        )
        .switchMap(info =>
          feed.get('blogTitle')
            ? O.of(info)
            : setBlogTitle(feed.get('id'), info.blogTitle).mapTo(info)
        )
        .switchMap(info =>
          updateLatestLink(feed.get('id'), info.link).mapTo(info)
        )
        .filter(() => feed.get('latestLink'))
        .do(({link}) => debug(`New URL: ${link}`))
    )
  }

  /* Takes a feed entity and a stream (curried) and checks exctracts all new
   * items from that stream. Then it returns an observable of those items.
   */
  const getNewLinks = feed => stream => {
    if (feed.get('latestLink')) {
      const latestIndex = stream.findIndex(e =>
        e.link === feed.get('latestLink')
      )
      const newLinks = stream.slice(0, latestIndex).reverse()
      return O.of(...newLinks)
    } else if (stream[0]) {
      return O.of(stream[0])
    } else if (stream.length < 1) {
      return O.empty()
    } else {
      throw Error('Unexpected state: stream is not an array')
    }
  }

  const PollFeeds = callback => (store, force) =>
    store.getFeeds(force)
      .switchMap(feeds =>
        O.merge(...feeds.map(queryFeed(store)))
          .switchMap(callbackWrapper(callback))
      )
  PollFeeds.queryFeed = queryFeed
  return PollFeeds
}

