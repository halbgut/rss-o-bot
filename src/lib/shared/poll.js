/**
 * @file poll.js
 * This module downloads XML feeds, parses them, filters them by
 * defined keywords and extracts relevant data from entries.
 */
const request = require('request')
const R = require('ramda')
const debug = require('debug')('rss-o-bot')
const Feedparser = require('feedparser')
const { Observable: O } = require('rxjs/Rx')
const iconv = require('iconv-lite')

const requestO = O.bindNodeCallback(request)

const H = require('./helpers')
const { throwO } = require('./errors')

const decodeXml = (str) => {
  const match = str.toString().match(/<\?xml[^>]+encoding="([\w-]+)"\?>/)
  return match
    ? iconv.decode(str, match[1])
    : str
}

const get = (url, depth = 0) => {
  debug(`GET ${depth} ${url}`)
  return requestO({
    url,
    encoding: null,
    headers: { 'User-Agent': 'RSS-o-Bot' }
  })
    .switchMap(([res]) =>
      H.isResponseSuccessful(res)
        ? O.of(res.body)
        : O.throw(new Error(`Request failed: ${url} with ${res.statusCode}`))
    )
}

function parse (xml) {
  return O.create(o => {
    const stream = []
    try {
      const feedparser = new Feedparser()
      feedparser.write(xml)
      feedparser.end()
      feedparser.on('error', err => o.error(err))
      feedparser.on('data', data => stream.push(data))
      feedparser.on('end', function () {
        o.next([stream, this.meta])
        o.complete()
      })
    } catch (err) {
      o.error(err)
    }
  })
}

const applyFilters = filters => ({ title }) => {
  /* If a filter has to use smartcase */
  const lowTitle = title.toLowerCase()
  const validFilters = R.filter(R.nth(0), filters)
  if (validFilters.length === 0) return true
  return validFilters
    /* Check if any filters match smartcase */
    .filter(([keyword, not]) => {
      const lowerCase = !H.includesUpperCase(keyword)
      const hasMatch = lowerCase
        ? R.contains(keyword, lowTitle)
        : R.contains(keyword, title)
      return not
        ? !hasMatch
        : hasMatch
    }).length > 0
}

module.exports = (url, filters = []) =>
  get(url)
    .catch(error => throwO('FAILED_TO_DOWNLOAD_FEED', { error, feed: url }))
    .map(decodeXml)
    .switchMap((body) =>
      parse(body)
        .catch((err) => throwO('FAILED_TO_PARSE_FEED', { error: err, feed: url }))
    )
    .map(([stream, meta]) => [
      stream
        .filter(applyFilters(filters))
        .sort(H.subtractItemDates),
      meta
    ])
    .map(([stream, meta]) =>
      stream.map(entry => ({
        blogTitle: meta.title,
        title: entry.title,
        link: H.isAbsoluteUrl(entry.link)
          ? entry.link
          : H.getBaseUrl(url) + entry.link
      }))
    )
