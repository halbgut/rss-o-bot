/**
 * opml
 * This module defines OPML import and export methods.
 * OPML (Outline Processor Markup Language) is an XML
 * format widely used by RSS clients for importing and
 * exporting defined Feed-URLs.
 */
const sax = require('sax')
const fs = require('fs')
const xml = require('xml')
const moment = require('moment')
const { Observable: O } = require('rxjs/Rx')

module.exports = H => ({
  import (file) {
    return ({ insertFeed }) =>
      O.create(o => {
        const saxStream = sax.createStream()
        const tasks = []
        fs.createReadStream(file)
          .pipe(saxStream)
        saxStream.on('opentag', t => {
          if (t.name !== 'OUTLINE') return
          tasks.push(insertFeed(t.attributes.XMLURL || t.attributes.URL, [], t.attributes.title))
        })
        saxStream.on('end', () =>
          O.forkJoin(tasks)
            .subscribe(
              v => o.next(v),
              err => o.error(err),
              () => o.complete()
            )
        )
        saxStream.on('error', err => o.error(err))
      })
  },

  export ({ listFeeds }) {
    return (
      listFeeds()
        .map(feeds => xml({
          opml: [
            {_attr: { version: '1.1' }},
            {head: [
              {title: 'RSS-o-Bot'},
              {dateCreated: moment().utc().format('dd D YYYY at HH:MM:SS UTC')}
            ]},
            {body: feeds.map(f =>
              ({
                outline: [{
                  _attr: {
                    xmlUrl: f.get('url'),
                    title: f.get('title'),
                    text: f.get('title')
                  }
                }]
              })
            )}
          ]
        }, {declaration: true}))
    )
  }
})

