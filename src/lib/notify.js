/**
 * notifiy
 * This module notifies about new entries users.
 */
const { Observable: O } = require('rx')
const debug = require('debug')('rss-o-bot')

module.exports = H => config => {
  let sends
  const setMethods = config.get('notification-methods')
  if (setMethods && setMethods.length > 0) {
    /**
     * Map over all configured notification methods and check if there
     * are installed modules by that name.
     */
    sends = setMethods.map(module => {
      O.onErrorResumeNext(
        H.isDirectory(module),
        H.isDirectory(`${__dirname}/../../../rss-o-bot-${module}`).map(require),
        H.isDirectory(`${__dirname}/../../../${module}`).map(require),
        O.of(module).map(require),
        O.of(`rss-o-bot-${module}`).map(require)
      )
        .map(f => (config.toJS()))
        .catch(() => { console.error(`Failed to load notifier ${module}`) })
        .filter(f => f) /* Exclude all notifiers, that weren't found */
        .tap(() => debug(`Successfully loaded notifier: ${module}`))
    })
  } else {
    sends = [O.of]
  }

  return (blog, link, title) =>
    /* Call all registered notifiers */
    sends
      .flatMap(f => f(blog, link, title))
      .last()
}

