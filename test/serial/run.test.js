'use strict'
const test = require('tap').test
const run = require('../../lib/run')

test('should log error on connection error', t => {
  t.plan(1)
  console.error = function (obj) {
    t.type(obj, Error)
    console.error = () => {}
  }
  run({
    url: 'http://unknownhost',
    connections: 2,
    duration: 2,
    title: 'title321',
    debug: true
  })
})
