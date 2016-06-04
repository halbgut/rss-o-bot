const fs = require('fs')
const path = require('path')

const locations = [
  `${__dirname}/../../config.json`,
  process.platform === 'win32'
    ? `${process.env.USERPROFILE}/.rss-o-bot`
    : `${process.env.HOME}/.rss-o-bot`,
  '/etc/.rss-o-bot'
].map(l => path.normalize(l))

const configError = `No config file found!
RTFM and put one in one of these locations:
${locations.join(', ')}
`

module.exports = {
  getTime (mod = 0) {
    return Math.round(((new Date()).getTime() + mod) / 1000)
  },
  getConfig () {
    const config =
      locations
        .filter(l => {
          try {
            return fs.statSync(l).isFile()
          } catch (e) {
            return false
          }
        })
        .slice(0, 1)
        .map(l => fs.readFileSync(l))
        .map(c => JSON.parse(c))[0]

    if (!config) {
      throw new Error(configError)
    }
    return config
  },
  transformFilter (filter) {
    return (
      filter[0] === '!'
        ? {keyword: filter.substr(1), kind: false}
        : {keyword: filter, kind: true}
    )
  }
}
