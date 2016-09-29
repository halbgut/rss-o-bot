/**
 * Tests for helpers.js
 */
const { test } = require('ava')
const { findExistingDirectory } = require('../../dist/lib/helpers')
const { Observable: O } = require('rxjs/Rx')

test('findExistingDirectory positive', t =>
  findExistingDirectory(['./not/a/directory', '.'])
    .do(f => {
      t.is(f, '.')
    })
)

test('findExistingDirectory negative', t =>
  findExistingDirectory(['./not/a/directory'])
    .catch(() => {
      t.pass()
      return O.empty()
    })
)

