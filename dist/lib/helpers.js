'use strict';

var fs = require('fs');
var path = require('path');
var markedMan = require('marked-man');

var locations = [__dirname + '/../../config.json', process.platform === 'win32' ? process.env.USERPROFILE + '/.rss-o-bot' : process.env.HOME + '/.rss-o-bot', '/etc/.rss-o-bot'].map(function (l) {
  return path.normalize(l);
});

var configError = 'No config file found!\nRTFM and put one in one of these locations:\n' + locations.join(', ') + '\n';

var domainRegex = '([\\w\\d-]+\\.)+\\w{2,}';
var protoRegex = '\\w+:\\/\\/';
var defaults = {
  interval: 600,
  database: {
    name: 'rss-o-bot',
    options: {
      dialect: 'sqlite',
      storage: '~/.rss-o-bot.sqlite'
    }
  }
};

var helpers = {
  getTime: function getTime() {
    var mod = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    return Math.round((new Date().getTime() + mod) / 1000);
  },
  getConfig: function getConfig() {
    var config = locations.filter(function (l) {
      try {
        return fs.statSync(l).isFile();
      } catch (e) {
        return false;
      }
    }).slice(0, 1).map(function (l) {
      return fs.readFileSync(l);
    }).map(function (c) {
      return JSON.parse(c);
    })[0];
    if (!config) {
      throw new Error(configError);
    }
    return Object.assign(defaults, config);
  },
  transformFilter: function transformFilter(filter) {
    return filter[0] === '!' ? { keyword: filter.substr(1), kind: false } : { keyword: filter, kind: true };
  },
  isAbsoluteUrl: function isAbsoluteUrl(str) {
    return !!str.match(new RegExp('^' + protoRegex + '|' + domainRegex));
  },
  getBaseUrl: function getBaseUrl(url) {
    var match = url.match(new RegExp('(' + protoRegex + ')?' + domainRegex));
    if (!match) return '';
    return match[0];
  },
  buildMan: function buildMan() {
    var packageInfo = require('../../package.json');
    var synopsis = fs.readFileSync(__dirname + '/../../src/man/synopsis.md').toString();
    var raw = fs.readFileSync(__dirname + '/../../src/man/man.md').toString().replace('[[SYNOPSIS]]', synopsis).replace('[[VERSION]]', packageInfo.version);
    var man = markedMan(raw, {
      version: packageInfo.version,
      section: 1
    });
    return { synopsis: synopsis, man: man, raw: raw };
  }
};

module.exports = helpers;