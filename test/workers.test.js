'use strict'

const path = require('path')
const fs = require('fs')
const { test } = require('node:test')
const http = require('http')
const initJob = require('../lib/init')
const { hasWorkerSupport } = require('../lib/util')
const helper = require('./helper')
const httpsServer = helper.startHttpsServer()

test('returns error when no worker support was found', (t, done) => {
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    workers: 3,
    amount: 6,
    title: 'with-workers'
  }, function (err, result) {
    if (hasWorkerSupport) {
      t.assert.ifError(err)
    } else {
      t.assert.strictEqual(err.message, 'Please use node >= 11.7.0 for workers support')
    }

    done()
  })
})

test('init with workers', { skip: !hasWorkerSupport }, (t, done) => {
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    workers: 3,
    amount: 6,
    title: 'with-workers'
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.ok(result.workers === 3, 'correct worker count')
    t.assert.strictEqual(result.title, 'with-workers', 'title should be what was passed in')
    t.assert.strictEqual(result.connections, 3, 'connections is the same')
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
    t.assert.ok(result.requests.total === 6, 'requests.total exists')
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
    t.assert.strictEqual(typeof result.throughput.total, 'number', 'throughput.total exists')
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

test('setupRequest and onResponse work with workers', { skip: !hasWorkerSupport }, (t, done) => {
  const server = http.createServer((req, res) => {
    // it's not easy to assert things within setupRequest and onResponse
    // when in workers mode. So, we set something in onResponse and use in the
    // next Request and make sure it exist or we return 404.
    if (req.method === 'GET' && req.url !== '/test-123?some=thing&bar=baz') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }

    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 4,
    workers: 1,
    requests: [
      {
        method: 'PUT',
        onResponse: path.join(__dirname, './utils/on-response')
      },
      {
        method: 'GET',
        setupRequest: path.join(__dirname, './utils/setup-request')
      }
    ]
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.strictEqual(4, result['2xx'], 'should have 4 ok requests')
    t.assert.strictEqual(0, result['4xx'], 'should not have any 404s')
    done()
  })
})

test('verifyBody work with workers', { skip: !hasWorkerSupport }, (t, done) => {
  const server = http.createServer((req, res) => {
    // it's not easy to assert things within setupRequest and onResponse
    // when in workers mode. So, we set something in onResponse and use in the
    // next Request and make sure it exist or we return 404.
    if (req.method === 'GET' && req.url !== '/test-123?some=thing&bar=baz') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }

    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 4,
    workers: 1,
    verifyBody: path.join(__dirname, './utils/verify-body')
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.strictEqual(4, result.mismatches, 'should have 4 mismatches requests')
    done()
  })
})

test('setupClient works with workers', { skip: !hasWorkerSupport }, (t, done) => {
  const server = http.createServer((req, res) => {
    if (req.headers.custom !== 'my-header') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }
    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 2,
    workers: 1,
    setupClient: path.join(__dirname, './utils/setup-client')
  }, function (err, result) {
    t.assert.ifError(err)

    t.assert.strictEqual(2, result['2xx'], 'should have 2 ok requests')
    t.assert.strictEqual(0, result['4xx'], 'should not have any 404s')
    done()
  })
})

test('tlsOptions using pfx work as intended in workers', { skip: !hasWorkerSupport }, (t, done) => {
  initJob({
    url: 'https://localhost:' + httpsServer.address().port,
    connections: 1,
    amount: 1,
    workers: 2,
    tlsOptions: {
      pfx: fs.readFileSync(path.join(__dirname, '/keystore.pkcs12')),
      passphrase: 'test'
    }
  }, function (err, result) {
    t.assert.ifError(err)
    t.assert.ok(result, 'requests are ok')
    done()
  })
})
