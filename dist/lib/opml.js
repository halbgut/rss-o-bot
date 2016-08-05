'use strict';

/**
 * opml
 * This module defines OPML import and export methods.
 * OPML (Outline Processor Markup Language) is an XML
 * format widely used by RSS clients for importing and
 * exporting defined Feed-URLs.
 */
var sax = require('sax');
var fs = require('fs');
var xml = require('xml');
var moment = require('moment');

var _require = require('rx');

var O = _require.Observable;


module.exports = function (H) {
  return {
    import: function _import(file) {
      return function (_ref) {
        var insertFeed = _ref.insertFeed;
        return O.create(function (o) {
          var saxStream = sax.createStream();
          var tasks = [];
          fs.createReadStream(file).pipe(saxStream);
          saxStream.on('opentag', function (t) {
            if (t.name !== 'OUTLINE') return;
            tasks.push(insertFeed(t.attributes.XMLURL || t.attributes.URL, [], t.attributes.title));
          });
          saxStream.on('end', function () {
            return O.forkJoin(tasks).subscribe(function (v) {
              return o.onNext(v);
            }, function (err) {
              return o.onError(err);
            }, function () {
              return o.onCompleted();
            });
          });
          saxStream.on('error', function (err) {
            return o.onError(err);
          });
        });
      };
    },
    export: function _export(_ref2) {
      var listFeeds = _ref2.listFeeds;

      return listFeeds().map(function (feeds) {
        return xml({
          opml: [{ _attr: { version: '1.1' } }, { head: [{ title: 'RSS-o-Bot' }, { dateCreated: moment().utc().format('dd D YYYY at HH:MM:SS UTC') }] }, { body: feeds.map(function (f) {
              return {
                outline: [{
                  _attr: {
                    xmlUrl: f.get('url'),
                    title: f.get('title'),
                    text: f.get('title')
                  }
                }]
              };
            }) }]
        }, { declaration: true });
      });
    }
  };
};