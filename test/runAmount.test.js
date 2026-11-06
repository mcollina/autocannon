'use strict'

const { test } = require('node:test')
const initJob = require('../lib/init')
const helper = require('./helper')
const timeoutServer = helper.startTimeoutServer()
const server = helper.startServer()

test('run should only send the expected number of requests', (t) => {
  t.plan(10, { wait: true })

  let done = false

  initJob({
    url: `http://localhost:${server.address().port}`,
    duration: 1,
    connections: 100,
    amount: 50146
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.requests.total + res.timeouts, 50146, 'results should match the amount')
    t.assert.strictEqual(res.requests.sent, 50146, 'totalRequests should match the amount')
    done = true
  })

  setTimeout(() => {
    t.assert.ok(!done)
  }, 1000)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    maxConnectionRequests: 10
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.requests.total, 20, 'results should match max connection requests * connections')
    t.assert.strictEqual(res.requests.sent, 20, 'totalRequests should match the expected amount')
  })

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    maxOverallRequests: 10
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.requests.total, 10, 'results should match max overall requests')
    t.assert.strictEqual(res.requests.sent, 10, 'totalRequests should match the expected amount')
  })
})

test('should shutdown after all amounts timeout', (t) => {
  t.plan(5, { wait: true })

  initJob({
    url: `http://localhost:${timeoutServer.address().port}`,
    amount: 10,
    timeout: 2,
    connections: 10
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.errors, 10)
    t.assert.strictEqual(res.timeouts, 10)
    t.assert.strictEqual(res.requests.sent, 10, 'totalRequests should match the expected amount')
    t.assert.strictEqual(res.requests.total, 0, 'total completed requests should be 0')
  })
})

test('should reconnect twice to the server with a reset rate of 10 for 20 connections', (t, done) => {
  t.plan(3)
  const testServer = helper.startServer()

  initJob({
    url: 'localhost:' + testServer.address().port,
    connections: 1,
    amount: 20,
    reconnectRate: 2
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.requests.sent, 20, 'totalRequests should match the expected amount')
    t.assert.strictEqual(testServer.autocannonConnects, 10, 'should have connected to the server 10 times after dropping the connection every second request')
    done()
  })
})
