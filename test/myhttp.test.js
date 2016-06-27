'use strict'

const test = require('tap').test
const Client = require('../lib/myhttp')
const helper = require('./helper')
const server = helper.startServer()
const timeoutServer = helper.startTimeoutServer()
const httpsServer = helper.startHttpsServer()
const bl = require('bl')

test('client calls a server twice', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client calls a https server twice', (t) => {
  t.plan(4)

  var opts = httpsServer.address()
  opts.protocol = 'https:'
  const client = new Client(opts)
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('myhttp client automatically reconnects', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })

  server.once('request', function (req, res) {
    setImmediate(() => {
      req.socket.destroy()
    })
  })
})

test('client supports custom headers', (t) => {
  t.plan(3)

  const opts = server.address()
  opts.headers = {
    hello: 'world'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.hello, 'world', 'custom header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

;[
  'DELETE',
  'POST',
  'PUT'
].forEach((method) => {
  test(`client supports ${method}`, (t) => {
    t.plan(3)

    const opts = server.address()
    opts.method = method

    const client = new Client(opts)

    server.once('request', (req, res) => {
      t.equal(req.method, method, 'custom method matches')
    })

    client.on('response', (statusCode, length) => {
      t.equal(statusCode, 200, 'status code matches')
      t.ok(length > 'hello world'.length, 'length includes the headers')
      client.destroy()
    })
  })
})

test('client does not supports HEAD', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'HEAD'

  t.throws(() => new Client(opts))
})

test('client supports sending a body', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = new Buffer('hello world')

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.deepEqual(body.toString(), opts.body.toString(), 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

test('client supports sending a body which is a string', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'hello world'

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.deepEqual(body.toString(), opts.body, 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

test('client supports changing the body', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'hello world'

  const client = new Client(opts)

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
  'request is okay before modifying')

  t.same(client.opts.body, 'hello world', 'body was as expected')
  client.setBody('modified')
  t.same(client.opts.body, 'modified', 'body was changed')

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
  'body changes updated request')
  client.destroy()
})

test('client supports changing the headers', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
  'request is okay before modifying')

  t.same(client.opts.headers, {}, 'header was as expected')
  client.setHeaders({header: 'modified'})
  t.same(client.opts.headers, {header: 'modified'}, 'header was changed')

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modified\r\n\r\n`),
  'header changes updated request')
  client.destroy()
})

test('client supports changing the headers and body', (t) => {
  t.plan(6)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
  'request is okay before modifying')

  t.same(client.opts.body, 'hello world', 'body was as expected')
  t.same(client.opts.headers, {'Content-Length': 11}, 'header was as expected')

  client.setBody('modified')
  client.setHeaders({header: 'modifiedHeader'})

  t.same(client.opts.body, 'modified', 'body was changed')
  t.same(client.opts.headers, {'Content-Length': 8, header: 'modifiedHeader'}, 'header was changed')

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
  'changes updated request')
  client.destroy()
})

test('client supports changing the headers and body together', (t) => {
  t.plan(6)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
  'request is okay before modifying')

  t.same(client.opts.body, 'hello world', 'body was as expected')
  t.same(client.opts.headers, {'Content-Length': 11}, 'header was as expected')

  client.setHeadersAndBody({header: 'modifiedHeader'}, 'modified')

  t.same(client.opts.body, 'modified', 'body was changed')
  t.same(client.opts.headers, {'Content-Length': 8, header: 'modifiedHeader'}, 'header was changed')

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
  'changes updated request')
  client.destroy()
})

test('client customiseRequest function overwrites the headers and body', (t) => {
  t.plan(9)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'
  opts.customiseRequest = (client) => {
    t.ok(client.setHeadersAndBody, 'client had setHeadersAndBody method')
    t.ok(client.setHeaders, 'client had setHeaders method')
    t.ok(client.setBody, 'client had setBody method')

    client.setHeadersAndBody({header: 'modifiedHeader'}, 'modified')
  }

  const client = new Client(opts)

  t.same(client.opts.body, 'modified', 'body was changed')
  t.notSame(client.opts.body, 'hello world', 'body was changed')

  t.same(client.opts.headers, {'Content-Length': 8, header: 'modifiedHeader'}, 'header was changed')
  t.notSame(client.opts.body, {'Content-Length': 11}, 'header was changed')

  t.same(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
  'changes updated request')

  t.notSame(client._req,
  new Buffer(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
  'changes updated request')

  client.destroy()
})

test('client should emit a timeout when no response is received', (t) => {
  t.plan(1)

  const opts = timeoutServer.address()
  opts.timeout = 1
  const client = new Client(opts)

  client.on('timeout', () => {
    t.ok(1, 'timeout should have happened')
  })

  setTimeout(() => {
    client.destroy()
  }, 1500)
})
