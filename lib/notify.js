const Rx = require('rx')
const Tg = require('tg-yarl')
const notifier = require('node-notifier')

module.exports = (config) => {
  const sends =
    config['notification-methods'].map(m => {
      if (m === 'telegram') return telegram(config)
      if (m === 'desktop') return desktop(config)
    })
  return (blog, link) =>
    Rx.Observable.forkJoin(
      sends.map(f => f(`${blog} posted something new.`, link))
    )
}

function telegram (config) {
  const tg = Tg(config.telegram)
  return (subject, message) =>
    Rx.Observable.forkJoin(
      config['telegram-recipients'].map(r =>
        Rx.Observable.fromPromise(tg.sendMessage(r, `${subject} \n${message}`))
      )
    )
}

function desktop (config) {
  const notify = Rx.Observable.fromNodeCallback(notifier.notify.bind(notifier))
  return (title, text) => notify({
    title, text, open: text
  }).takeUntilWithTime(1000) // Time out gracefully if nothing happens
}

