/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */
const { Observable: O } = require('rx')

const Config = require('./lib/config')
const Helpers = require('./lib/helpers')
const initStore = require('./lib/store')
const pollFeeds = require('./lib/pollFeeds')(Helpers)
const Notify = require('./lib/notify')

module.exports = function runRSSOBotDaemon (state) {
  const config = state.get('configuration')
  O.combineLatest(
    initStore(config),
    O.interval(config.get('interval') * 1000).startWith(0),
    ([s]) => s
  )
    .flatMap(pollFeeds(Notify(config)))
    /* Restart on error */
    .catch(err => {
      console.error(err)
      return runRSSOBotDaemon(state)
    })
    .subscribe(
      () => {},
      console.error
    )
}

module.exports.pollFeeds = pollFeeds
module.exports.getConfig = Config.readConfig

