const { Observable: O } = require('rxjs/Rx')

const H = require('./shared/helpers')

exports.send = (privateKey, url, insecure = false) => message =>
  (
    insecure
      ? O.of(message)
      : H.signJwt(privateKey)(message)
  )
  .switchMap(H.httpPost(url))
