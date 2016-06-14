const {getConfig} = require('./helpers')
const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const http = require('http')
const Rx = require('rx')
const O = Rx.Observable

module.exports = {
  listen: () =>
    O.create(o => {
      const port = getConfig('port')

      http.createServer()
        .on('upgrade', (request, socket, body) => {
          if (WebSocket.isWebSocket(request)) {
            let ws = new WebSocket(request, socket, body)
            const respond = msg => O.create(o => {
              jwt.sign(msg, getConfig('remote-key'), {}, (err, token) => {
                if (err) return o.onError(err)
                ws.send(token)
              })
            })
            ws.on('message', e => {
              jwt.verify(e.data, getConfig('remote-key'), {}, (err, data) => {
                if (err) return o.onError(err)
                o.onNext([data, respond])
              })
            })
            ws.on('error', err => {
              ws = null
              o.onError(err)
            })
            ws.on('end', () => {
              ws = null
              o.onCompleted()
            })
          }
        })
        .listen(port)
    })
}

