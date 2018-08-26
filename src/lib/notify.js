/**
 * notifiy
 * This module notifies about new entries users.
 */
const path = require('path')
const R = require('ramda')

const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

const H = require('./shared/helpers')
const { throwO } = require('./shared/errors')

module.exports = config => {
  const setMethods = config.get('notification-methods') || []
  const notifierFunctions = getNotifierFunctions(config, setMethods)

  return (blog, link, title) =>
    /* Call all registered notifiers */
    O.merge(...notifierFunctions)
      .flatMap(f => f(blog, link, title))
      /* The results should be ignored here */
      .toArray()
      .concatMap(results =>
        results.length < 1
          ? throwO('NO_VALID_NOTIFIERS', { setMethods })
          : O.of(true)
      )
}

const getNotifierFunctions = (config, setMethods) =>
  /* Map over all configured notification methods and check if there
   * are installed modules by that name. require and isDirectory both
   * throw errors if the directory or module doesn't exist.
   */
  setMethods.map(module => {
    /* Notifiers may just be functions. */
    if (R.is(Function, module)) return O.of(module(config))
    return H.getNpmPrefix()
      .switchMap(prefix =>
        H.findExistingDirectory([
          module,
          path.join(prefix, 'lib', 'node_modules', `rss-o-bot-${module}`),
          path.join(prefix, 'node_modules', `rss-o-bot-${module}`),
          path.join(prefix, 'lib', 'node_modules', module),
          path.join(prefix, 'node_modules', module)
        ])
      )
      .map(require)
      .map(module => module(config))
      .do(() => debug(`Successfully loaded notifier: ${module}`))
      .catch(() => {
        H.logError(`Failed to load notifier "${module}"`)
        return O.empty()
      })
  })
