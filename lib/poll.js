const request = require('request')
const Feedparser = require('feedparser')
const Rx = require('rx')

const get = url => Rx.Observable.create(o => {
  request(url, (err, res, body) => {
    if (err || res.statusCode !== 200) o.onError(err || res)
    o.onNext(body)
    o.onCompleted()
  })
})

function parse (xml) {
  return Rx.Observable.create(o => {
    const stream = []
    const feedparser = new Feedparser()
    feedparser.write(xml)
    feedparser.end()
    feedparser.on('error', err => o.onError(err))
    feedparser.on('data', data => stream.push(data))
    feedparser.on('end', function () {
      o.onNext([stream, this.meta])
      o.onCompleted()
    })
  })
}

module.exports =
  function poll (url) {
    return (
      get(url)
        .flatMap(parse)
        .map(([stream, meta]) => ({
          blog: meta.title,
          latestTitle: stream[0].title,
          latestLink: stream[0].link
        }))
    )
  }

