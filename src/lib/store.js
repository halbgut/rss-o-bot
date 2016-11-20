/**
 * store
 * All interactions with the database are abstracted
 * by this module. They are made through sequelize.
 * This allows users to use any DB they might want.
 */
const path = require('path')
const uuid = require('node-uuid')
const Rx = require('rxjs/Rx')
const O = Rx.Observable
const Sequelize = require('sequelize')
const R = require('ramda')
const debug = require('debug')('rss-o-bot')

module.exports = (H, E) => {
  const genInsertFeed = (Feed, Filter) => (url, filters, blogTitle) => {
    if (!H.isValidUrl(url)) return E.throwO('INVALID_URL')
    return (
      O.fromPromise(Feed.create(
        {
          url,
          lastCheck: 0,
          blogTitle
        }
      ))
      .switchMap(feed =>
        filters.length > 0
          ? O.forkJoin(filters.map(f => O.fromPromise(Filter.create(f))))
            .switchMap(filters => O.fromPromise(feed.addFilters(filters)))
            .map(() => feed)
          : O.of(feed)
      )
      .do(feed => debug(`feed inserted: ${feed.get('url')}`))
    )
  }

  // TODO: Data races have been prevented.
  // The updaterId is for reference inside the next select query
  // Now the problem is, that the load isn't evenly spread between
  // threads. To implement that, I'd have to do a findOne using
  // The same where clause, as here, try updating the element and
  // still use that same where clause in that query. Then use a
  // retryWhen operator to repeat the whole process if the update
  // query didn't affect any elements.
  const genGetFeeds = (Feed, interval) => force => {
    const updaterId = uuid.v4()
    return O.fromPromise(
      Feed.update(
        { lastCheck: H.getTime(), updaterId },
        force
          ? { where: {} }
          : { where: { lastCheck: { $lt: H.getTime(interval * -1) } } }
      )
        .then(() => Feed.findAll({
          where: { updaterId }
        }))
    )
  }

  const genSetBlogTitle = Feed => (id, blogTitle) => {
    debug(`Setting blog title: ${blogTitle}`)
    return O.fromPromise(Feed.update(
      { blogTitle },
      { where: { id } }
    ))
  }

  const genUpdateLatestLink = Feed => (id, latestLink) =>
    O.fromPromise(Feed.update(
      { latestLink },
      { where: { id } }
    ))

  const genRemoveFeed = Feed => id => O.fromPromise(
    Feed.findById(id)
      .then(feed => {
        if (!feed) throw new Error('Item doesn\'t exist.')
        return feed
      })
      .then(feed => feed.getFilters())
      .then(filters => Promise.all(
        filters.map(filter => filter.destroy)
      ))
      .then(() => Feed.destroy({ where: { id } }))
  )

  const genListFeeds = Feed => () => O.fromPromise(Feed.findAll())

  const initStore = (config) => {
    const storage = config.getIn(['database', 'options', 'storage'])
    if (storage) debug(`Loading database: ${path.resolve(storage)}`)
    const sequelize = new Sequelize(
      config.get('name'),
      config.get('username'),
      config.get('password'),
      Object.assign({
        logging: () => {}
      }, config.getIn(['database', 'options']).toJS())
    )
    const Feed = sequelize.define('feed', {
      blogTitle: Sequelize.STRING,
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

    debug('Database loaded; synchronizing model')
    return (
      O.fromPromise(sequelize.sync())
        .map(() => {
          debug('Model applied creating store object')
          return {
            _Feed: Feed,
            _Filter: Filter,
            insertFeed: genInsertFeed(Feed, Filter),
            getFeeds: genGetFeeds(Feed, config.get('interval')),
            updateLatestLink: genUpdateLatestLink(Feed),
            removeFeed: genRemoveFeed(Feed),
            listFeeds: genListFeeds(Feed),
            setBlogTitle: genSetBlogTitle(Feed),
            findById: R.unary(Feed.findById.bind(Feed))
          }
        })
    )
  }

  return initStore
}

