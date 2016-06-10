const Rx = require('rx')
const debug = require('debug')('rss-o-bot')

module.exports = (config) => {
  const sends =
    /**
     * Map over all configured notification methods and check if there
     * are installed modules by that name.
     */
    config['notification-methods'].map(m => {
      const module = `rss-o-bot-${m}`
      const msg = `Successfully loaded notifier: ${module}`
      try {
        try {
         /* Attempt local require */
          const send = require(module)(config)
          debug(msg)
          return send
        } catch (e) {
         /* Attempt global require */
          const send = require(`${__dirname}/../../../${module}`)(config)
          debug(msg)
          return send
        }
      } catch (e) {
        /* Notifier not found */
        console.error(e)
        debug(`Failed to load notifier: ${module}`)
      }
    }).filter(f => f) /* Exclude all notifiers, that weren't found */
  return (blog, link, title) =>
    /* Call all registered notifiers */
    Rx.Observable.forkJoin(
      sends.map(f => f(blog, link, title))
    )
}

