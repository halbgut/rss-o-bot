const R = require('ramda')
const { Observable: O } = require('rx')

module.exports = H => ({
  send: (privateKey, url, insecure = false) =>
    R.cond([
      [R.identity(insecure), R.identity(O.of)],
      [R.T, H.signJwt(privateKey)]
    ])
    .flatMap(H.httpPost(url))
})

