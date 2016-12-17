const { Observable: O } = require('rxjs/Rx')
const R = require('ramda')
const debug = require('debug')('rss-o-bot')

const { throwO } = require('./shared/errors')
const H = require('./shared/helpers')

const savePublicKey = (config, publicKey) => newPublicKey =>
  O.if(
    () => publicKey,
    throwO('PUBLIC_KEY_ALREADY_EXISTS'),
    H.writeFile(H.publicKeyPath(config), newPublicKey)
  )
const executeCommand = (state, commands) => ({ command, args }) => {
  debug(`Executing command ${command}`)
  const cState = H.setCommandState(state)(
    H.findCommand(commands, command, args)
  )
  if (!cState.get('command')) return throwO('UNKNOWN_COMMAND', { command })
  return (
    H.shouldRunOnServer(cState.get('scope'))
      ? cState.get('command')(state)
      : throwO('LOCAL_ONLY_COMMAND_ON_SERVER', { command })
  )
}

module.exports = (commands, state) => {
  const exec = executeCommand(state, commands)
  return (
    H.httpServer(state.getIn(['configuration', 'port']))
      .switchMap(x => {
        const [ data, respond ] = x
        debug(`client sent: ${data.toString()}`)
        if (data === H.serverStartup) return O.of('Succssfully started server.')
        const errRespond = err => {
          debug(err)
          // If it's a properly formated error, it may be sent to the user
          return respond(500)(
            err.error
            ? err
            : { error: 'NO_DATA_IN_REQUEST' }
          )
        }
        if (data.length < 1) {
          return errRespond(null)
        } else if (data.indexOf('PUBLIC KEY') > -1) {
          return (
            savePublicKey(state.get('configuration'), state.get('publicKey'))(data)
              .switchMap(() => respond(200)({ output: 'Wrote public key.' }))
              .catch(errRespond)
          )
        } else {
          return (
            H.verifyJwt(state.get('publicKey'))(data)
              .switchMap(R.cond([
                [
                  R.where({
                    command: R.is(String),
                    args: R.allPass([R.is(Array), R.all(R.is(String))])
                  }),
                  (command) =>
                    exec(command)
                      .switchMap(output => respond(200)({ output }))
                ],
                [R.T, () => respond(500)({ error: 'NO_DATA_IN_REQUEST' })]
              ]))
              .catch((err) => errRespond('INVALID_JWT'))
          )
        }
      })
  )
}
