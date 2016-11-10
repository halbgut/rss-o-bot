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
const { Observable: O } = require('rxjs/Rx')

module.exports = (H, { throwO }) => {
  const get = (url, depth = 0) => O.create(o => {
    const {host, path, protocol} = urlUtil.parse(url)
    const request =
      protocol === 'http:'
        ? http.request
        : https.request
    debug(`${(protocol || 'http:').toUpperCase()} GET ${depth} ${url}`)
    request({
      host,
      path,
      headers: { 'User-Agent': 'RSS-o-Bot' }
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      if (H.isResponseRedirect(res)) {
        if (depth > 10) { // maximum redirects
          return o.error(new Error('Maximum redirects reached'))
        }
        get(res.headers.location, ++depth)
          .subscribe(
            v => o.next(v),
            err => o.error(err),
            v => o.complete()
          )
      } else if (H.isResponseSuccessful(res)) {
        res.on('data', chunk => { body += chunk })
        res.on('end', () => { o.next(body); o.complete() })
        res.on('error', err => o.error(err))
      } else {
        o.error(new Error(`Request failed: ${url} with ${res.statusCode}`))
      }
    })
      .on('error', err => o.error(err))
      .end()
  })

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
    return filters
      /* Filter for valid keywords */
      .filter(([keyword]) => keyword)
      /* Check if any filters match smartcase */
      .filter(([keyword, not]) => {
        const lowerCase = !H.includesUpperCase(keyword)
        if (not && lowerCase) {
          return lowTitle.indexOf(keyword) > -1
        } else if (not && !lowerCase) {
          return title.indexOf(keyword) > -1
        } else if (!not && lowerCase) {
          return lowTitle.indexOf(keyword) === -1
        } else if (!not && !lowerCase) {
          return title.indexOf(keyword) === -1
        } else {
          debug(`Unexpected case in filter ${not}, ${lowerCase}`)
        }
      }).length === 0
  }

  const Poll = (url, filters) =>
    get(url)
      .catch(error => throwO('FAILED_TO_DOWNLOAD_FEED', { error, feed: url }))
      .switchMap((body) =>
        parse(body)
          .catch((err) => throwO('FAILED_TO_PARSE_FEED', { error: err, feed: url }))
      )
      .map(([stream, meta]) => [
        stream.filter(applyFilters(filters)),
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

  return Poll
}

