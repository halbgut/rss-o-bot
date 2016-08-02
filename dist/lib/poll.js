'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * @file poll.js
 * This module downloads XML feeds, parses them, filters them by
 * defined keywords and extracts relevant data from entries.
 */
var http = require('http');
var https = require('https');
var urlUtil = require('url');
var debug = require('debug')('rss-o-bot');

var Feedparser = require('feedparser');
var Rx = require('rx');
var O = Rx.Observable;

var isRedirect = function isRedirect(res) {
  return res.statusCode >= 300 && res.statusCode <= 399 && res.headers.location;
};
var isSuccessful = function isSuccessful(res) {
  return res.statusCode >= 200 && res.statusCode < 400;
};

var get = function get(url) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
  return O.create(function (o) {
    var _urlUtil$parse = urlUtil.parse(url);

    var host = _urlUtil$parse.host;
    var path = _urlUtil$parse.path;
    var protocol = _urlUtil$parse.protocol;

    var request = protocol === 'http:' ? http.request : https.request;
    debug((protocol || 'http:').toUpperCase() + ' GET ' + depth + ' ' + url);
    request({
      host: host, path: path,
      headers: { 'User-Agent': 'RSS-o-Bot' }
    }, function (res) {
      var body = '';
      if (isRedirect(res)) {
        if (depth > 10) {
          // maximum redirects
          return o.onError(new Error('Maximum redirects reached'));
        }
        get(res.headers.location, ++depth).subscribe(function (v) {
          return o.onNext(v);
        }, function (err) {
          return o.onError(err);
        }, function (v) {
          return o.onCompleted();
        });
      } else if (isSuccessful(res)) {
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', function () {
          o.onNext(body);o.onCompleted();
        });
        res.on('error', function (err) {
          return o.onError(err);
        });
      } else {
        o.onError(new Error('Request failed: ' + url + ' with ' + res.statusCode));
      }
    }).on('error', function (err) {
      return o.onError(err);
    }).end();
  });
};

var _require = require('./helpers');

var isAbsoluteUrl = _require.isAbsoluteUrl;
var getBaseUrl = _require.getBaseUrl;


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

var applyFilters = function applyFilters(filters) {
  return function (_ref) {
    var title = _ref.title;

    /* If a filter has to use smartcase */
    var lowTitle = title.toLowerCase();
    return filters
    /* Filter for valid keywords */
    .filter(function (_ref2) {
      var _ref3 = _slicedToArray(_ref2, 1);

      var keyword = _ref3[0];
      return keyword;
    })
    /* Check if any filters match smartcase */
    .filter(function (_ref4) {
      var _ref5 = _slicedToArray(_ref4, 2);

      var keyword = _ref5[0];
      var not = _ref5[1];

      var lowerCase = !includesUpperCase(keyword);
      if (not && lowerCase) {
        return lowTitle.indexOf(keyword) === -1;
      } else if (not && !lowerCase) {
        return title.indexOf(keyword) === -1;
      } else if (!not && lowerCase) {
        return lowTitle.indexOf(keyword) > -1;
      } else if (!not && !lowerCase) {
        return title.indexOf(keyword) > -1;
      } else {
        debug('Unexpected case in filter ${not}, ${lowerCase}');
      }
    }).length === 0;
  };
};

module.exports = function (url, filters) {
  return get(url).flatMap(parse).map(function (_ref6) {
    var _ref7 = _slicedToArray(_ref6, 2);

    var stream = _ref7[0];
    var meta = _ref7[1];
    return [stream.filter(applyFilters(filters)), meta];
  }).map(function (_ref8) {
    var _ref9 = _slicedToArray(_ref8, 2);

    var stream = _ref9[0];
    var meta = _ref9[1];
    return stream.map(function (entry) {
      return {
        blogTitle: meta.title,
        title: entry.title,
        link: isAbsoluteUrl(entry.link) ? entry.link : getBaseUrl(url) + entry.link
      };
    });
  });
};

function includesUpperCase(str) {
  return !!str.match(/[A-Z]/);
}