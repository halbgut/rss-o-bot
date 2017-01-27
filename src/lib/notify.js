/**
 * notifiy
 * This module notifies about new entries users.
 */
const path = require('path')

const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

const H = require('./shared/helpers')

module.exports = config => {
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
            H.isDirectory(path.join(prefix, module))
              .do(null, (path) => { debug(`Notifier not in ${path}`) })
              .catch(() => H.isDirectory(path.join(prefix, `rss-o-bot-${module}`)))
              .do((path) => { debug(`Notifier found in ${path}`) })
              .catch(() => {
                debug(`Notifier not in ${path}`)
                debug(`Continuing with normal operation without notifier ${module}`)
                return O.empty()
              })
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
