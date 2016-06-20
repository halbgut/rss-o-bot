![alt text](https://i.imgur.com/reQMPMD.png "RSS-o-Bot Logo")

# RSS-o-Bot 1.0.0-rc.0

A super simple command-line RSS and Atom reader/client. It's not made to read Feeds (like Newsbeuter), but to notify you when new items are posted. The Web is supposed to be decentralized most readers (like RSS Bot) are built through centralized services. RSS-o-Bot is not. It's build to be run on your own machine. Notifications are managed by services that are installed separately. Notification services are available for email, desktop notifications and Telegram.

## Name

The name RSS-o-Bot is a play on [RSS Bot](https://itunes.apple.com/us/app/rss-bot-news-notifier/id605732865?mt=12&ign-mpt=uo%3D4). The _o_ stands for open as in FOSS.

## Documentation

Refer to the [man-page on Github](https://github.com/Kriegslustig/rss-o-bot/blob/master/src/man/man.md) or `man rss-o-bot` (if you have installed it).

## Installation

RSS-o-Bot can be run in two modes; remote and local. The former is meant for running RSS-o-Bot on a server and controlling it from your local machine. Local mode is preferred, since it's a lot simpler to use.

### Local Mode Installation

```bash
npm i -g rss-o-bot
npm i -g rss-o-bot-email # A notifier
```

Your RSS-o-Bot, will search for a configuration file in `~/.rss-o-bot`. Here's an example configuration:

```json
{
  "notification-methods": ["desktop", "telegram", "email"],
  "email-recipients": ["someone@somewhereinthe.net"],
  "telegram-api-token": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "telegram-recipients": ["00000000"]
}
```

By default rss-o-bot stores its data inside a SQLite database in `~/.rss-o-bot.sqlite`.

### Remote Mode Installation

Installing RSS-o-Bot on a remote Server is a bit more complex. You'll first need to create you're configuration files. The local configuration is pretty simple:

```json
{
  "remote": "[URL]",
  "remote-key": "[some random string]"
}
```

The `remote-key` is used as a key to sign the commands that you send to the server. It's symmetrical, meaning the key should be the same on the server and on the client. For more information on the implementation, refer to the man-page.

The configuration options on the server is basically the same as the local one.

```json
{
  "remote-key": "[some random string (same as in the local configuration)]",
  ...
}
```

For other configuration options, refer to the installation guide for the local version or the man-page.

## Usage

First, let's add a feed:

```bash
$ rss-o-bot add https://github.com/kriegslustig/rss-o-bot/commits/master.atom
```

That feed might might get a bit busy. So let's say, we only care about changes in the notification system. To add a filter, we'll first need to delete the old feed. To do that, we'll need to know its ID.

```bash
$ rss-o-bot list
1 https://github.com/kriegslustig/rss-o-bot/commits/master.atom
```

The first column in the output of `rss-o-bot list` denotes the ID. So let's remove it:

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

## Credits

Logo created by [mala23](https://github.com/mala23)

## TODO

* Multi-threading
* Remote
* Titles

