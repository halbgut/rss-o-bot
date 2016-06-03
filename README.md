# RSS-o-Bot 0.2.0

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

## TODO

* Document the demonization
* Multi-threading
* Clean up the output

