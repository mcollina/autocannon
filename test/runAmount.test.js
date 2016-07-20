'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const timeoutServer = helper.startTimeoutServer()
const server = helper.startServer()

test('run should only send the expected number of requests', (t) => {
  t.plan(10)

  let done = false

  run({
    url: `http://localhost:${server.address().port}`,
    duration: 1,
    connections: 100,
    amount: 50146
  }, (err, res) => {
    t.error(err)
    t.equal(res.requests.total + res.timeouts, 50146, 'results should match the amount')
    t.equal(res.totalRequests, 50146, 'totalRequests should match the amount')
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
    t.equal(res.totalRequests, 20, 'totalRequests should match the expected amount')
  })

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    maxOverallRequests: 10
  }, (err, res) => {
    t.error(err)
    t.equal(res.requests.total, 10, 'results should match max overall requests')
    t.equal(res.totalRequests, 10, 'totalRequests should match the expected amount')
  })
})

test('should shutdown after all amounts timeout', (t) => {
  t.plan(5)

  run({
    url: `http://localhost:${timeoutServer.address().port}`,
    amount: 10,
    timeout: 2,
    connections: 10
  }, (err, res) => {
    t.error(err)
    t.equal(res.errors, 10)
    t.equal(res.timeouts, 10)
    t.equal(res.totalRequests, 10, 'totalRequests should match the expected amount')
    t.equal(res.requests.total, 0, 'total completed requests should be 0')
  })
})
