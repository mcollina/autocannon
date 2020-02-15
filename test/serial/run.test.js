'use strict'
const test = require('tap').test
const run = require('../../lib/run')

test('should log error on connection error', t => {
  t.plan(2)
  const _error = console.error
  console.error = function (obj) {
    t.type(obj, Error)
    t.is(obj.code, 'ENOTFOUND')
    console.error = _error
    t.end()
  }
  run({
    url: 'http://unknownhost',
    connections: 2,
    duration: '1',
    title: 'title321',
    debug: true
  })
})
