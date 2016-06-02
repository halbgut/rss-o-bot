const {getTime} = require('./helpers.js')

const Rx = require('rx')
const Sequelize = require('sequelize')

const define = (sequelize, ...args) => {
  const entity = sequelize.define(...args)
  return Rx.Observable.create(o => {
    sequelize.sync()
      .then(r => {
        o.onNext(entity)
        o.onCompleted()
      })
      .catch(err => o.onError(err))
  })
}

const genInsertFeed = Feed => url =>
  Rx.Observable.fromPromise(Feed.create({
    url,
    addded: getTime(),
    date: 0
  }))

const genGetFeed = (Feed, interval) => () =>
  Rx.Observable.fromPromise(Feed.update(
    { lastCheck: getTime() },
    {
      where: { lastCheck: { $lt: getTime(interval * -1) } }
      // limit: 1 # This needs to work, in order to multithread it
    }
  ))

const genUpdateLatestLink = Feed => (id, latestLink) =>
  Rx.Observable.fromPromise(Feed.update(
    { latestLink },
    { where: { id } }
  ))

module.exports = function initStore (config) {
  const sequelize = new Sequelize(
    config.name,
    config.username,
    config.password,
    config.database.options
  )
  return (
    define(sequelize, 'feed', {
      url: Sequelize.STRING,
      added: Sequelize.INTEGER,
      lastCheck: Sequelize.INTEGER,
      latestLink: Sequelize.STRING
    })
      .last()
      .map(Feed => ({
        _Feed: Feed,
        insertFeed: genInsertFeed(Feed),
        getFeeds: genGetFeed(Feed, config.interval),
        updateLatestLink: genUpdateLatestLink(Feed)
      }))
  )
}

