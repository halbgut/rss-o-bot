'use strict';

var _require = require('./helpers.js');

var getTime = _require.getTime;


var Rx = require('rx');
var O = Rx.Observable;
var Sequelize = require('sequelize');

var genInsertFeed = function genInsertFeed(Feed, Filter) {
  return function (url, filters) {
    return O.fromPromise(Feed.create({
      url: url,
      addded: getTime(),
      lastCheck: 0
    })).flatMap(function (feed) {
      return filters.length > 0 ? O.forkJoin(filters.map(function (f) {
        return O.fromPromise(Filter.create(f));
      })).flatMap(function (filters) {
        return O.fromPromise(feed.addFilters(filters));
      }).map(function () {
        return feed;
      }) : O.just(feed);
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
  return function () {
    var updaterId = Math.round(Math.random() * 1000000000000);
    return O.fromPromise(Feed.update({ lastCheck: getTime(), updaterId: updaterId }, { where: { lastCheck: { $lt: getTime(interval * -1) } } }).then(function () {
      return Feed.findAll({
        where: { updaterId: updaterId }
      });
    }));
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

module.exports = function initStore(config) {
  var sequelize = new Sequelize(config.name, config.username, config.password, Object.assign({
    logging: function logging() {}
  }, config.database.options));
  var Feed = sequelize.define('feed', {
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
      getFeeds: genGetFeeds(Feed, config.interval),
      updateLatestLink: genUpdateLatestLink(Feed),
      removeFeed: genRemoveFeed(Feed),
      listFeeds: genListFeeds(Feed)
    };
  });
};