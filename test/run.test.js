'use strict'

const test = require('tap').test
const run = require('../lib/run')
const server = require('./helper').startServer()

test('run', (t) => {
  run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration >= 2, 'duration is at least 2s')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')

    t.ok(result.requests, 'requests exists')
    t.ok(result.requests.average, 'requests.average exists')
    t.ok(result.requests.stddev, 'requests.stddev exists')
    t.ok(result.requests.min, 'requests.min exists')
    t.ok(result.requests.max, 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })
})

test('tracker.stop()', (t) => {
  const tracker = run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 5
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration < 5, 'duration is lower because of stop')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')

    t.ok(result.requests, 'requests exists')
    t.ok(result.requests.average, 'requests.average exists')
    t.ok(result.requests.stddev, 'requests.stddev exists')
    t.ok(result.requests.min, 'requests.min exists')
    t.ok(result.requests.max, 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })

  t.ok(tracker.opts, 'opts exist on tracker')

  setTimeout(() => {
    tracker.stop()
  }, 1000)
})

test('run should callback with an error with an invalid pipelining factor', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    pipelining: -1,
    connections: 10
  }, function (err, result) {
    t.ok(err, 'invalid pipelining should cause an error')
    t.notOk(result, 'results should not exist')
  })
})

test('run should callback with an error with an invalid connections factor', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    connections: -1
  }, function (err, result) {
    t.ok(err, 'invalid connections should cause an error')
    t.notOk(result, 'results should not exist')
  })
})

test('run should callback with an error when no connections are passed in', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port
  }, function (err, result) {
    t.ok(err, 'no connections should cause an error')
    t.notOk(result, 'results should not exist')
  })
})

test('run should callback with an error when no url is passed in', (t) => {
  t.plan(2)

  run({
    connections: 10
  }, function (err, result) {
    t.ok(err, 'no connections should cause an error')
    t.notOk(result, 'results should not exist')
  })
})
