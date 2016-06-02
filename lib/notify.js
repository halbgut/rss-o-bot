const Rx = require('rx')
const Tg = require('tg-yarl')

module.exports = (config) => {
  const tg = Tg(config.telegram)
  return function notify (blog, link) {
    return Rx.Observable.create((observer) => {
      const message = `${blog} posted something new: \n${link}`
      const done = []

      config.recipients.map(r =>
        tg.sendMessage(r, message)
          .then(() => {
            done.push(r)
            observer.onNext(r)
            if (done.length === config.recipients.length) observer.onComplete()
          })
          .catch(err => {
            done.push(r)
            observer.onError(err)
          })
      )
    })
  }
}

