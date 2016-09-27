/**
 * Tests for helpers.js
 */
const { test } = require('ava')
const { findExistingDirectory } = require('../../src/lib/helpers')

test.cb(t => {
  findExistingDirectory(['./not/a/directory', '.'])
    .do(f => {
      t.is(f, '.')
    })
    .subscribe(
      () => {},
      (err) => {
        console.error(err)
        t.fail('')
        t.end()
      },
      () => {
        t.end()
      }
    )
})

