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
    lastCheck: 0
  }))

// TODO: Data races have been prevented.
// The updaterId is for reference inside the next select query
// Now the problem is, that the load isn't evenly spread between
// threads. To implement that, I'd have to do a findOne using
// The same where clause, as here, try updating the element and
// still use that same where clause in that query. Then use a
// retryWhen operator to repeat the whole process if the update
// query didn't affect any elements.
const genGetFeeds = (Feed, interval) => () => {
  const updaterId = Math.round(Math.random() * 1000000000000)
  return Rx.Observable.fromPromise(
    Feed.update(
      { lastCheck: getTime(), updaterId },
      { where: { lastCheck: { $lt: getTime(interval * -1) } } }
    )
      .then(() => Feed.findAll({
        where: { updaterId }
      }))
  )
}

const genUpdateLatestLink = Feed => (id, latestLink) => console.log(id, latestLink) ||
  Rx.Observable.fromPromise(Feed.update(
    { latestLink },
    { where: { id } }
  ))

const genRemoveFeed = Feed => id => Rx.Observable.fromPromise(
  Feed.findById(id)
    .then(feed => feed.destroy())
)

const genListFeeds = Feed => () => Rx.Observable.fromPromise(Feed.findAll())

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
      latestLink: Sequelize.STRING,
      updaterId: Sequelize.STRING
    })
      .last()
      .map(Feed => ({
        _Feed: Feed,
        insertFeed: genInsertFeed(Feed),
        getFeeds: genGetFeeds(Feed, config.interval),
        updateLatestLink: genUpdateLatestLink(Feed),
        removeFeed: genRemoveFeed(Feed),
        listFeeds: genListFeeds(Feed)
      }))
  )
}

