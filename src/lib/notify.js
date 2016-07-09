/**
 * notifiy
 * This module notifies about new entries users.
 */
const { Observable: O } = require('rx')
const debug = require('debug')('rss-o-bot')

module.exports = (config) => {
  let sends
  const setMethods = config.get('notification-methods')
  if (setMethods && setMethods.length > 0) {
    /**
     * Map over all configured notification methods and check if there
     * are installed modules by that name.
     */
    sends = setMethods.map(m => {
      const configObj = config.toJS()
      const module = `rss-o-bot-${m}`
      const msg = `Successfully loaded notifier: ${module}`
      try {
        try {
         /* Attempt local require */
          const send = require(module)(configObj)
          debug(msg)
          return send
        } catch (e) {
         /* Attempt global require */
          const send = require(`${__dirname}/../../../${module}`)(configObj)
          debug(msg)
          return send
        }
      } catch (e) {
        /* Notifier not found */
        console.error(e)
        debug(`Failed to load notifier: ${module}`)
      }
    }).filter(f => f) /* Exclude all notifiers, that weren't found */
  } else {
    sends = [O.of]
  }

  return (blog, link, title) =>
    /* Call all registered notifiers */
    O.forkJoin(
      sends.map(f => f(blog, link, title))
    )
}

