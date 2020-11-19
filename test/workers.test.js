'use strict'

const path = require('path')
const test = require('tap').test
const http = require('http')
const initJob = require('../lib/init')
const hasWorkerSupport = require('./utils/has-worker-support')

test('setupRequest and onResponse work with workers', { skip: !hasWorkerSupport }, (t) => {
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
    t.error(err)

    t.equal(4, result['2xx'], 'should have 4 ok requests')
    t.equal(0, result['4xx'], 'should not have any 404s')
    t.end()
  })
})

test('setupClient works with workers', { skip: !hasWorkerSupport }, (t) => {
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
    t.error(err)

    t.equal(2, result['2xx'], 'should have 2 ok requests')
    t.equal(0, result['4xx'], 'should not have any 404s')
    t.end()
  })
})
