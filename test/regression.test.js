'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const timeoutServer = helper.startTimeoutServer()

test('should shutdown after all amounts timeout', (t) => {
  t.plan(2)

  run({
    url: `http://localhost:${timeoutServer.address().port}`,
    amount: 10,
    timeout: 2,
    connections: 10
  }, (err, res) => {
    t.error(err)
    t.equal(res.errors, 10)
  })
})
