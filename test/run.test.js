'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const server = helper.startServer()

test('run', (t) => {
  run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration >= 2, 'duration is at least 2s')
    t.equal(result.title, 'title321', 'title should be what was passed in')
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
    t.ok(result.requests.sent, 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')

    t.ok(result.start, 'start time exists')
    t.ok(result.finish, 'finish time exists')

    t.equal(result.errors, 0, 'no errors')

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })
})

test('tracker.stop()', (t) => {
  const tracker = run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration < 5, 'duration is lower because of stop')
    t.notOk(result.title, 'title should not exist when not passed in')
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
    t.ok(result.requests.sent, 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')

    t.ok(result.start, 'start time exists')
    t.ok(result.finish, 'finish time exists')

    t.equal(result.errors, 0, 'no errors')

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })

  t.ok(tracker.opts, 'opts exist on tracker')

  setTimeout(() => {
    tracker.stop()
  }, 1000)
})

test('run should callback with an error with an invalid connections factor', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    connections: -1
  }, function (err, result) {
    t.ok(err, 'invalid connections should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid pipelining factor', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    pipelining: -1
  }, function (err, result) {
    t.ok(err, 'invalid pipelining should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid bailout', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    bailout: -1
  }, function (err, result) {
    t.ok(err, 'invalid bailout should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid duration', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:' + server.address().port,
    duration: -1
  }, function (err, result) {
    t.ok(err, 'invalid duration should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error when no url is passed in', (t) => {
  t.plan(2)

  run({}, function (err, result) {
    t.ok(err, 'no url should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error after a bailout', (t) => {
  t.plan(2)

  run({
    url: 'http://localhost:4', // 4 = first unassigned port: https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers
    bailout: 1
  }, function (err, result) {
    t.error(err)
    t.ok(result, 'results should not exist')
    t.end()
  })
})

test('run should allow users to enter timestrings to be used for duration', (t) => {
  t.plan(3)

  const instance = run({
    url: 'http://localhost:' + server.address().port,
    duration: '10m'
  }, function (err, result) {
    t.error(err)
    t.ok(result, 'results should exist')
    t.end()
  })

  t.equal(instance.opts.duration, 10 * 60, 'duration should have been parsed to be 600 seconds (10m)')

  setTimeout(() => {
    instance.stop()
  }, 500)
})

test('run should recognise valid urls without http at the start', (t) => {
  t.plan(3)

  run({
    url: 'localhost:' + server.address().port,
    duration: 1
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.url, 'http://localhost:' + server.address().port, 'url should have http:// added to start')
    t.end()
  })
})

for (let i = 1; i <= 5; i++) {
  test(`run should count all ${i}xx status codes`, (t) => {
    t.plan(2)

    const server = helper.startServer({ statusCode: i * 100 + 2 })

    run({
      url: `http://localhost:${server.address().port}`,
      connections: 2,
      duration: 2
    }, (err, res) => {
      t.error(err)
      t.ok(res[`${i}xx`], `${i}xx status codes recorded`)
      t.end()
    })
  })
}
