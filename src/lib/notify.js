/**
 * notifiy
 * This module notifies about new entries users.
 */
const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

module.exports = H => config => {
  const setMethods = config.get('notification-methods') || []
  const notifierFunctions = getNotifierFunctions(H, config, setMethods)

  return (blog, link, title) =>
    /* Call all registered notifiers */
    O.merge(...notifierFunctions)
      .switchMap(f => f(blog, link, title))
      /* The results should be ignored here */
      .last()
}

const getNotifierFunctions = (H, config, setMethods) =>
  /* Map over all configured notification methods and check if there
   * are installed modules by that name. require and isDirectory both
   * throw errors if the directory or module doesn't exist.
   */
  setMethods.map(module =>
    typeof module === 'function'
      ? O.of(module(config))
      : O.onErrorResumeNext(
        H.isDirectory(module).map(require),
        H.getNpmPrefix()
          .switchMap(prefix =>
            H.isDirectory(`${prefix}/${module}`)
              .catch(() => H.isDirectory(`${prefix}/rss-o-bot-${module}`))
              .map(require)
          )
      )
        .defaultIfEmpty()
        .filter(x => {
          if (!x) throw new Error(`Failed to load notifier ${module}`)
          return true
        })
        .map(f => f(config))
        .do(() => debug(`Successfully loaded notifier: ${module}`))
  )

