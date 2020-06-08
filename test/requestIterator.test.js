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

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world`)
  const request2Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)

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

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world`)
  const request2Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)
  const request3Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhell0 w0rld`)

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

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world`)
  const request2Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)
  const request3Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)
  const request4Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified`)
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
  const result = iterator.currentRequest.requestBuffer.toString().trim()

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
  const result = iterator.currentRequest.requestBuffer.toString().trim()

  t.equal(result.includes('[<id>]'), false, 'One or more [<id>] tags were not replaced')
  t.equal(result.slice(-1), '0', 'Generated ID should end with request number')
})

test('request iterator should invoke onResponse callback when set', (t) => {
  t.plan(9)

  const opts = server.address()
  opts.requests = [
    {
      onResponse: (status, body, context) => {
        t.same(status, 200)
        t.same(body, 'ok')
        t.deepEqual(context, {})
      }
    },
    {},
    {
      onResponse: (status, body, context) => {
        t.same(status, 201)
        t.same(body, '')
        t.deepEqual(context, {})
      }
    }
  ]

  const iterator = new RequestIterator(opts)
  iterator.recordBody(iterator.currentRequest, 200, 'ok')
  iterator.nextRequest()
  iterator.recordBody(iterator.currentRequest, 500, 'ignored')
  iterator.nextRequest()
  iterator.recordBody(iterator.currentRequest, 201, '')
  // will reset the iterator
  iterator.nextRequest()
  iterator.recordBody(iterator.currentRequest, 200, 'ok')
})

test('request iterator should properly mutate requests if a setupRequest function is located', (t) => {
  t.plan(6)

  const opts = server.address()
  opts.method = 'POST'

  let i = 0

  opts.requests = [
    {
      body: 'hello world',
      setupRequest: req => {
        req.body += i++
        return req
      }
    },
    {
      method: 'POST',
      body: 'modified',
      setupRequest: req => {
        req.method = 'GET'
        return req
      }
    }
  ]

  const request1Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 12\r\n\r\nhello world0`)
  const request2Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 9\r\n\r\nmodified1`)
  const request3Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)
  const request4Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 9\r\n\r\nmodified2`)
  const request5Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 9\r\n\r\nmodified3`)
  const request6Res = Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`)

  const iterator = new RequestIterator(opts)
  t.same(iterator.currentRequest.requestBuffer, request1Res, 'request was okay')
  iterator.setBody('modified')
  t.same(iterator.currentRequest.requestBuffer, request2Res, 'request was okay')
  iterator.nextRequest() // verify it didn't affect the other request
  t.same(iterator.currentRequest.requestBuffer, request3Res, 'request was okay')
  iterator.nextRequest()
  t.same(iterator.currentRequest.requestBuffer, request4Res, 'request was okay')
  iterator.setHeaders({ header: 'modifiedHeader' })
  t.same(iterator.currentRequest.requestBuffer, request5Res, 'request was okay')
  iterator.setRequest() // this should build default request
  t.same(iterator.currentRequest.requestBuffer, request6Res, 'request was okay')
})

test('request iterator should maintain context while looping on requests', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.requests = [
    {
      setupRequest: (req, context) => {
        t.deepEqual(context, {}, 'context was supposed to be empty for first request')
        context.num = 1
        context.init = true
        return req
      }
    },
    {
      setupRequest: (req, context) => {
        t.deepEqual(context, { num: 1, init: true }, 'context was supposed to be initialized for second request')
        context.num++
        return req
      }
    },
    {
      setupRequest: (req, context) => {
        t.deepEqual(context, { num: 2, init: true }, 'context was supposed to be initialized for third request')
        context.num++
        return req
      }
    }
  ]

  const iterator = new RequestIterator(opts)
  iterator.nextRequest()
  iterator.nextRequest()
  // will reset the iterator
  iterator.nextRequest()
})

test('request iterator should return instance of RequestIterator', t => {
  t.plan(1)
  const caller = {}
  const opts = server.address()

  const iterator = RequestIterator.call(caller, opts)
  t.type(iterator, RequestIterator)
})

test('request iterator should return next request buffer', (t) => {
  t.plan(1)

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

  const request2Res = Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified`)

  opts.requests = requests

  const iterator = new RequestIterator(opts)
  const buffer = iterator.nextRequestBuffer()
  t.same(request2Res, buffer, 'request is okay')
})
