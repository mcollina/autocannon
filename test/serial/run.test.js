'use strict'
const { test } = require('node:test')
const initJob = require('../../lib/init')

test('should log error on connection error', t => {
  t.plan(1, { wait: true })
  console.error = function (obj) {
    t.assert.ok(obj instanceof Error)
    console.error = () => {}
  }
  initJob({
    url: 'http://unknownhost',
    connections: 2,
    duration: 5,
    title: 'title321',
    debug: true
  })
})
