# RSS-o-Bot

## SYNOPSIS
[[SYNOPSIS]]

## FLAGS

### -h, --help
Displays the synopsis.

### -m, --man, --manual
Display the whole man page.

### -v, --version
Display the current version.

## ACTIONS
### [run]
Run the deamon process in the foreground.

### add _url_ [_filter_...]
_$1_ a Feed-URL to the database. _url_ is a URL to an Atom or RSS feed. The URL must include the protocol. HTTP and HTTPS are supported. Post-titles inside a feed will be filtered by the words passed as _filter_ to `add`. _filter_ can be negated (to check that a title doesn't include a string) by pepending them with a bang (`!`). For example `rss-o-bot add <url> 'children' '!cooking'`. Be carefull to always wrap negated filters in quotes (`'`). Otherwise your shell will probably interpret the bang as a keyword.

### rm _id_
Remove a Feed-URL from the database. _id_ is the key of a Feed-URL inside the database. `id`s are displayed in `rss-o-bot list`.

### list
List all Feed-URLs, their IDs and their filters.

### test-notification [_url_]
Send a test notification over the defined "notification-methods"

### import _path_
OPML import. Takes a _path_ to an OPML-file as a parameter and scanns it for outline elements. It's standard for RSS clients to provide an OPML export. These contain outline tags which the importer searches for. From those tags, the xmlUrl or Url Attributes are read as feed-URLs.

### export
Exports the RSS feeds as OPML to STDOUT. The export does not include the defined filters. Simply beacause, there is no standard way of exporting those.

### poll-feeds
Triggers a poll of all feeds in the database.

## DEBUGGING
To enter the debugging mode, you'll need to set the `DEBUG` environment variable to a list including `rss-o-bot`. For example:

```
DEBUG=rss-o-bot rss-o-bot
```

For further information check [the debug-package's docs](https://www.npmjs.com/package/debug). It's the debugging utitlity this tool uses.

## CONFIGURATION
RSS-o-Bot checks three places for configuration files. `$HOME/.rss-o-bot`, or `%USERPROFILE%\.rss-o-bot` on windows, `/etc/.rss-o-bot` and `${__dirname}/config.json`. The last is the root directory of the NPM package. It is only meant for development puposes. The files are check for their existance in that order (except for `config.json` which is checked first).

The configuration file should contain a single JSON-object on the root level. Use the example configuration inside the README as a reference. These are the available configuration options:

### notification-methods
An array of methods. When a new item appears in a stream, a notification will be sent over the defined methods. rss-o-bot requires modules named after these methods. So if you define a method `"email"` you'll need to `npm i -g rss-o-bot-email` first. Currenly known notifiers are `rss-o-bot-email`, `rss-o-bot-desktop`, `rss-o-bot-telegram`.

### interval
A number in section that defines how often the Feed-URLs should be polled.

### database
An object containing information on the database. It must include a `name` property. If you're database requires a username and password (non-SQLite), set these as the `username` and `password` properties. The object must also include a `options` object containing further information on the database connection. It must at least include a `dialect` and a `storage` attribute. SQLite is the prefered database here, since it has a very low overhead and high portability. The `options` object is passed as-is to Sequelize. Check its [docs](http://sequelize.readthedocs.io/en/latest/api/sequelize/) for further information. Here's an example of a simple `database` configuration:

```
{
  "name": "rssobot",
  "options": {
    "dialect": "sqlite",
    "storage": "~/.rss-o-bot.sqlite"
  }
}
```

## AUTHORS
Kriegslustig <npm@ls7.ch>

