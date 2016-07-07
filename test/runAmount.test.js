'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const timeoutServer = helper.startTimeoutServer()
const server = helper.startServer()

test('run should only send the expected number of requests', (t) => {
  t.plan(7)

  let done = false

  run({
    url: `http://localhost:${server.address().port}`,
    duration: 1,
    connections: 100,
    amount: 50146
  }, (err, res) => {
    t.error(err)
    t.equal(res.requests.total, 50146, 'results should match the amount')
    done = true
  })

  setTimeout(() => {
    t.notOk(done)
  }, 1000)

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    maxConnectionRequests: 10
  }, (err, res) => {
    t.error(err)
    t.equal(res.requests.total, 20, 'results should match max connection requests * connections')
  })

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    maxOverallRequests: 10
  }, (err, res) => {
    t.error(err)
    t.equal(res.requests.total, 10, 'results should match max overall requests')
  })
})

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
