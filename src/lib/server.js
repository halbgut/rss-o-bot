const WebSocket = require('faye-websocket')
const jwt = require('jsonwebtoken')
const http = require('http')
const { Observable: O } = require('rx')
const debug = require('debug')('rss-o-bot')

const startup = Symbol('startup')

module.exports = (H, {
  throwO,
  PUBLIC_KEY_ALREADY_EXISTS,
  LOCAL_ONLY_COMMAND_ON_SERVER,
  NO_DATA_IN_REQUEST,
  UNKNOWN_COMMAND,
  FAILED_TO_SAVE_PUB_KEY
}) => {
  const isTokenValid = (() => {
    let cache = []
    return nEl => {
      cache = cache.filter(el => el[1] > H.getTime())
      return !(cache.findIndex(el => el[0] === nEl) > -1)
    }
  })()

  const verifyTokenAndCheckForPublicKey = (o, respond, publicKey) => e => {
    debug('Server receiving message')
    if (!e.data || e.data.length < 1) return respond(NO_DATA_IN_REQUEST)
    if (e.data.indexOf('PUBLIC KEY') > -1) { // Must be a public key
      if (publicKey) {
        respond({ error: PUBLIC_KEY_ALREADY_EXISTS })
      } else {
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
              debug('Server sending response.')
              ws.send(msg)
              debug('Server closing socket.')
              ws.close()
              ws = null
            }
            ws.on('message', (e) => verifyTokenAndCheckForPublicKey(o, respond, publicKey)(e))
            ws.on('error', err => {
              ws.close()
              ws = null
              o.onError(err)
            })
            ws.on('end', () => {
              debug('Client closed socket.')
              ws.close()
              ws = null
              o.onCompleted()
            })
          }
        })
        .listen(port)
      /* Send the startup message */
      o.onNext([startup])
      debug('Server started')
      return () => { debug('Server killed') }
    }),

    run: commands => state => {
      const config = state.get('configuration')
      debug('Starting server')
      return (
        Server.listen(config)(state.get('publicKey'))
          .flatMap(([data, respond]) => {
            /* Just let it through if it's the start up message */
            if (data === startup) return O.of('Server started!')
            /* Must be a public key */
            if (typeof data === 'string') {
              debug('Recieved public key')
              return (
                H.writeFile(H.publicKeyPath(config), data)
                  .catch(() => {
                    respond({ error: FAILED_TO_SAVE_PUB_KEY })
                    return O.of(FAILED_TO_SAVE_PUB_KEY)
                  })
                  .do(respond)
              )
            } else {
              debug(`Executing command ${data.action}`)
              const cState = H.setCommandState(state)(
                H.findCommand(commands, data.action, data.args)
              )
              if (!cState.get('command')) return throwO(UNKNOWN_COMMAND)
              return (
                cState.get('localOnly') && data.action !== 'ping'
                  ? throwO(LOCAL_ONLY_COMMAND_ON_SERVER)
                  : cState.get('command')(state).do(respond)
              )
            }
          })
      )
    }
  }

  return Server
}

