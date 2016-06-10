const Rx = require('rx')
const debug = require('debug')('rss-o-bot')

module.exports = (config) => {
  const sends =
    config['notification-methods'].map(m => {
      const module = `rss-o-bot-${m}`
      const msg = `Successfully loaded notifier: ${module}`
      try {
        try {
          const send = require(module)(config)
          debug(msg)
          return send
        } catch (e) {
          const send = require(`${__dirname}/../../../${module}`)(config) // Global require
          debug(msg)
          return send
        }
      } catch (e) {
        console.error(e)
        debug(`Failed to load notifier: ${module}`)
      }
    }).filter(f => f)
  return (blog, link, title) =>
    Rx.Observable.forkJoin(
      sends.map(f => f(`${blog} posted something new.`, link, title))
    )
}

