module.exports = {
  getTime (mod = 0) {
    return Math.round(((new Date()).getTime() + mod) / 1000)
  }
}
