'use strict'

const test = require('tap').test
const helper = require('./helper')
const server = helper.startServer()
const RequestIterator = require('../lib/requestIterator')

test('request iterator should create requests with sensible defaults', (t) => {
  t.plan(3)

  const opts = server.address()

  let iterator = new RequestIterator(opts)

  t.same(iterator.currentRequest.requestBuffer,
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')

  opts.requests = [{}]

  iterator = new RequestIterator(opts)

  t.same(iterator.currentRequest.requestBuffer,
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')

  opts.requests = []

  iterator = new RequestIterator(opts)

  t.notOk(iterator.currentRequest, 'request doesn\'t exist')
})

test('request iterator should create requests with overwritten defaults', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const iterator = new RequestIterator(opts)

  t.same(iterator.currentRequest.requestBuffer,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request iterator should create requests with overwritten defaults', (t) => {
  t.plan(3)

  const opts = server.address()
  opts.method = 'POST'

  const requests = [
    {
      body: 'hello world'
    },
    {
      method: 'GET',
      body: 'modified'
    }
  ]

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`)
  const request2Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`)

  opts.requests = requests

  const iterator = new RequestIterator(opts)

  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request2Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')
})

test('request iterator should allow for overwriting the requests passed in, but still use overwritten defaults', (t) => {
  t.plan(5)

  const opts = server.address()
  opts.method = 'POST'

  const requests1 = [
    {
      body: 'hello world'
    },
    {
      method: 'GET',
      body: 'modified'
    }
  ]

  const requests2 = [
    {
      body: 'hell0 w0rld'
    }
  ]

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`)
  const request2Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`)
  const request3Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhell0 w0rld\r\n`)

  opts.requests = requests1

  const iterator = new RequestIterator(opts)

  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request2Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')

  iterator.setRequests(requests2)
  t.same(iterator.currentRequest.requestBuffer, request3Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request3Res, 'request was okay')
})

test('request iterator should allow for rebuilding the current request', (t) => {
  t.plan(6)

  const opts = server.address()
  opts.method = 'POST'

  const requests1 = [
    {
      body: 'hello world'
    },
    {
      method: 'GET',
      body: 'modified'
    }
  ]

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`)
  const request2Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`)
  const request3Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`)
  const request4Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`)
  const request5Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`)

  opts.requests = requests1

  const iterator = new RequestIterator(opts)
  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')
  iterator.setBody('modified')
  t.same(iterator.currentRequest.requestBuffer, request2Res, 'request was okay')
  iterator.nextRequest() // verify it didn't affect the other request
  t.same(iterator.currentRequest.requestBuffer, request3Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request2Res, 'request was okay')
  iterator.setHeaders({ header: 'modifiedHeader' })
  t.same(iterator.currentRequest.requestBuffer, request4Res, 'request was okay')
  iterator.setRequest() // this should build default request
  t.same(iterator.currentRequest.requestBuffer, request5Res, 'request was okay')
})

test('request iterator should not replace any [<id>] tags with generated IDs when calling move with idReplacement disabled', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = '[<id>]'
  opts.requests = [{}]

  const iterator = new RequestIterator(opts)
  const result = iterator.move().toString().trim()

  const contentLength = result.split('Content-Length: ')[1].slice(0, 1)
  t.equal(contentLength, '6', 'Content-Length was incorrect')

  const body = result.split('Content-Length: 6')[1].trim()
  t.equal(body, '[<id>]', '[<id>] should be present in body')
})

test('request iterator should replace all [<id>] tags with generated IDs when calling move with idReplacement enabled', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = '[<id>]'
  opts.requests = [{}]
  opts.idReplacement = true

  const iterator = new RequestIterator(opts)
  const result = iterator.move().toString().trim()

  t.equal(result.includes('[<id>]'), false, 'One or more [<id>] tags were not replaced')
  t.equal(result.slice(-1), '0', 'Generated ID should end with request number')
})
