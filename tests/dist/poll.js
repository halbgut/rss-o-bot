'use strict';

var _require = require('ava');

var test = _require.test;
// const { Observable: O } = require('rx')

var Poll = require('../../dist/lib/poll.js');

var T = require('./lib/helpers');

var isValidEntry = function isValidEntry(t) {
  return function (e) {
    t.true(typeof e.blogTitle === 'string');
    t.true(typeof e.title === 'string');
    /* Link should be a valid URL, this doesn't excactly check for
     * that, but it's close enough IMO.
     */
    t.truthy(e.link.match(/https?:\/\/.*/));
  };
};

test.cb('poll rss', function (t) {
  return T.testObservable(Poll('https://lucaschmid.net/feed/rss.xml', []).tap(function (entries) {
    entries.forEach(isValidEntry(t));
  }))(t);
});