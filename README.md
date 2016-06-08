# RSS-o-Bot 0.4.7

A super simple commandline RSS and Atom reader/client. It's not made to read Feeds (like Newsbeuter), but to notify you when new items are posted. The Web is supposed to be decentralized most readers (like RSS Bot) are built through centralized services. RSS-o-Bot is not. It's build to be run on your own machine. Notifications are managed by services that are installed seperatly. Notification services are available for email, desktop notifications and Telegram.

## Name

The name RSS-o-Bot is a play on [RSS Bot](https://itunes.apple.com/us/app/rss-bot-news-notifier/id605732865?mt=12&ign-mpt=uo%3D4). The _o_ stands for open as in FOSS.

## Documentation

Refer to the [man-page on Github](https://github.com/Kriegslustig/rss-o-bot/blob/master/src/man/man.md) or `man rss-o-bot` (if you have installed it).

## Installation

```bash
npm i -g rss-o-bot
npm i -g rss-o-bot-email # A notifier
```

Your RSS-o-Bot, will search for a configuration file in ~/.rss-o-bot. Here's an example configuration:

```json
{
  "notification-methods": ["telegram", "desktop"],
  "telegram-api-token": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "telegram-recipients": ["00000000"],
  "interval": 100,
  "database": {
    "name": "data",
    "username": null,
    "password": null,
    "options": {
      "dialect": "sqlite",
      "storage": "/home/myuser/.rss-o-bot.sqlite"
    }
  }
}
```

## Usage

```bash
rss-o-bot -h
rss-o-bot add https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw "Machine Learning Recipes"
```

## Daemonizing

If you're using linux you'll probably want to go with systemd. Figure it out yourself.

If not, you probably want to use pm2. It provides a really powerful, yet simple to use system for process-daemonization (LOL).

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

## TODO

* Multi-threading
* Fix possible memory leak
* GUI?
* Add support for E-Mail notifications (SMTP)
* Implement extandability for the notifications system throug packages

