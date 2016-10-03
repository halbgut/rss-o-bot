const { test } = require('ava')
const H = require('../../dist/lib/helpers')
const Config = require('../../dist/lib/config')(H)

test('validate empty', t => t.truthy(
  Config.validate({}).valid
))

test('validate full', t => t.truthy(
  Config.validate({
    'name': 'rss-o-bot',
    'options': {
      'dialect': 'sqlite',
      'storage': '~/.rss-o-bot/feeds.sqlite'
    }
  }).valid
))

test('validate extended', t => t.truthy(
  Config.validate({
    'name': 'rss-o-bot',
    'options': {
      'dialect': 'sqlite',
      'storage': '~/.rss-o-bot/feeds.sqlite'
    },
    'undefined': ''
  }).valid
))

