/**
 * Tests for helpers.js
 */
const { test } = require('ava')
const { findExistingDirectory, exec } = require('../../../dist/lib/shared/helpers')
const { Observable: O } = require('rxjs/Rx')

test('findExistingDirectory positive', t => {
  t.plan(1)
  return findExistingDirectory(['./not/a/directory', '.'])
    .do(f => {
      t.is(f, '.')
    })
})

test('findExistingDirectory negative', t =>
  findExistingDirectory(['./not/a/directory'])
    .catch(() => {
      t.pass()
      return O.empty()
    })
)

test('exec', t => {
  t.plan(1)
  return exec('echo "test"')
    .do(lines => t.deepEqual(['test\n', ''], lines))
})
