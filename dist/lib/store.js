'use strict';

/**
 * store
 * All interactions with the database are abstracted
 * by this module. They are made through sequelize.
 * This allows users to use any DB they might want.
 */
var uuid = require('node-uuid');
var Rx = require('rx');
var O = Rx.Observable;
var Sequelize = require('sequelize');
var path = require('path');
var debug = require('debug')('rss-o-bot');

module.exports = function (H) {
  var genInsertFeed = function genInsertFeed(Feed, Filter) {
    return function (url, filters, blogTitle) {
      return O.fromPromise(Feed.create({
        url: url,
        lastCheck: 0,
        blogTitle: blogTitle
      })).flatMap(function (feed) {
        return filters.length > 0 ? O.forkJoin(filters.map(function (f) {
          return O.fromPromise(Filter.create(f));
        })).flatMap(function (filters) {
          return O.fromPromise(feed.addFilters(filters));
        }).map(function () {
          return feed;
        }) : O.just(feed);
      }).tap(function (feed) {
        return debug('feed inserted: ' + feed.get('url'));
      });
    };
  };

  // TODO: Data races have been prevented.
  // The updaterId is for reference inside the next select query
  // Now the problem is, that the load isn't evenly spread between
  // threads. To implement that, I'd have to do a findOne using
  // The same where clause, as here, try updating the element and
  // still use that same where clause in that query. Then use a
  // retryWhen operator to repeat the whole process if the update
  // query didn't affect any elements.
  var genGetFeeds = function genGetFeeds(Feed, interval) {
    return function (force) {
      var updaterId = uuid.v4();
      return O.fromPromise(Feed.update({ lastCheck: H.getTime(), updaterId: updaterId }, force ? { where: {} } : { where: { lastCheck: { $lt: H.getTime(interval * -1) } } }).then(function () {
        return Feed.findAll({
          where: { updaterId: updaterId }
        });
      }));
    };
  };

  var genSetBlogTitle = function genSetBlogTitle(Feed) {
    return function (id, blogTitle) {
      return debug('Setting blog title: ' + blogTitle) || O.fromPromise(Feed.update({ blogTitle: blogTitle }, { where: { id: id } }));
    };
  };

  var genUpdateLatestLink = function genUpdateLatestLink(Feed) {
    return function (id, latestLink) {
      return O.fromPromise(Feed.update({ latestLink: latestLink }, { where: { id: id } }));
    };
  };

  var genRemoveFeed = function genRemoveFeed(Feed) {
    return function (id) {
      return O.fromPromise(Feed.findById(id).then(function (feed) {
        if (!feed) throw new Error('Item doesn\'t exist.');
        return feed;
      }).then(function (feed) {
        return feed.getFilters();
      }).then(function (filters) {
        return Promise.all(filters.map(function (filter) {
          return filter.destroy;
        }));
      }).then(function () {
        return Feed.destroy({ where: { id: id } });
      }));
    };
  };

  var genListFeeds = function genListFeeds(Feed) {
    return function () {
      return O.fromPromise(Feed.findAll());
    };
  };

  var initStore = function initStore(config) {
    var storage = config.getIn(['database', 'options', 'storage']);
    if (storage) debug('Loading database: ' + path.resolve(storage));
    var sequelize = new Sequelize(config.get('name'), config.get('username'), config.get('password'), Object.assign({
      logging: function logging() {}
    }, config.getIn(['database', 'options']).toJS()));
    var Feed = sequelize.define('feed', {
      blogTitle: Sequelize.STRING,
      url: Sequelize.STRING,
      added: Sequelize.INTEGER,
      lastCheck: Sequelize.INTEGER,
      latestLink: Sequelize.STRING,
      updaterId: Sequelize.STRING
    });
    var Filter = sequelize.define('filter', {
      keyword: Sequelize.STRING,
      kind: Sequelize.BOOLEAN
    });
    Feed.hasMany(Filter);

    return O.fromPromise(sequelize.sync()).map(function () {
      return {
        _Feed: Feed,
        _Filter: Filter,
        insertFeed: genInsertFeed(Feed, Filter),
        getFeeds: genGetFeeds(Feed, config.get('interval')),
        updateLatestLink: genUpdateLatestLink(Feed),
        removeFeed: genRemoveFeed(Feed),
        listFeeds: genListFeeds(Feed),
        setBlogTitle: genSetBlogTitle(Feed)
      };
    });
  };

  return initStore;
};