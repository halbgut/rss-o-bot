const test = require('ava')
const nock = require('nock')
const { Observable: O } = require('rxjs')

const pollFeeds = require('../../../dist/lib/poll-feeds')

nock('http://test.foo')
  .get('/')
  .replyWithFile(200, `${__dirname}/../../fixtures/exampleFeed.xml`)

nock('http://test.bar')
  .get('/')
  .replyWithFile(200, `${__dirname}/../../fixtures/lucaschmidNetFeedAtom.xml`)

let index = 0
test('poll-feeds', t => {
  const storeMock = {
    getFeeds: (force) => O.of([
      {
        get: (key) => ({
          url: 'http://test.foo/',
          blogTitle: 'Test-Foo',
          latestLink: 'https://github.com/Kriegslustig/rss-o-bot/commit/b82de06b9034bd14eb59d14336bad7751c797a77',
          id: 90001
        })[key],
        // Filters are tested in the `poll` unit tests
        getFilters: () => Promise.resolve([])
      },
      {
        get: (key) => ({
          url: 'http://test.bar/',
          blogTitle: 'Test-Bar',
          latestLink: 'https://lucaschmid.net/anotherblog/letsencrypt-express',
          id: 3492
        })[key],
        getFilters: () => Promise.resolve([])
      }
    ]),
    updateLatestLink: () => O.of(true),
    setBlogTitle: () => O.of(true)
  }

  return pollFeeds((blogTitle, link, title) => {
    if (index === 0) {
      t.is(blogTitle, 'Recent Commits to rss-o-bot:master')
      t.is(title, 'refactor(tests): move acceptance tests to acceptance tests')
      t.is(link, 'https://github.com/Kriegslustig/rss-o-bot/commit/626404a9fe51b226b34224069fd4e21d10b0e1f3')
    } else if (index === 1) {
      t.is(blogTitle, 'Luca Nils Schmid - Blog')
      t.is(title, 'My experience working with Durpal – a rant')
      t.is(link, 'https://lucaschmid.net/anotherblog/drupal')
    } else {
      t.is(blogTitle, 'Luca Nils Schmid - Blog')
      t.is(title, 'Minimum Viable Modern JavaScript')
      t.is(link, 'https://lucaschmid.net/anotherblog/minimum-viable-modern-javascript')
    }
    ++index
    return O.of(true)
  })(storeMock)
})
