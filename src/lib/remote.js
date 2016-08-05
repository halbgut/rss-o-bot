const uuid = require('node-uuid')
const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const { Observable: O } = require('rx')
const debug = require('debug')('rss-o-bot')

const JWT_EXPIRATION = 60 // Sixty seconds default JWT expiration time

module.exports = H => ({
  send: (url, message, insecure) => privateKey => O.create(o => {
    const ws = new WebSocket.Client(url)
    debug('Opening socket')
    ws.on('open', () => {
      debug('Socket has been opened')
      if (insecure) {
        console.log(message)
        ws.send(message)
      } else {
        jwt.sign(
          Object.assign(message, { exp: H.getTime(JWT_EXPIRATION), jti: uuid.v4() }),
          privateKey,
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
})

