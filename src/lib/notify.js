const Rx = require('rx')
const debug = require('debug')('rss-o-bot')

module.exports = (config) => {
  const sends =
    config['notification-methods'].map(m => {
      const module = `rss-o-bot-${m}`
      try {
        const send = require(module)(config)
        debug(`Successfully loaded notifier: ${module}`)
        return send
      } catch (e) {
        debug(`Failed to load notifier: ${module}`)
      }
    }).filter(f => f)
  return (blog, link) =>
    Rx.Observable.forkJoin(
      sends.map(f => f(`${blog} posted something new.`, link))
    )
}

