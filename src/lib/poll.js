/**
 * @file poll.js
 * This module downloads XML feeds, parses them, filters them by
 * defined keywords and extracts relevant data from entries.
 */
const http = require('http')
const https = require('https')
const urlUtil = require('url')
const debug = require('debug')('rss-o-bot')

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
  debug(`${(protocol || 'http:').toUpperCase()} GET ${depth} ${url}`)
  request({
    host, path,
    headers: { 'User-Agent': 'RSS-o-Bot' }
  }, res => {
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
      o.onError(new Error(`Request failed: ${url} with ${res.statusCode}`))
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

const applyFilters = filters => ({ title }) => {
  /* If a filter has to use smartcase */
  const lowTitle = title.toLowerCase()
  return filters
    /* Filter for valid keywords */
    .filter(([keyword]) => keyword)
    /* Check if any filters match smartcase */
    .filter(([keyword, not]) => {
      const lowerCase = !includesUpperCase(keyword)
      if (not && lowerCase) {
        return lowTitle.indexOf(keyword) === -1
      } else if (not && !lowerCase) {
        return title.indexOf(keyword) === -1
      } else if (!not && lowerCase) {
        return lowTitle.indexOf(keyword) > -1
      } else if (!not && !lowerCase) {
        return title.indexOf(keyword) > -1
      } else {
        debug('Unexpected case in filter ${not}, ${lowerCase}')
      }
    }).length === 0
}

module.exports = (url, filters) =>
  get(url)
    .flatMap(parse)
    .map(([stream, meta]) => [
      stream.filter(applyFilters(filters)),
      meta
    ])
    .map(([stream, meta]) =>
      stream.map(entry => ({
        blogTitle: meta.title,
        title: entry.title,
        link: isAbsoluteUrl(entry.link)
          ? entry.link
          : getBaseUrl(url) + entry.link
      }))
    )

function includesUpperCase (str) {
  return !!str.match(/[A-Z]/)
}

