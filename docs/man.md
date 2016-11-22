# RSS-o-Bot

## SYNOPSIS
[[SYNOPSIS]]

## VERSION
[[VERSION]]

## FLAGS/SWITCHES

### help, -h, --help
Displays the synopsis.

### manual, -m, --man, --manual
Display the whole man page.

### version, -v, --version
Display the current version.

### --config=_/path/to/configDirectory_
The path to a directory containing configuration files. See CONFIGURATION for further information.

### --columns=[_columns_...]
_columns_ should be a comma-seperated list of columns to be displayed. (e.g. `--columns=blogTitle, url`). Available columns are `blogTitle`, `url`, `filters` and `lastCheck`.

### --no-wrap
Don't wrap table views.

## ACTIONS
### [run]
Run the deamon process in the foreground.

### add _url_ [_filter_...]
_$1_ a Feed-URL to the database. _url_ is a URL to an Atom or RSS feed. The URL must include the protocol. HTTP and HTTPS are supported. Post-titles inside a feed will be filtered by the words passed as _filter_ to `add`. _filter_ can be negated (to check that a title doesn't include a string) by pepending them with a bang (`!`). For example `rss-o-bot add <url> 'children' '!cooking'`. Be carefull to always wrap negated filters in quotes (`'`). Otherwise your shell will probably interpret the bang as a keyword. The filters are matched using "_smartcase_" (as in VIM smartcase). So if a filter includes no upper-case letters, it will be matched case-insensitively. When it contains an upper-case letter it will be matched case-sensitively.

### rm _id_
Remove a Feed-URL from the database. _id_ is the key of a Feed-URL inside the database. `id`s are displayed in `rss-o-bot list`.

### list
List all Feed-URLs, their IDs and their filters. See also _--no-wrap_ and _--columns_

### test-notification [_url_]
Send a test notification over the defined "notification-methods"

### import _path_
OPML import. Takes a _path_ to an OPML-file as a parameter and scanns it for outline elements. It's standard for RSS clients to provide an OPML export. These contain outline tags which the importer searches for. From those tags, the xmlUrl or Url Attributes are read as feed-URLs.

### export
Exports the RSS feeds as OPML to STDOUT. The export does not include the defined filters. Simply beacause, there is no standard way of exporting those.

### poll-feeds
Triggers a poll of all feeds in the database.

### test-config
Validates the configuration file against a JSON Schema.

## DEBUGGING
To enter the debugging mode, you'll need to set the `DEBUG` environment variable to a list including `rss-o-bot`. For example:

```
DEBUG=rss-o-bot rss-o-bot
```

For further information check [the debug-package's docs](https://www.npmjs.com/package/debug). It's the debugging utitlity this tool uses.

## CONFIGURATION
RSS-o-Bot checks three places for configuration files. `$HOME/.rss-o-bot/config.json`, or `%USERPROFILE%\.rss-o-bot\config.json` on windows and `${__dirname}/data/config.json`. The last is the root directory of the NPM package. It is only meant for development purposes. The files are check for their existence in that order (except for `config.json` which is checked first). These configuration paths may be overridden using the `--config` switch. See *FLAGS/SWITCHES* for more information.

The configuration file should contain a single JSON-object on the root level. Use the example configuration inside the README as a reference. These are the available configuration options:

### notification-methods
An array of methods. No **default**. When a new item appears in a stream, a notification will be sent over the defined methods. rss-o-bot requires modules named after these methods. So if you define a method `"email"` you'll need to `npm i -g rss-o-bot-email` first. Currenly known notifiers are `rss-o-bot-email`, `rss-o-bot-desktop`, `rss-o-bot-telegram`.

### interval
A number in seconds that defines how often the Feed-URLs should be polled. **Defaults** to 300.

### database
An object containing information on the database. It must include a `name` property. If you're database requires a username and password (non-SQLite), set these as the `username` and `password` properties. The object must also include a `options` object containing further information on the database connection. It must at least include a `dialect` and a `storage` attribute. SQLite is the prefered database here, since it has a very low overhead and high portability. The `options` object is passed as-is to Sequelize. Check its [docs](http://sequelize.readthedocs.io/en/latest/api/sequelize/) for further information. The **default** is:

```
{
  "name": "rss-o-bot",
  "options": {
    "dialect": "sqlite",
    "storage": "~/.rss-o-bot/feeds.sqlite"
  }
}
```

## Remote-Mode
The RSS-o-Bot daemon can be run on a remote machine (as a server) and controlled through the local installation. The installation isn't as straight forward as the simple _local-mode_ install. A quick note on terminology; *remote* refers to the local installation and server refers to the daemon running somewhere else.

### Install
First, let's set up the remote (local installation). Simply install it using `NPM`. Now let's configure it. Create a file `~/.rss-o-bot/config.json`. It should contain the following:

```
{
  "remote": "my.fancy-server.co"
}
```

Fill in the address of your server in the `remote`-field. It may contain a domain or an IP. You can also use a `port`-field to set the remote to communicate with something other than the default port (3645). If you have any questions regarding configuration, please checkout the JSON-Schema in docs/config.schema.json first.

Then on your server, install `RSS-o-Bot`, the same way. Then configure it, as you would in the local-mode installation and add the following field:

```
{
  ...
  "mode": "server"
}
```

Then run the server as a daemon as described in the README.

The communication between remote and server is simple HTTP. To secure it, all messages from remote to server is signed and verified using an asymetric cypher. These messages **are not encrypted** and communication from server to client is **not signed**. Only commands sent from remote to server are signed. That means, that anyone can listen in. So It's advisable to run an RSS-o-Bot server behind a TLS-enabled SSH proxy.

For that asymetric signiture to work, a keypair needs to be generated and a public key communicated to the server. RSS-o-Bot provides an easy to use command for that. After configuring both server and remote and having started the server daemon, you can simply run `rss-o-bot gen-keys` on the remote. This command assumes that you are either using TLS (as described in the last paragraph) or are trusting the connection. If a MitM may intercept the public key and send his own along, defeating the signature/verification process insecure.

## AUTHORS
Kriegslustig <npm@ls7.ch>

