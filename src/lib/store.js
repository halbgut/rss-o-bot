const {getTime} = require('./helpers.js')

const Rx = require('rx')
const O = Rx.Observable
const Sequelize = require('sequelize')

const genInsertFeed = (Feed, Filter) => (url, filters) =>
  O.fromPromise(Feed.create(
    {
      url,
      addded: getTime(),
      lastCheck: 0
    }
  ))
  .flatMap(feed =>
    filters.length > 0
      ? O.forkJoin(filters.map(f => O.fromPromise(Filter.create(f))))
        .flatMap(filters => O.fromPromise(feed.addFilters(filters)))
        .map(() => feed)
      : O.just(feed)
  )

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
  return O.fromPromise(
    Feed.update(
      { lastCheck: getTime(), updaterId },
      { where: { lastCheck: { $lt: getTime(interval * -1) } } }
    )
      .then(() => Feed.findAll({
        where: { updaterId }
      }))
  )
}

const genUpdateLatestLink = Feed => (id, latestLink) =>
  O.fromPromise(Feed.update(
    { latestLink },
    { where: { id } }
  ))

const genRemoveFeed = Feed => id => O.fromPromise(
  Feed.findById(id)
    .then(feed => feed.getFilters())
    .then(filters => Promise.all(
      filters.map(filter => filter.destroy)
    ))
    .then(() => Feed.destroy({ where: { id } }))
)

const genListFeeds = Feed => () => O.fromPromise(Feed.findAll())

module.exports = function initStore (config) {
  const sequelize = new Sequelize(
    config.name,
    config.username,
    config.password,
    Object.assign({
      logging: () => {}
    }, config.database.options)
  )
  const Feed = sequelize.define('feed', {
    url: Sequelize.STRING,
    added: Sequelize.INTEGER,
    lastCheck: Sequelize.INTEGER,
    latestLink: Sequelize.STRING,
    updaterId: Sequelize.STRING
  })
  const Filter = sequelize.define('filter', {
    keyword: Sequelize.STRING,
    kind: Sequelize.BOOLEAN
  })
  Feed.hasMany(Filter)

  return (
    O.fromPromise(sequelize.sync())
      .map(() => ({
        _Feed: Feed,
        _Filter: Filter,
        insertFeed: genInsertFeed(Feed, Filter),
        getFeeds: genGetFeeds(Feed, config.interval),
        updateLatestLink: genUpdateLatestLink(Feed),
        removeFeed: genRemoveFeed(Feed),
        listFeeds: genListFeeds(Feed)
      }))
  )
}

