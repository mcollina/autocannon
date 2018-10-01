'use strict'

const test = require('tap').test
const Client = require('../lib/httpClient')
const helper = require('./helper')
const server = helper.startServer()
const timeoutServer = helper.startTimeoutServer()
const httpsServer = helper.startHttpsServer()
const tlsServer = helper.startTlsServer()
const trailerServer = helper.startTrailerServer()
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

test('client calls a tls server without SNI servername twice', (t) => {
  t.plan(4)

  var opts = tlsServer.address()
  opts.protocol = 'https:'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.deepEqual(response.headers, ['X-servername', '', 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client calls a tls server with SNI servername twice', (t) => {
  t.plan(4)

  var opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.servername = 'example.com'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.deepEqual(response.headers, ['X-servername', opts.servername, 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('http client automatically reconnects', (t) => {
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

test('client supports host custom header', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.headers = {
    host: 'www.autocannon.com'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.host, 'www.autocannon.com', 'host header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})

test('client supports response trailers', (t) => {
  t.plan(3)

  const client = new Client(trailerServer.address())
  let n = 0
  client.on('body', (raw) => {
    if (++n === 1) {
      // trailer value
      t.ok(/7895bf4b8828b55ceaf47747b4bca667/.test(raw.toString()))
    }
  })
  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

;
[
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

test('client supports sending a body', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = Buffer.from('hello world')

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
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'hello world'

  const client = new Client(opts)

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
    'request is okay before modifying')

  client.setBody('modified')

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
    'body changes updated request')
  client.destroy()
})

test('client supports changing the headers', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'

  const client = new Client(opts)
  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay before modifying')

  client.setHeaders({
    header: 'modified'
  })

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modified\r\n\r\n`),
    'header changes updated request')
  client.destroy()
})

test('client supports changing the headers and body', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
    'request is okay before modifying')

  client.setBody('modified')
  client.setHeaders({
    header: 'modifiedHeader'
  })

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
    'changes updated request')
  client.destroy()
})

test('client supports changing the headers and body together', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
    'request is okay before modifying')

  client.setHeadersAndBody({
    header: 'modifiedHeader'
  }, 'modified')

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
    'changes updated request')
  client.destroy()
})

test('client supports updating the current request object', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
    'request is okay before modifying')

  client.setRequest({
    headers: {
      header: 'modifiedHeader'
    },
    body: 'modified',
    method: 'GET'
  })

  t.same(client.getRequestBuffer(),
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
    'changes updated request')
  client.destroy()
})

test('client customiseRequest function overwrites the headers and body', (t) => {
  t.plan(5)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'
  opts.setupClient = (client) => {
    t.ok(client.setHeadersAndBody, 'client had setHeadersAndBody method')
    t.ok(client.setHeaders, 'client had setHeaders method')
    t.ok(client.setBody, 'client had setBody method')

    client.setHeadersAndBody({
      header: 'modifiedHeader'
    }, 'modified')
  }

  const client = new Client(opts)

  t.same(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nheader: modifiedHeader\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
    'changes updated request')

  t.notSame(client.getRequestBuffer(),
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
    'changes updated request')

  client.destroy()
})

test('client should throw when attempting to modify the request with a pipelining greater than 1', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.pipelining = 10
  const client = new Client(opts)

  t.throws(() => client.setHeaders({}))

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

  setTimeout(() => client.destroy(), 1500)
})

test('client should emit 2 timeouts when no responses are received', (t) => {
  t.plan(2)

  const opts = timeoutServer.address()
  opts.timeout = 1
  const client = new Client(opts)

  client.on('timeout', () => {
    t.ok(1, 'timeout should have happened')
  })

  setTimeout(() => client.destroy(), 2500)
})

test('client should have 2 different requests it iterates over', (t) => {
  t.plan(3)
  const opts = server.address()
  opts.method = 'POST'

  opts.requests = [{
    body: 'hello world'
  },
  {
    method: 'GET',
    body: 'modified'
  }
  ]

  const client = new Client(opts)
  let number = 0

  client.on('response', (statusCode, length) => {
    number++
    if (number === 1 || number === 3) {
      t.same(client.getRequestBuffer(),
        Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 8\r\n\r\nmodified\r\n`),
        'body changes updated request')

      if (number === 3) {
        client.destroy()
        t.end()
      }
    } else {
      t.same(client.getRequestBuffer(),
        Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 11\r\n\r\nhello world\r\n`),
        'request was okay')
    }
  })
})
