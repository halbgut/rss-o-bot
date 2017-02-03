![alt text](https://i.imgur.com/reQMPMD.png "RSS-o-Bot Logo")

# RSS-o-Bot 1.0.0-rc.21

[![Coverage Status](https://coveralls.io/repos/github/Kriegslustig/rss-o-bot/badge.svg?branch=master)](https://coveralls.io/github/Kriegslustig/rss-o-bot?branch=master)
[![Build Status](https://travis-ci.org/Kriegslustig/rss-o-bot.svg?branch=master)](https://travis-ci.org/Kriegslustig/rss-o-bot)
[![Dependency Status](https://dependencyci.com/github/Kriegslustig/rss-o-bot/badge)](https://dependencyci.com/github/Kriegslustig/rss-o-bot)

A super simple command-line RSS and Atom reader/client. It's not made to read Feeds (like Newsbeuter), but to notify you when new items are posted. The Web is supposed to be decentralized. Most readers (like RSS Bot) are built through centralized services. RSS-o-Bot is not. It's build to be run on your own machine. Notifications are managed by services that are installed separately. Notification services are available for email, desktop notifications and Telegram.

## Requirements

* [Node.js LTS](https://nodejs.org/en/)

## Compatibility

RSS-o-Bot should run on all platforms where Node.js runs. But it's developed on Mac OS and the tests are run on Linux. The goal is that it also runs on Windows. Sadly I don't regularly have a machine to test it on. Running RSS-o-Bot itself on different platforms is pretty unproblematic for the most part. What's not as easy though, is running the different notifiers. Especially the desktop notifier. So please check its [docs](https://github.com/kriegslustig/rss-o-bot-desktop) for more information on compatibility.

## Name

The name RSS-o-Bot is a play on [RSS Bot](https://itunes.apple.com/us/app/rss-bot-news-notifier/id605732865?mt=12&ign-mpt=uo%3D4). The _o_ stands for open as in FOSS.

## Documentation

Refer to the [man-page on Github](https://github.com/Kriegslustig/rss-o-bot/blob/master/src/man/man.md) or `man rss-o-bot` (if you have installed it).

## Installation

```bash
npm i -g rss-o-bot
npm i -g rss-o-bot-email # A notifier
```

Your RSS-o-Bot, will search for a configuration file here: `~/.rss-o-bot/config.json`. Here's an example configuration:

```json
{
  "notification-methods": ["desktop", "telegram", "email"],
  "email-recipients": ["someone@somewhereinthe.net"],
  "telegram-api-token": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "telegram-recipients": ["00000000"]
}
```

By default rss-o-bot stores its data inside a SQLite database in `~/.rss-o-bot/feeds.sqlite`. But you may configure it as you want (see man-page).

After creating the configuration file you can validate it using `rss-o-bot test-config`.

## Usage

First, let's add a feed:

```bash
$ rss-o-bot add https://github.com/kriegslustig/rss-o-bot/commits/master.atom
```

When we now list all feeds, the one we added, is displayed.

```bash
$ rss-o-bot list
1: null - https://github.com/kriegslustig/rss-o-bot/commits/master.atom -
```

The first column in the output of `rss-o-bot list` is the feeds IDs. The second shows the title. It's `null` right now, because 

```bash
$ rss-o-bot rm 1
```

Now we can add the URL again, now with a filter:

```bash
$ rss-o-bot add https://github.com/kriegslustig/rss-o-bot/commits/master.atom "notif"
```

So now we get notified, whenever a commit message contains the string "notif". There are some more options available when adding filtered feeds. Refer to the [man-page](https://github.com/Kriegslustig/rss-o-bot/blob/master/src/man/man.md) for more information.

## Available Notifiers

* [`rss-o-bot-email`](https://github.com/kriegslustig/rss-o-bot-email)
* [`rss-o-bot-desktop`](https://github.com/kriegslustig/rss-o-bot-desktop)
* [`rss-o-bot-telegram`](https://github.com/kriegslustig/rss-o-bot-telegram)

## Daemonizing

To run RSS-o-Bot, you'll want to daemonize (make it run in the background) it. Daemonizing it brings some problems with it though. The daemonized process can't send desktop notifications. If you're using Linux you'll probably want to go with systemd. Figure it out yourself. If not, you probably want to use pm2. It provides a really powerful, yet simple to use system for process-daemonization (LOL).

```bash
npm i -g pm2
pm2 start rss-o-bot
```

If you haven't yet, I'd make pm2 services start upon reboot.

```bash
pm2 startup [platform] # Refer to `pm2 -h` for available platforms
```

## Development

Before committing, use `npm run build` to build the man page and the JS.

### Developing Notifiers

RSS-o-Bot requires a module for each "notification-methods" in the pattern `rss-o-bot-${method}`. You may develop your own notifier by creating a package and naming it `rss-o-bot-${method-name}`. That package's main should export a single function that is called by `rss-o-bot` in the following manner:

```js
notifier(configuration)(blogTitle, entryUrl, entryTitle)
```

You may want to check the [`rss-o-bot-email`](https://github.com/kriegslustig/rss-o-bot-email) source code for further reference.

## Trouble Shooting

### Error: Please install sqlite3 package manually

This error sometimes occures when sqlite3 couldn't be installed properly. To solve this do the following:

```
cd $(npm config get prefix)/lib/node_modules/rss-o-bot/node_modules/sqlite3
npm i --build-from-source
```

Now you should be able to run rss-o-bot.

## Credits

Logo created by [mala23](https://github.com/mala23)

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.

## TODO

* Completions
