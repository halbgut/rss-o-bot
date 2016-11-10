const test = require('ava')
const nock = require('nock')
const fs = require('fs')
const exampleFeed = fs.readFileSync('../../data/exampleFeed.xml')

const H = require('../../../dist/lib/helpers')
const E = require('../../../dist/lib/errors')
const poll = require('../../../dist/lib/pollFeeds/lib/poll')(H, E)

nock('http://testfeed.com')
  .get('/feed.xml')
  .reply(200, exampleFeed)

test('poll', (t) =>
  poll('http://testfeed.com/feed.xml', [])
    .do((data) => t.deepEqual(data[data.length - 1], {
      blogTitle: 'Recent Commits to rss-o-bot:master',
      title: 'feat(cli): error handling for add',
      link: 'https://github.com/Kriegslustig/rss-o-bot/commit/7d71325d56557742019bd9a1f890203efbe2fbf7'
    }))
)

