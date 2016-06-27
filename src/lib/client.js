const {getConfig, getTime, getPrivateKey} = require('./helpers')
const uuid = require('node-uuid')
const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const Rx = require('rx')
const O = Rx.Observable
const debug = require('debug')('rss-o-bot')

module.exports = {
  send: (message, insecure) => O.create(o => {
    const ws = new WebSocket.Client(getConfig('remote'))
    debug('Opening socket')
    ws.on('open', () => {
      debug('Socket has been opened')
      if (insecure) {
        console.log(message)
        ws.send(message)
      } else {
        jwt.sign(
          Object.assign(message, { exp: getTime(getConfig('jwt-expiration')), jti: uuid.v4() }),
          getPrivateKey(),
          { algorithm: 'RS512' },
          (err, token) => {
            if (err) return o.onError(err)
            ws.send(token)
          }
        )
      }
    })
    ws.on('message', e => o.onNext(e.data))
    ws.on('error', err => o.onError(err))
    ws.on('close', () => o.onCompleted())
  })
}

