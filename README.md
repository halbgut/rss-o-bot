# RSS-o-Bot 0.4.1

A super simple RSS client.

## Installation

```bash
npm i -g rss-o-bot
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
```

## Daemonizing

If you're using linux you'll probably want to go with systemd. Figure it out yourself.

If not, you probably want to use pm2. It provides a really powerful, yet simple to use system for process-daemonization (LOL).

```js
npm i -g pm2
pm2 start rss-o-bot
```

## TODO

* Multi-threading
* Add a man-page, since they rock
* Replace the request library
* Fix the memory leak

