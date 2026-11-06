'use strict'

const { test } = require('node:test')
const Autocannon = require('../autocannon')

test('debug works', (t) => {
  t.plan(5, { wait: true })

  const args = Autocannon.parseArguments([
    '-H', 'X-Http-Method-Override=GET',
    '-m', 'POST',
    '-b', 'the body',
    '--debug',
    'http://localhost/foo/bar'
  ])

  t.assert.strictEqual(args.url, 'http://localhost/foo/bar')
  t.assert.deepStrictEqual(args.headers, { 'X-Http-Method-Override': 'GET' })
  t.assert.strictEqual(args.method, 'POST')
  t.assert.strictEqual(args.body, 'the body')
  t.assert.strictEqual(args.debug, true)
})
