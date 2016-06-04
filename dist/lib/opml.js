'use strict';

var sax = require('sax');
var fs = require('fs');
var Rx = require('rx');
var O = Rx.Observable;

module.exports = {
  import: function _import(file) {
    return function (_ref) {
      var insertFeed = _ref.insertFeed;
      return O.create(function (o) {
        var saxStream = sax.createStream();
        var tasks = [];
        fs.createReadStream(file).pipe(saxStream);
        saxStream.on('opentag', function (t) {
          if (t.name !== 'OUTLINE') return;
          tasks.push(insertFeed(t.attributes.XMLURL || t.attributes.URL, []));
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
  }
};