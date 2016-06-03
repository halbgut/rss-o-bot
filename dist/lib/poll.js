'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var request = require('request');
var Feedparser = require('feedparser');
var Rx = require('rx');

var get = function get(url) {
  return Rx.Observable.create(function (o) {
    request(url, function (err, res, body) {
      if (err || res.statusCode !== 200) o.onError(err || res);
      o.onNext(body);
      o.onCompleted();
    });
  });
};

function parse(xml) {
  return Rx.Observable.create(function (o) {
    var stream = [];
    var feedparser = new Feedparser();
    feedparser.write(xml);
    feedparser.end();
    feedparser.on('error', function (err) {
      return o.onError(err);
    });
    feedparser.on('data', function (data) {
      return stream.push(data);
    });
    feedparser.on('end', function () {
      o.onNext([stream, this.meta]);
      o.onCompleted();
    });
  });
}

module.exports = function poll(url, filters) {
  return get(url).flatMap(parse).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var stream = _ref2[0];
    var meta = _ref2[1];
    return [stream.filter(function (_ref3) {
      var title = _ref3.title;
      return filters.filter(function (_ref4) {
        var _ref5 = _slicedToArray(_ref4, 2);

        var keyword = _ref5[0];
        var kind = _ref5[1];
        return kind ? title.indexOf(keyword) === -1 // When the kind is true and it's not in the title
        : title.indexOf(keyword) > -1;
      } // When the kind is false and it's inside the title
      ).length === 0;
    }), meta];
  }).map(function (_ref6) {
    var _ref7 = _slicedToArray(_ref6, 2);

    var stream = _ref7[0];
    var meta = _ref7[1];
    return {
      blog: meta.title,
      latestTitle: stream[0].title,
      latestLink: stream[0].link
    };
  });
};