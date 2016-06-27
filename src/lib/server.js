const {getConfig, getTime, getPublicKey} = require('./helpers')
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
            const respond = msg => {
              ws.send(msg)
              ws.close()
              ws = null
            }
            ws.on('message', e => {
              if (e.data.indexOf('PUBLIC KEY') > -1) { // Must be a public key
                if (getPublicKey()) {
                  respond('I already have a public key. Please remove it from the server manually before generating a new one.')
                } else {
                  o.onNext([e.data, respond])
                }
              } else {
                jwt.verify(
                  e.data,
                  getPublicKey(),
                  { algorithms: ['RS512'] },
                  (err, data) => {
                    if (err || !valid([data.jit, data.exp])) {
                      return o.onError(err || new Error('Invalid jit'))
                    }
                    o.onNext([data, respond])
                  }
                )
              }
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

const valid = (() => {
  let cache = []
  return nEl => {
    cache = cache.filter(el => el[1] > getTime())
    return !(cache.findIndex(el => el[0] === nEl) > -1)
  }
})()

