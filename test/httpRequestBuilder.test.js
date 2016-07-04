'use strict'

const test = require('tap').test
const helper = require('./helper')
const server = helper.startServer()
const RequestBuilder = require('../lib/httpRequestBuilder')

test('request builder should create a request with sensible defaults', (t) => {
  t.plan(1)

  const opts = server.address()

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    new Buffer(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should allow default overwriting', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should allow per build overwriting', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const build = RequestBuilder(opts)

  const result = build({method: 'GET'})

  t.same(result,
    new Buffer(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should throw on unknown http method', (t) => {
  t.plan(1)

  const opts = server.address()

  const build = RequestBuilder(opts)

  t.throws(() => build({method: 'HEAD'}))
})
