const http = require('http')
const https = require('https')
const urlUtil = require('url')

const Feedparser = require('feedparser')
const Rx = require('rx')
const O = Rx.Observable

const isRedirect = res => res.statusCode >= 300 && res.statusCode <= 399 && res.headers.location
const isSuccessful = res => res.statusCode >= 200 && res.statusCode < 400

const get = (url, depth = 0) => O.create(o => {
  const {host, path, protocol} = urlUtil.parse(url)
  const request =
    protocol === 'http:'
      ? http.request
      : https.request
  request({
    host, path,
    headers: { 'User-Agent': 'RSS-o-Bot' }
  }, res => {
    console.log(res.statusCode)
    let body = ''
    if (isRedirect(res)) {
      if (depth > 10) { // maximum redirects
        return o.onError(new Error('Maximum redirects reached'))
      }
      get(res.headers.location, ++depth)
        .subscribe(
          v => o.onNext(v),
          err => o.onError(err),
          v => o.onCompleted()
        )
    } else if (isSuccessful(res)) {
      res.on('data', chunk => { body += chunk })
      res.on('end', () => { o.onNext(body); o.onCompleted() })
      res.on('error', err => o.onError(err))
    } else {
      o.onError(new Error(`Request failed: ${url}`))
    }
  })
    .on('error', err => o.onError(err))
    .end()
})

const {isAbsoluteUrl, getBaseUrl} = require('./helpers')

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
  function poll (url, filters) {
    return (
      get(url)
        .flatMap(parse)
        .map(([stream, meta]) => [
          stream
            .filter(({ title }) =>
              filters.filter(([keyword, kind]) =>
                kind
                  ? title.indexOf(keyword) === -1 // When the kind is true and it's not in the title
                  : title.indexOf(keyword) > -1 // When the kind is false and it's inside the title
              ).length === 0
            ),
          meta
        ])
        .map(([stream, meta]) => ({
          blog: meta.title,
          latestTitle: stream[0].title,
          latestLink: isAbsoluteUrl(stream[0].link)
            ? stream[0].link
            : getBaseUrl(url) + stream[0].link
        }))
    )
  }

