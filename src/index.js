/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */
const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

const Helpers = require('./lib/helpers')
const Config = require('./lib/config')(Helpers)
const initStore = require('./lib/store')(Helpers)
const Errors = require('./lib/errors')
const pollFeeds = require('./lib/pollFeeds')(Helpers, Errors)
const Notify = require('./lib/notify')(Helpers)

module.exports = function runRSSOBotDaemon (state) {
  const config = state.get('configuration')
  O.combineLatest(
    initStore(config),
    O.interval(config.get('interval') * 1000).startWith(0)
  )
    .map(([store]) => store)
    .switchMap(pollFeeds(Notify(config)))
    /* Restart on error */
    .catch(err => {
      debug(state)
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

