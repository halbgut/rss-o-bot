const { test } = require('ava')
const nock = require('nock')

const T = require('../helpers/helpers')

const Poll = require('../../../dist/lib/shared/poll.js')

T.mockLucaschmidNet()
nock('https://reverse-order.feed')
  .get('/')
  .replyWithFile(200, `${__dirname}/../../fixtures/reverse-order-feed.xml`)

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
    .do(allEntriesValid(t))
)(t))

test.cb('poll atom', t => T.testObservable(
  Poll('https://lucaschmid.net/feed/atom.xml', [])
    .do(allEntriesValid(t))
)(t))

test.cb('poll positive atom filter', t => T.testObservable(
  Poll('https://lucaschmid.net/feed/atom.xml', [['definetly not inside the feeds']])
    .do(entries => t.is(entries.length, 0))
)(t))

test.cb('poll negative rss filter', t => T.testObservable(
  /* Testing inverted filters */
  Poll('https://lucaschmid.net/feed/rss.xml', [['a', true], ['e', true]])
    .do(entries => t.is(entries.length, 0))
)(t))

test.cb('poll positive rss filter', t => T.testObservable(
  /* Testing inverted filters */
  Poll('https://lucaschmid.net/feed/rss.xml', [['a'], ['e']])
    .do(entries => t.true(entries.length > -1))
)(t))

test.cb('poll case-sensitive positive rss filter', t => T.testObservable(
  /* Testing inverted filters */
  Poll('https://lucaschmid.net/feed/rss.xml', [])
    .switchMap(entries =>
      /* I'm assuming, that all entries have some upper-case letters in them */
      Poll('https://lucaschmid.net/feed/rss.xml', [entries[0].title])
    )
    .do(entries => t.true(entries.length === 1))
)(t))

test('poll should order feeds by creation data', t =>
  Poll('https://reverse-order.feed')
    .do(arr => t.deepEqual(arr, [
      {
        blogTitle: 'Yoloisma',
        link: 'https://reverse-order.feed/asdf',
        title: 'A sdf'
      },
      {
        blogTitle: 'Yoloisma',
        link: 'https://reverse-order.feed/asdf1',
        title: 'A sdf 1'
      }
    ]))
)

