'use strict'

const os = require('os')
const path = require('path')
const { test } = require('node:test')
const initJob = require('../lib/init')
const defaultOptions = require('../lib/defaultOptions')
const helper = require('./helper')
const server = helper.startServer()

test('init', (t, done) => {
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.ok(result.duration >= 2, 'duration is at least 2s')
    t.assert.strictEqual(result.title, 'title321', 'title should be what was passed in')
    t.assert.strictEqual(result.connections, 2, 'connections is the same')
    t.assert.strictEqual(result.pipelining, 1, 'pipelining is the default')

    t.assert.ok(result.latency, 'latency exists')
    t.assert.strictEqual(typeof result.latency.average, 'number', 'latency.average exists')
    t.assert.strictEqual(typeof result.latency.stddev, 'number', 'latency.stddev exists')
    t.assert.ok(result.latency.min >= 0, 'latency.min exists')
    t.assert.strictEqual(typeof result.latency.max, 'number', 'latency.max exists')
    t.assert.strictEqual(typeof result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.assert.strictEqual(typeof result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.assert.strictEqual(typeof result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.assert.ok(result.requests, 'requests exists')
    t.assert.strictEqual(typeof result.requests.average, 'number', 'requests.average exists')
    t.assert.strictEqual(typeof result.requests.stddev, 'number', 'requests.stddev exists')
    t.assert.strictEqual(typeof result.requests.min, 'number', 'requests.min exists')
    t.assert.strictEqual(typeof result.requests.max, 'number', 'requests.max exists')
    t.assert.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.assert.strictEqual(typeof result.requests.sent, 'number', 'sent exists')
    t.assert.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.assert.strictEqual(typeof result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.assert.strictEqual(typeof result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.assert.strictEqual(typeof result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.assert.ok(result.throughput, 'throughput exists')
    t.assert.strictEqual(typeof result.throughput.average, 'number', 'throughput.average exists')
    t.assert.strictEqual(typeof result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.assert.strictEqual(typeof result.throughput.min, 'number', 'throughput.min exists')
    t.assert.strictEqual(typeof result.throughput.max, 'number', 'throughput.max exists')
    t.assert.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.assert.strictEqual(typeof result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.assert.strictEqual(typeof result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.assert.strictEqual(typeof result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.assert.ok(result.start, 'start time exists')
    t.assert.ok(result.finish, 'finish time exists')

    t.assert.strictEqual(result.errors, 0, 'no errors')
    t.assert.strictEqual(result.mismatches, 0, 'no mismatches')
    t.assert.strictEqual(result.resets, 0, 'no resets')

    t.assert.strictEqual(result['1xx'], 0, '1xx codes')
    t.assert.strictEqual(result['2xx'], result.requests.total, '2xx codes')
    t.assert.strictEqual(result['3xx'], 0, '3xx codes')
    t.assert.strictEqual(result['4xx'], 0, '4xx codes')
    t.assert.strictEqual(result['5xx'], 0, '5xx codes')
    t.assert.strictEqual(result.non2xx, 0, 'non 2xx codes')

    done()
  })
})

test('run preserves URL credentials, host and request target', (t) => {
  t.plan(6, { wait: true })

  const server = helper.startServer({
    body (req) {
      t.assert.strictEqual(req.url, '/some%20path?name=a%20b&value=1', 'path and query stay encoded')
      t.assert.strictEqual(req.headers.host, `localhost:${server.address().port}`, 'host includes the port')
      t.assert.strictEqual(req.headers.authorization, `Basic ${Buffer.from('user@name:p@ss:word').toString('base64')}`, 'credentials are decoded')
      return 'hello world'
    }
  })
  t.after(() => server.close())

  initJob({
    url: `http://user%40name:p%40ss%3Aword@localhost:${server.address().port}/some%20path?name=a%20b&value=1#fragment`,
    connections: 1,
    amount: 1
  }, (err, result) => {
    t.assert.ifError(err)
    t.assert.strictEqual(result.errors, 0, 'no connection errors')
    t.assert.strictEqual(result.requests.total, 1, 'request completed')
  })
})

test('tracker.stop()', (t, done) => {
  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.ok(result.duration < 5, 'duration is lower because of stop')
    t.assert.ok(!result.title, 'title should not exist when not passed in')
    t.assert.strictEqual(result.connections, 2, 'connections is the same')
    t.assert.strictEqual(result.pipelining, 1, 'pipelining is the default')

    t.assert.ok(result.latency, 'latency exists')
    t.assert.strictEqual(typeof result.latency.average, 'number', 'latency.average exists')
    t.assert.strictEqual(typeof result.latency.stddev, 'number', 'latency.stddev exists')
    t.assert.ok(result.latency.min >= 0, 'latency.min exists')
    t.assert.strictEqual(typeof result.latency.max, 'number', 'latency.max exists')
    t.assert.strictEqual(typeof result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.assert.strictEqual(typeof result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.assert.strictEqual(typeof result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.assert.ok(result.requests, 'requests exists')
    t.assert.strictEqual(typeof result.requests.average, 'number', 'requests.average exists')
    t.assert.strictEqual(typeof result.requests.stddev, 'number', 'requests.stddev exists')
    t.assert.strictEqual(typeof result.requests.min, 'number', 'requests.min exists')
    t.assert.strictEqual(typeof result.requests.max, 'number', 'requests.max exists')
    t.assert.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.assert.strictEqual(typeof result.requests.sent, 'number', 'sent exists')
    t.assert.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.assert.strictEqual(typeof result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.assert.strictEqual(typeof result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.assert.strictEqual(typeof result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.assert.ok(result.throughput, 'throughput exists')
    t.assert.strictEqual(typeof result.throughput.average, 'number', 'throughput.average exists')
    t.assert.strictEqual(typeof result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.assert.strictEqual(typeof result.throughput.min, 'number', 'throughput.min exists')
    t.assert.strictEqual(typeof result.throughput.max, 'number', 'throughput.max exists')
    t.assert.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.assert.strictEqual(typeof result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.assert.strictEqual(typeof result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.assert.strictEqual(typeof result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.assert.ok(result.start, 'start time exists')
    t.assert.ok(result.finish, 'finish time exists')

    t.assert.strictEqual(result.errors, 0, 'no errors')
    t.assert.strictEqual(result.mismatches, 0, 'no mismatches')

    t.assert.strictEqual(result['1xx'], 0, '1xx codes')
    t.assert.strictEqual(result['2xx'], result.requests.total, '2xx codes')
    t.assert.strictEqual(result['3xx'], 0, '3xx codes')
    t.assert.strictEqual(result['4xx'], 0, '4xx codes')
    t.assert.strictEqual(result['5xx'], 0, '5xx codes')
    t.assert.strictEqual(result.non2xx, 0, 'non 2xx codes')

    done()
  })

  t.assert.ok(tracker.opts, 'opts exist on tracker')

  setTimeout(() => {
    tracker.stop()
  }, 1000)
})

test('requests.min should be 0 when there are no successful requests', (t, done) => {
  initJob({
    url: 'nonexistent',
    connections: 1,
    amount: 1
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.strictEqual(result.requests.min, 0, 'requests.min should be 0')
    done()
  })
})

test('run should callback with an error with an invalid connections factor', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: -1
  }, function (err, result) {
    t.assert.ok(err, 'invalid connections should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should callback with an error with an invalid pipelining factor', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    pipelining: -1
  }, function (err, result) {
    t.assert.ok(err, 'invalid pipelining should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should callback with an error with an invalid bailout', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    bailout: -1
  }, function (err, result) {
    t.assert.ok(err, 'invalid bailout should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should callback with an error with an invalid duration', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    duration: -1
  }, function (err, result) {
    t.assert.ok(err, 'invalid duration should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should callback with an error when no url is passed in', (t, done) => {
  t.plan(2)

  initJob({}, function (err, result) {
    t.assert.ok(err, 'no url should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should callback with an error after a bailout', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:4', // 4 = first unassigned port: https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers
    bailout: 1
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.ok(result, 'results should not exist')
    done()
  })
})

test('run should callback with an error using expectBody and requests', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    requests: [{ body: 'something' }],
    expectBody: 'hello'
  }, function (err, result) {
    t.assert.ok(err, 'expectBody used with requests should cause an error')
    t.assert.ok(!result, 'results should not exist')
    done()
  })
})

test('run should handle context correctly', (t) => {
  t.plan(1, { wait: true })

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    initialContext: { init: 'context' },
    requests: [{
      setupRequest: (req, context) => {
        t.assert.deepStrictEqual(context, { init: 'context' }, 'context should be initialized from opts')
        return req
      }
    }]
  })
})

test('run should allow users to enter timestrings to be used for duration', (t, done) => {
  t.plan(3)

  const instance = initJob({
    url: 'http://localhost:' + server.address().port,
    duration: '10m'
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.ok(result, 'results should exist')
    done()
  })

  t.assert.strictEqual(instance.opts.duration, 10 * 60, 'duration should have been parsed to be 600 seconds (10m)')

  setTimeout(() => {
    instance.stop()
  }, 500)
})

test('run should recognise valid urls without http at the start', (t, done) => {
  t.plan(3)

  initJob({
    url: 'localhost:' + server.address().port,
    duration: 1
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(res, 'results should exist')
    t.assert.strictEqual(res.url, 'http://localhost:' + server.address().port, 'url should have http:// added to start')
    done()
  })
})

test('run should produce count of mismatches with expectBody set', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    expectBody: 'body will not be this',
    maxOverallRequests: 10,
    timeout: 100
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.strictEqual(result.mismatches, 10)
    done()
  })
})

test('run should produce 0 mismatches with expectBody set and matches', (t, done) => {
  t.plan(2)

  const responseBody = 'hello dave'
  const server = helper.startServer({ body: responseBody })

  initJob({
    url: 'http://localhost:' + server.address().port,
    expectBody: responseBody,
    maxOverallRequests: 10
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.strictEqual(result.mismatches, 0)
    done()
  })
})

test('run should produce count of mismatches with verifyBody set', (t, done) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    verifyBody: function () {
      return false
    },
    maxOverallRequests: 10,
    timeout: 100
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.strictEqual(result.mismatches, 10)
    done()
  })
})

test('run should produce 0 mismatches with verifyBody set and return true', (t, done) => {
  t.plan(2)

  const responseBody = 'hello dave'
  const server = helper.startServer({ body: responseBody })

  initJob({
    url: 'http://localhost:' + server.address().port,
    verifyBody: function (body) {
      return body.indexOf('hello') > -1
    },
    maxOverallRequests: 10
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.strictEqual(result.mismatches, 0)
    done()
  })
})

test('run should accept a unix socket/windows pipe', (t, done) => {
  t.plan(11)

  const socketPath = process.platform === 'win32'
    ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
    : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

  helper.startServer({ socketPath })

  initJob({
    url: 'localhost',
    socketPath,
    connections: 2,
    duration: 2
  }, (err, result) => {
    t.assert.ifError(err)
    t.assert.ok(result, 'results should exist')
    t.assert.strictEqual(result.socketPath, socketPath, 'socketPath should be included in result')
    t.assert.ok(result.requests.total > 0, 'should make at least one request')

    if (process.platform === 'win32') {
      // On Windows a few errors are expected. We'll accept a 1% error rate on
      // the pipe.
      t.assert.ok(result.errors / result.requests.total < 0.01, `should have less than 1% errors on Windows (had ${result.errors} errors)`)
    } else {
      t.assert.strictEqual(result.errors, 0, 'no errors')
    }

    t.assert.strictEqual(result['1xx'], 0, '1xx codes')
    t.assert.strictEqual(result['2xx'], result.requests.total, '2xx codes')
    t.assert.strictEqual(result['3xx'], 0, '3xx codes')
    t.assert.strictEqual(result['4xx'], 0, '4xx codes')
    t.assert.strictEqual(result['5xx'], 0, '5xx codes')
    t.assert.strictEqual(result.non2xx, 0, 'non 2xx codes')
    done()
  })
})

for (let i = 1; i <= 5; i++) {
  test(`run should count all ${i}xx status codes`, (t, done) => {
    const server = helper.startServer({ statusCode: i * 100 + 2 })

    initJob({
      url: `http://localhost:${server.address().port}`,
      connections: 2,
      duration: 2
    }, (err, result) => {
      t.assert.ifError(err)

      t.assert.ok(result[`${i}xx`], `${i}xx status codes recorded`)

      t.assert.ok(result.latency, 'latency exists')
      t.assert.ok(!Number.isNaN(result.latency.average), 'latency.average is not NaN')
      t.assert.strictEqual(typeof result.latency.average, 'number', 'latency.average exists')
      t.assert.strictEqual(typeof result.latency.stddev, 'number', 'latency.stddev exists')
      t.assert.ok(result.latency.min >= 0, 'latency.min exists')
      t.assert.strictEqual(typeof result.latency.max, 'number', 'latency.max exists')
      t.assert.strictEqual(typeof result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
      t.assert.strictEqual(typeof result.latency.p50, 'number', 'latency.p50 (50%) exists')
      t.assert.strictEqual(typeof result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
      t.assert.strictEqual(typeof result.latency.p99, 'number', 'latency.p99 (99%) exists')

      t.assert.ok(result.throughput, 'throughput exists')
      t.assert.ok(!Number.isNaN(result.throughput.average), 'throughput.average is not NaN')
      t.assert.strictEqual(typeof result.throughput.average, 'number', 'throughput.average exists')
      t.assert.strictEqual(typeof result.throughput.stddev, 'number', 'throughput.stddev exists')
      t.assert.strictEqual(typeof result.throughput.min, 'number', 'throughput.min exists')
      t.assert.strictEqual(typeof result.throughput.max, 'number', 'throughput.max exists')
      t.assert.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
      t.assert.strictEqual(typeof result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
      t.assert.strictEqual(typeof result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
      t.assert.strictEqual(typeof result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
      t.assert.strictEqual(typeof result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

      done()
    })
  })
}

test('run should not modify default options', (t, done) => {
  const origin = Object.assign({}, defaultOptions)
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.deepStrictEqual(defaultOptions, origin, 'calling run function does not modify default options')
    done()
  })
})

test('run will exclude non 2xx stats from latency and throughput averages if excludeErrorStats is true', (t, done) => {
  const server = helper.startServer({ statusCode: 404 })

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    duration: 2,
    excludeErrorStats: true
  }, (err, result) => {
    t.assert.ifError(err)

    t.assert.strictEqual(result['1xx'], 0, '1xx codes')
    t.assert.strictEqual(result['2xx'], 0, '2xx codes')
    t.assert.strictEqual(result['3xx'], 0, '3xx codes')
    t.assert.strictEqual(result['4xx'], result.requests.total, '4xx codes')
    t.assert.strictEqual(result['5xx'], 0, '5xx codes')
    t.assert.strictEqual(result.non2xx, result.requests.total, 'non 2xx codes')

    t.assert.ok(result.latency, 'latency exists')
    t.assert.strictEqual(result.latency.average, 0, 'latency.average should be 0')
    t.assert.strictEqual(result.latency.stddev, 0, 'latency.stddev should be 0')
    t.assert.strictEqual(result.latency.min, 0, 'latency.min should be 0')
    t.assert.strictEqual(result.latency.max, 0, 'latency.max should be 0')
    t.assert.strictEqual(result.latency.p1, 0, 'latency.p1 (1%) should be 0')
    t.assert.strictEqual(result.latency.p2_5, 0, 'latency.p2_5 (2.5%) should be 0')
    t.assert.strictEqual(result.latency.p50, 0, 'latency.p50 (50%) should be 0')
    t.assert.strictEqual(result.latency.p97_5, 0, 'latency.p97_5 (97.5%) should be 0')
    t.assert.strictEqual(result.latency.p99, 0, 'latency.p99 (99%) should be 0')

    t.assert.ok(result.throughput, 'throughput exists')
    t.assert.strictEqual(result.throughput.average, 0, 'throughput.average should be 0')
    t.assert.strictEqual(result.throughput.stddev, 0, 'throughput.stddev should be 0')
    t.assert.strictEqual(result.throughput.min, 0, 'throughput.min should be 0')
    t.assert.strictEqual(result.throughput.max, 0, 'throughput.max should be 0')
    t.assert.strictEqual(result.throughput.total, 0, 'throughput.total should be 0')
    t.assert.strictEqual(result.throughput.p1, 0, 'throughput.p1 (1%) should be 0')
    t.assert.strictEqual(result.throughput.p2_5, 0, 'throughput.p2_5 (2.5%) should be 0')
    t.assert.strictEqual(result.throughput.p50, 0, 'throughput.p50 (50%) should be 0')
    t.assert.strictEqual(result.throughput.p97_5, 0, 'throughput.p97_5 (97.5%) should be 0')

    done()
  })
})

test('tracker will emit reqError with error message on timeout', (t) => {
  t.plan(2, { wait: true })

  const server = helper.startTimeoutServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    duration: 5,
    timeout: 2,
    bailout: 1,
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    t.assert.ok(err instanceof Error, 'reqError should pass an Error to listener')
    t.assert.strictEqual(err.message, 'request timed out', 'error should indicate timeout')
    tracker.stop()
  })
})

test('tracker will emit reqError with error message on error', (t) => {
  t.plan(1, { wait: true })

  const server = helper.startSocketDestroyingServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 15,
    method: 'POST',
    body: 'hello',
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    console.log(err)
    t.assert.ok(err instanceof Error, 'reqError should pass an Error to listener')
    tracker.stop()
  })
})

test('tracker will emit reqMismatch when body does not match expectBody', (t) => {
  t.plan(2, { wait: true })

  const responseBody = 'hello world'
  const server = helper.startServer({ body: responseBody })

  const expectBody = 'goodbye world'

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 15,
    method: 'GET',
    body: 'hello',
    expectBody
  })

  tracker.once('reqMismatch', (bodyStr) => {
    t.assert.strictEqual(bodyStr, responseBody)
    t.assert.notStrictEqual(bodyStr, expectBody)
    tracker.stop()
  })
})

test('tracker will emit tick with current counter value', (t) => {
  t.plan(1, { wait: true })

  const server = helper.startSocketDestroyingServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 10
  })

  tracker.once('tick', (counter) => {
    t.assert.strictEqual(typeof counter, 'object')
    tracker.stop()
  })
})

test('throw if connections is greater than amount', (t) => {
  t.plan(1, { wait: true })

  const server = helper.startSocketDestroyingServer()

  t.assert.throws(function () {
    initJob({
      url: `http://localhost:${server.address().port}`,
      connections: 10,
      amount: 1,
      excludeErrorStats: true
    }, () => {})
  })
})

test('run promise', (t, done) => {
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }).then(result => {
    t.assert.ok(result.duration >= 2, 'duration is at least 2s')
    t.assert.strictEqual(result.title, 'title321', 'title should be what was passed in')
    t.assert.strictEqual(result.connections, 2, 'connections is the same')
    t.assert.strictEqual(result.pipelining, 1, 'pipelining is the default')

    t.assert.ok(result.latency, 'latency exists')
    t.assert.strictEqual(typeof result.latency.average, 'number', 'latency.average exists')
    t.assert.strictEqual(typeof result.latency.stddev, 'number', 'latency.stddev exists')
    t.assert.ok(result.latency.min >= 0, 'latency.min exists')
    t.assert.strictEqual(typeof result.latency.max, 'number', 'latency.max exists')
    t.assert.strictEqual(typeof result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.assert.strictEqual(typeof result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.assert.strictEqual(typeof result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.assert.ok(result.requests, 'requests exists')
    t.assert.strictEqual(typeof result.requests.average, 'number', 'requests.average exists')
    t.assert.strictEqual(typeof result.requests.stddev, 'number', 'requests.stddev exists')
    t.assert.strictEqual(typeof result.requests.min, 'number', 'requests.min exists')
    t.assert.strictEqual(typeof result.requests.max, 'number', 'requests.max exists')
    t.assert.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.assert.strictEqual(typeof result.requests.sent, 'number', 'sent exists')
    t.assert.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.assert.strictEqual(typeof result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.assert.strictEqual(typeof result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.assert.strictEqual(typeof result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.assert.ok(result.throughput, 'throughput exists')
    t.assert.strictEqual(typeof result.throughput.average, 'number', 'throughput.average exists')
    t.assert.strictEqual(typeof result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.assert.strictEqual(typeof result.throughput.min, 'number', 'throughput.min exists')
    t.assert.strictEqual(typeof result.throughput.max, 'number', 'throughput.max exists')
    t.assert.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.assert.strictEqual(typeof result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.assert.strictEqual(typeof result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.assert.strictEqual(typeof result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.assert.strictEqual(typeof result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.assert.ok(result.start, 'start time exists')
    t.assert.ok(result.finish, 'finish time exists')

    t.assert.strictEqual(result.errors, 0, 'no errors')
    t.assert.strictEqual(result.resets, 0, 'no resets')

    t.assert.strictEqual(result['1xx'], 0, '1xx codes')
    t.assert.strictEqual(result['2xx'], result.requests.total, '2xx codes')
    t.assert.strictEqual(result['3xx'], 0, '3xx codes')
    t.assert.strictEqual(result['4xx'], 0, '4xx codes')
    t.assert.strictEqual(result['5xx'], 0, '5xx codes')
    t.assert.strictEqual(result.non2xx, 0, 'non 2xx codes')

    done()
  })
})

test('should throw if duration is not a number nor a string', t => {
  t.plan(1, { wait: true })
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: ['foobar'],
    title: 'title321'
  })
    .then((result) => {
      t.assert.fail()
    })
    .catch((err) => {
      t.assert.strictEqual(err.message, 'duration entered was in an invalid format')
    })
})

test('should emit error', (t, done) => {
  t.plan(1)
  const server = helper.startServer()
  const tracker = initJob({
    url: `http://unknownhost:${server.address().port}`,
    connections: 1,
    timeout: 100,
    forever: true,
    form: {
      param1: {
        type: 'string',
        value: null // this will trigger an error
      }
    }
  })

  tracker.once('error', (error) => {
    t.assert.strictEqual(error.message, 'A \'type\' key with value \'text\' or \'file\' should be specified')
    done()
  })
})

test('should throw if timeout is less than zero', t => {
  t.plan(1, { wait: true })
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    timeout: -1,
    title: 'title321'
  })
    .then((result) => {
      t.assert.fail()
    })
    .catch((err) => {
      t.assert.strictEqual(err.message, 'timeout must be greater than 0')
    })
})

test('should handle duration in string format', t => {
  t.plan(1, { wait: true })
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: '1',
    title: 'title321'
  }).then((result) => {
    t.assert.ok(true)
  })
})

test('should count resets', (t, done) => {
  t.plan(1)
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 10,
    requests: [
      { method: 'GET' },
      { method: 'PUT' },
      {
        method: 'POST',
        // falsey result will reset
        setupRequest: () => {}
      }
    ]
  }).then((result) => {
    t.assert.strictEqual(result.resets, 4)
    done()
  })
})

test('should get onResponse callback invoked even when there is no body', async t => {
  t.plan(4, { wait: true })
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok' }, { statusCode: 204 }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 2,
    requests: [
      {
        method: 'GET',
        onResponse (status, body) {
          t.assert.deepStrictEqual(status, 200)
          t.assert.deepStrictEqual(body, 'ok')
        }
      },
      {
        method: 'GET',
        onResponse (status, body) {
          t.assert.deepStrictEqual(status, 204)
          t.assert.deepStrictEqual(body, '')
        }
      }
    ]
  })
})

test('should use request from HAR', (t, done) => {
  t.plan(6)
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    duration: 1,
    har
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(res, 'results should exist')
    t.assert.strictEqual(res.errors, 0)
    t.assert.strictEqual(res.timeouts, 0)
    t.assert.ok(res['2xx'] > 0)
    t.assert.strictEqual(res.url, url)
    done()
  })
})

test('should use extend headers of HAR requests', (t, done) => {
  t.plan(6 + 2) // header check done as many times as sent requests
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-simple-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 2,
    headers: { 'X-CUSTOM': 'my-own-value' },
    har
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(res, 'results should exist')
    t.assert.strictEqual(res.errors, 0)
    t.assert.strictEqual(res.timeouts, 0)
    t.assert.ok(res['2xx'] > 0)
    t.assert.strictEqual(res.url, url)
    done()
  }).on('response', (client) => {
    t.assert.strictEqual(client.requestIterator.currentRequest.headers['X-CUSTOM'], 'my-own-value', 'X-CUSTOM was not sent to server')
  })
})

test('should not override method or body of HAR requests', (t, done) => {
  t.plan(6 + 4) // method and body checks done as many times as sent requests
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-simple-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 2,
    method: 'POST',
    body: 'my-custom-body',
    har
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(res, 'results should exist')
    t.assert.strictEqual(res.errors, 0)
    t.assert.strictEqual(res.timeouts, 0)
    t.assert.ok(res['2xx'] > 0)
    t.assert.strictEqual(res.url, url)
    done()
  }).on('response', (client) => {
    t.assert.strictEqual(client.requestIterator.currentRequest.method, 'GET', 'Method was not mean to be overidden')
    t.assert.strictEqual(client.requestIterator.currentRequest.body, undefined, 'Body was not mean to be overidden')
  })
})

test('should ignore HAR requests targetting a different domain', (t, done) => {
  t.plan(6)
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/multi-domains.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 4,
    har
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(res, 'results should exist')
    t.assert.strictEqual(res.errors, 0)
    t.assert.strictEqual(res.timeouts, 0)
    // if the github request is fired, it'll fail with 4xx status
    t.assert.strictEqual(res['2xx'], 4)
    t.assert.strictEqual(res.url, url)
    done()
  })
})

test('should throw on invalid HAR', (t, done) => {
  t.plan(1)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    amount: 4,
    har: {
      log: {
        version: '1.2',
        creator: {
          name: 'Firefox',
          version: '80.0.1'
        },
        pages: [
          {
            startedDateTime: '2020-09-28T16:43:28.987+02:00',
            id: 'page_1',
            title: 'mcollina/autocannon: fast HTTP/1.1 benchmarking tool written in Node.js',
            pageTimings: {
              onContentLoad: 1234,
              onLoad: 1952
            }
          }
        ]
      }
    }
  }, (err, res) => {
    t.assert.match(err.message, /Could not parse HAR content: no entries found/)
    done()
  })
})

test('should run when no callback is passed in', async (t) => {
  t.plan(1, { wait: true })

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    duration: 1
  })
  t.assert.partialDeepStrictEqual(await tracker, { connections: 1 }, 'The main tracker should resolve')
})

test('Should run a warmup if one is passed in', async (t) => {
  t.plan(1, { wait: true })

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    duration: 1,
    warmup: {
      connections: 1,
      duration: 1
    }
  })
  t.assert.ok(await tracker, 'The main tracker should resolve')
})

test('The warmup should not pollute the main result set', (t) => {
  t.plan(3, { wait: true })

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    duration: 1,
    warmup: {
      connections: 4,
      duration: 2
    }
  })
  tracker.then((result) => {
    t.assert.strictEqual(result.connections, 3, 'connections should equal the main connections and not the warmup connections')
    t.assert.ok(result.duration >= 1, 'duration should equal the main duration and not the warmup duration')
    t.assert.strictEqual(typeof result.warmup, 'object')
  })
})

test('should get headers passed from server onResponse callback', async t => {
  t.plan(3, { wait: true })
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok', headers: { 'set-cookie': 123 } }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    requests: [
      {
        method: 'GET',
        onResponse (status, body, context, headers) {
          t.assert.deepStrictEqual(status, 200)
          t.assert.deepStrictEqual(body, 'ok')
          t.assert.deepStrictEqual(headers['set-cookie'], '123')
        }
      }
    ]
  })
})

test('should get multi-value headers passed from server onResponse callback', async t => {
  t.plan(3, { wait: true })
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok', headers: { 'set-cookie': [123, 456, 789] } }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    requests: [
      {
        method: 'GET',
        onResponse (status, body, context, headers) {
          t.assert.deepStrictEqual(status, 200)
          t.assert.deepStrictEqual(body, 'ok')
          t.assert.deepStrictEqual(headers['set-cookie'], ['123', '456', '789'])
        }
      }
    ]
  })
})
