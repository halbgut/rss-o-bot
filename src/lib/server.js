const {getConfig} = require('./helpers')
const WebSocket = require('faye-websocket')
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
            ws.on('message', msg => o.onNext([ws, msg]))
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

