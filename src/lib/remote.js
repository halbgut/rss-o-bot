const uuid = require('node-uuid')
const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const Rx = require('rx')
const debug = require('debug')('rss-o-bot')

const JWT_EXPIRATION = 60 // Sixty seconds default JWT expiration time

module.exports = H => ({
  send: (url, message, insecure) => privateKey => {
    const subject = new Rx.Subject()
    const ws = new WebSocket.Client(url)
    debug('Opening socket')
    ws.on('open', () => {
      debug('Socket has been opened.')
      // Should be a GPG public key
      if (insecure) {
        ws.send(message)
      } else {
        jwt.sign(
          Object.assign(message, { exp: H.getTime(JWT_EXPIRATION), jti: uuid.v4() }),
          privateKey,
          { algorithm: 'RS512' },
          (err, token) => {
            if (err) return subject.onError(err)
            ws.send(token)
          }
        )
      }
    })
    ws.on('message', e => {
      const data = e.data
      if (data.error) return subject.onError(data.error)
      else subject.onNext(data)
    })
    ws.on('error', err => subject.onError(err))
    ws.on('close', () => subject.onCompleted())
    return subject
  }
})

