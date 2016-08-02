const { test } = require('ava')
// const { Observable: O } = require('rx')

const Poll = require('../../dist/lib/poll.js')

const T = require('./lib/helpers')

const isValidEntry = t => e => {
  t.true(typeof e.blogTitle === 'string')
  t.true(typeof e.title === 'string')
  /* Link should be a valid URL, this doesn't excactly check for
   * that, but it's close enough IMO.
   */
  t.truthy(e.link.match(/https?:\/\/.*/))
}

const allEntriesValid = t => entries =>
  entries.forEach(isValidEntry(t))

test.cb('poll rss', t => T.testObservable(
  Poll('https://lucaschmid.net/feed/rss.xml', [])
    .tap(allEntriesValid(t))
)(t))

test.cb('poll atom', t => T.testObservable(
  Poll('https://lucaschmid.net/feed/atom.xml', [])
    .tap(allEntriesValid(t))
)(t))

