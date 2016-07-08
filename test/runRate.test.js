'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const server = helper.startServer()

test('run should only send the expected number of requests per second', (t) => {
  t.plan(6)

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    overallRate: 10,
    amount: 40
  }, (err, res) => {
    t.error(err)
    t.equal(res.duration, 4, 'should have take 4 seconds to send 10 requests per seconds')
    t.equal(res.requests.average, 10, 'should have sent 10 requests per second on average')
  })

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    connectionRate: 10,
    amount: 40
  }, (err, res) => {
    t.error(err)
    t.equal(res.duration, 2, 'should have taken 2 seconds to send 10 requests per connection with 2 connections')
    t.equal(res.requests.average, 20, 'should have sent 20 requests per second on average with two connections')
  })
})
