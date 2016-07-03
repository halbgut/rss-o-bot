/**
 * helpers
 * Helper functions used by multiple modules.
 */
const fs = require('fs')
const path = require('path')
const markedMan = require('marked-man')
const {Observable: O} = require('rx')
const debug = require('debug')('rss-o-bot')

const domainRegex = '([\\w\\d-]+\\.)+\\w{2,}'
const protoRegex = '\\w+:\\/\\/'

const Helpers = {
  /*
   * fs releated
   */
  readFile: O.fromNodeCallback(fs.readFile),
  writeFile: O.fromNodeCallback(fs.writeFile),
  stat: O.fromNodeCallback(fs.stat),
  isDirectory: path => Helpers.stat(path).map(Helpers.tryCall('isDirectory')),
  findExistingDirectory: locations =>
    O.of(locations[0])
      .flatMap(l =>
        l
          ? Helpers.isDirectory(l).flatMap(is =>
            is
              ? O.of(l)
              : Helpers.findExistingDirectory(locations.slice(1))
          )
          : O.throw('None of those directories exist')
      ),

  /*
   * Functional helpers
   */
  tryCall:
    (key, ...args) => obj =>
      typeof obj[key] === 'function'
        ? obj[key](...args)
        : false,

  tryGet:
    (...keys) => obj =>
      typeof obj === 'object'
        ? keys.length > 1
          ? obj[keys[0]]
            ? Helpers.tryGet(...keys.slice(1))(obj[keys[0]])
            : obj[keys[0]]
          : obj[keys[0]]
        : obj,

  /*
   * Key exchange related
   */
  privateKeyPath: config => path.normalize(`${config.get('location')}/priv.pem`),
  publicKeyPath: config => path.normalize(`${config.get('location')}/pub.pem`),

  getTime (mod = 0) {
    return Math.round(((new Date()).getTime()) / 1000) + mod
  },

  /*
   * RSS-o-Bot filter helpers
   */
  transformFilter (filter) {
    return (
      filter[0] === '!'
        ? {keyword: filter.substr(1), kind: false}
        : {keyword: filter, kind: true}
    )
  },

  /*
   * URL manipulation
   */
  isAbsoluteUrl (str) {
    return !!str.match(new RegExp(`^${protoRegex}|${domainRegex}`))
  },

  getBaseUrl (url) {
    const match = url.match(new RegExp(`(${protoRegex})?${domainRegex}`))
    if (!match) return ''
    return match[0]
  },

  buildMan: state =>
    O.forkJoin(
      Helpers.readFile(`${__dirname}/../../src/man/man.md`),
      Helpers.readFile(`${__dirname}/../../src/man/synopsis.md`)
    )
      .map(([f1, f2]) => [f1.toString(), f2.toString()])
      .map(args => [...args, require('../../package.json')])
      .map(([raw, synopsis, packageInfo]) => [
        raw, synopsis, packageInfo,
        raw
          .replace('[[SYNOPSIS]]', synopsis)
          .replace('[[VERSION]]', packageInfo.version)
      ])
      .map(([raw, synopsis, {version}, man]) => ({
        raw,
        synopsis,
        man: markedMan(raw, {version, section: 1})
      })),

  /* Prints all feed in a bare table */
  printFeeds: feeds =>
    O.forkJoin(
      feeds.map(feed => O.fromPromise(feed.getFilters()
        .then(filters => [
          feed.get('id'),
          feed.get('blogTitle'),
          feed.get('url'),
          filters.map(f =>
            f.get('kind')
              ? f.get('keyword')
              : `!${f.get('keyword')}`
          ).join(', ')
        ])
      ))
    )
      .map(feeds =>
        feeds.map(([id, blogTitle, url, filters]) =>
          `${id}: ${blogTitle} – ${url} – ${filters}\n`
        ).join('')
      ),

  /*
   * Helpers for finding commands
   */
  getCommand: commands => state => {
    const command = Helpers.findCommand(commands, state.get('action'))
    if (!command) throw new Error(`No such command: ${state.get('action')}`)
    debug(`Running command ${command[0]}`)
    return Helpers.setCommandState(state)(command)
  },

  setCommandState: state => command =>
    state
      .set('command', Helpers.tryGet(2)(command))
      .set('localOnly', Helpers.tryGet(3)(command)),

  findCommand: (commands, action, args) =>
    commands.find(([command, validator, run]) =>
      (
        typeof command === 'object'
          ? command.indexOf(action) > -1
          : command === action
      ) &&
      (
        typeof validator === 'function'
          ? validator(args)
          : validator
      )
    ),

  /* Extracts the config and arguments from a state */
  getConfigAndArgs: state => [
    state.get('configuration'),
    ...state.get('arguments').toJS()
  ],

  /* Makes most common preparation steps for a command */
  setUpEnv: init => state =>
    init(state.get('configuration'))
      .map(store => [store, ...Helpers.getConfigAndArgs(state)])
}

module.exports = Helpers

