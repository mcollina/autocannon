'use strict'

const os = require('os')
const path = require('path')
const test = require('tap').test
const run = require('../lib/run')
const defaultOptions = require('../lib/defaultOptions')
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
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

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
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

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

test('run should accept a unix socket/windows pipe', (t) => {
  t.plan(11)

  const socketPath = process.platform === 'win32'
    ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
    : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

  helper.startServer({ socketPath })

  run({
    url: 'localhost',
    socketPath,
    connections: 2,
    duration: 2
  }, (err, result) => {
    t.error(err)
    t.ok(result, 'results should exist')
    t.equal(result.socketPath, socketPath, 'socketPath should be included in result')
    t.ok(result.requests.total > 0, 'should make at least one request')

    if (process.platform === 'win32') {
      // On Windows a few errors are expected. We'll accept a 1% error rate on
      // the pipe.
      t.ok(result.errors / result.requests.total < 0.01, `should have less than 1% errors on Windows (had ${result.errors} errors)`)
    } else {
      t.equal(result.errors, 0, 'no errors')
    }

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')
    t.end()
  })
})

for (let i = 1; i <= 5; i++) {
  test(`run should count all ${i}xx status codes`, (t) => {
    const server = helper.startServer({ statusCode: i * 100 + 2 })

    run({
      url: `http://localhost:${server.address().port}`,
      connections: 2,
      duration: 2
    }, (err, result) => {
      t.error(err)

      t.ok(result[`${i}xx`], `${i}xx status codes recorded`)

      t.ok(result.latency, 'latency exists')
      t.ok(!Number.isNaN(result.latency.average), 'latency.average is not NaN')
      t.type(result.latency.average, 'number', 'latency.average exists')
      t.type(result.latency.stddev, 'number', 'latency.stddev exists')
      t.ok(result.latency.min >= 0, 'latency.min exists')
      t.type(result.latency.max, 'number', 'latency.max exists')
      t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
      t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
      t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
      t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

      t.ok(result.throughput, 'throughput exists')
      t.ok(!Number.isNaN(result.throughput.average), 'throughput.average is not NaN')
      t.type(result.throughput.average, 'number', 'throughput.average exists')
      t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
      t.type(result.throughput.min, 'number', 'throughput.min exists')
      t.type(result.throughput.max, 'number', 'throughput.max exists')
      t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
      t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
      t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
      t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
      t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

      t.end()
    })
  })
}

test('run should not modify default options', (t) => {
  const origin = Object.assign({}, defaultOptions)
  run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)
    t.deepEqual(defaultOptions, origin, 'calling run function does not modify default options')
    t.end()
  })
})

test('run will exclude non 2xx stats from latency and throughput averages if excludeErrorStats is true', (t) => {
  const server = helper.startServer({ statusCode: 404 })

  run({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    duration: 2,
    excludeErrorStats: true
  }, (err, result) => {
    t.error(err)

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], 0, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], result.requests.total, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, result.requests.total, 'non 2xx codes')

    t.ok(result.latency, 'latency exists')
    t.equal(result.latency.average, 0, 'latency.average should be 0')
    t.equal(result.latency.stddev, 0, 'latency.stddev should be 0')
    t.equal(result.latency.min, 0, 'latency.min should be 0')
    t.equal(result.latency.max, 0, 'latency.max should be 0')
    t.equal(result.latency.p1, 0, 'latency.p1 (1%) should be 0')
    t.equal(result.latency.p2_5, 0, 'latency.p2_5 (2.5%) should be 0')
    t.equal(result.latency.p50, 0, 'latency.p50 (50%) should be 0')
    t.equal(result.latency.p97_5, 0, 'latency.p97_5 (97.5%) should be 0')
    t.equal(result.latency.p99, 0, 'latency.p99 (99%) should be 0')

    t.ok(result.throughput, 'throughput exists')
    t.equal(result.throughput.average, 0, 'throughput.average should be 0')
    t.equal(result.throughput.stddev, 0, 'throughput.stddev should be 0')
    t.equal(result.throughput.min, 0, 'throughput.min should be 0')
    t.equal(result.throughput.max, 0, 'throughput.max should be 0')
    t.equal(result.throughput.total, 0, 'throughput.total should be 0')
    t.equal(result.throughput.p1, 0, 'throughput.p1 (1%) should be 0')
    t.equal(result.throughput.p2_5, 0, 'throughput.p2_5 (2.5%) should be 0')
    t.equal(result.throughput.p50, 0, 'throughput.p50 (50%) should be 0')
    t.equal(result.throughput.p97_5, 0, 'throughput.p97_5 (97.5%) should be 0')

    t.end()
  })
})

test('tracker will emit reqError with error message on timeout', (t) => {
  t.plan(2)

  const server = helper.startTimeoutServer()

  const tracker = run({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    duration: 5,
    timeout: 2,
    bailout: 1,
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    t.type(err, Error, 'reqError should pass an Error to listener')
    t.equal(err.message, 'request timed out', 'error should indicate timeout')
    tracker.stop()
  })
})

test('tracker will emit reqError with error message on error', (t) => {
  t.plan(2)

  const server = helper.startSocketDestroyingServer()

  const tracker = run({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 15,
    method: 'POST',
    body: 'hello',
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    t.type(err, Error, 'reqError should pass an Error to listener')
    t.ok(err.message, 'err.message should have a value')
    tracker.stop()
  })
})

test('throw if connections is greater than amount', (t) => {
  t.plan(1)

  const server = helper.startSocketDestroyingServer()

  t.throws(function () {
    run({
      url: `http://localhost:${server.address().port}`,
      connections: 10,
      amount: 1,
      excludeErrorStats: true
    }, () => {})
  })
})

test('run promise', (t) => {
  run({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }).then(result => {
    t.ok(result.duration >= 2, 'duration is at least 2s')
    t.equal(result.title, 'title321', 'title should be what was passed in')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

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
