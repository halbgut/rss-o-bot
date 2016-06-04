const sax = require('sax')
const fs = require('fs')
const Rx = require('rx')
const O = Rx.Observable

module.exports = {
  import (file) {
    return ({ insertFeed }) =>
      O.create(o => {
        const saxStream = sax.createStream()
        const tasks = []
        fs.createReadStream(file)
          .pipe(saxStream)
        saxStream.on('opentag', t => {
          if (t.name !== 'OUTLINE') return
          tasks.push(insertFeed(t.attributes.XMLURL || t.attributes.URL, []))
        })
        saxStream.on('end', () =>
          O.forkJoin(tasks)
            .subscribe(
              v => o.onNext(v),
              err => o.onError(err),
              () => o.onCompleted()
            )
        )
        saxStream.on('error', err => o.onError(err))
      })
  }
}

