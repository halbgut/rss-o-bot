const {getConfig} = require('./helpers')
const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const Rx = require('rx')
const O = Rx.Observable

module.exports = {
  send: (url, message) => O.create(o => {
    const ws = new WebSocket.Client(url)
    ws.on('open', () => {
      jwt.sign(message, getConfig('remote-key'), {}, (err, token) => {
        if (err) return o.onError(err)
        ws.send(token)
      })
    })
    ws.on('message', e => o.onNext(e.data))
    ws.on('error', err => o.onError(err))
    ws.on('close', () => o.onCompleted())
  })
}

