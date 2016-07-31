const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const http = require('http')
const Rx = require('rx')
const debug = require('debug')('rss-o-bot')
const O = Rx.Observable

const H = require('./helpers')

const isTokenValid = (() => {
  let cache = []
  return nEl => {
    cache = cache.filter(el => el[1] > H.getTime())
    return !(cache.findIndex(el => el[0] === nEl) > -1)
  }
})()

const verifyTokenAndCheckForPublicKey = (o, respond, publicKey) => e => {
  if (e.data.indexOf('PUBLIC KEY') > -1) { // Must be a public key
    if (publicKey) {
      respond('I already have a public key. Please remove it from the server manually before generating a new one.')
    } else {
      /*  */
      o.onNext([e.data, respond])
    }
  } else {
    jwt.verify(
      e.data,
      publicKey,
      { algorithms: ['RS512'] },
      (err, data) => {
        if (err || !isTokenValid([data.jit, data.exp])) {
          return o.onError(err || new Error('Invalid jit'))
        }
        o.onNext([data, respond])
      }
    )
  }
}

const Server = {
  listen: config => publicKey => O.create(o => {
    const port = config.get('port')
    http.createServer()
      .on('upgrade', (request, socket, body) => {
        if (WebSocket.isWebSocket(request)) {
          let ws = new WebSocket(request, socket, body)
          const respond = msg => {
            ws.send(msg)
            ws.close()
            ws = null
          }
          ws.on('message', verifyTokenAndCheckForPublicKey(o, respond))
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
  }),

  run: commands => state => {
    const config = state.get('configuration')
    Server.listen(config)
      .map(([data, respond]) => {
        /* Must be a public key */
        if (typeof data === 'string') {
          debug('Recieved public key')
          return H.writeFile(H.publicKeyPath(config), data)
        } else {
          debug(`Executing command ${data.action}`)
          const cState = H.setCommandState(state)(
            H.findCommand(commands, data.action, data.args)
          )
          if (cState.get('localOnly')) return O.throw(new Error('Local-only command can\'t be executed on a server'))
          return cState.get('command')(state)
        }
      })
  }
}

module.exports = Server

