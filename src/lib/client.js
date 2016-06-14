const WebSocket = require('faye-websocket')
const Rx = require('rx')
const O = Rx.Observable

module.exports = {
  send: (url, message) => O.create(o => {
    const ws = new WebSocket.Client(url)
    ws.on('open', () => {
      ws.send(message)
    })
    ws.on('message', msg => o.onNext(msg))
    ws.on('error', err => o.onError(err))
    ws.on('close', () => o.onCompleted())
  })
}

